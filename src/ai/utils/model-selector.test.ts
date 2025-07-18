import { describe, it, expect } from 'vitest';
import { ModelSelector } from './model-selector';

// Mock AVAILABLE_MODELS for consistent testing
import type { ModelConfig } from "./model-selector";
const MOCK_AVAILABLE_MODELS: ModelConfig[] = [
  {
    name: 'gemini-1.5-flash',
    provider: 'google',
    capabilities: { complexity: 'medium', costIndex: 3 },
  },
  {
    name: 'gemini-1.5-pro',
    provider: "google",
    capabilities: { complexity: 'high', costIndex: 7 },
  },
  {
    name: 'gpt-4o',
    provider: 'openai',
    capabilities: { complexity: 'high', costIndex: 8 },
  },
  {
    name: 'gpt-3.5-turbo',
    provider: "openai",
    capabilities: { complexity: 'low', costIndex: 1 },
  },
];

describe('ModelSelector', () => {
  describe('selectModel', () => {
    const longInput = 'a'.repeat(500); // Simulate a long user input

    it('should select the cheapest low-complexity model for simple requests from the preferred provider (Google)', () => {
      const request = { userInput: 'Hello', preferredProvider: 'google' as const };
      const model = ModelSelector.selectModel(request, MOCK_AVAILABLE_MODELS);
      expect(model.name).toBe('gemini-1.5-flash'); // Cheapest Google model
    });

    it('should select the cheapest low-complexity model for simple requests from the preferred provider (OpenAI)', () => {
      const request = { userInput: 'Hello', preferredProvider: 'openai' as const };
      const model = ModelSelector.selectModel(request, MOCK_AVAILABLE_MODELS);
      expect(model.name).toBe('gpt-3.5-turbo'); // Cheapest OpenAI model
    });

    it('should select a medium-complexity model for a medium-complexity action from the preferred provider (Google)', () => {
      const request = { userInput: 'Create a new task', requestedAction: 'createTask', preferredProvider: 'google' as const };
      const model = ModelSelector.selectModel(request, MOCK_AVAILABLE_MODELS);
      expect(model.name).toBe('gemini-1.5-flash');
    });

    it('should select the cheapest high-complexity model for a high-complexity action from the preferred provider (OpenAI)', () => {
      const request = { userInput: 'Analyze my project performance', requestedAction: 'analyzeProject', preferredProvider: 'openai' as const };
      const model = ModelSelector.selectModel(request, MOCK_AVAILABLE_MODELS);
      expect(model.name).toBe('gpt-4o');
    });

    it('should select a medium-complexity model for long user input from the preferred provider (Google)', () => {
      const request = { userInput: longInput, preferredProvider: 'google' as const };
      const model = ModelSelector.selectModel(request, MOCK_AVAILABLE_MODELS);
      expect(model.name).toBe('gemini-1.5-flash');
    });

    it('should select the cheapest available model that meets the minimum complexity and preferred provider', () => {
      const request = { userInput: 'Complex query', requestedAction: 'generateQuote', preferredProvider: 'google' as const };
      const model = ModelSelector.selectModel(request, MOCK_AVAILABLE_MODELS);
      expect(model.name).toBe('gemini-1.5-pro'); // Cheapest high-complexity Google model
    });

    it('should select a high-complexity model for long conversation history from the preferred provider (Google)', () => {
      const request = { userInput: 'Another message', historyLength: 15, preferredProvider: 'google' as const };
      const model = ModelSelector.selectModel(request, MOCK_AVAILABLE_MODELS);
      expect(model.name).toBe('gemini-1.5-pro'); // Should pick high-complexity due to history
    });
  });

  describe('getFallbackModel', () => {
    it('should return the next cheapest model from the same provider as a fallback', () => {
      const failedModel = MOCK_AVAILABLE_MODELS.find(m => m.name === 'gemini-1.5-pro')!;
      const fallback = ModelSelector.getFallbackModel(failedModel, MOCK_AVAILABLE_MODELS);
      expect(fallback).not.toBeNull();
      expect(fallback!.name).toBe('gemini-1.5-flash'); // Fallback should be the next cheapest Google model
    });

    it('should return null if no other models are available from the same provider', () => {
      const singleModelList: ModelConfig[] = [
        { name: 'gemini-1.5-flash', provider: 'google', capabilities: { complexity: 'medium', costIndex: 3 } },
      ];
      const failedModel: ModelConfig = singleModelList[0];
      const fallback = ModelSelector.getFallbackModel(failedModel, singleModelList);
      expect(fallback).toBeNull();
    });

    it('should return null if no other models are available from the same provider even if other providers exist', () => {
      const limitedModels: ModelConfig[] = [
        { name: 'gemini-1.5-flash', provider: 'google', capabilities: { complexity: 'medium', costIndex: 3 } },
        { name: 'gpt-4o', provider: 'openai', capabilities: { complexity: 'high', costIndex: 8 } },
      ];
      const failedModel: ModelConfig = limitedModels.find(m => m.name === 'gemini-1.5-flash')!;
      const fallback = ModelSelector.getFallbackModel(failedModel, limitedModels);
      expect(fallback).toBeNull(); // No other Google models
    });
  });
});