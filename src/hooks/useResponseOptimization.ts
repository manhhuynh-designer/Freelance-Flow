'use client';

import { useState, useCallback } from 'react';
import { 
  ResponseOptimizer, 
  type OptimizationContext, 
  type ResponseOptimization,
  type ResponseOptimizationConfig 
} from '@/ai/optimization/response-optimizer';
import { ContextMemoryEntry } from '@/hooks/useContextMemory';
import { UserPattern } from '@/ai/learning/pattern-learner';

export interface UseResponseOptimizationReturn {
  optimizer: ResponseOptimizer;
  optimizeResponse: (
    baseResponse: string,
    context: Partial<OptimizationContext>
  ) => Promise<{
    optimizedResponse: string;
    optimizations: ResponseOptimization[];
  }>;
  getOptimizationStats: () => ReturnType<ResponseOptimizer['getOptimizationStats']>;
  clearOptimizations: () => void;
  updateConfig: (config: Partial<ResponseOptimizationConfig>) => void;
  isOptimizing: boolean;
}

export function useResponseOptimization(initialConfig?: Partial<ResponseOptimizationConfig>): UseResponseOptimizationReturn {
  const [optimizer] = useState(() => new ResponseOptimizer(initialConfig));
  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimizeResponse = useCallback(async (
    baseResponse: string,
    contextData: Partial<OptimizationContext>
  ) => {
    if (!baseResponse.trim()) {
      return {
        optimizedResponse: baseResponse,
        optimizations: []
      };
    }

    setIsOptimizing(true);

    try {
      // Build complete optimization context
      const now = new Date();
      const hour = now.getHours();
      
      const fullContext: OptimizationContext = {
        userQuery: contextData.userQuery || '',
        conversationHistory: contextData.conversationHistory || [],
        detectedPatterns: contextData.detectedPatterns || [],
        currentInsights: contextData.currentInsights || [],
        timeContext: {
          timeOfDay: hour >= 6 && hour < 12 ? 'morning' :
                     hour >= 12 && hour < 18 ? 'afternoon' :
                     hour >= 18 && hour < 22 ? 'evening' : 'night',
          dayOfWeek: now.toLocaleDateString('en', { weekday: 'long' }),
          isWorkingHours: hour >= 9 && hour <= 17 && ![0, 6].includes(now.getDay())
        },
        sessionContext: {
          messageCount: contextData.sessionContext?.messageCount || 1,
          averageResponseTime: contextData.sessionContext?.averageResponseTime || 2000,
          lastInteraction: contextData.sessionContext?.lastInteraction || null
        }
      };

      console.log('🎯 Optimizing response with context:', {
        query: fullContext.userQuery.substring(0, 50) + '...',
        historyEntries: fullContext.conversationHistory.length,
        patterns: fullContext.detectedPatterns.length,
        timeOfDay: fullContext.timeContext.timeOfDay
      });

      // Simulate async optimization (in real implementation, this might involve API calls)
      await new Promise(resolve => setTimeout(resolve, 50));

      const result = optimizer.optimizeResponse(fullContext, baseResponse);

      console.log('🎯 Response optimization complete:', {
        originalLength: baseResponse.length,
        optimizedLength: result.optimizedResponse.length,
        optimizations: result.optimizations.length,
        types: result.optimizations.map(o => o.type)
      });

      return result;

    } catch (error) {
      console.error('Error during response optimization:', error);
      return {
        optimizedResponse: baseResponse,
        optimizations: []
      };
    } finally {
      setIsOptimizing(false);
    }
  }, [optimizer]);

  const getOptimizationStats = useCallback(() => {
    return optimizer.getOptimizationStats();
  }, [optimizer]);

  const clearOptimizations = useCallback(() => {
    optimizer.clearOptimizations();
    console.log('🎯 Response optimization history cleared');
  }, [optimizer]);

  const updateConfig = useCallback((newConfig: Partial<ResponseOptimizationConfig>) => {
    optimizer.updateConfig(newConfig);
    console.log('🎯 Response optimization config updated:', newConfig);
  }, [optimizer]);

  return {
    optimizer,
    optimizeResponse,
    getOptimizationStats,
    clearOptimizations,
    updateConfig,
    isOptimizing
  };
}
