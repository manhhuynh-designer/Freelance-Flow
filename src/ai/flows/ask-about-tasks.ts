
'use server';

/**
 * @fileOverview A flow for answering questions about the user's tasks.
 *
 * - askAboutTasks - A function that answers user queries based on their tasks and clients.
 * - AskAboutTasksInput - The input type for the askAboutTasks function.
 * - AskAboutTasksOutput - The output type for the askAboutTasks function.
 */

import {ai, genkit, googleAI, openAI} from '@/ai/genkit';
import { z } from 'genkit';
import {format} from 'date-fns';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.array(z.object({ text: z.string() })),
});

const AskAboutTasksInputSchema = z.object({
  userInput: z.string().describe("The user's latest message or question."),
  history: z.array(MessageSchema).describe('The chat history between the user and the model.'),
  tasks: z.array(z.any()).describe("A JSON array of the user's active tasks."),
  clients: z.array(z.any()).describe("A JSON array of the user's clients."),
  collaborators: z.array(z.any()).describe("A JSON array of the user's collaborators."),
  quoteTemplates: z.array(z.any()).describe("A JSON array of the user's quote templates."),
  language: z.enum(['en', 'vi']).describe("The user's selected language for the response."),
  provider: z.enum(['google', 'openai']).describe('The AI provider to use.'),
  apiKey: z.string().optional().describe('The API key for the selected provider.'),
  modelName: z.string().describe("The name of the model to use (e.g., 'gemini-1.5-flash', 'gpt-4o')."),
});
export type AskAboutTasksInput = z.infer<typeof AskAboutTasksInputSchema>;

const UpdateTaskStatusPayloadSchema = z.object({
    taskId: z.string().describe("The ID of the task to update."),
    status: z.enum(['todo', 'inprogress', 'done', 'onhold', 'archived']).describe("The new status for the task."),
});

const SuggestedItemSchema = z.object({
  description: z.string().describe('The description of the work item.'),
  quantity: z.coerce.number().describe('The quantity for this item.'),
  unitPrice: z.coerce.number().describe('The price for a single unit of this item in VND.'),
});

const CreateTaskPayloadSchema = z.object({
    name: z.string().describe("The name of the new task."),
    description: z.string().optional().describe("A brief description of the task."),
    clientName: z.string().describe("The name of the client for this task. The client will be created if it doesn't exist. Use the exact name provided by the user."),
    categoryId: z.string().describe("The category ID ('cat-1' for 2D, 'cat-2' for 3D)."),
    startDate: z.string().describe("The start date in YYYY-MM-DD format."),
    deadline: z.string().describe("The deadline date in YYYY-MM-DD format."),
    quoteItems: z.array(SuggestedItemSchema).optional().describe("A list of suggested line items for the quote, generated based on the task description. This should be populated if the user provides a task description."),
});

const EditTaskPayloadSchema = z.object({
    taskId: z.string().describe("The ID of the task to update."),
    updates: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        clientName: z.string().optional().describe("The new client name, if changing. The client will be created if it doesn't exist."),
        categoryId: z.string().optional().describe("The new category ID, if changing."),
        startDate: z.string().optional().describe("The new start date in YYYY-MM-DD format."),
        deadline: z.string().optional().describe("The new deadline date in YYYY-MM-DD format."),
    }).describe("An object containing the fields to update."),
});

const AskAboutTasksOutputSchema = z.object({
    text: z.string().describe("The natural language response to the user."),
    action: z
        .discriminatedUnion("type", [
            z.object({
                type: z.enum(['updateTaskStatus']),
                payload: UpdateTaskStatusPayloadSchema,
            }),
            z.object({
                type: z.enum(['createTask']),
                payload: CreateTaskPayloadSchema,
            }),
             z.object({
                type: z.enum(['editTask']),
                payload: EditTaskPayloadSchema,
            }),
        ])
        .nullable()
        .optional()
        .describe("The action the client application should perform, if any."),
});
export type AskAboutTasksOutput = z.infer<typeof AskAboutTasksOutputSchema>;


const askAboutTasksFlow = ai.defineFlow(
  {
    name: 'askAboutTasksFlow',
    inputSchema: AskAboutTasksInputSchema,
    outputSchema: AskAboutTasksOutputSchema,
  },
  async (input) => {
    if (!input.apiKey) {
      return {
          text: "An API key is required. Please add it in your settings.",
          action: null
      };
    }
    
    const plugins = input.provider === 'openai' 
      ? [openAI({ apiKey: input.apiKey })] 
      : [googleAI({ apiKey: input.apiKey })];

    const localAi = genkit({ plugins });

    const clientMap = input.clients.reduce((acc, client) => {
      acc[client.id] = client.name;
      return acc;
    }, {} as Record<string, string>);

    const tasksForPrompt = input.tasks.map(task => ({
      id: task.id,
      name: task.name,
      description: task.description,
      status: task.status,
      deadline: task.deadline,
      clientName: clientMap[task.clientId] || 'Unknown Client',
    }));
    
    const currentDate = format(new Date(), 'yyyy-MM-dd');

    const systemPrompt = `You are a helpful assistant and agent for an application called "Freelance Flow".
Your goal is to help the user manage their data by answering questions and performing actions. Today's date is ${currentDate}.

When the user asks a question, use the data to form a concise and helpful answer in the 'text' output field.

When the user asks you to perform an action (like creating or updating a task), you MUST:
1.  If creating a task, gather all required information (name, client name, category, start date, deadline). If any information is missing, you must ask the user for it.
2.  Populate the 'action' field in your output with the correct action type and payload. If no action is needed, the 'action' field MUST be null, not an empty object.
3.  Provide a confirmation message in the 'text' output field.
4.  **Client Handling**: For \`createTask\` and \`editTask\`, use the \`clientName\` field. Provide the exact client name. A new client will be created automatically if one with that name does not exist. You do not need to find a client ID.
5.  **Quote Generation**: When creating a task, you must generate a quote. Prioritize the following methods:
    a. **Template Matching (Highest Priority)**: If the user mentions a quote template by its full name, an abbreviation, or a keyword (e.g., "use the standard 2D template", "using the 'basic 3d' quote"), you MUST find the closest matching template from the "User's Quote Templates" JSON data. If a clear match is found, use the 'items' from that template to populate the \`quoteItems\` field in the \`createTask\` payload.
    b. **Auto-Quoting (Fallback)**: If NO template is mentioned but the user provides a \`description\`, you MUST generate a detailed list of billable line items for a price quote. The quote should be logical for the work described. For each line item, provide a \`description\`, \`quantity\`, and \`unitPrice\` in Vietnamese Dong (VND). Populate this list in the \`quoteItems\` field.

AVAILABLE ACTIONS:
- 'updateTaskStatus': Changes the status of a task.
  - payload schema: { taskId: string, status: 'todo' | 'inprogress' | 'done' | 'onhold' | 'archived' }
- 'createTask': Creates a new task.
  - payload schema: { name: string, description?: string, clientName: string, categoryId: string, startDate: string (YYYY-MM-DD), deadline: string (YYYY-MM-DD), quoteItems?: { description: string, quantity: number, unitPrice: number }[] }
- 'editTask': Edits an existing task.
  - payload schema: { taskId: string, updates: { name?: string, description?: string, clientName?: string, categoryId?: string, startDate?: string (YYYY-MM-DD), deadline?: string (YYYY-MM-DD) } }

If you don't know the answer or cannot perform the action, politely say so in the 'text' field and set the 'action' field to null. The 'action' field MUST NOT be an empty object like {}.
Respond in the user's selected language: ${input.language === 'vi' ? 'Vietnamese' : 'English'}.
Your entire response must be a single, valid JSON object that conforms to the required output schema. Do not add any text before or after the JSON object.

Here is the user's data. Do not mention that you are seeing it as JSON, just use it to answer questions naturally.

Available Categories:
- 2D (id: cat-1)
- 3D (id: cat-2)

User's Clients:
\`\`\`json
${JSON.stringify(input.clients)}
\`\`\`

User's Collaborators:
\`\`\`json
${JSON.stringify(input.collaborators)}
\`\`\`

User's Quote Templates:
\`\`\`json
${JSON.stringify(input.quoteTemplates)}
\`\`\`

User's Tasks:
\`\`\`json
${JSON.stringify(tasksForPrompt)}
\`\`\`
`;
    
    const modelToUse = input.provider === 'openai' 
        ? `openai/${input.modelName}` 
        : googleAI.model(input.modelName);
    
    try {
      const generateConfig: any = {};
      if (input.provider === 'google') {
          generateConfig.safetySettings = [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ];
      }
      if (input.provider === 'openai') {
        generateConfig.response_format = { type: 'json_object' };
      }
      
      const response = await localAi.generate({
          model: modelToUse,
          prompt: input.userInput,
          system: systemPrompt,
          history: input.history,
          output: { schema: AskAboutTasksOutputSchema },
          config: generateConfig,
      });

      if (!response.output) {
          return {
              text: response.text || "I'm sorry, I couldn't generate a valid response. Please try rephrasing your request.",
              action: null
          };
      }
      
      return response.output;

    } catch (e: any) {
      console.error("Error in askAboutTasksFlow:", e);
      const errorMessage = e.message || 'An unknown error occurred.';
      
      if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('overloaded')) {
          return {
              text: "I'm sorry, the AI model is currently experiencing high demand. Please try again shortly. You can also try a different model in the settings.",
              action: null
          };
      }
      
      if (errorMessage.includes('Schema validation failed')) {
        return {
            text: "I'm sorry, I encountered an issue while formatting my response. Could you please try rephrasing your request?",
            action: null
        };
      }
      return {
          text: `I'm sorry, an error occurred. Please check your API key and configuration. Details: ${errorMessage}`,
          action: null
      };
    }
  }
);

export async function askAboutTasks(input: AskAboutTasksInput): Promise<AskAboutTasksOutput> {
    const result = await askAboutTasksFlow(input);

    if (!result) {
        return {
            text: "An unexpected error occurred and the AI flow did not return a response.",
            action: null,
        }
    }
    return result;
}
