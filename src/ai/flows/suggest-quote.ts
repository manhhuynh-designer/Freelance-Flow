
'use server';

/**
 * @fileOverview AI-powered quote suggestion flow.
 *
 * - suggestQuote - A function that suggests a price quote based on the task description and category.
 * - SuggestQuoteInput - The input type for the suggestQuote function.
 * - SuggestQuoteOutput - The return type for the suggestQuote function.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const SuggestQuoteInputSchema = z.object({
  taskDescription: z.string().describe('The description of the task.'),
  taskCategory: z.string().describe('The category of the task (e.g., 2D, 3D, design, animation).'),
  apiKey: z.string().describe('The Google AI API key.'),
  modelName: z.string().default('gemini-1.5-flash').describe("The name of the Gemini model to use."),
});
export type SuggestQuoteInput = z.infer<typeof SuggestQuoteInputSchema>;

const SuggestedItemSchema = z.object({
  description: z.string().describe('The description of the work item.'),
  quantity: z.coerce.number().describe('The quantity for this item.'),
  unitPrice: z.coerce.number().describe('The price for a single unit of this item in VND.'),
});

const SuggestQuoteOutputSchema = z.object({
  suggestedItems: z.array(SuggestedItemSchema).describe('A list of suggested line items for the quote.'),
});
export type SuggestQuoteOutput = z.infer<typeof SuggestQuoteOutputSchema>;

export async function suggestQuote(input: SuggestQuoteInput): Promise<SuggestQuoteOutput | null> {
  try {
    if (!input.apiKey) {
      throw new Error('An API key is required to suggest a quote.');
    }

    const genAI = new GoogleGenerativeAI(input.apiKey);
    const model = genAI.getGenerativeModel({ model: input.modelName });

    const prompt = `You are an expert pricing consultant for freelance creative work. Based on the task description and category provided, break down the project into a detailed list of billable line items.

For each line item, provide a clear description of the work, the quantity, and a suggested unit price in Vietnamese Dong (VND). Ensure the breakdown is logical and covers the likely steps involved in the project.

Task Description: ${input.taskDescription}
Task Category: ${input.taskCategory}

Return the breakdown as a structured JSON response with the following format:
{
  "suggestedItems": [
    {
      "description": "Work item description",
      "quantity": 1,
      "unitPrice": 500000
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    try {
      const jsonResponse = JSON.parse(text);
      return SuggestQuoteOutputSchema.parse(jsonResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return null;
    }
  } catch (error: any) {
    console.error("Error in suggestQuote:", error);
    throw error;
  }
}
