'use server';

/**
 * @fileOverview A flow for analyzing the user's project data to provide insights.
 *
 * - analyzeProject - A function that provides insights on timeline, workload, risks, and optimizations.
 * - ProjectAnalysisInput - The input type for the analyzeProject function.
 * - ProjectAnalysisOutput - The output type for the analyzeProject function.
 */

import { ai, genkit, googleAI, openAI } from '@/ai/genkit';
import { z } from 'genkit';

// Define the input schema, which consists of the user's project data.
const ProjectAnalysisInputSchema = z.object({
  tasks: z.array(z.any()).describe("A JSON array of the user's active tasks."),
  clients: z.array(z.any()).describe("A JSON array of the user's clients."),
  collaborators: z.array(z.any()).describe("A JSON array of the user's collaborators."),
  language: z.enum(['en', 'vi']).describe("The user's selected language for the response."),
  provider: z.enum(['google', 'openai']).describe('The AI provider to use.'),
  apiKey: z.string().optional().describe('The API key for the selected provider.'),
  modelName: z.string().describe("The name of the model to use."),
});
export type ProjectAnalysisInput = z.infer<typeof ProjectAnalysisInputSchema>;

// Define the structured output schema for the analysis result.
const ProjectAnalysisOutputSchema = z.object({
  timeline: z.object({
    estimatedCompletionDate: z.string().describe('An estimated completion date for all tasks.'),
    overdueTasks: z.number().describe('The number of tasks that are currently overdue.'),
  }),
  workload: z.object({
    totalTasks: z.number().describe('The total number of active tasks.'),
    tasksPerCollaborator: z.record(z.number()).describe('A dictionary mapping collaborator names to the number of tasks assigned to them.'),
  }),
  risks: z.array(z.string()).describe('A list of potential risks identified from the project data (e.g., bottlenecks, resource conflicts).'),
  suggestions: z.array(z.string()).describe('A list of actionable suggestions to optimize the project (e.g., task reassignments, deadline adjustments).'),
});
export type ProjectAnalysisOutput = z.infer<typeof ProjectAnalysisOutputSchema>;

// Define the Genkit flow for project analysis.
const projectAnalysisFlow = ai.defineFlow(
  {
    name: 'projectAnalysisFlow',
    inputSchema: ProjectAnalysisInputSchema,
    outputSchema: ProjectAnalysisOutputSchema,
  },
  async (input) => {
    if (!input.apiKey) {
      throw new Error('An API key is required for project analysis.');
    }

    const plugins = input.provider === 'openai'
      ? [openAI({ apiKey: input.apiKey })]
      : [googleAI({ apiKey: input.apiKey })];

    const localAi = genkit({ plugins });

    const prompt = `You are an expert project analyst. Your task is to analyze the provided JSON data for a user's freelance projects and provide a structured analysis.
Analyze the user's tasks, clients, and collaborators to identify key insights.
Based on your analysis, provide a structured response that includes:
1.  **Timeline Analysis**: Calculate the estimated completion date and count the number of overdue tasks.
2.  **Workload Analysis**: Calculate the total number of tasks and break down the number of tasks assigned to each collaborator.
3.  **Risk Identification**: Identify potential risks such as project bottlenecks, resource conflicts, or tasks with tight deadlines.
4.  **Optimization Suggestions**: Provide actionable suggestions for improvement, such as reassigning tasks, adjusting deadlines, or focusing on specific clients.

Respond ONLY with a valid JSON object that conforms to the required output schema. Do not add any explanatory text.
The response should be in the user's selected language: ${input.language}.

Project Data:
Tasks: ${JSON.stringify(input.tasks)}
Clients: ${JSON.stringify(input.clients)}
Collaborators: ${JSON.stringify(input.collaborators)}
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
        output: { schema: ProjectAnalysisOutputSchema },
        config: generateConfig,
      });

      if (!output) {
        throw new Error("Failed to generate a valid analysis. The model returned an empty response.");
      }

      return output;
    } catch (e: any) {
      console.error("Error in projectAnalysisFlow:", e);
      // Re-throw the error to be handled by the client, allowing for more specific error messages.
      throw new Error(`Project analysis failed. Details: ${e.message}`);
    }
  }
);

// Expose the flow as a callable server function.
export async function analyzeProject(input: ProjectAnalysisInput): Promise<ProjectAnalysisOutput> {
  const result = await projectAnalysisFlow(input);
  if (!result) {
    throw new Error("An unexpected error occurred and the analysis flow did not return a response.");
  }
  return result;
}