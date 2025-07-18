'use server';

/**
 * @fileOverview A flow for answering questions about the user's tasks.
 * This flow uses a modular ContextManager to build prompts and leverages Genkit
 * for execution and monitoring.
 */

import {ai, genkit, googleAI, openAI} from '@/ai/genkit';
import { z } from 'genkit';
import { ContextManager } from '../utils/context-manager';
import { PatternRecognition } from '../learning/pattern-recognition';
import { MessageSchema, Message } from '../types/message'; // Import MessageSchema and Message
import { ModelSelector } from '../utils/model-selector'; // Import ModelSelector

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
    clientName: z.string().describe("The name of the client for this task. IMPORTANT: First, check the provided client list for a match. If a matching client exists, use their exact name. Only provide a new name if the client does not exist in the list."),
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
        clientName: z.string().optional().describe("The new client name, if changing. IMPORTANT: First, check the provided client list for a match. If a matching client exists, use their exact name. Only provide a new name if the client does not exist in the list."),
        categoryId: z.string().optional().describe("The new category ID, if changing."),
        startDate: z.string().optional().describe("The new start date in YYYY-MM-DD format."),
        deadline: z.string().optional().describe("The new deadline date in YYYY-MM-DD format."),
    }).describe("An object containing the fields to update."),
});

const DeleteTaskPayloadSchema = z.object({
    taskId: z.string().describe("The ID of the task to delete."),
});

const CreateClientPayloadSchema = z.object({
    name: z.string().describe("The name of the new client."),
    email: z.string().optional().describe("The email of the new client."),
    phone: z.string().optional().describe("The phone number of the new client."),
});

const EditClientPayloadSchema = z.object({
    clientId: z.string().describe("The ID of the client to update."),
    updates: z.object({
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
    }).describe("An object containing the fields to update."),
});

const DeleteClientPayloadSchema = z.object({
    clientId: z.string().describe("The ID of the client to delete."),
});

const CreateCollaboratorPayloadSchema = z.object({
    name: z.string().describe("The name of the new collaborator."),
    email: z.string().optional().describe("The email of the new collaborator."),
    role: z.string().optional().describe("The role of the new collaborator."),
});

const EditCollaboratorPayloadSchema = z.object({
    collaboratorId: z.string().describe("The ID of the collaborator to update."),
    updates: z.object({
        name: z.string().optional(),
        email: z.string().optional(),
        role: z.string().optional(),
    }).describe("An object containing the fields to update."),
});

const DeleteCollaboratorPayloadSchema = z.object({
    collaboratorId: z.string().describe("The ID of the collaborator to delete."),
});

const CreateCategoryPayloadSchema = z.object({
    name: z.string().describe("The name of the new category."),
});

const EditCategoryPayloadSchema = z.object({
    categoryId: z.string().describe("The ID of the category to update."),
    updates: z.object({
        name: z.string().optional(),
    }).describe("An object containing the fields to update."),
});

const DeleteCategoryPayloadSchema = z.object({
    categoryId: z.string().describe("The ID of the category to delete."),
});

const OpenTaskDialogElementSchema = z.object({
    type: z.enum(['openTaskDialog']),
    taskId: z.string().describe("The ID of the task to open in a dialog."),
});

const CopyableTextElementSchema = z.object({
    type: z.enum(['copyableText']),
    content: z.string().describe("The text content that can be copied."),
    label: z.string().optional().describe("Optional label for the copy button."),
});

const ExportContentToTaskElementSchema = z.object({
    type: z.enum(['exportContentToTask']),
    content: z.string().describe("The content to be exported to a new task's description."),
    suggestedTaskName: z.string().optional().describe("Optional suggested name for the new task."),
});

const InteractiveElementSchema = z.discriminatedUnion('type', [
    OpenTaskDialogElementSchema,
    CopyableTextElementSchema,
    ExportContentToTaskElementSchema,
]);

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
            z.object({
                type: z.enum(['deleteTask']),
                payload: DeleteTaskPayloadSchema,
            }),
            z.object({
                type: z.enum(['createClient']),
                payload: CreateClientPayloadSchema,
            }),
            z.object({
                type: z.enum(['editClient']),
                payload: EditClientPayloadSchema,
            }),
            z.object({
                type: z.enum(['deleteClient']),
                payload: DeleteClientPayloadSchema,
            }),
            z.object({
                type: z.enum(['createCollaborator']),
                payload: CreateCollaboratorPayloadSchema,
            }),
            z.object({
                type: z.enum(['editCollaborator']),
                payload: EditCollaboratorPayloadSchema,
            }),
            z.object({
                type: z.enum(['deleteCollaborator']),
                payload: DeleteCollaboratorPayloadSchema,
            }),
            z.object({
                type: z.enum(['createCategory']),
                payload: CreateCategoryPayloadSchema,
            }),
            z.object({
                type: z.enum(['editCategory']),
                payload: EditCategoryPayloadSchema,
            }),
            z.object({
                type: z.enum(['deleteCategory']),
                payload: DeleteCategoryPayloadSchema,
            }),
        ])
        .nullable()
        .optional()
        .describe("The action the client application should perform, if any."),
    confirmationRequired: z.boolean().optional().describe("If true, this action requires explicit user confirmation before execution."),
    interactiveElements: z.array(InteractiveElementSchema).optional().describe("A list of interactive UI elements to display to the user."),
});
export type AskAboutTasksOutput = z.infer<typeof AskAboutTasksOutputSchema>;


const askAboutTasksFlow = ai.defineFlow(
  {
    name: 'askAboutTasksFlow',
    inputSchema: AskAboutTasksInputSchema,
    outputSchema: AskAboutTasksOutputSchema,
  },
  async (input) => {
    // Check if API key is available in environment variables
    const googleApiKey = process.env.GOOGLE_GENAI_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (input.provider === 'google' && !googleApiKey) {
      return {
          text: "🔑 **Lỗi API Key**\n\nCần cài đặt GOOGLE_GENAI_API_KEY trong file .env.local để sử dụng Google AI models.",
          action: null
      };
    }
    
    if (input.provider === 'openai' && !openaiApiKey) {
      return {
          text: "🔑 **Lỗi API Key**\n\nCần cài đặt OPENAI_API_KEY trong file .env.local để sử dụng OpenAI models.",
          action: null
      };
    }
    
    // Use the pre-configured global AI instance instead of creating a local one
    const localAi = ai;

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
    
    const MAX_HISTORY_TOKENS = 2000;

    const optimizedHistory = ContextManager.optimizeHistory(input.history, MAX_HISTORY_TOKENS);

    // *** REFACTORED PART ***
    const detectedLanguage = PatternRecognition.detectLanguageFromMessage(input.userInput);
    const detectedIntent = PatternRecognition.detectIntent(input.userInput);

    console.log('Detected Language:', detectedLanguage);
    console.log('Detected Intent:', detectedIntent);
    console.log('User Input:', input.userInput);

    const systemPrompt = ContextManager.buildSystemPrompt({
        language: detectedLanguage,
        intent: detectedIntent, // Pass the detected intent
        data: {
            tasks: tasksForPrompt,
            clients: input.clients,
            collaborators: input.collaborators,
            quoteTemplates: input.quoteTemplates,
        }
    });
    
    console.log('System Prompt Length:', systemPrompt.length);

    const selectedModelConfig = ModelSelector.selectModel({
        userInput: input.userInput,
        requestedAction: detectedIntent,
        historyLength: input.history.length,
        preferredProvider: input.provider,
    });

    console.log('Selected Model:', selectedModelConfig);

    const modelToUse = selectedModelConfig.provider === 'openai' 
        ? `openai/${selectedModelConfig.name}` 
        : googleAI.model(selectedModelConfig.name);
    
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
      
      const messages = [
        ...optimizedHistory,
        { role: 'user' as const, content: [{ text: input.userInput }] },
      ];

      const response = await localAi.generate({
          model: modelToUse,
          messages: messages,
          system: systemPrompt,
          output: { schema: AskAboutTasksOutputSchema },
          config: generateConfig,
      });

      console.log('AI Response Raw:', response);

      if (!response.output) {
          console.error('AI response missing output:', response);
          return {
              text: response.text || "I'm sorry, I couldn't generate a valid response. Please try rephrasing your request.",
              action: null
          };
      }

      // Validate the response structure
      try {
          const validatedOutput = AskAboutTasksOutputSchema.parse(response.output);
          console.log('Validated AI Output:', validatedOutput);
          
          let confirmationRequired = false;
          if (validatedOutput.action) {
              const destructiveActions = ['deleteTask', 'deleteClient', 'deleteCollaborator', 'deleteCategory'];
              if (destructiveActions.includes(validatedOutput.action.type)) {
                  confirmationRequired = true;
              }
          }

          return {
              ...validatedOutput,
              confirmationRequired: confirmationRequired,
          };
      } catch (validationError: any) {
          console.error('Schema validation error:', validationError);
          console.error('Raw response output:', response.output);
          return {
              text: "I'm sorry, I encountered an issue while formatting my response. Could you please try rephrasing your request?",
              action: null
          };
      }

    } catch (e: any) {
      console.error("Error in askAboutTasksFlow:", e);
      console.error("Error stack:", e.stack);
      console.error("Input that caused error:", JSON.stringify(input, null, 2));
      
      const errorMessage = e.message || 'An unknown error occurred.';
      
      if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('overloaded')) {
          return {
              text: "😔 **Dịch vụ AI hiện tại đang quá tải** \\n\\nXin lỗi, mô hình AI hiện đang có nhiều yêu cầu. Vui lòng thử lại sau ít phút hoặc thử chuyển sang mô hình khác trong cài đặt.",
              action: null
          };
      }
      
      if (errorMessage.includes('Schema validation failed') || errorMessage.includes('Invalid JSON')) {
        return {
            text: "😅 **Có lỗi trong quá trình xử lý** \\n\\nXin lỗi, tôi gặp sự cố khi định dạng phản hồi. Bạn có thể thử diễn đạt lại yêu cầu không? Hoặc thử các câu lệnh đơn giản hơn như: \\n\\n• 'Tạo task mới tên ABC cho khách hàng XYZ' \\n• 'Thay đổi trạng thái task 123 thành hoàn thành'",
            action: null
        };
      }
      
      if (errorMessage.includes('API key')) {
        return {
            text: "🔑 **Lỗi API Key** \\n\\nCó vấn đề với API key. Vui lòng kiểm tra lại cài đặt API key trong phần Settings.",
            action: null
        };
      }
      
      return {
          text: `❌ **Đã xảy ra lỗi** \\n\\nXin lỗi, có lỗi xảy ra. Vui lòng kiểm tra lại API key và cấu hình trong Settings. \\n\\n**Chi tiết lỗi:** ${errorMessage}`,
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
