/**
 * @fileoverview Implements intelligent model selection logic.
 * This module helps in choosing the most appropriate AI model for a given task
 * based on complexity, cost, and desired capabilities, optimizing both performance and expense.
 */

// Assuming these types are defined in a central types file.
export interface AIRequest {
  userInput: string;
  context?: any; // The data context provided for the request.
  requestedAction?: string; // The type of action requested, e.g., 'analyzeProject'.
  historyLength?: number; // Add historyLength to AIRequest
  preferredProvider: 'google' | 'openai'; // Add preferredProvider
}

export interface ModelConfig {
  name: string; // e.g., 'gemini-1.5-flash', 'gpt-4o'
  provider: 'google' | 'openai';
  capabilities: {
    complexity: 'low' | 'medium' | 'high'; // Model's ability to handle complex reasoning.
    costIndex: number; // A relative cost index (e.g., 1-10).
  };
}

// A predefined list of available models and their characteristics.
// This would typically be managed in a more dynamic configuration setting.
const AVAILABLE_MODELS: ModelConfig[] = [
  {
    name: 'gemini-1.5-flash',
    provider: 'google',
    capabilities: { complexity: 'medium', costIndex: 3 },
  },
  {
    name: 'gemini-1.5-pro',
    provider: 'google',
    capabilities: { complexity: 'high', costIndex: 7 },
  },
  {
    name: 'gpt-4o',
    provider: 'openai',
    capabilities: { complexity: 'high', costIndex: 8 },
  },
  {
    name: 'gpt-3.5-turbo',
    provider: 'openai',
    capabilities: { complexity: 'low', costIndex: 1 },
  },
];

export class ModelSelector {
  /**
   * Selects the best model for a given AI request based on its complexity.
   * @param request The AI request object.
   * @param availableModels An array of available model configurations.
   * @returns The configuration of the selected model.
   */
  static selectModel(request: AIRequest, availableModels: readonly ModelConfig[] = AVAILABLE_MODELS): ModelConfig {
    const { preferredProvider } = request;
    let requiredComplexity: 'low' | 'medium' | 'high' = 'low';

    // 1. Determine the required complexity from the request.
    if (request.requestedAction) {
      switch (request.requestedAction) {
        case 'analyzeProject':
        case 'generateQuote':
          requiredComplexity = 'high';
          break;
        case 'createTask':
        case 'editTask':
        case 'updateStatus':
          requiredComplexity = 'medium';
          break;
        default:
          requiredComplexity = 'low';
      }
    } else {
      // Check for task creation keywords in user input
      const taskCreationKeywords = ['create', 'add', 'new task', 'make a task', 'schedule', 'tạo', 'thêm', 'tạo công việc'];
      const lowerInput = request.userInput.toLowerCase();
      
      if (taskCreationKeywords.some(keyword => lowerInput.includes(keyword)) || 
          request.userInput.includes('#Task') || 
          request.userInput.includes('/Task')) {
        requiredComplexity = 'medium';
      } else if (request.userInput.length > 300) {
        // Longer user inputs might imply more complex queries.
        requiredComplexity = 'medium';
      }
    }

    // Adjust complexity based on history length for long conversations
    if (request.historyLength && request.historyLength > 10) { // Example threshold
        requiredComplexity = 'high';
    } else if (request.historyLength && request.historyLength > 5) {
        if (requiredComplexity === 'low') {
            requiredComplexity = 'medium';
        }
    }

    // 2. Filter models that meet the required complexity AND preferred provider.
    const complexityMap = { low: 1, medium: 2, high: 3 };
    const suitableModels = availableModels.filter(
      (model) => 
        model.provider === preferredProvider && // Filter by preferred provider
        complexityMap[model.capabilities.complexity] >= complexityMap[requiredComplexity]
    );

    if (suitableModels.length === 0) {
      // Fallback to any available model from the preferred provider if none meet the complexity, preferring cheaper ones.
      const fallbackModelsByProvider = availableModels.filter(model => model.provider === preferredProvider);
      if (fallbackModelsByProvider.length > 0) {
        return [...fallbackModelsByProvider].sort((a, b) => a.capabilities.costIndex - b.capabilities.costIndex)[0];
      }
      // If no models from preferred provider, fallback to any available model (should not happen if AVAILABLE_MODELS is well-defined)
      return [...availableModels].sort((a, b) => a.capabilities.costIndex - b.capabilities.costIndex)[0] || availableModels[0];
    }

    // 3. From the suitable models, select the one with the lowest cost index.
    // Create a shallow copy before sorting.
    const sortedSuitableModels = [...suitableModels].sort((a, b) => a.capabilities.costIndex - b.capabilities.costIndex);
    
    return sortedSuitableModels[0];
  }

  /**
   * Provides a fallback model in case the primary choice fails.
   * @param failedModel The model that failed.
   * @param availableModels An array of available model configurations.
   * @returns The next best model to try, or null if no other options exist.
   */
  static getFallbackModel(failedModel: ModelConfig, availableModels: readonly ModelConfig[] = AVAILABLE_MODELS): ModelConfig | null {
    // Filter out the failed model and sort the rest by cost.
    // Create a shallow copy before sorting.
    const otherModels = [...availableModels]
      .filter(model => model.name !== failedModel.name && model.provider === failedModel.provider) // Only fallback to models from the same provider
      .sort((a, b) => a.capabilities.costIndex - b.capabilities.costIndex);

    return otherModels.length > 0 ? otherModels[0] : null;
  }
}