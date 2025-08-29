import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiModel, ModelFallbackManager } from '@/ai/utils/gemini-models';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatRequest {
  messages: ChatMessage[];
  apiKey: string;
  modelName: string; // This is the user's preferred model, used as starting point for fallback
}

export interface ChatResponse {
  message: ChatMessage;
  success: boolean;
  error?: string;
}

export async function chatWithAI(request: ChatRequest): Promise<ChatResponse> {
  if (!request.apiKey) {
    return {
      message: { role: 'assistant', content: 'Lỗi: Không tìm thấy khóa API Google. Vui lòng kiểm tra cài đặt.', timestamp: new Date() },
      success: false,
      error: 'Google API key is required'
    };
  }

  // Determine fallback chain for the requested model
  const primaryModel = ModelFallbackManager.getPreferredModel(request.modelName);
  const fallbackChain = ModelFallbackManager.getFallbackChain(primaryModel);

  console.log(`🔍 chatWithAI called. Primary model: ${primaryModel}. Fallback chain: ${fallbackChain.join(', ')}`);

  for (const modelToTry of fallbackChain) {
    try {
      console.log(`🤖 AI: Attempting with model: ${modelToTry}`);
      
      const genAI = new GoogleGenerativeAI(request.apiKey);
      const model = genAI.getGenerativeModel({ model: modelToTry });

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

      console.log(`✅ AI response received successfully from model: ${modelToTry}`);
      return {
        message: {
          role: 'assistant',
          content: text,
          timestamp: new Date(),
        },
        success: true,
      };
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error(`❌ Chat error with model ${modelToTry}: ${errorMessage}`);

      const isQuotaExceededError = errorMessage.includes('Quota exceeded') || errorMessage.includes('429 Too Many Requests');
      const isModelOverloadError = errorMessage.includes('503 Service Unavailable') || errorMessage.includes('The model is overloaded') || errorMessage.includes('rate limit exceeded') || errorMessage.includes('An internal error has occurred'); // ADDED check for 500 internal error

      if (isQuotaExceededError) {
        // Immediately return quota error, no fallback attempt
        console.error('❌ AI Quota Exceeded. Please check your Google Cloud / Gemini API billing details.');
        return {
          message: {
            role: 'assistant',
            content: 'Xin lỗi, đã vượt quá hạn ngạch AI của bạn. Vui lòng kiểm tra chi tiết thanh toán hoặc khóa API Google của bạn.',
            timestamp: new Date(),
          },
          success: false,
          error: `Quota Exceeded: ${errorMessage}`,
        };
      }

      if (!isModelOverloadError && modelToTry === fallbackChain[fallbackChain.length - 1]) {
        // If it's not a model-related failure AND it's the last model, rethrow or return as final error
        return {
          message: {
            role: 'assistant',
            content: `Xin lỗi, đã có lỗi xảy ra với AI: ${errorMessage}`,
            timestamp: new Date(),
          },
          success: false,
          error: errorMessage,
        };
      }
      // If it's a model overload/unavailable error, or not the last model, try next fallback (loop continues)
    }
  }

  // Fallback if all models in chain failed, but the errors weren't "model failure" for the last model
  return {
    message: {
      role: 'assistant',
      content: 'Xin lỗi, không có mô hình AI nào có thể phản hồi tin nhắn của bạn. Vui lòng thử lại sau.',
      timestamp: new Date(),
    },
    success: false,
    error: 'All AI models in fallback chain failed or encountered non-retryable errors.'
  };
}
