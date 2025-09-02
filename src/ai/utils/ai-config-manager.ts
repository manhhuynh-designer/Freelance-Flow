/**
 * AI Configuration and API Key Management
 * Handles API key retrieval from user settings and environment fallbacks
 */

import type { AppSettings } from '@/lib/types';
import { GeminiModel, ModelFallbackManager } from './gemini-models';
import { browserLocal } from '@/lib/browser';

export interface AIConfig {
  geminiApiKey: string | null;
  modelName: GeminiModel;
  provider: 'google' | 'openai';
  isConfigured: boolean;
}

export class AIConfigManager {
  private static readonly DEFAULT_GOOGLE_MODEL = GeminiModel.GEMINI_2_5_FLASH;
  private static readonly DEFAULT_PROVIDER = 'google';

  /**
   * Get AI configuration from app settings
   */
  static getAIConfig(appSettings?: AppSettings): AIConfig {
    const geminiApiKey = this.getGeminiApiKey(appSettings);
    const modelName = this.getPreferredModel(appSettings?.googleModel);
    const provider = (appSettings?.preferredModelProvider as 'google' | 'openai') || this.DEFAULT_PROVIDER;

    return {
      geminiApiKey,
      modelName,
      provider,
      isConfigured: !!geminiApiKey
    };
  }

  /**
   * Get preferred Gemini model from settings with fallback
   */
  static getPreferredModel(userPreference?: string): GeminiModel {
    return ModelFallbackManager.getPreferredModel(userPreference);
  }

  /**
   * Get Gemini API key from user settings with fallbacks
   */
  static getGeminiApiKey(appSettings?: AppSettings): string | null {
    // Priority 1: User settings
    if (appSettings?.googleApiKey) {
      return appSettings.googleApiKey;
    }

    // Priority 2: Local storage (legacy support)
    try {
      const localStorageKey = browserLocal.getItem('gemini-api-key');
      if (localStorageKey) return localStorageKey;
    } catch (e) {
      // ignore
    }

    // Priority 3: Environment variables (development/testing)
    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      return process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    }

    return null;
  }

  /**
   * Validate API key format
   */
  static validateGeminiApiKey(apiKey: string): boolean {
    return !!(
      apiKey && 
      apiKey.length > 10 && 
      (apiKey.startsWith('AIzaSy') || apiKey.startsWith('AIza'))
    );
  }

  /**
   * Get error message for missing API key
   */
  static getNoApiKeyMessage(language: 'en' | 'vi' = 'en'): string {
    return language === 'vi' 
      ? 'Vui lòng cấu hình khóa API Google Gemini trong cài đặt để sử dụng tính năng AI.'
      : 'Please configure your Google Gemini API key in settings to use AI features.';
  }

  /**
   * Check if AI features are available
   */
  static isAIAvailable(appSettings?: AppSettings): boolean {
    const config = this.getAIConfig(appSettings);
    return config.isConfigured && this.validateGeminiApiKey(config.geminiApiKey!);
  }

  /**
   * Get AI status for logging
   */
  static getAIStatus(appSettings?: AppSettings): {
    status: 'configured' | 'missing_key' | 'invalid_key';
    provider: string;
    model: string;
  } {
    const config = this.getAIConfig(appSettings);
    
    if (!config.geminiApiKey) {
      return { status: 'missing_key', provider: config.provider, model: config.modelName };
    }
    
    if (!this.validateGeminiApiKey(config.geminiApiKey)) {
      return { status: 'invalid_key', provider: config.provider, model: config.modelName };
    }

    return { status: 'configured', provider: config.provider, model: config.modelName };
  }

  /**
   * Get rate limiting info for API calls
   */
  static getRateLimitInfo(): {
    maxRequestsPerMinute: number;
    batchSize: number;
    delayBetweenRequests: number;
  } {
    return {
      maxRequestsPerMinute: 15, // Conservative limit for Gemini free tier
      batchSize: 3,
      delayBetweenRequests: 1000 // 1 second between requests
    };
  }

  /**
   * Log AI configuration status (for debugging)
   */
  static logAIStatus(appSettings?: AppSettings): void {
    const status = this.getAIStatus(appSettings);
    const config = this.getAIConfig(appSettings);
    
    console.log('🤖 AI Configuration Status:', {
      ...status,
      keyConfigured: !!config.geminiApiKey,
      keyValid: config.geminiApiKey ? this.validateGeminiApiKey(config.geminiApiKey) : false,
      timestamp: new Date().toISOString()
    });
  }
}
