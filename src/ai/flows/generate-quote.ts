'use server';

/**
 * @fileOverview A flow for generating a professional quote based on a list of tasks.
 *
 * - generateQuote - A function that creates a structured quote from tasks and client info.
 * - GenerateQuoteInput - The input type for the generateQuote function.
 * - GenerateQuoteOutput - The output type for the generateQuote function.
 */

import { ai, genkit, googleAI, openAI } from '@/ai/genkit';
import { z } from 'genkit';

// Define schemas for individual data types to be used in the main input.
const TaskSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  estimatedHours: z.number().optional(),
  complexity: z.enum(['low', 'medium', 'high']).optional(),
});

const ClientSchema = z.object({
  name: z.string(),
  company: z.string().optional(),
});

const PricingPreferencesSchema = z.object({
  hourlyRate: z.number().optional().describe('The user-defined hourly rate in their local currency.'),
  currency: z.string().default('VND').describe('The currency for the quote (e.g., VND, USD).'),
});

// Define the main input schema for the flow.
const GenerateQuoteInputSchema = z.object({
  tasks: z.array(TaskSchema).describe('A list of tasks to be included in the quote.'),
  client: ClientSchema.describe('The client for whom the quote is being generated.'),
  pricingPreferences: PricingPreferencesSchema.describe('The user\'s pricing preferences.'),
  language: z.enum(['en', 'vi']).describe("The user's selected language for the response."),
  provider: z.enum(['google', 'openai']).describe('The AI provider to use.'),
  apiKey: z.string().optional().describe('The API key for the selected provider.'),
  modelName: z.string().describe("The name of the model to use."),
});
export type GenerateQuoteInput = z.infer<typeof GenerateQuoteInputSchema>;

// Define the structured output schema for the generated quote.
const QuoteItemSchema = z.object({
  description: z.string().describe('A description of the line item.'),
  quantity: z.number().describe('The quantity (e.g., hours, units).'),
  unitPrice: z.number().describe('The price per unit.'),
  total: z.number().describe('The total price for this line item (quantity * unitPrice).'),
});

const GenerateQuoteOutputSchema = z.object({
  quoteTitle: z.string().describe('A professional title for the quote.'),
  clientName: z.string().describe('The name of the client.'),
  items: z.array(QuoteItemSchema).describe('A list of line items for the quote.'),
  totalPrice: z.number().describe('The total price for the entire quote.'),
  currency: z.string().describe('The currency of the quote.'),
  notes: z.string().optional().describe('Any additional notes or terms and conditions.'),
});
export type GenerateQuoteOutput = z.infer<typeof GenerateQuoteOutputSchema>;


// Define the Genkit flow for quote generation.
const generateQuoteFlow = ai.defineFlow(
  {
    name: 'generateQuoteFlow',
    inputSchema: GenerateQuoteInputSchema,
    outputSchema: GenerateQuoteOutputSchema,
  },
  async (input) => {
    if (!input.apiKey) {
      throw new Error('An API key is required for quote generation.');
    }

    const plugins = input.provider === 'openai'
      ? [openAI({ apiKey: input.apiKey })]
      : [googleAI({ apiKey: input.apiKey })];

    const localAi = genkit({ plugins });

    const prompt = `You are an expert freelance consultant who creates professional price quotes.
Your task is to generate a structured quote in JSON format based on the provided list of tasks, client information, and pricing preferences.

Instructions:
1.  Create a professional title for the quote.
2.  For each task in the input, create a detailed line item. If \`estimatedHours\` and \`hourlyRate\` are provided, use them to calculate the price. Otherwise, estimate a fair price based on the task's description and complexity.
3.  Calculate the total price for the entire quote.
4.  Include the client's name and the specified currency.
5.  Add a brief, professional note at the end, such as payment terms or a thank you message.

Respond ONLY with a valid JSON object that conforms to the required output schema.
The response should be in the user's selected language: ${input.language}.

Quote Details:
Tasks: ${JSON.stringify(input.tasks)}
Client: ${JSON.stringify(input.client)}
Pricing Preferences: ${JSON.stringify(input.pricingPreferences)}
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
        output: { schema: GenerateQuoteOutputSchema },
        config: generateConfig,
      });

      if (!output) {
        throw new Error("Failed to generate a valid quote. The model returned an empty response.");
      }

      return output;
    } catch (e: any)      {
      console.error("Error in generateQuoteFlow:", e);
      throw new Error(`Quote generation failed. Details: ${e.message}`);
    }
  }
);

// Expose the flow as a callable server function.
export async function generateQuote(input: GenerateQuoteInput): Promise<GenerateQuoteOutput> {
  const result = await generateQuoteFlow(input);
  if (!result) {
    throw new Error("An unexpected error occurred and the quote generation flow did not return a response.");
  }
  return result;
}