import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatRequest {
  messages: ChatMessage[];
  apiKey: string;
  modelName: string;
}

export interface ChatResponse {
  message: ChatMessage;
  success: boolean;
  error?: string;
}

export async function chatWithAI(request: ChatRequest): Promise<ChatResponse> {
  try {
    if (!request.apiKey) {
      throw new Error('Google API key is required');
    }

    console.log('🔍 chatWithAI called with:', {
      modelName: request.modelName,
      messagesCount: request.messages.length,
      apiKeyLength: request.apiKey.length,
      apiKeyStart: request.apiKey.substring(0, 10) + '...'
    });

    const genAI = new GoogleGenerativeAI(request.apiKey);
    const model = genAI.getGenerativeModel({ model: request.modelName });

    // Convert chat history to Gemini format
    const chatHistory = request.messages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: chatHistory as any,
    });

    const lastMessage = request.messages[request.messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = await result.response;
    const text = response.text();

    return {
      message: {
        role: 'assistant',
        content: text,
        timestamp: new Date(),
      },
      success: true,
    };
  } catch (error: any) {
    console.error('Chat error:', error);
    return {
      message: {
        role: 'assistant',
        content: 'Xin lỗi, đã có lỗi xảy ra khi xử lý tin nhắn của bạn.',
        timestamp: new Date(),
      },
      success: false,
      error: error.message,
    };
  }
}
