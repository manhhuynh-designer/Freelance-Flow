/**
 * Behavior Tracker - Phase 4.2
 * Tracks user behavior patterns for adaptive learning
 */

import type { Task, Client, Collaborator } from '@/lib/types';

export interface ActionEvent {
  id: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
  actionType: ActionType;
  entityType: EntityType;
  entityId: string;
  context: ActionContext;
  duration?: number;
  outcome: ActionOutcome;
  metadata: Record<string, any>;
}

export type ActionType = 
  | 'create' | 'edit' | 'delete' | 'complete' | 'view' 
  | 'search' | 'filter' | 'sort' | 'navigate' | 'export'
  | 'ai_query' | 'prediction_view' | 'recommendation_accept' | 'recommendation_reject';

export type EntityType = 
  | 'task' | 'client' | 'collaborator' | 'quote' | 'category' 
  | 'calendar' | 'dashboard' | 'settings' | 'ai_prediction';

export type ActionOutcome = 'success' | 'failure' | 'cancelled' | 'partial';

export interface ActionContext {
  currentView: string;
  previousAction?: ActionType;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  workloadLevel: 'low' | 'medium' | 'high' | 'overloaded';
  urgentTasksCount: number;
  nearDeadlinesCount: number;
}

export interface UserBehaviorPattern {
  id: string;
  patternType: PatternType;
  frequency: number;
  confidence: number;
  description: string;
  triggers: string[];
  outcomes: string[];
  lastObserved: Date;
  strength: number; // 0-1, how consistent this pattern is
}

export type PatternType = 
  | 'workflow_sequence' | 'time_preference' | 'task_clustering' 
  | 'procrastination' | 'productivity_cycle' | 'decision_making'
  | 'ai_interaction' | 'prioritization';

export interface UserPreferences {
  workingHours: {
    start: string;
    end: string;
    timezone: string;
  };
  productivityPeaks: string[]; // time periods
  preferredTaskDuration: number; // minutes
  multitaskingTendency: number; // 0-1
  planningStyle: 'detailed' | 'flexible' | 'minimal';
  deadlineBuffer: number; // days before deadline to start
  aiAssistanceLevel: 'minimal' | 'moderate' | 'extensive';
  predictionTrust: number; // 0-1
}

export interface PerformanceMetrics {
  taskCompletionRate: number;
  averageTaskDuration: number;
  deadlineAdherence: number;
  workloadEfficiency: number;
  aiPredictionAccuracy: number;
  recommendationAcceptanceRate: number;
  productivityScore: number;
  consistencyScore: number;
}

export class BehaviorTracker {
  private actionBuffer: ActionEvent[] = [];
  private patterns: Map<string, UserBehaviorPattern> = new Map();
  private preferences: UserPreferences | null = null;
  private readonly bufferSize = 1000;

  constructor(private userId: string) {}
  
  /**
   * Compatibility shim: return all recorded actions.
   */
  async getActions(): Promise<ActionEvent[]> {
    return this.actionBuffer.slice();
  }
  
    /**
   * Get all actions in memory, will try make function more re useful in near implentations to came
   */
    public getRecentActions(days: number): ActionEvent[] {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.actionBuffer.filter(action => action.timestamp >= cutoff);
  }
  /**
   * Track a user action
   */
  trackAction(action: Omit<ActionEvent, 'id' | 'userId' | 'timestamp'>): void {
    const actionEvent: ActionEvent = {
      id: this.generateActionId(),
      userId: this.userId,
      timestamp: new Date(),
      ...action
    };

    this.actionBuffer.push(actionEvent);
    
    // Maintain buffer size
    if (this.actionBuffer.length > this.bufferSize) {
      this.actionBuffer.shift();
    }

    // Real-time pattern detection
    this.detectImmediatePatterns(actionEvent);
  }

  /**
   * Track task completion with detailed metrics
   */
  trackTaskCompletion(task: Task, actualDuration: number, predictedDuration?: number): void {
    this.trackAction({
      sessionId: this.getCurrentSessionId(),
      actionType: 'complete',
      entityType: 'task',
      entityId: task.id,
      context: this.getCurrentContext(),
      duration: actualDuration,
      outcome: 'success',
      metadata: {
        taskName: task.name,
        categoryId: task.categoryId,
        status: task.status,
        actualDuration,
        predictedDuration,
        accuracyRatio: predictedDuration ? actualDuration / predictedDuration : null,
        deadline: task.deadline,
        wasOnTime: task.deadline ? new Date() <= new Date(task.deadline) : null
      }
    });
  }

  /**
   * Track AI interaction patterns
   */
  trackAIInteraction(
    interactionType: 'query' | 'prediction_view' | 'recommendation',
    action: 'view' | 'accept' | 'reject' | 'modify',
    context: any
  ): void {
    this.trackAction({
      sessionId: this.getCurrentSessionId(),
      actionType: 'ai_query',
      entityType: 'ai_prediction',
      entityId: `ai_${Date.now()}`,
      context: this.getCurrentContext(),
      outcome: action === 'accept' ? 'success' : action === 'reject' ? 'failure' : 'partial',
      metadata: {
        interactionType,
        action,
        context,
        trustLevel: this.preferences?.predictionTrust || 0.5
      }
    });
  }

  /**
   * Analyze behavior patterns
   */
  async analyzePatterns(): Promise<UserBehaviorPattern[]> {
       const recentActions = this.getRecentActions(7);
    const patterns: UserBehaviorPattern[] = [];

    // Workflow sequence patterns
    patterns.push(...this.detectWorkflowPatterns(recentActions));
    
    // Time-based patterns
    patterns.push(...this.detectTimePatterns(recentActions));
    
    // Task clustering patterns
    patterns.push(...this.detectTaskClusteringPatterns(recentActions));
    
    // Productivity cycle patterns
    patterns.push(...this.detectProductivityPatterns(recentActions));
    
    // AI interaction patterns
    patterns.push(...this.detectAIInteractionPatterns(recentActions));

    return patterns;
   
  }

  /**
   * Update user preferences based on observed behavior
   */
  async updatePreferences(): Promise<UserPreferences> {
    const recentActions = this.getRecentActions(30); // Last 30 days
    
    const preferences: UserPreferences = {
      workingHours: this.inferWorkingHours(recentActions),
      productivityPeaks: this.inferProductivityPeaks(recentActions),
      preferredTaskDuration: this.inferPreferredTaskDuration(recentActions),
      multitaskingTendency: this.inferMultitaskingTendency(recentActions),
      planningStyle: this.inferPlanningStyle(recentActions),
      deadlineBuffer: this.inferDeadlineBuffer(recentActions),
      aiAssistanceLevel: this.inferAIAssistanceLevel(recentActions),
      predictionTrust: this.inferPredictionTrust(recentActions)
    };

    this.preferences = preferences;
    return preferences;
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const recentActions = this.getRecentActions(30);
    
    return {
      taskCompletionRate: this.calculateCompletionRate(recentActions),
      averageTaskDuration: this.calculateAverageTaskDuration(recentActions),
      deadlineAdherence: this.calculateDeadlineAdherence(recentActions),
      workloadEfficiency: this.calculateWorkloadEfficiency(recentActions),
      aiPredictionAccuracy: this.calculatePredictionAccuracy(recentActions),
      recommendationAcceptanceRate: this.calculateRecommendationAcceptance(recentActions),
      productivityScore: this.calculateProductivityScore(recentActions),
      consistencyScore: this.calculateConsistencyScore(recentActions)
    };
  }

  /**
   * Get learning insights
   */
  async getLearningInsights(): Promise<{
    patterns: UserBehaviorPattern[];
    preferences: UserPreferences;
    metrics: PerformanceMetrics;
    recommendations: string[];
  }> {
    const [patterns, preferences, metrics] = await Promise.all([
      this.analyzePatterns(),
      this.updatePreferences(),
      this.getPerformanceMetrics()
    ]);

    const recommendations = this.generateBehaviorRecommendations(patterns, preferences, metrics);

    return {
      patterns,
      preferences,
      metrics,
      recommendations
    };
  }

  // Helper methods
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentSessionId(): string {
    return `session_${Date.now()}_${this.userId}`;
  }

  private getCurrentContext(): ActionContext {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    let timeOfDay: ActionContext['timeOfDay'];
    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
    else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    return {
      currentView: 'dashboard', // This would be dynamic in real implementation
      timeOfDay,
      dayOfWeek,
      workloadLevel: 'medium', // Would be calculated from current tasks
      urgentTasksCount: 0, // Would be calculated from current tasks
      nearDeadlinesCount: 0 // Would be calculated from current tasks
    };
  }


  private detectImmediatePatterns(action: ActionEvent): void {
    // Real-time pattern detection logic
    // This would analyze the current action in context of recent actions
  }

  private detectWorkflowPatterns(actions: ActionEvent[]): UserBehaviorPattern[] {
    // Analyze sequences of actions to identify workflow patterns
    return [];
  }

  private detectTimePatterns(actions: ActionEvent[]): UserBehaviorPattern[] {
    // Analyze time-based patterns in user behavior
    return [];
  }

  private detectTaskClusteringPatterns(actions: ActionEvent[]): UserBehaviorPattern[] {
    // Analyze how users group and organize tasks
    return [];
  }

  private detectProductivityPatterns(actions: ActionEvent[]): UserBehaviorPattern[] {
    // Analyze productivity cycles and patterns
    return [];
  }

  private detectAIInteractionPatterns(actions: ActionEvent[]): UserBehaviorPattern[] {
    // Analyze how users interact with AI features
    return [];
  }

  // Preference inference methods
  private inferWorkingHours(actions: ActionEvent[]): UserPreferences['workingHours'] {
    // Analyze action timestamps to infer working hours
    return {
      start: '09:00',
      end: '17:00',
      timezone: 'UTC+7'
    };
  }

  private inferProductivityPeaks(actions: ActionEvent[]): string[] {
    // Identify times when user is most productive
    return ['09:00-11:00', '14:00-16:00'];
  }

  private inferPreferredTaskDuration(actions: ActionEvent[]): number {
    // Analyze completed tasks to find preferred duration
    return 45; // minutes
  }

  private inferMultitaskingTendency(actions: ActionEvent[]): number {
    // Analyze concurrent task handling
    return 0.6; // 0-1 scale
  }

  private inferPlanningStyle(actions: ActionEvent[]): UserPreferences['planningStyle'] {
    // Analyze planning behaviors
    return 'flexible';
  }

  private inferDeadlineBuffer(actions: ActionEvent[]): number {
    // Analyze when users typically start tasks relative to deadlines
    return 3; // days
  }

  private inferAIAssistanceLevel(actions: ActionEvent[]): UserPreferences['aiAssistanceLevel'] {
    // Analyze AI feature usage
    return 'moderate';
  }

  private inferPredictionTrust(actions: ActionEvent[]): number {
    // Analyze acceptance rate of AI predictions
    return 0.7; // 0-1 scale
  }

  // Metrics calculation methods
  private calculateCompletionRate(actions: ActionEvent[]): number {
    const taskActions = actions.filter(a => a.entityType === 'task');
    const completions = taskActions.filter(a => a.actionType === 'complete');
    return taskActions.length > 0 ? completions.length / taskActions.length : 0;
  }

  private calculateAverageTaskDuration(actions: ActionEvent[]): number {
    const completions = actions.filter(a => 
      a.actionType === 'complete' && a.entityType === 'task' && a.duration
    );
    if (completions.length === 0) return 0;
    
    const totalDuration = completions.reduce((sum, action) => sum + (action.duration || 0), 0);
    return totalDuration / completions.length;
  }

  private calculateDeadlineAdherence(actions: ActionEvent[]): number {
    const completions = actions.filter(a => 
      a.actionType === 'complete' && 
      a.entityType === 'task' && 
      a.metadata?.wasOnTime !== null
    );
    
    if (completions.length === 0) return 0;
    
    const onTimeCompletions = completions.filter(a => a.metadata?.wasOnTime === true);
    return onTimeCompletions.length / completions.length;
  }

  private calculateWorkloadEfficiency(actions: ActionEvent[]): number {
    // Calculate efficiency based on task completion vs. time spent
    return 0.75; // Placeholder
  }

  private calculatePredictionAccuracy(actions: ActionEvent[]): number {
    const predictions = actions.filter(a => 
      a.metadata?.predictedDuration && a.metadata?.actualDuration
    );
    
    if (predictions.length === 0) return 0;
    
    const accuracies = predictions.map(a => {
      const predicted = a.metadata.predictedDuration;
      const actual = a.metadata.actualDuration;
      return Math.min(predicted / actual, actual / predicted);
    });
    
    return accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
  }

  private calculateRecommendationAcceptance(actions: ActionEvent[]): number {
    const recommendations = actions.filter(a => a.actionType === 'recommendation_accept' || a.actionType === 'recommendation_reject');
    const acceptances = recommendations.filter(a => a.actionType === 'recommendation_accept');
    return recommendations.length > 0 ? acceptances.length / recommendations.length : 0;
  }

  private calculateProductivityScore(actions: ActionEvent[]): number {
    // Composite score based on multiple factors
    return 0.8; // Placeholder
  }

  private calculateConsistencyScore(actions: ActionEvent[]): number {
    // Measure consistency in behavior patterns
    return 0.7; // Placeholder
  }

  private generateBehaviorRecommendations(
    patterns: UserBehaviorPattern[],
    preferences: UserPreferences,
    metrics: PerformanceMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.deadlineAdherence < 0.8) {
      recommendations.push("Tăng buffer time trước deadline để cải thiện punctuality");
    }

    if (metrics.taskCompletionRate < 0.7) {
      recommendations.push("Chia nhỏ tasks lớn thành subtasks để tăng completion rate");
    }

    if (preferences.predictionTrust < 0.6) {
      recommendations.push("AI predictions đang cải thiện, hãy thử tin tướng và feedback để tăng accuracy");
    }

    return recommendations;
  }
}

export default BehaviorTracker;
