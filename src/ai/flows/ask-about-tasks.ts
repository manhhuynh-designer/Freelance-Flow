'use server';

/**
 * @fileOverview A flow for answering questions about the user's tasks and projects.
 *
 * - askAboutTasks - A function that answers questions using task context
 * - AskAboutTasksInput - The input type for the askAboutTasks function.
 * - AskAboutTasksOutput - The output type for the askAboutTasks function.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Define the input schema
const AskAboutTasksInputSchema = z.object({
  question: z.string().describe('The user\'s question about their tasks or projects.'),
  tasks: z.array(z.any()).describe("A JSON array of the user's tasks for context."),
  clients: z.array(z.any()).optional().describe("A JSON array of the user's clients for context."),
  collaborators: z.array(z.any()).optional().describe("A JSON array of the user's collaborators for context."),
  language: z.enum(['en', 'vi']).describe("The user's selected language for the response."),
  apiKey: z.string().describe('The Google API key for Gemini.'),
  modelName: z.string().describe("The name of the Gemini model to use."),
});
export type AskAboutTasksInput = z.infer<typeof AskAboutTasksInputSchema>;

// Define the output schema
const AskAboutTasksOutputSchema = z.object({
  answer: z.string().describe('The AI\'s answer to the user\'s question.'),
  relevantTasks: z.array(z.string()).optional().describe('IDs or names of tasks relevant to the answer.'),
  suggestions: z.array(z.string()).optional().describe('Additional suggestions based on the analysis.'),
});
export type AskAboutTasksOutput = z.infer<typeof AskAboutTasksOutputSchema>;

export async function askAboutTasks(input: AskAboutTasksInput): Promise<AskAboutTasksOutput | null> {
  try {
    if (!input.apiKey) {
      throw new Error('Google API key is required to ask about tasks.');
    }

    const genAI = new GoogleGenerativeAI(input.apiKey);
    const model = genAI.getGenerativeModel({ model: input.modelName });

    const contextData = {
      tasks: input.tasks,
      ...(input.clients && { clients: input.clients }),
      ...(input.collaborators && { collaborators: input.collaborators }),
    };

    const prompt = `You are an expert project management assistant. Based on the provided context data about the user's tasks, clients, and collaborators, answer their question accurately and helpfully.

User Question: "${input.question}"

Context Data:
${JSON.stringify(contextData, null, 2)}

Please provide a comprehensive answer that:
1. Directly addresses the user's question
2. References specific tasks, clients, or collaborators when relevant
3. Offers actionable insights or suggestions where appropriate
4. Uses the context data to provide personalized advice

If you identify specific tasks that are relevant to your answer, include their names or IDs in the relevantTasks field.
If you have additional suggestions based on the analysis, include them in the suggestions field.

Respond ONLY with a valid JSON object that conforms to the required output schema. Do not add any explanatory text.
The response should be in the user's selected language: ${input.language}.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    try {
      const jsonResponse = JSON.parse(text);
      return AskAboutTasksOutputSchema.parse(jsonResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return null;
    }
  } catch (error: any) {
    console.error("Error in askAboutTasks:", error);
    throw error;
  }
}
