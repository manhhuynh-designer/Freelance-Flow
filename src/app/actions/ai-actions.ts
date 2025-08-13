'use server';

import { chatWithAI, type ChatRequest } from '@/ai/simple-ai';
import type { AskAboutTasksInput, AskAboutTasksOutput } from '@/lib/ai-types';
import { z } from 'zod';

// --- Placeholders ---
export async function askAboutTasksAction(input: AskAboutTasksInput): Promise<AskAboutTasksOutput> { return { text: "...", action: null}; }
export async function suggestQuoteAction(input: any): Promise<any> { return null; }

// --- AI Writing Assistant Action ---

const WritingAssistantInputSchema = z.object({
  baseText: z.string().min(10, "Base text is too short."),
  prompt: z.string().optional(),
  action: z.enum(['write', 'edit', 'reply', 'summarize', 'translate']),
  tone: z.enum(['formal', 'casual', 'professional', 'friendly']),
  length: z.enum(['short', 'medium', 'long']),
  outputLanguage: z.enum(['en', 'vi']),
  apiKey: z.string().min(1),
  modelName: z.string().min(1),
});

type WritingAssistantInput = z.infer<typeof WritingAssistantInputSchema>;

function buildFinalPrompt(params: WritingAssistantInput): string {
    const { baseText, prompt, tone, length, outputLanguage, action } = params;
    const targetLanguage = outputLanguage === 'vi' ? 'Vietnamese' : 'English';

    let mainTask = `Your main task is to perform the action "${action}" on the "Base Content".`;
    if(prompt) mainTask += `\nFollow these specific instructions: "${prompt}"`;
    
    let finalPrompt = `${mainTask}\n\n--- Base Content ---\n${baseText}\n\n--- AI INSTRUCTIONS ---`;
    finalPrompt += `\n- Tone: ${tone}.`;
    finalPrompt += `\n- Length: ${length}.`;
    finalPrompt += `\n- Language: Respond in ${targetLanguage}.`;
    finalPrompt += `\n- OUTPUT FORMAT: You MUST respond with a single, valid JSON object. Do not add any text before or after it. The JSON object must have two keys: "summaryTitle" (a short, 5-7 word summary of the original user's request in ${targetLanguage}) and "mainContent" (the full text result, formatted in Markdown if appropriate).`;
    
    return finalPrompt;
}

export async function writingAssistantAction(input: WritingAssistantInput): Promise<{ success: boolean; result?: { mainContent: string; summaryTitle: string; }; error?: string }> {
  try {
    const validation = WritingAssistantInputSchema.safeParse(input);
    if (!validation.success) { return { success: false, error: "Invalid input." }; }
    
    const prompt = buildFinalPrompt(validation.data);
    const result = await chatWithAI({
      messages: [{ role: 'user', content: prompt, timestamp: new Date() }],
      modelName: validation.data.modelName, apiKey: validation.data.apiKey,
    });
    
    if (result.success) {
      try {
        // Find and parse the JSON object from the response string
        const jsonString = result.message.content.match(/\{[\s\S]*\}/)?.[0];
        if (!jsonString) throw new Error("No valid JSON object found in AI response.");
        const parsedResult = JSON.parse(jsonString);

        if (typeof parsedResult.mainContent === 'string' && typeof parsedResult.summaryTitle === 'string') {
            return { success: true, result: parsedResult };
        } else {
            throw new Error("JSON response is missing required keys ('mainContent', 'summaryTitle').");
        }
      } catch (e: any) {
        // If parsing fails, return the raw content as a fallback
        return { success: true, result: { mainContent: result.message.content, summaryTitle: "Untitled" } };
      }
    } else {
      return { success: false, error: result.error || 'AI error.' };
    }

  } catch (error: any) {
    return { success: false, error: error.message || 'Server error.' };
  }
}
