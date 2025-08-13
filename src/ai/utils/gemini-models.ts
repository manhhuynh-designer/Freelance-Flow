/**
 * Gemini Model Configuration and Fallback System
 * Supports Gemini 2.5 Pro, 2.5 Flash, 2.5 Flash Lite with automatic fallback to 1.5 models
 */

export enum GeminiModel {
  // Gemini 2.5 Models (Latest)
  GEMINI_2_5_PRO = 'gemini-2.5-pro',
  GEMINI_2_5_FLASH = 'gemini-2.5-flash',
  GEMINI_2_5_FLASH_LITE = 'gemini-2.5-flash-lite',
  
  // Gemini 1.5 Models (Fallback)
  GEMINI_1_5_PRO = 'gemini-1.5-pro',
  GEMINI_1_5_FLASH = 'gemini-1.5-flash',
  GEMINI_1_5_FLASH_8B = 'gemini-1.5-flash-8b'
}

export interface ModelConfig {
  name: GeminiModel;
  displayName: string;
  category: '2.5' | '1.5';
  capabilities: {
    maxTokens: number;
    inputCost: number; // per 1M tokens
    outputCost: number; // per 1M tokens
    rateLimit: number; // requests per minute
  };
  fallbackModel?: GeminiModel;
}

export const GEMINI_MODELS: Record<GeminiModel, ModelConfig> = {
  [GeminiModel.GEMINI_2_5_PRO]: {
    name: GeminiModel.GEMINI_2_5_PRO,
    displayName: 'Gemini 2.5 Pro',
    category: '2.5',
    capabilities: {
      maxTokens: 8192,
      inputCost: 1.25,
      outputCost: 2.50,
      rateLimit: 10
    },
    fallbackModel: GeminiModel.GEMINI_1_5_PRO
  },
  
  [GeminiModel.GEMINI_2_5_FLASH]: {
    name: GeminiModel.GEMINI_2_5_FLASH,
    displayName: 'Gemini 2.5 Flash',
    category: '2.5',
    capabilities: {
      maxTokens: 8192,
      inputCost: 0.075,
      outputCost: 0.30,
      rateLimit: 15
    },
    fallbackModel: GeminiModel.GEMINI_1_5_FLASH
  },
  
  [GeminiModel.GEMINI_2_5_FLASH_LITE]: {
    name: GeminiModel.GEMINI_2_5_FLASH_LITE,
    displayName: 'Gemini 2.5 Flash Lite',
    category: '2.5',
    capabilities: {
      maxTokens: 4096,
      inputCost: 0.0375,
      outputCost: 0.15,
      rateLimit: 20
    },
    fallbackModel: GeminiModel.GEMINI_1_5_FLASH_8B
  },
  
  [GeminiModel.GEMINI_1_5_PRO]: {
    name: GeminiModel.GEMINI_1_5_PRO,
    displayName: 'Gemini 1.5 Pro',
    category: '1.5',
    capabilities: {
      maxTokens: 8192,
      inputCost: 1.25,
      outputCost: 5.00,
      rateLimit: 10
    }
  },
  
  [GeminiModel.GEMINI_1_5_FLASH]: {
    name: GeminiModel.GEMINI_1_5_FLASH,
    displayName: 'Gemini 1.5 Flash',
    category: '1.5',
    capabilities: {
      maxTokens: 8192,
      inputCost: 0.075,
      outputCost: 0.30,
      rateLimit: 15
    }
  },
  
  [GeminiModel.GEMINI_1_5_FLASH_8B]: {
    name: GeminiModel.GEMINI_1_5_FLASH_8B,
    displayName: 'Gemini 1.5 Flash 8B',
    category: '1.5',
    capabilities: {
      maxTokens: 8192,
      inputCost: 0.0375,
      outputCost: 0.15,
      rateLimit: 20
    }
  }
};

export class ModelFallbackManager {
  private static readonly DEFAULT_MODEL = GeminiModel.GEMINI_2_5_FLASH;
  private static readonly FALLBACK_CHAIN = [
    GeminiModel.GEMINI_2_5_PRO,
    GeminiModel.GEMINI_2_5_FLASH,
    GeminiModel.GEMINI_2_5_FLASH_LITE,
    GeminiModel.GEMINI_1_5_PRO,
    GeminiModel.GEMINI_1_5_FLASH,
    GeminiModel.GEMINI_1_5_FLASH_8B
  ];

  /**
   * Get the preferred model from user settings - ALWAYS prioritize user choice
   */
  static getPreferredModel(userPreference?: string): GeminiModel {
    // PRIORITY 1: User's explicit choice in settings
    if (userPreference) {
      // Check if it's a valid 2.5 model name
      if (userPreference === 'gemini-2.5-pro' || userPreference === GeminiModel.GEMINI_2_5_PRO) {
        return GeminiModel.GEMINI_2_5_PRO;
      }
      if (userPreference === 'gemini-2.5-flash' || userPreference === GeminiModel.GEMINI_2_5_FLASH) {
        return GeminiModel.GEMINI_2_5_FLASH;
      }
      if (userPreference === 'gemini-2.5-flash-lite' || userPreference === GeminiModel.GEMINI_2_5_FLASH_LITE) {
        return GeminiModel.GEMINI_2_5_FLASH_LITE;
      }
      
      // Check if it's a valid 1.5 model name  
      if (userPreference === 'gemini-1.5-pro' || userPreference === GeminiModel.GEMINI_1_5_PRO) {
        return GeminiModel.GEMINI_1_5_PRO;
      }
      if (userPreference === 'gemini-1.5-flash' || userPreference === GeminiModel.GEMINI_1_5_FLASH) {
        return GeminiModel.GEMINI_1_5_FLASH;
      }
      if (userPreference === 'gemini-1.5-flash-8b' || userPreference === GeminiModel.GEMINI_1_5_FLASH_8B) {
        return GeminiModel.GEMINI_1_5_FLASH_8B;
      }
      
      // Legacy support for old format
      if (userPreference.includes('1.5')) {
        if (userPreference.includes('pro')) return GeminiModel.GEMINI_1_5_PRO;
        if (userPreference.includes('8b')) return GeminiModel.GEMINI_1_5_FLASH_8B;
        return GeminiModel.GEMINI_1_5_FLASH;
      }
      
      // If user preference is valid enum value
      if (Object.values(GeminiModel).includes(userPreference as GeminiModel)) {
        console.log(`✅ Using user's preferred model: ${userPreference}`);
        return userPreference as GeminiModel;
      }
      
      console.warn(`⚠️ Invalid user model preference: ${userPreference}, falling back to default`);
    }
    
    // PRIORITY 2: System default (only if no user preference)
    console.log(`🔧 Using system default model: ${this.DEFAULT_MODEL}`);
    return this.DEFAULT_MODEL;
  }

  /**
   * Get fallback chain starting from a specific model
   */
  static getFallbackChain(startModel: GeminiModel): GeminiModel[] {
    const config = GEMINI_MODELS[startModel];
    const chain: GeminiModel[] = [startModel];
    
    let currentModel = startModel;
    while (GEMINI_MODELS[currentModel]?.fallbackModel) {
      const fallback = GEMINI_MODELS[currentModel].fallbackModel!;
      chain.push(fallback);
      currentModel = fallback;
    }
    
    return chain;
  }

  /**
   * Get all available 2.5 models
   */
  static get25Models(): ModelConfig[] {
    return Object.values(GEMINI_MODELS).filter(model => model.category === '2.5');
  }

  /**
   * Get all available 1.5 models (fallback models)
   */
  static get15Models(): ModelConfig[] {
    return Object.values(GEMINI_MODELS).filter(model => model.category === '1.5');
  }

  /**
   * Check if a model is a 2.5 generation model
   */
  static is25Model(model: GeminiModel): boolean {
    return GEMINI_MODELS[model].category === '2.5';
  }

  /**
   * Get model configuration
   */
  static getModelConfig(model: GeminiModel): ModelConfig {
    return GEMINI_MODELS[model];
  }

  /**
   * Get cost estimate for a request
   */
  static estimateCost(model: GeminiModel, inputTokens: number, outputTokens: number): number {
    const config = GEMINI_MODELS[model];
    const inputCost = (inputTokens / 1_000_000) * config.capabilities.inputCost;
    const outputCost = (outputTokens / 1_000_000) * config.capabilities.outputCost;
    return inputCost + outputCost;
  }
}
