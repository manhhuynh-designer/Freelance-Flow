import type { Task } from '@/lib/types';
import type { PredictionContext, AITaskPrediction } from '../context/prediction-context-types';
import { AIPromptBuilder } from '../utils/prompt-builder';
import { GeminiAPIService } from '../utils/gemini-api-service';
import { GeminiModel } from '../utils/gemini-models';

export interface TaskPredictionRequest {
  task: Task;
  context: PredictionContext;
  geminiApiKey: string;
  preferredModel?: GeminiModel;
}

export interface GeneralPredictionRequest {
  context: PredictionContext;
  geminiApiKey: string;
  preferredModel?: GeminiModel;
  focusArea?: 'tasks' | 'productivity' | 'workload' | 'all';
}

export interface TaskPredictionResponse {
  prediction: AITaskPrediction | null;
  success: boolean;
  error?: string;
  fallbackUsed?: boolean;
  modelUsed?: GeminiModel;
}

export interface GeneralPredictionResponse {
  predictions: any[];
  success: boolean;
  error?: string;
  fallbackUsed?: boolean;
  modelUsed?: GeminiModel;
}

export class AITaskPredictor {
  private static readonly DEFAULT_MODEL = GeminiModel.GEMINI_1_5_FLASH;

  static async predictTaskCompletion({
    task,
    context,
    geminiApiKey,
    preferredModel = this.DEFAULT_MODEL,
  }: TaskPredictionRequest): Promise<TaskPredictionResponse> {
    
    if (!geminiApiKey) {
      return this.getFallbackPrediction(task, 'No API key provided');
    }

    const targetModel = preferredModel;

    try {
      console.log('🤖 AI Task Prediction Request:', {
        taskId: task.id,
        taskName: task.name,
        targetModel,
        contextQuality: context.contextMetadata.dataQuality
      });

      const prompt = AIPromptBuilder.buildTaskPredictionPrompt(task, context);
      const fullPrompt = `${prompt.system}\n\n${prompt.user}\n\n${prompt.format}`;
      
      const result = await GeminiAPIService.callWithFallback<any>(
        geminiApiKey,
        targetModel,
        fullPrompt,
        {
          temperature: 0.7,
          maxOutputTokens: 1024,
          language: 'en'
        }
      );

      if (!result.success) {
        console.warn('🚨 AI Task Prediction Failed (all models):', result.error);
        return this.getFallbackPrediction(task, result.error || 'All AI models failed');
      }

      console.log(`✅ Task prediction successful with ${result.modelUsed}`, {
        fallbackAttempts: result.fallbackAttempts,
        modelUsed: result.modelUsed
      });

      const parsedPrediction = this.parseAIResponse(result.data, task);
      
      if (!parsedPrediction) {
        console.warn('🚨 Failed to parse AI response:', result.data);
        return this.getFallbackPrediction(task, 'Failed to parse AI response');
      }

      return {
        prediction: parsedPrediction,
        success: true,
        modelUsed: result.modelUsed
      };

    } catch (error) {
      console.error('🚨 AI Task Prediction Error:', error);
      return this.getFallbackPrediction(task, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  static async generateGeneralPredictions({
    context,
    geminiApiKey,
    preferredModel = this.DEFAULT_MODEL,
    focusArea = 'all'
  }: GeneralPredictionRequest): Promise<GeneralPredictionResponse> {
    
    if (!geminiApiKey) {
      return this.getFallbackGeneralPredictions(context, 'No API key provided');
    }

    const targetModel = preferredModel;

    try {
      console.log('🤖 AI General Predictions Request:', {
        focusArea,
        targetModel,
        contextQuality: context.contextMetadata.dataQuality,
        taskCount: context.currentState.activeTasks.length
      });

      const prompt = this.buildGeneralPredictionPrompt(context, focusArea);
      
      const result = await GeminiAPIService.callWithFallback<any>(
        geminiApiKey,
        targetModel,
        prompt,
        {
          temperature: 0.7,
          maxOutputTokens: 2048,
          language: 'en'
        }
      );

      if (!result.success) {
        console.warn('🚨 General predictions failed (all models):', result.error);
        return this.getFallbackGeneralPredictions(context, result.error || 'All AI models failed');
      }

      console.log(`✅ General predictions successful with ${result.modelUsed}`, {
        fallbackAttempts: result.fallbackAttempts,
        modelUsed: result.modelUsed
      });

      const predictions = this.parseGeneralPredictionsResponse(result.data);

      return {
        predictions,
        success: true,
        modelUsed: result.modelUsed
      };

    } catch (error) {
      console.error('🚨 General Predictions Error:', error);
      return this.getFallbackGeneralPredictions(context, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private static parseAIResponse(response: string, task: Task): AITaskPrediction | null {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in AI response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!this.validatePredictionStructure(parsed)) {
        console.warn('Invalid prediction structure:', parsed);
        return null;
      }

      parsed.taskId = task.id;
      this.validateAndAdjustDates(parsed, task);

      return parsed as AITaskPrediction;

    } catch (error) {
      console.error('Error parsing AI response:', error);
      return null;
    }
  }

  private static validatePredictionStructure(prediction: any): boolean {
    return (
      prediction &&
      prediction.estimatedCompletion &&
      prediction.estimatedCompletion.realistic &&
      prediction.riskAssessment &&
      prediction.recommendations &&
      Array.isArray(prediction.recommendations) &&
      prediction.aiReasoning
    );
  }

  private static validateAndAdjustDates(prediction: any, task: Task): void {
    const now = new Date();
    const taskDeadline = new Date(task.deadline);

    ['optimistic', 'realistic', 'pessimistic'].forEach(scenario => {
      const dateStr = prediction.estimatedCompletion[scenario];
      const date = new Date(dateStr);
      
      if (isNaN(date.getTime()) || date < now) {
        prediction.estimatedCompletion[scenario] = this.getDefaultDate(scenario, now, taskDeadline);
      }
    });

    const opt = new Date(prediction.estimatedCompletion.optimistic);
    const real = new Date(prediction.estimatedCompletion.realistic);
    const pess = new Date(prediction.estimatedCompletion.pessimistic);

    if (opt > real) {
      prediction.estimatedCompletion.optimistic = prediction.estimatedCompletion.realistic;
    }
    if (real > pess) {
      prediction.estimatedCompletion.pessimistic = prediction.estimatedCompletion.realistic;
    }
  }

  private static getDefaultDate(scenario: string, now: Date, deadline: Date): string {
    const daysToAdd = scenario === 'optimistic' ? 2 : scenario === 'realistic' ? 4 : 7;
    const date = new Date(now.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
    
    if ((scenario === 'optimistic' || scenario === 'realistic') && date > deadline) {
      return deadline.toISOString().split('T')[0];
    }
    
    return date.toISOString().split('T')[0];
  }

  private static getFallbackPrediction(task: Task, errorMessage: string): TaskPredictionResponse {
    const now = new Date();
    const deadline = new Date(task.deadline);
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const fallbackPrediction: AITaskPrediction = {
      taskId: task.id,
      estimatedCompletion: {
        optimistic: new Date(this.getDefaultDate('optimistic', now, deadline)),
        realistic: new Date(this.getDefaultDate('realistic', now, deadline)),
        pessimistic: new Date(this.getDefaultDate('pessimistic', now, deadline)),
        confidence: 0.6
      },
      riskAssessment: {
        level: daysUntilDeadline < 3 ? 'high' : daysUntilDeadline < 7 ? 'medium' : 'low',
        factors: [
          { factor: 'Limited AI analysis available', impact: 0.3, mitigation: 'Monitor progress closely' },
          ...(daysUntilDeadline < 7 ? [{ factor: 'Approaching deadline', impact: 0.7, mitigation: 'Prioritize this task' }] : [])
        ],
        contingencyTime: Math.max(1, Math.ceil(daysUntilDeadline * 0.2))
      },
      recommendations: [
        { category: 'approach' as const, action: 'Break down task into smaller components', rationale: 'Easier to track progress', impact: 'medium' as const, effort: 'low' as const },
        { category: 'scheduling' as const, action: 'Allocate focused time blocks', rationale: 'Improves efficiency', impact: 'high' as const, effort: 'low' as const }
      ],
      dependencies: [{ type: 'internal' as const, description: 'Depends on available time', timeline: 'daily', criticality: 'medium' as const }],
      aiReasoning: {
        primaryFactors: ['Task deadline', 'General patterns'],
        historicalComparisons: ['Limited data'],
        assumptionsMade: ['Standard productivity'],
        confidenceFactors: ['Limited AI analysis due to: ' + errorMessage]
      }
    };

    console.log('🔄 Using fallback prediction for task:', task.id, 'Reason:', errorMessage);

    return {
      prediction: fallbackPrediction,
      success: true,
      fallbackUsed: true,
      error: errorMessage
    };
  }
  
  private static buildGeneralPredictionPrompt(context: PredictionContext, focusArea: string): string {
    return `
You are an AI productivity assistant. Based on the provided context, generate 3-5 actionable predictions in JSON format.
CONTEXT:
- Active Tasks: ${context.currentState?.activeTasks?.length || 0}
- Focus Area: ${focusArea}

FORMAT:
{
  "predictions": [
    {
      "id": "unique_id",
      "type": "completion_time|deadline_risk",
      "title": "Prediction Title",
      "description": "Detailed description",
      "confidence": 0.85,
      "urgency": "high|medium|low",
      "actionItems": ["Action 1"]
    }
  ]
}
`;
  }

  private static parseGeneralPredictionsResponse(response: string): any[] {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.predictions || !Array.isArray(parsed.predictions)) return [];
      return parsed.predictions.map((pred: any, index: number) => ({
        ...pred,
        id: pred.id || `ai-pred-${Date.now()}-${index}`,
      }));
    } catch (error) {
      console.error('Error parsing general predictions response:', error);
      return [];
    }
  }

  private static getFallbackGeneralPredictions(context: PredictionContext, errorMessage: string): GeneralPredictionResponse {
    const activeTasksCount = context.currentState?.activeTasks?.length || 0;
    
    const fallbackPredictions = [
      {
        id: `fallback-productivity-${Date.now()}`,
        type: 'completion_time',
        title: 'Productivity Analysis',
        description: `Based on ${activeTasksCount} active tasks, maintain focus.`,
        confidence: 0.6,
        urgency: 'medium',
        actionItems: ['Review and prioritize tasks']
      }
    ];

    console.log('🔄 Using fallback general predictions. Reason:', errorMessage);

    return {
      predictions: fallbackPredictions,
      success: true,
      fallbackUsed: true,
      error: errorMessage
    };
  }
}
