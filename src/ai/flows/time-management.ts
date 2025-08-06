'use server';

/**
 * @fileOverview A flow for providing time management suggestions based on user's tasks and schedule.
 *
 * - suggestTimeManagement - A function that provides time management insights
 * - TimeManagementInput - The input type for the time management function.
 * - TimeManagementOutput - The output type for the time management function.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Define the input schema
const TimeManagementInputSchema = z.object({
  tasks: z.array(z.any()).describe("A JSON array of the user's active tasks."),
  workingHours: z.object({
    startTime: z.string().describe('Start time in HH:MM format'),
    endTime: z.string().describe('End time in HH:MM format'),
    workingDays: z.array(z.string()).describe('Array of working days'),
  }).optional().describe('User\'s preferred working hours and days'),
  currentDate: z.string().describe('Current date in ISO format'),
  language: z.enum(['en', 'vi']).describe("The user's selected language for the response."),
  apiKey: z.string().describe('The Google API key for Gemini.'),
  modelName: z.string().describe("The name of the Gemini model to use."),
});
export type TimeManagementInput = z.infer<typeof TimeManagementInputSchema>;

// Define the output schema
const TimeManagementOutputSchema = z.object({
  priorityTasks: z.array(z.object({
    taskName: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    reason: z.string(),
  })).describe('List of tasks prioritized by urgency and importance'),
  timeBlocks: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
    taskName: z.string(),
    description: z.string(),
  })).optional().describe('Suggested time blocks for focused work'),
  suggestions: z.array(z.string()).describe('Time management tips and suggestions'),
  workloadAnalysis: z.object({
    overloaded: z.boolean(),
    availableHours: z.number().optional(),
    recommendedAdjustments: z.array(z.string()).optional(),
  }).describe('Analysis of current workload'),
});
export type TimeManagementOutput = z.infer<typeof TimeManagementOutputSchema>;

export async function suggestTimeManagement(input: TimeManagementInput): Promise<TimeManagementOutput | null> {
  try {
    if (!input.apiKey) {
      throw new Error('Google API key is required for time management suggestions.');
    }

    const genAI = new GoogleGenerativeAI(input.apiKey);
    const model = genAI.getGenerativeModel({ model: input.modelName });

    const prompt = `You are an expert time management consultant. Analyze the user's tasks and provide structured time management recommendations.

Based on the provided task data, working hours, and current date, help the user:
1. Prioritize tasks by urgency and importance
2. Suggest optimal time blocks for focused work (if working hours provided)
3. Identify workload issues and provide solutions
4. Offer practical time management tips

Current Date: ${input.currentDate}
Working Hours: ${input.workingHours ? JSON.stringify(input.workingHours) : 'Not specified'}

Tasks:
${JSON.stringify(input.tasks, null, 2)}

Consider:
- Task deadlines and urgency
- Estimated time requirements
- Dependencies between tasks
- Work-life balance
- Productivity patterns

Respond ONLY with a valid JSON object that conforms to the required output schema. Do not add any explanatory text.
The response should be in the user's selected language: ${input.language}.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    try {
      const jsonResponse = JSON.parse(text);
      return TimeManagementOutputSchema.parse(jsonResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return null;
    }
  } catch (error: any) {
    console.error("Error in suggestTimeManagement:", error);
    throw error;
  }
}
