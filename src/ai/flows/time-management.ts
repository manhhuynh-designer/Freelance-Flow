'use server';

/**
 * @fileOverview A flow for analyzing the user's time management based on their tasks and time logs.
 *
 * - manageTime - A function that provides insights and suggestions for time management.
 * - TimeManagementInput - The input type for the manageTime function.
 * - TimeManagementOutput - The output type for the manageTime function.
 */

import { ai, genkit, googleAI, openAI } from '@/ai/genkit';
import { z } from 'genkit';

// Define schemas for individual data types.
const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  estimatedHours: z.number().optional(),
  deadline: z.string().optional().describe('Deadline in YYYY-MM-DD format.'),
});

const TimeLogSchema = z.object({
  taskId: z.string(),
  hoursSpent: z.number(),
  date: z.string().describe('Date of the time log in YYYY-MM-DD format.'),
});

// Define the main input schema for the flow.
const TimeManagementInputSchema = z.object({
  tasks: z.array(TaskSchema).describe('A list of active tasks.'),
  timeLogs: z.array(TimeLogSchema).describe('A list of time logs recorded by the user.'),
  language: z.enum(['en', 'vi']).describe("The user's selected language for the response."),
  provider: z.enum(['google', 'openai']).describe('The AI provider to use.'),
  apiKey: z.string().optional().describe('The API key for the selected provider.'),
  modelName: z.string().describe("The name of the model to use."),
});
export type TimeManagementInput = z.infer<typeof TimeManagementInputSchema>;

// Define the structured output schema for the time management insights.
const TimeManagementOutputSchema = z.object({
  timeAnalysis: z.record(z.object({
    estimatedHours: z.number().optional(),
    loggedHours: z.number(),
    variance: z.number().describe('Difference between logged and estimated hours. Positive means overtime.'),
  })).describe('A dictionary mapping task names to their time analysis.'),
  
  scheduleSuggestions: z.array(z.string()).describe('A list of suggestions to optimize the user\'s schedule (e.g., "Suggest taking a break", "Allocate focus blocks for Task X").'),
  
  deadlineWarnings: z.array(z.object({
    taskName: z.string(),
    deadline: z.string(),
    message: z.string().describe('A warning message about an upcoming or overdue deadline.'),
  })).describe('A list of warnings for tasks with approaching or past deadlines.'),
});
export type TimeManagementOutput = z.infer<typeof TimeManagementOutputSchema>;


// Define the Genkit flow for time management analysis.
const timeManagementFlow = ai.defineFlow(
  {
    name: 'timeManagementFlow',
    inputSchema: TimeManagementInputSchema,
    outputSchema: TimeManagementOutputSchema,
  },
  async (input) => {
    if (!input.apiKey) {
      throw new Error('An API key is required for time management analysis.');
    }

    const plugins = input.provider === 'openai'
      ? [openAI({ apiKey: input.apiKey })]
      : [googleAI({ apiKey: input.apiKey })];

    const localAi = genkit({ plugins });

    const prompt = `You are an expert productivity coach. Your task is to analyze a user's tasks and time logs to provide actionable time management insights.

Instructions:
1.  **Time Analysis**: For each task, compare the \`estimatedHours\` with the total \`loggedHours\` from the time logs. Calculate the variance.
2.  **Schedule Suggestions**: Based on the workload and deadlines, provide concrete suggestions to optimize the user's schedule. This could include recommending focus blocks for complex tasks or suggesting breaks.
3.  **Deadline Warnings**: Identify any tasks that are close to their deadline or are already overdue. Create a clear warning message for each.

Respond ONLY with a valid JSON object that conforms to the required output schema.
The response should be in the user's selected language: ${input.language}.

Data for Analysis:
Tasks: ${JSON.stringify(input.tasks)}
Time Logs: ${JSON.stringify(input.timeLogs)}
`;

    const modelToUse = input.provider === 'openai'
        ? `openai/${input.modelName}`
        : googleAI.model(input.modelName);

    try {
      const generateConfig: any = { response_format: { type: 'json_object' } };
       if (input.provider === 'google') {
          generateConfig.safetySettings = [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ];
      }

      const { output } = await localAi.generate({
        model: modelToUse,
        prompt: prompt,
        output: { schema: TimeManagementOutputSchema },
        config: generateConfig,
      });

      if (!output) {
        throw new Error("Failed to generate valid time management insights. The model returned an empty response.");
      }

      return output;
    } catch (e: any) {
      console.error("Error in timeManagementFlow:", e);
      throw new Error(`Time management analysis failed. Details: ${e.message}`);
    }
  }
);

// Expose the flow as a callable server function.
export async function manageTime(input: TimeManagementInput): Promise<TimeManagementOutput> {
  const result = await timeManagementFlow(input);
  if (!result) {
    throw new Error("An unexpected error occurred and the time management flow did not return a response.");
  }
  return result;
}