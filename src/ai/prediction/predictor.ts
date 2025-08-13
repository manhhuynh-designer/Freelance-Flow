// Phase 4: Core Prediction Engine
// Advanced predictive intelligence system for Freelance Flow

import type { ContextMemoryEntry } from '@/hooks/useContextMemory';
import type { UserPattern, LearningInsight } from '@/ai/learning/pattern-learner';
import type { SmartContextPrioritizer } from '@/ai/context/smart-prioritizer';

// Enhanced prediction types for Phase 4
export interface TaskPrediction {
  id: string;
  type: 'upcoming_task' | 'deadline_risk' | 'capacity_alert' | 'revenue_opportunity' | 'workflow_optimization' | 'client_interaction';
  title: string;
  description: string;
  confidence: number; // 0-1
  priority: 'critical' | 'high' | 'medium' | 'low';
  timeframe: 'immediate' | 'today' | 'this_week' | 'next_week' | 'this_month' | 'next_month';
  category: 'productivity' | 'business' | 'client' | 'technical' | 'financial';
  suggestedActions: PredictedAction[];
  relatedData: {
    taskIds?: string[];
    clientIds?: string[];
    patterns?: string[];
    metrics?: Record<string, number | string>;
    confidence_breakdown?: Record<string, number>;
  };
  impact: {
    productivity: number;
    revenue: number;
    satisfaction: number;
    workload: number;
  };
  createdAt: Date;
  validUntil: Date;
  tags: string[];
}

export interface PredictedAction {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number; // minutes
  category: 'task' | 'communication' | 'planning' | 'review';
  automation_possible: boolean;
  dependencies?: string[];
}

export interface PredictionModel {
  id: string;
  name: string;
  type: 'pattern_based' | 'time_series' | 'behavioral' | 'hybrid';
  accuracy: number;
  last_trained: Date;
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface PredictionContext {
  user_patterns: UserPattern[];
  memory_entries: ContextMemoryEntry[];
  tasks: any[];
  clients: any[];
  collaborators: any[];
  time_context: {
    current_time: Date;
    business_hours: { start: number; end: number };
    timezone: string;
    working_days: number[];
  };
  business_context: {
    current_capacity: number;
    upcoming_deadlines: any[];
    active_projects: any[];
    revenue_targets: Record<string, number>;
  };
}

export class CorePredictionEngine {
  private models: Map<string, PredictionModel> = new Map();
  private cache: Map<string, { data: TaskPrediction[]; expiry: Date }> = new Map();
  private contextPrioritizer?: SmartContextPrioritizer;

  constructor() {
    this.initializeModels();
  }

  setContextPrioritizer(prioritizer: SmartContextPrioritizer) {
    this.contextPrioritizer = prioritizer;
  }

  // Initialize prediction models
  private initializeModels() {
    // Pattern-based prediction model
    this.models.set('pattern_predictor', {
      id: 'pattern_predictor',
      name: 'Pattern-Based Predictor',
      type: 'pattern_based',
      accuracy: 0.78,
      last_trained: new Date(),
      parameters: {
        min_pattern_confidence: 0.6,
        lookback_days: 30,
        pattern_weight: 0.8
      },
      enabled: true
    });

    // Time series prediction model
    this.models.set('time_series', {
      id: 'time_series',
      name: 'Time Series Forecaster',
      type: 'time_series',
      accuracy: 0.72,
      last_trained: new Date(),
      parameters: {
        forecast_horizon: 7, // days
        seasonal_adjustment: true,
        trend_weight: 0.3
      },
      enabled: true
    });

    // Behavioral prediction model
    this.models.set('behavioral', {
      id: 'behavioral',
      name: 'Behavioral Pattern Predictor',
      type: 'behavioral',
      accuracy: 0.85,
      last_trained: new Date(),
      parameters: {
        behavior_window: 14, // days
        habit_strength_threshold: 0.7,
        adaptation_rate: 0.1
      },
      enabled: true
    });

    // Hybrid ensemble model
    this.models.set('ensemble', {
      id: 'ensemble',
      name: 'Ensemble Predictor',
      type: 'hybrid',
      accuracy: 0.88,
      last_trained: new Date(),
      parameters: {
        model_weights: {
          pattern_based: 0.4,
          time_series: 0.3,
          behavioral: 0.3
        },
        confidence_threshold: 0.6
      },
      enabled: true
    });
  }

  // Main prediction generation method
  async generatePredictions(context: PredictionContext): Promise<TaskPrediction[]> {
    const cacheKey = this.generateCacheKey(context);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > new Date()) {
      console.log('🔮 Using cached predictions');
      return cached.data;
    }

    console.log('🔮 Generating new predictions...');
    const predictions: TaskPrediction[] = [];

    try {
      // Use prioritized contexts if available
      let prioritizedEntries = context.memory_entries;
      if (this.contextPrioritizer && context.memory_entries.length > 0) {
        const prioritized = this.contextPrioritizer.prioritizeContext(
          context.memory_entries,
          'Generate predictions based on user patterns and context'
        );
        prioritizedEntries = prioritized.map(p => p.entry);
      }

      const enhancedContext = { ...context, memory_entries: prioritizedEntries };

      // Generate predictions from each enabled model
      const modelPredictions = await Promise.all([
        this.generatePatternBasedPredictions(enhancedContext),
        this.generateTimeSeriesPredictions(enhancedContext),
        this.generateBehavioralPredictions(enhancedContext),
        this.generateWorkflowPredictions(enhancedContext),
        this.generateBusinessPredictions(enhancedContext),
        this.generateClientPredictions(enhancedContext)
      ]);

      // Combine and deduplicate predictions
      const allPredictions = modelPredictions.flat();
      const uniquePredictions = this.deduplicatePredictions(allPredictions);

      // Apply ensemble scoring
      const scoredPredictions = this.applyEnsembleScoring(uniquePredictions, enhancedContext);

      // Filter by confidence threshold
      const filteredPredictions = scoredPredictions.filter(p => p.confidence >= 0.6);

      // Sort by priority and confidence
      const sortedPredictions = this.sortPredictions(filteredPredictions);

      // Limit to top predictions
      const finalPredictions = sortedPredictions.slice(0, 20);

      // Cache results
      this.cache.set(cacheKey, {
        data: finalPredictions,
        expiry: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

      console.log(`🔮 Generated ${finalPredictions.length} predictions with avg confidence: ${
        finalPredictions.reduce((sum, p) => sum + p.confidence, 0) / finalPredictions.length
      }`);

      return finalPredictions;

    } catch (error) {
      console.error('Error generating predictions:', error);
      return [];
    }
  }

  // Pattern-based predictions using Phase 3 patterns
  private async generatePatternBasedPredictions(context: PredictionContext): Promise<TaskPrediction[]> {
    const predictions: TaskPrediction[] = [];
    const model = this.models.get('pattern_predictor')!;

    // Workflow pattern predictions
    const workflowPatterns = context.user_patterns.filter(p => p.type === 'workflow');
    for (const pattern of workflowPatterns) {
      if (pattern.confidence >= model.parameters.min_pattern_confidence) {
        predictions.push({
          id: `pattern-workflow-${Date.now()}-${Math.random()}`,
          type: 'workflow_optimization',
          title: `Workflow Pattern: ${pattern.pattern}`,
          description: `Based on your workflow patterns, you typically ${pattern.pattern} during this time period.`,
          confidence: pattern.confidence * model.accuracy,
          priority: pattern.frequency > 0.7 ? 'high' : 'medium',
          timeframe: this.predictTimeframe(pattern),
          category: 'productivity',
          suggestedActions: this.generateWorkflowActions(pattern),
          relatedData: {
            patterns: [pattern.pattern],
            metrics: { frequency: pattern.frequency },
            confidence_breakdown: { pattern: pattern.confidence, model: model.accuracy }
          },
          impact: {
            productivity: pattern.frequency * 0.8,
            revenue: pattern.frequency * 0.4,
            satisfaction: pattern.confidence * 0.6,
            workload: pattern.frequency * 0.3
          },
          createdAt: new Date(),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          tags: ['workflow', 'pattern', 'productivity']
        });
      }
    }

    // Timing pattern predictions
    const timingPatterns = context.user_patterns.filter(p => p.type === 'timing');
    for (const pattern of timingPatterns) {
      if (pattern.confidence >= 0.7) {
        predictions.push({
          id: `pattern-timing-${Date.now()}-${Math.random()}`,
          type: 'workflow_optimization',
          title: 'Optimal Timing Detected',
          description: `Your peak productivity time is ${pattern.metadata.timePatterns?.[0] || 'morning'}. Consider scheduling important tasks during this period.`,
          confidence: pattern.confidence * model.accuracy,
          priority: 'high',
          timeframe: 'today',
          category: 'productivity',
          suggestedActions: this.generateTimingActions(pattern),
          relatedData: {
            patterns: pattern.metadata.timePatterns || [],
            metrics: { peak_hours: pattern.frequency }
          },
          impact: {
            productivity: 0.9,
            revenue: 0.7,
            satisfaction: 0.8,
            workload: 0.6
          },
          createdAt: new Date(),
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          tags: ['timing', 'productivity', 'optimization']
        });
      }
    }

    return predictions;
  }

  // Time series predictions
  private async generateTimeSeriesPredictions(context: PredictionContext): Promise<TaskPrediction[]> {
    const predictions: TaskPrediction[] = [];
    const model = this.models.get('time_series')!;

    // Task completion trend analysis
    const recentTasks = context.tasks.filter((task: any) => {
      const taskDate = new Date(task.createdAt);
      const daysDiff = (new Date().getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30;
    });

    if (recentTasks.length > 5) {
      const completionRate = recentTasks.filter((t: any) => t.status === 'completed').length / recentTasks.length;
      const trend = this.calculateTrend(recentTasks);

      if (completionRate < 0.7) {
        predictions.push({
          id: `timeseries-completion-${Date.now()}`,
          type: 'capacity_alert',
          title: 'Declining Task Completion Rate',
          description: `Your task completion rate has decreased to ${(completionRate * 100).toFixed(1)}%. Consider adjusting workload or priorities.`,
          confidence: Math.min(0.9, trend.confidence) * model.accuracy,
          priority: 'high',
          timeframe: 'immediate',
          category: 'productivity',
          suggestedActions: [
            {
              id: 'action-1',
              title: 'Review Task Priorities',
              description: 'Reassess and prioritize current tasks',
              priority: 'high',
              estimatedTime: 30,
              category: 'planning',
              automation_possible: false
            },
            {
              id: 'action-2',
              title: 'Identify Bottlenecks',
              description: 'Find tasks that are blocking progress',
              priority: 'medium',
              estimatedTime: 20,
              category: 'review',
              automation_possible: true
            }
          ],
          relatedData: {
            taskIds: recentTasks.map((t: any) => t.id),
            metrics: { 
              completion_rate: completionRate, 
              trend_score: trend.confidence,
              trend_direction: trend.direction
            }
          },
          impact: {
            productivity: 0.8,
            revenue: 0.6,
            satisfaction: 0.5,
            workload: 0.9
          },
          createdAt: new Date(),
          validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          tags: ['completion', 'trend', 'capacity']
        });
      }
    }

    return predictions;
  }

  // Behavioral predictions
  private async generateBehavioralPredictions(context: PredictionContext): Promise<TaskPrediction[]> {
    const predictions: TaskPrediction[] = [];
    const model = this.models.get('behavioral')!;

    // Analyze user behavior patterns
    const languagePatterns = context.user_patterns.filter(p => p.type === 'language');
    const topicPatterns = context.user_patterns.filter(p => p.type === 'topic');

    // Language preference analysis
    if (languagePatterns.length > 0) {
      const dominantLanguage = languagePatterns.sort((a, b) => b.frequency - a.frequency)[0];
      if (dominantLanguage.frequency > 0.6) {
        predictions.push({
          id: `behavioral-language-${Date.now()}`,
          type: 'workflow_optimization',
          title: 'Communication Style Optimization',
          description: `You prefer ${dominantLanguage.pattern} communication style. Optimizing responses accordingly.`,
          confidence: dominantLanguage.confidence * model.accuracy,
          priority: 'medium',
          timeframe: 'this_week',
          category: 'productivity',
          suggestedActions: [
            {
              id: 'action-comm-1',
              title: 'Update Communication Templates',
              description: 'Align templates with preferred style',
              priority: 'low',
              estimatedTime: 15,
              category: 'task',
              automation_possible: true
            }
          ],
          relatedData: {
            patterns: [dominantLanguage.pattern],
            metrics: { preference_strength: dominantLanguage.frequency }
          },
          impact: {
            productivity: 0.6,
            revenue: 0.3,
            satisfaction: 0.8,
            workload: 0.2
          },
          createdAt: new Date(),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          tags: ['communication', 'style', 'optimization']
        });
      }
    }

    return predictions;
  }

  // Workflow-specific predictions
  private async generateWorkflowPredictions(context: PredictionContext): Promise<TaskPrediction[]> {
    const predictions: TaskPrediction[] = [];

    // Upcoming deadline analysis
    const upcomingDeadlines = context.business_context.upcoming_deadlines;
    if (upcomingDeadlines.length > 0) {
      const criticalDeadlines = upcomingDeadlines.filter((deadline: any) => {
        const daysUntil = (new Date(deadline.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
        return daysUntil > 0 && daysUntil <= 3;
      });

      if (criticalDeadlines.length > 0) {
        predictions.push({
          id: `workflow-deadline-${Date.now()}`,
          type: 'deadline_risk',
          title: 'Critical Deadlines Approaching',
          description: `${criticalDeadlines.length} critical deadlines in the next 3 days. Immediate attention required.`,
          confidence: 0.95,
          priority: 'critical',
          timeframe: 'immediate',
          category: 'business',
          suggestedActions: [
            {
              id: 'action-deadline-1',
              title: 'Prioritize Deadline Tasks',
              description: 'Focus on upcoming deadline items',
              priority: 'high',
              estimatedTime: 60,
              category: 'planning',
              automation_possible: false
            },
            {
              id: 'action-deadline-2',
              title: 'Notify Stakeholders',
              description: 'Update clients on progress',
              priority: 'high',
              estimatedTime: 30,
              category: 'communication',
              automation_possible: true
            }
          ],
          relatedData: {
            taskIds: criticalDeadlines.map((d: any) => d.taskId),
            metrics: { risk_level: criticalDeadlines.length / upcomingDeadlines.length }
          },
          impact: {
            productivity: 0.9,
            revenue: 0.8,
            satisfaction: 0.9,
            workload: 1.0
          },
          createdAt: new Date(),
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          tags: ['deadline', 'critical', 'risk']
        });
      }
    }

    return predictions;
  }

  // Business-focused predictions
  private async generateBusinessPredictions(context: PredictionContext): Promise<TaskPrediction[]> {
    const predictions: TaskPrediction[] = [];

    // Revenue opportunity analysis
    const recentPositiveInteractions = context.memory_entries.filter(entry => 
      entry.sentiment === 'positive' &&
      entry.entityMentions.some(mention => mention.toLowerCase().includes('client')) &&
      (new Date().getTime() - entry.timestamp.getTime()) < 7 * 24 * 60 * 60 * 1000
    );

    if (recentPositiveInteractions.length >= 3) {
      predictions.push({
        id: `business-revenue-${Date.now()}`,
        type: 'revenue_opportunity',
        title: 'Revenue Opportunity Detected',
        description: `${recentPositiveInteractions.length} positive client interactions this week suggest potential for expansion.`,
        confidence: Math.min(0.85, recentPositiveInteractions.length / 5),
        priority: 'high',
        timeframe: 'next_week',
        category: 'financial',
        suggestedActions: [
          {
            id: 'action-revenue-1',
            title: 'Schedule Client Follow-ups',
            description: 'Reach out to satisfied clients',
            priority: 'high',
            estimatedTime: 45,
            category: 'communication',
            automation_possible: false
          },
          {
            id: 'action-revenue-2',
            title: 'Prepare Upsell Proposals',
            description: 'Create additional service proposals',
            priority: 'medium',
            estimatedTime: 90,
            category: 'planning',
            automation_possible: false
          }
        ],
        relatedData: {
          clientIds: context.clients.map((c: any) => c.id),
          metrics: { opportunity_score: recentPositiveInteractions.length / context.memory_entries.length }
        },
        impact: {
          productivity: 0.7,
          revenue: 0.9,
          satisfaction: 0.8,
          workload: 0.6
        },
        createdAt: new Date(),
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        tags: ['revenue', 'opportunity', 'client']
      });
    }

    return predictions;
  }

  // Client relationship predictions
  private async generateClientPredictions(context: PredictionContext): Promise<TaskPrediction[]> {
    const predictions: TaskPrediction[] = [];

    // Client communication pattern analysis
    const clientMentions = context.memory_entries.filter(entry =>
      entry.entityMentions.some(mention => mention.toLowerCase().includes('client'))
    );

    if (clientMentions.length > 0) {
      const recentClientMentions = clientMentions.filter(entry =>
        (new Date().getTime() - entry.timestamp.getTime()) < 3 * 24 * 60 * 60 * 1000
      );

      if (recentClientMentions.length === 0 && clientMentions.length > 5) {
        predictions.push({
          id: `client-communication-${Date.now()}`,
          type: 'client_interaction',
          title: 'Client Communication Gap Detected',
          description: 'No recent client interactions detected. Consider reaching out to maintain relationships.',
          confidence: 0.75,
          priority: 'medium',
          timeframe: 'today',
          category: 'client',
          suggestedActions: [
            {
              id: 'action-client-1',
              title: 'Send Client Check-in',
              description: 'Reach out to active clients',
              priority: 'medium',
              estimatedTime: 30,
              category: 'communication',
              automation_possible: true
            }
          ],
          relatedData: {
            clientIds: context.clients.map((c: any) => c.id),
            metrics: { communication_gap: 3 }
          },
          impact: {
            productivity: 0.5,
            revenue: 0.7,
            satisfaction: 0.8,
            workload: 0.3
          },
          createdAt: new Date(),
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          tags: ['client', 'communication', 'relationship']
        });
      }
    }

    return predictions;
  }

  // Helper methods
  private generateCacheKey(context: PredictionContext): string {
    return `predictions-${context.memory_entries.length}-${context.tasks.length}-${Math.floor(Date.now() / (10 * 60 * 1000))}`;
  }

  private deduplicatePredictions(predictions: TaskPrediction[]): TaskPrediction[] {
    const seen = new Set();
    return predictions.filter(prediction => {
      const key = `${prediction.type}-${prediction.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private applyEnsembleScoring(predictions: TaskPrediction[], context: PredictionContext): TaskPrediction[] {
    const ensemble = this.models.get('ensemble')!;
    const weights = ensemble.parameters.model_weights;

    return predictions.map(prediction => ({
      ...prediction,
      confidence: Math.min(1, prediction.confidence * ensemble.accuracy)
    }));
  }

  private sortPredictions(predictions: TaskPrediction[]): TaskPrediction[] {
    return predictions.sort((a, b) => {
      // Priority order: critical > high > medium > low
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by confidence
      return b.confidence - a.confidence;
    });
  }

  private predictTimeframe(pattern: UserPattern): TaskPrediction['timeframe'] {
    if (pattern.frequency > 0.8) return 'today';
    if (pattern.frequency > 0.6) return 'this_week';
    if (pattern.frequency > 0.4) return 'next_week';
    return 'this_month';
  }

  private generateWorkflowActions(pattern: UserPattern): PredictedAction[] {
    return [
      {
        id: `action-workflow-${Date.now()}`,
        title: 'Optimize Workflow Step',
        description: `Streamline your ${pattern.pattern} process`,
        priority: 'medium',
        estimatedTime: 20,
        category: 'task',
        automation_possible: true
      }
    ];
  }

  private generateTimingActions(pattern: UserPattern): PredictedAction[] {
    return [
      {
        id: `action-timing-${Date.now()}`,
        title: 'Schedule Peak Work',
        description: 'Block calendar for high-priority tasks during peak hours',
        priority: 'high',
        estimatedTime: 15,
        category: 'planning',
        automation_possible: true
      }
    ];
  }

  private calculateTrend(tasks: any[]): { direction: 'up' | 'down' | 'stable'; confidence: number } {
    if (tasks.length < 3) return { direction: 'stable', confidence: 0.5 };
    
    const completionRates = this.getWeeklyCompletionRates(tasks);
    if (completionRates.length < 2) return { direction: 'stable', confidence: 0.5 };

    const recent = completionRates[completionRates.length - 1];
    const previous = completionRates[completionRates.length - 2];
    
    const diff = recent - previous;
    if (Math.abs(diff) < 0.1) return { direction: 'stable', confidence: 0.8 };
    
    return {
      direction: diff > 0 ? 'up' : 'down',
      confidence: Math.min(0.9, Math.abs(diff) * 2)
    };
  }

  private getWeeklyCompletionRates(tasks: any[]): number[] {
    // Simplified implementation
    return [0.7, 0.6, 0.65]; // Placeholder
  }

  // Model management methods
  getModel(id: string): PredictionModel | undefined {
    return this.models.get(id);
  }

  updateModel(id: string, updates: Partial<PredictionModel>): boolean {
    const model = this.models.get(id);
    if (!model) return false;
    
    this.models.set(id, { ...model, ...updates });
    return true;
  }

  getModelAccuracies(): Record<string, number> {
    const accuracies: Record<string, number> = {};
    for (const [id, model] of this.models) {
      accuracies[id] = model.accuracy;
    }
    return accuracies;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
