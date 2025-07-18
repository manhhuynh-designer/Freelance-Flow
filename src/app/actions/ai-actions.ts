'use server';

import { askAboutTasks, type AskAboutTasksInput, type AskAboutTasksOutput } from '@/ai/flows/ask-about-tasks';
import { suggestQuote, type SuggestQuoteInput, type SuggestQuoteOutput } from '@/ai/flows/suggest-quote';

export async function askAboutTasksAction(input: AskAboutTasksInput): Promise<AskAboutTasksOutput> {
  try {
    console.log('🔄 askAboutTasksAction called with input:', {
      userInput: input.userInput,
      provider: input.provider,
      modelName: input.modelName,
      language: input.language
    });
    
    if (!input.userInput?.trim()) {
      return {
        text: "Please provide a message.",
        action: null
      };
    }
    
    const result = await askAboutTasks(input);
    
    console.log('✅ askAboutTasksAction result:', {
      text: result.text.substring(0, 100) + '...',
      action: result.action
    });
    
    return result;
  } catch (error: any) {
    console.error('❌ askAboutTasksAction error:', error.message || error);
    
    // Return a safe error response
    return {
      text: `Sorry, I encountered an error: ${error.message || 'Unknown error'}. Please check your API key and try again.`,
      action: null
    };
  }
}

export async function suggestQuoteAction(input: SuggestQuoteInput): Promise<SuggestQuoteOutput | null> {
  try {
    console.log('🔄 suggestQuoteAction called');
    
    if (!input.apiKey) {
      throw new Error('API key is required');
    }
    
    const result = await suggestQuote(input);
    console.log('✅ suggestQuoteAction result:', result ? 'Success' : 'No result');
    return result;
  } catch (error: any) {
    console.error('❌ suggestQuoteAction error:', error.message || error);
    return null;
  }
}
