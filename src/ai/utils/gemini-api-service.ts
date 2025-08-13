/**
 * Gemini API Service with Automatic Model Fallback
 * Handles API calls to Gemini models with intelligent fallback to lower versions
 */

import { GeminiModel, ModelFallbackManager, GEMINI_MODELS } from './gemini-models';

interface APIError {
  code?: string;
  message: string;
  status?: number;
}

interface FallbackResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  modelUsed: GeminiModel;
  fallbackAttempts: number;
  fallbackHistory: Array<{
    model: GeminiModel;
    error: string;
    timestamp: Date;
  }>;
}

export class GeminiAPIService {
  private static readonly API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
  private static readonly RETRY_DELAYS = [1000, 2000, 3000]; // ms

  /**
   * Make API call with automatic model fallback
   */
  static async callWithFallback<T>(
    apiKey: string,
    preferredModel: GeminiModel,
    prompt: string,
    options: {
      temperature?: number;
      maxOutputTokens?: number;
      language?: 'en' | 'vi';
    } = {}
  ): Promise<FallbackResult<T>> {
    const fallbackChain = ModelFallbackManager.getFallbackChain(preferredModel);
    const fallbackHistory: FallbackResult<T>['fallbackHistory'] = [];
    
    console.log(`🚀 Starting API call with fallback chain:`, {
      preferred: preferredModel,
      chain: fallbackChain.map(m => GEMINI_MODELS[m].displayName),
      timestamp: new Date().toISOString()
    });

    for (let i = 0; i < fallbackChain.length; i++) {
      const currentModel = fallbackChain[i];
      const modelConfig = GEMINI_MODELS[currentModel];
      
      try {
        console.log(`🤖 Attempting API call with ${modelConfig.displayName}...`);
        
        const result = await this.makeAPICall<T>(apiKey, currentModel, prompt, options);
        
        // Success!
        console.log(`✅ API call successful with ${modelConfig.displayName}`);
        
        if (i > 0) {
          // We had to fallback
          const language = options.language || 'en';
          const fallbackMessage = language === 'vi' 
            ? `Đã chuyển từ ${GEMINI_MODELS[preferredModel].displayName} sang ${modelConfig.displayName} do lỗi API`
            : `Switched from ${GEMINI_MODELS[preferredModel].displayName} to ${modelConfig.displayName} due to API error`;
          
          this.showFallbackNotification(fallbackMessage, language);
        }
        
        return {
          success: true,
          data: result,
          modelUsed: currentModel,
          fallbackAttempts: i,
          fallbackHistory
        };
        
      } catch (error) {
        const errorMsg = this.parseAPIError(error);
        fallbackHistory.push({
          model: currentModel,
          error: errorMsg,
          timestamp: new Date()
        });
        
        console.warn(`❌ ${modelConfig.displayName} failed:`, errorMsg);
        
        // If this is the last model in chain, return error
        if (i === fallbackChain.length - 1) {
          const language = options.language || 'en';
          const finalError = language === 'vi'
            ? `Tất cả mô hình AI đều thất bại. Lỗi cuối: ${errorMsg}`
            : `All AI models failed. Final error: ${errorMsg}`;
            
          return {
            success: false,
            error: finalError,
            modelUsed: currentModel,
            fallbackAttempts: i,
            fallbackHistory
          };
        }
        
        // Continue to next model in fallback chain
        const nextModel = fallbackChain[i + 1];
        console.log(`🔄 Falling back to ${GEMINI_MODELS[nextModel].displayName}...`);
      }
    }

    // This should never be reached
    return {
      success: false,
      error: 'Unexpected error in fallback chain',
      modelUsed: preferredModel,
      fallbackAttempts: fallbackChain.length,
      fallbackHistory
    };
  }

  /**
   * Make actual API call to Gemini
   */
  private static async makeAPICall<T>(
    apiKey: string,
    model: GeminiModel,
    prompt: string,
    options: {
      temperature?: number;
      maxOutputTokens?: number;
    }
  ): Promise<T> {
    const modelConfig = GEMINI_MODELS[model];
    const url = `${this.API_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: Math.min(
          options.maxOutputTokens || 1024,
          modelConfig.capabilities.maxTokens
        )
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API Error ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Gemini API Error: ${data.error.message}`);
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid API response format');
    }

    // Parse the response based on expected type
    const text = data.candidates[0].content.parts[0].text;
    
    try {
      return JSON.parse(text) as T;
    } catch {
      // If not JSON, return as string
      return text as unknown as T;
    }
  }

  /**
   * Parse API error for user-friendly messages
   */
  private static parseAPIError(error: any): string {
    if (error.message) {
      // Common Gemini API errors
      if (error.message.includes('API_KEY_INVALID')) {
        return 'Invalid API key';
      }
      if (error.message.includes('QUOTA_EXCEEDED')) {
        return 'API quota exceeded';
      }
      if (error.message.includes('MODEL_NOT_FOUND')) {
        return 'Model not available';
      }
      if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
        return 'Rate limit exceeded';
      }
      if (error.message.includes('SAFETY')) {
        return 'Content blocked by safety filters';
      }
      return error.message;
    }
    return 'Unknown API error';
  }

  /**
   * Show fallback notification to user
   */
  private static showFallbackNotification(message: string, language: 'en' | 'vi'): void {
    // Create a toast notification
    if (typeof window !== 'undefined') {
      console.log(`🔄 Model Fallback: ${message}`);
      
      // You can integrate with your toast system here
      // For now, we'll use console.log with a distinctive format
      const timestamp = new Date().toLocaleTimeString();
      console.warn(`[${timestamp}] 🔄 AI Model Fallback: ${message}`);
      
      // Optional: Show browser notification if permissions granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('AI Model Fallback', {
          body: message,
          icon: '/icons/icon-192x192.png'
        });
      }
    }
  }

  /**
   * Test model availability
   */
  static async testModel(apiKey: string, model: GeminiModel): Promise<boolean> {
    try {
      await this.makeAPICall(apiKey, model, 'Test message', {
        temperature: 0.1,
        maxOutputTokens: 10
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get model status summary
   */
  static async getModelStatus(apiKey: string): Promise<Record<GeminiModel, boolean>> {
    const status: Record<GeminiModel, boolean> = {} as any;
    
    const testPromises = Object.values(GeminiModel).map(async (model) => {
      status[model] = await this.testModel(apiKey, model);
    });
    
    await Promise.all(testPromises);
    return status;
  }
}
