'use server';

import { chatWithAI, type ChatRequest, type ChatResponse } from '@/ai/simple-ai';
import type { AskAboutTasksInput, AskAboutTasksOutput } from '@/lib/ai-types';

export async function askAboutTasksAction(input: AskAboutTasksInput): Promise<AskAboutTasksOutput> {
  try {
    console.log('🔄 askAboutTasksAction called with input:', {
      userInput: input.userInput,
      modelName: input.modelName,
      language: input.language,
      tasksCount: input.tasks?.length || 0,
      clientsCount: input.clients?.length || 0,
      collaboratorsCount: input.collaborators?.length || 0
    });
    
    if (!input.userInput?.trim()) {
      return {
        text: input.language === 'vi' ? 'Vui lòng nhập tin nhắn.' : 'Please provide a message.',
        action: null
      };
    }

    // Tạo context từ dữ liệu người dùng
    const contextData = {
      tasks: input.tasks || [],
      clients: input.clients || [],
      collaborators: input.collaborators || [],
      quoteTemplates: input.quoteTemplates || []
    };

    // Tạo prompt với context
    const contextPrompt = `You are a helpful AI assistant for a freelance project management app. You have access to the user's current data:

TASKS: ${JSON.stringify(contextData.tasks)}
CLIENTS: ${JSON.stringify(contextData.clients)}  
COLLABORATORS: ${JSON.stringify(contextData.collaborators)}
QUOTE TEMPLATES: ${JSON.stringify(contextData.quoteTemplates)}

User question: ${input.userInput}

Please provide a helpful response based on the user's data. If they ask about tasks, clients, or projects, use the data provided above. Respond in ${input.language === 'vi' ? 'Vietnamese' : 'English'}.`;

    const chatRequest: ChatRequest = {
      messages: [{
        role: 'user',
        content: contextPrompt,
        timestamp: new Date()
      }],
      modelName: input.modelName || 'gemini-1.5-flash',
      apiKey: input.apiKey || ''
    };
    
    const result = await chatWithAI(chatRequest);
    
    return {
      text: result.message.content,
      action: null // No actions for simple chat
    };
  } catch (error: any) {
    console.error('❌ askAboutTasksAction error:', error.message || error);
    
    // Return a safe error response
    return {
      text: input.language === 'vi' 
        ? `Xin lỗi, đã xảy ra lỗi: ${error.message || 'Lỗi không xác định'}. Vui lòng kiểm tra API key và thử lại.`
        : `Sorry, I encountered an error: ${error.message || 'Unknown error'}. Please check your API key and try again.`,
      action: null
    };
  }
}

// Temporary stub for suggestQuoteAction to avoid import errors
export async function suggestQuoteAction(input: any): Promise<any> {
  console.log('🔄 suggestQuoteAction called (stub implementation)');
  return null;
}
