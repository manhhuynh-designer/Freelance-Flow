
'use server';

/**
 * @fileOverview AI-powered quote suggestion flow.
 *
 * - suggestQuote - A function that suggests a price quote based on the task description and category.
 * - SuggestQuoteInput - The input type for the suggestQuote function.
 * - SuggestQuoteOutput - The return type for the suggestQuote function.
 */

import {ai, genkit, googleAI, openAI} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestQuoteInputSchema = z.object({
  taskDescription: z.string().describe('The description of the task.'),
  taskCategory: z.string().describe('The category of the task (e.g., 2D, 3D, design, animation).'),
  provider: z.enum(['google', 'openai']).describe('The AI provider to use.'),
  apiKey: z.string().optional().describe('The API key for the selected provider.'),
  modelName: z.string().describe("The name of the model to use."),
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
  return suggestQuoteFlow(input);
}

const suggestQuoteFlow = ai.defineFlow(
  {
    name: 'suggestQuoteFlow',
    inputSchema: SuggestQuoteInputSchema,
    outputSchema: SuggestQuoteOutputSchema.nullable(),
  },
  async (input) => {
    if (!input.apiKey) {
      throw new Error('An API key is required to suggest a quote.');
    }
    
    const plugins = input.provider === 'openai' 
      ? [openAI({ apiKey: input.apiKey })] 
      : [googleAI({ apiKey: input.apiKey })];

    const localAi = genkit({ plugins });

    const prompt = `You are an expert pricing consultant for freelance creative work. Based on the task description and category provided, break down the project into a detailed list of billable line items.

For each line item, provide a clear description of the work, the quantity, and a suggested unit price in Vietnamese Dong (VND). Ensure the breakdown is logical and covers the likely steps involved in the project.

Task Description: ${input.taskDescription}
Task Category: ${input.taskCategory}

Return the breakdown as a structured list of quote items.`;

    const modelToUse = input.provider === 'openai' 
        ? `openai/${input.modelName}` 
        : googleAI.model(input.modelName);

    try {
      const generateConfig: any = {};
      if (input.provider === 'openai') {
          generateConfig.response_format = { type: 'json_object' };
      }

      const { output } = await localAi.generate({
        model: modelToUse,
        prompt: prompt,
        output: { schema: SuggestQuoteOutputSchema },
        config: generateConfig,
      });
      
      return output;
    } catch (e: any) {
      console.error("Error in suggestQuoteFlow:", e);
      throw e; // Re-throw the error to be handled by the client
    }
  }
);
