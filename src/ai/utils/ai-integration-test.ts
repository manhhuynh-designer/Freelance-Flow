/**
 * Simple AI Integration Test
 * Test real AI integration with user settings API key
 */

import { AIConfigManager } from '@/ai/utils/ai-config-manager';
import { PredictionContextBuilder } from '@/ai/context/prediction-context-builder';
import { AIBusinessInsightGenerator } from '@/ai/prediction/ai-business-insights';
import type { AppSettings, Task, Client } from '@/lib/types';
import type { UserPattern } from '@/ai/learning/pattern-learner';
import type { ContextMemoryEntry } from '@/hooks/useContextMemory';

interface TestAIIntegrationParams {
  appSettings: AppSettings;
  tasks: Task[];
  clients: Client[];
  userPatterns?: UserPattern[];
  memoryEntries?: ContextMemoryEntry[];
}

export async function testAIIntegration({
  appSettings,
  tasks,
  clients,
  userPatterns = [],
  memoryEntries = []
}: TestAIIntegrationParams) {
  console.log('🧪 Testing AI Integration with User Settings...');

  // Step 1: Check AI Configuration
  const aiConfig = AIConfigManager.getAIConfig(appSettings);
  AIConfigManager.logAIStatus(appSettings);

  if (!aiConfig.isConfigured) {
    console.warn('❌ AI not configured:', AIConfigManager.getNoApiKeyMessage('vi'));
    return {
      success: false,
      error: 'API key not configured',
      message: AIConfigManager.getNoApiKeyMessage('vi')
    };
  }

  try {
    // Step 2: Build Context
    const contextBuilder = new PredictionContextBuilder({
      tasks,
      clients,
      userPatterns,
      memoryEntries,
      actionHistory: [],
      taskAnalysis: {
        total: tasks.length,
        active: tasks.filter(t => t.status === 'inprogress' || t.status === 'todo').length,
        completed: tasks.filter(t => t.status === 'done').length,
        overdue: tasks.filter(t => new Date(t.deadline) < new Date()).length,
        upcomingDeadlineCount: 0,
        activeTasks: tasks.filter(t => t.status === 'inprogress' || t.status === 'todo'),
        completedTasks: tasks.filter(t => t.status === 'done'),
        overdueTasks: tasks.filter(t => new Date(t.deadline) < new Date()),
        upcomingDeadlines: []
      }
    });

    const context = contextBuilder.buildContext();

    // Step 3: Test AI Business Insights
    console.log('🤖 Testing AI Business Insights Generation...');
    const insightsResponse = await AIBusinessInsightGenerator.generateBusinessInsights({
      context,
      geminiApiKey: aiConfig.geminiApiKey!,
      modelName: aiConfig.modelName,
      focusArea: 'all'
    });

    if (insightsResponse.success) {
      console.log('✅ AI Integration Test Successful!', {
        insightCount: insightsResponse.insights.length,
        contextQuality: context.contextMetadata.dataQuality,
        fallbackUsed: insightsResponse.fallbackUsed
      });

      return {
        success: true,
        insights: insightsResponse.insights,
        context: context.contextMetadata,
        config: aiConfig
      };
    } else {
      console.warn('⚠️ AI Test completed with fallback:', insightsResponse.error);
      return {
        success: false,
        error: insightsResponse.error,
        fallbackUsed: true
      };
    }

  } catch (error) {
    console.error('❌ AI Integration Test Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Quick API key validation test
 */
export function validateUserAPIKey(appSettings: AppSettings): {
  isValid: boolean;
  status: string;
  message: string;
} {
  const aiConfig = AIConfigManager.getAIConfig(appSettings);
  
  if (!aiConfig.geminiApiKey) {
    return {
      isValid: false,
      status: 'missing',
      message: 'Không tìm thấy khóa API Google Gemini. Vui lòng cấu hình trong cài đặt.'
    };
  }

  if (!AIConfigManager.validateGeminiApiKey(aiConfig.geminiApiKey)) {
    return {
      isValid: false,
      status: 'invalid',
      message: 'Khóa API không đúng định dạng. Khóa API Google Gemini phải bắt đầu bằng "AIzaSy".'
    };
  }

  return {
    isValid: true,
    status: 'valid',
    message: 'Khóa API đã được cấu hình và có định dạng hợp lệ.'
  };
}

/**
 * Check if real AI features should be enabled
 */
export function shouldUseAI(appSettings: AppSettings): boolean {
  return AIConfigManager.isAIAvailable(appSettings);
}
