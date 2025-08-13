/**
 * Personal Deadline Intelligence - Phase 4.3 Day 2
 * Hệ thống thông minh dự đoán và quản lý deadline cá nhân
 */

import type { Task, Client } from '@/lib/types';
import type { ActionEvent, UserBehaviorPattern } from '../learning/behavior-tracker';

export interface DeadlineRiskAssessment {
  taskId: string;
  taskName: string;
  deadline: Date;
  currentProgress: number; // 0-100
  estimatedCompletion: Date;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: DeadlineRiskFactor[];
  recommendedActions: string[];
  bufferTime: number; // minutes needed as safety margin
  confidenceScore: number; // 0-100
}

export interface DeadlineRiskFactor {
  factor: string;
  impact: 'positive' | 'negative';
  severity: number; // 1-10
  description: string;
  mitigation?: string;
}

export interface DeadlinePerformanceHistory {
  taskId: string;
  taskName: string;
  originalDeadline: Date;
  actualCompletion: Date;
  variance: number; // minutes (negative = early, positive = late)
  accuracyScore: number; // 0-100
  category: string;
  complexity: 'low' | 'medium' | 'high';
  successFactors: string[];
  challenges: string[];
}

export interface PersonalDeadlinePattern {
  userId: string;
  patternType: 'early_finisher' | 'last_minute' | 'consistent' | 'unpredictable';
  averageDeadlineAccuracy: number; // 0-100
  optimalBufferTime: number; // minutes
  peakPerformancePeriods: {
    dayOfWeek: string;
    timeRange: { start: number; end: number };
    efficiency: number;
  }[];
  procrastinationTriggers: string[];
  motivationFactors: string[];
}

export interface DeadlineOptimizationSuggestion {
  type: 'reschedule' | 'break_down' | 'delegate' | 'prioritize' | 'buffer_adjust';
  urgency: 'immediate' | 'soon' | 'moderate' | 'low';
  description: string;
  expectedImpact: string;
  estimatedTimeInvestment: number; // minutes
  successProbability: number; // 0-100
}

export interface SmartDeadlineRecommendation {
  originalDeadline: Date;
  recommendedDeadline: Date;
  bufferTime: number; // minutes
  reasoning: string[];
  riskMitigation: string[];
  alternativeOptions: {
    deadline: Date;
    tradeoffs: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }[];
}

export interface DeadlineIntelligenceMetrics {
  overallAccuracy: number; // 0-100
  riskAssessments: DeadlineRiskAssessment[];
  performanceHistory: DeadlinePerformanceHistory[];
  personalPatterns: PersonalDeadlinePattern;
  optimizationSuggestions: DeadlineOptimizationSuggestion[];
  upcomingDeadlines: {
    task: Task;
    daysRemaining: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    readinessScore: number; // 0-100
  }[];
}

export class PersonalDeadlineIntelligence {
  private deadlineHistory: Map<string, DeadlinePerformanceHistory[]> = new Map();
  private userPatterns: PersonalDeadlinePattern | null = null;

  constructor(private userId: string) {}

  /**
   * Assess deadline risk for specific task
   */
  async assessDeadlineRisk(
    task: Task,
    actions: ActionEvent[],
    similarTasks: Task[] = []
  ): Promise<DeadlineRiskAssessment> {
    const deadline = new Date(task.deadline);
    const now = new Date();
    const timeRemaining = deadline.getTime() - now.getTime();
    
    // Calculate current progress
    const currentProgress = this.calculateTaskProgress(task, actions);
    
    // Estimate completion time based on patterns
    const estimatedCompletion = await this.estimateCompletionTime(task, actions, similarTasks);
    
    // Identify risk factors
    const riskFactors = await this.identifyRiskFactors(task, actions, timeRemaining);
    
    // Calculate risk level
    const riskLevel = this.calculateRiskLevel(timeRemaining, estimatedCompletion, currentProgress);
    
    // Generate recommendations
    const recommendedActions = this.generateDeadlineRecommendations(task, riskLevel, riskFactors);
    
    // Calculate needed buffer time
    const bufferTime = this.calculateOptimalBuffer(task, estimatedCompletion, deadline);
    
    // Confidence in assessment
    const confidenceScore = this.calculateAssessmentConfidence(task, actions, similarTasks);

    return {
      taskId: task.id,
      taskName: task.name,
      deadline,
      currentProgress,
      estimatedCompletion,
      riskLevel,
      riskFactors,
      recommendedActions,
      bufferTime,
      confidenceScore
    };
  }

  /**
   * Analyze personal deadline performance patterns
   */
  async analyzePersonalDeadlinePatterns(
    completedTasks: Task[],
    actions: ActionEvent[]
  ): Promise<PersonalDeadlinePattern> {
    // Analyze completion patterns
    const completionData = completedTasks.map(task => {
      const deadline = new Date(task.deadline);
      const completion = this.getTaskCompletionDate(task, actions);
      const variance = completion ? completion.getTime() - deadline.getTime() : 0;
      
      return { task, deadline, completion, variance };
    }).filter(data => data.completion);

    // Determine pattern type
    const patternType = this.identifyDeadlinePersonality(completionData);
    
    // Calculate average accuracy
    const averageDeadlineAccuracy = this.calculateAverageAccuracy(completionData);
    
    // Find optimal buffer time
    const optimalBufferTime = this.findOptimalBufferTime(completionData);
    
    // Identify peak performance periods
    const peakPerformancePeriods = this.identifyPeakPerformancePeriods(actions, completedTasks);
    
    // Find procrastination triggers
    const procrastinationTriggers = this.identifyProcrastinationTriggers(actions, completionData);
    
    // Find motivation factors
    const motivationFactors = this.identifyMotivationFactors(actions, completedTasks);

    this.userPatterns = {
      userId: this.userId,
      patternType,
      averageDeadlineAccuracy,
      optimalBufferTime,
      peakPerformancePeriods,
      procrastinationTriggers,
      motivationFactors
    };

    return this.userPatterns;
  }

  /**
   * Generate smart deadline recommendations
   */
  async generateSmartDeadlineRecommendation(
    task: Task,
    requestedDeadline: Date,
    actions: ActionEvent[] = [],
    similarTasks: Task[] = []
  ): Promise<SmartDeadlineRecommendation> {
    // Estimate realistic completion time
    const estimatedCompletion = await this.estimateCompletionTime(task, actions, similarTasks);
    
    // Calculate optimal buffer
    const bufferTime = this.calculateOptimalBuffer(task, estimatedCompletion, requestedDeadline);
    
    // Generate recommended deadline
    const recommendedDeadline = new Date(estimatedCompletion.getTime() + bufferTime);
    
    // Provide reasoning
    const reasoning = this.generateDeadlineReasoning(task, estimatedCompletion, bufferTime);
    
    // Risk mitigation strategies
    const riskMitigation = this.generateRiskMitigation(task, requestedDeadline, recommendedDeadline);
    
    // Alternative options
    const alternativeOptions = this.generateAlternativeDeadlines(task, estimatedCompletion, requestedDeadline);

    return {
      originalDeadline: requestedDeadline,
      recommendedDeadline,
      bufferTime,
      reasoning,
      riskMitigation,
      alternativeOptions
    };
  }

  /**
   * Get comprehensive deadline intelligence metrics
   */
  async getDeadlineIntelligenceMetrics(
    tasks: Task[],
    actions: ActionEvent[]
  ): Promise<DeadlineIntelligenceMetrics> {
    const completedTasks = tasks.filter(task => task.status === 'done');
    const activeTasks = tasks.filter(task => ['todo', 'inprogress'].includes(task.status));
    
    // Risk assessments for active tasks
    const riskAssessments = await Promise.all(
      activeTasks.map(task => this.assessDeadlineRisk(task, actions, completedTasks))
    );
    
    // Performance history
    const performanceHistory = await this.generatePerformanceHistory(completedTasks, actions);
    
    // Personal patterns
    const personalPatterns = await this.analyzePersonalDeadlinePatterns(completedTasks, actions);
    
    // Optimization suggestions
    const optimizationSuggestions = this.generateOptimizationSuggestions(riskAssessments, personalPatterns);
    
    // Overall accuracy
    const overallAccuracy = performanceHistory.length > 0
      ? performanceHistory.reduce((sum, p) => sum + p.accuracyScore, 0) / performanceHistory.length
      : 0;
    
    // Upcoming deadlines analysis
    const upcomingDeadlines = this.analyzeUpcomingDeadlines(activeTasks, riskAssessments);

    return {
      overallAccuracy,
      riskAssessments,
      performanceHistory,
      personalPatterns,
      optimizationSuggestions,
      upcomingDeadlines
    };
  }

  // Helper Methods
  private calculateTaskProgress(task: Task, actions: ActionEvent[]): number {
    // Calculate progress based on task actions và status
    const taskActions = actions.filter(action => 
      action.entityType === 'task' && action.entityId === task.id
    );
    
    if (task.progress !== undefined) {
      return task.progress;
    }
    
    if (task.status === 'done') return 100;
    if (task.status === 'inprogress') {
      // Estimate based on action frequency
      const editActions = taskActions.filter(a => a.actionType === 'edit').length;
      return Math.min(90, editActions * 10);
    }
    if (task.status === 'todo') return 0;
    
    return 0;
  }

  private async estimateCompletionTime(
    task: Task,
    actions: ActionEvent[],
    similarTasks: Task[]
  ): Promise<Date> {
    const now = new Date();
    
    // Base estimate from task duration
    let estimatedHours = (task.duration || 1) * 8;
    
    // Adjust based on similar tasks
    if (similarTasks.length > 0) {
      const similarDurations = similarTasks
        .filter(t => t.status === 'done')
        .map(t => t.duration || 1);
      
      if (similarDurations.length > 0) {
        const avgDuration = similarDurations.reduce((sum, d) => sum + d, 0) / similarDurations.length;
        estimatedHours = avgDuration * 8;
      }
    }
    
    // Adjust based on current progress
    const currentProgress = this.calculateTaskProgress(task, actions);
    const remainingProgress = (100 - currentProgress) / 100;
    estimatedHours *= remainingProgress;
    
    // Apply personal patterns if available
    if (this.userPatterns) {
      const patternMultiplier = this.getPatternMultiplier(this.userPatterns.patternType);
      estimatedHours *= patternMultiplier;
    }
    
    // Convert to completion date (assuming 8 work hours per day)
    const estimatedDays = Math.ceil(estimatedHours / 8);
    const completionDate = new Date(now);
    completionDate.setDate(completionDate.getDate() + estimatedDays);
    
    return completionDate;
  }

  private async identifyRiskFactors(
    task: Task,
    actions: ActionEvent[],
    timeRemaining: number
  ): Promise<DeadlineRiskFactor[]> {
    const factors: DeadlineRiskFactor[] = [];
    
    // Time pressure factor
    const daysRemaining = timeRemaining / (1000 * 60 * 60 * 24);
    if (daysRemaining < 1) {
      factors.push({
        factor: 'Critical Time Pressure',
        impact: 'negative',
        severity: 9,
        description: 'Less than 1 day remaining',
        mitigation: 'Focus on essential features only'
      });
    } else if (daysRemaining < 3) {
      factors.push({
        factor: 'High Time Pressure',
        impact: 'negative',
        severity: 7,
        description: 'Less than 3 days remaining',
        mitigation: 'Eliminate non-essential tasks'
      });
    }
    
    // Complexity factor
    const estimatedDuration = (task.duration || 1) * 8;
    if (estimatedDuration > 16) {
      factors.push({
        factor: 'High Complexity',
        impact: 'negative',
        severity: 6,
        description: 'Task estimated to take more than 2 days',
        mitigation: 'Break down into smaller subtasks'
      });
    }
    
    // Progress factor
    const progress = this.calculateTaskProgress(task, actions);
    if (progress < 20 && daysRemaining < 5) {
      factors.push({
        factor: 'Low Progress',
        impact: 'negative',
        severity: 8,
        description: 'Limited progress with approaching deadline',
        mitigation: 'Increase daily time allocation'
      });
    }
    
    // Dependencies factor
    if (task.dependencies && task.dependencies.length > 0) {
      factors.push({
        factor: 'Task Dependencies',
        impact: 'negative',
        severity: 5,
        description: 'Task has dependencies that may cause delays',
        mitigation: 'Follow up on dependent tasks'
      });
    }
    
    return factors;
  }

  private calculateRiskLevel(
    timeRemaining: number,
    estimatedCompletion: Date,
    currentProgress: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const now = new Date();
    const completionBuffer = estimatedCompletion.getTime() - now.getTime();
    
    if (timeRemaining <= 0) return 'critical';
    if (completionBuffer > timeRemaining) return 'critical';
    if (completionBuffer > timeRemaining * 0.8) return 'high';
    if (completionBuffer > timeRemaining * 0.5) return 'medium';
    return 'low';
  }

  private generateDeadlineRecommendations(
    task: Task,
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    riskFactors: DeadlineRiskFactor[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (riskLevel === 'critical') {
      recommendations.push('URGENT: Focus exclusively on this task');
      recommendations.push('Consider requesting deadline extension');
      recommendations.push('Identify minimum viable deliverable');
    } else if (riskLevel === 'high') {
      recommendations.push('Increase daily time allocation');
      recommendations.push('Minimize context switching');
      recommendations.push('Delegate or defer other tasks');
    } else if (riskLevel === 'medium') {
      recommendations.push('Monitor progress daily');
      recommendations.push('Prepare contingency plan');
    } else {
      recommendations.push('Maintain current pace');
      recommendations.push('Use extra time for quality improvements');
    }
    
    // Add factor-specific recommendations
    riskFactors.forEach(factor => {
      if (factor.mitigation) {
        recommendations.push(factor.mitigation);
      }
    });
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  private calculateOptimalBuffer(
    task: Task,
    estimatedCompletion: Date,
    deadline: Date
  ): number {
    const estimatedDuration = (task.duration || 1) * 8 * 60; // minutes
    
    // Base buffer: 20% of estimated duration
    let buffer = estimatedDuration * 0.2;
    
    // Adjust based on task complexity
    if (estimatedDuration > 16 * 60) { // More than 2 days
      buffer = estimatedDuration * 0.3; // 30% buffer for complex tasks
    }
    
    // Apply personal patterns
    if (this.userPatterns) {
      buffer = Math.max(buffer, this.userPatterns.optimalBufferTime);
    }
    
    return Math.round(buffer);
  }

  private calculateAssessmentConfidence(
    task: Task,
    actions: ActionEvent[],
    similarTasks: Task[]
  ): number {
    let confidence = 50; // Base confidence
    
    // More similar tasks = higher confidence
    confidence += Math.min(30, similarTasks.length * 5);
    
    // More action history = higher confidence
    const taskActions = actions.filter(action => 
      action.entityType === 'task' && action.entityId === task.id
    );
    confidence += Math.min(15, taskActions.length * 2);
    
    // Personal patterns available = higher confidence
    if (this.userPatterns) {
      confidence += 15;
    }
    
    return Math.min(100, confidence);
  }

  private getTaskCompletionDate(task: Task, actions: ActionEvent[]): Date | null {
    const completeAction = actions.find(action => 
      action.entityType === 'task' && 
      action.entityId === task.id && 
      action.actionType === 'complete'
    );
    
    return completeAction ? completeAction.timestamp : null;
  }

  private identifyDeadlinePersonality(completionData: any[]): 'early_finisher' | 'last_minute' | 'consistent' | 'unpredictable' {
    if (completionData.length < 3) return 'unpredictable';
    
    const variances = completionData.map(d => d.variance);
    const avgVariance = variances.reduce((sum, v) => sum + v, 0) / variances.length;
    const standardDeviation = Math.sqrt(
      variances.reduce((sum, v) => sum + Math.pow(v - avgVariance, 2), 0) / variances.length
    );
    
    const dayInMs = 1000 * 60 * 60 * 24;
    
    if (avgVariance < -dayInMs) return 'early_finisher';
    if (avgVariance > dayInMs && standardDeviation < dayInMs) return 'last_minute';
    if (standardDeviation < dayInMs / 2) return 'consistent';
    return 'unpredictable';
  }

  private calculateAverageAccuracy(completionData: any[]): number {
    if (completionData.length === 0) return 0;
    
    const accuracies = completionData.map(data => {
      const dayInMs = 1000 * 60 * 60 * 24;
      const absVariance = Math.abs(data.variance);
      return Math.max(0, 100 - (absVariance / dayInMs) * 10);
    });
    
    return accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
  }

  private findOptimalBufferTime(completionData: any[]): number {
    if (completionData.length === 0) return 2 * 60; // Default 2 hours
    
    const lateCompletions = completionData.filter(d => d.variance > 0);
    if (lateCompletions.length === 0) return 1 * 60; // 1 hour for early finishers
    
    const avgLateness = lateCompletions.reduce((sum, d) => sum + d.variance, 0) / lateCompletions.length;
    return Math.round(avgLateness / (1000 * 60)); // Convert to minutes
  }

  private identifyPeakPerformancePeriods(actions: ActionEvent[], tasks: Task[]): {
    dayOfWeek: string;
    timeRange: { start: number; end: number };
    efficiency: number;
  }[] {
    const dayEfficiency = new Map<string, number[]>();
    const hourEfficiency = new Map<number, number[]>();
    
    actions.forEach(action => {
      const dayOfWeek = action.timestamp.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = action.timestamp.getHours();
      const efficiency = action.actionType === 'complete' ? 100 : 70;
      
      if (!dayEfficiency.has(dayOfWeek)) {
        dayEfficiency.set(dayOfWeek, []);
      }
      dayEfficiency.get(dayOfWeek)!.push(efficiency);
      
      if (!hourEfficiency.has(hour)) {
        hourEfficiency.set(hour, []);
      }
      hourEfficiency.get(hour)!.push(efficiency);
    });
    
    const periods: {
      dayOfWeek: string;
      timeRange: { start: number; end: number };
      efficiency: number;
    }[] = [];
    
    dayEfficiency.forEach((efficiencies, day) => {
      const avgEfficiency = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
      
      if (avgEfficiency > 80) {
        periods.push({
          dayOfWeek: day,
          timeRange: { start: 9, end: 17 }, // Default work hours
          efficiency: avgEfficiency
        });
      }
    });
    
    return periods.sort((a, b) => b.efficiency - a.efficiency);
  }

  private identifyProcrastinationTriggers(actions: ActionEvent[], completionData: any[]): string[] {
    const triggers: string[] = [];
    
    // Analyze late completions
    const lateCompletions = completionData.filter(d => d.variance > 0);
    if (lateCompletions.length > completionData.length * 0.3) {
      triggers.push('Tendency to underestimate task duration');
    }
    
    // Check for infrequent action patterns
    const taskUpdateFrequency = new Map<string, number>();
    actions.forEach(action => {
      if (action.entityType === 'task') {
        const current = taskUpdateFrequency.get(action.entityId) || 0;
        taskUpdateFrequency.set(action.entityId, current + 1);
      }
    });
    
    const avgUpdates = Array.from(taskUpdateFrequency.values())
      .reduce((sum, count) => sum + count, 0) / taskUpdateFrequency.size;
    
    if (avgUpdates < 3) {
      triggers.push('Infrequent task updates leading to last-minute rushes');
    }
    
    return triggers;
  }

  private identifyMotivationFactors(actions: ActionEvent[], tasks: Task[]): string[] {
    const factors: string[] = [];
    
    // Check for patterns in successful completions
    const completedTasks = tasks.filter(t => t.status === 'done');
    const fastCompletions = completedTasks.filter(task => {
      const estimated = (task.duration || 1) * 8;
      return estimated > 8; // Complex tasks completed efficiently
    });
    
    if (fastCompletions.length > 0) {
      factors.push('Performs well on complex, challenging tasks');
    }
    
    // Check action consistency
    const actionDays = new Set(actions.map(a => 
      a.timestamp.toDateString()
    )).size;
    
    if (actionDays > 5) {
      factors.push('Consistent daily engagement');
    }
    
    return factors;
  }

  private getPatternMultiplier(patternType: 'early_finisher' | 'last_minute' | 'consistent' | 'unpredictable'): number {
    switch (patternType) {
      case 'early_finisher': return 0.8;
      case 'last_minute': return 1.2;
      case 'consistent': return 1.0;
      case 'unpredictable': return 1.3;
      default: return 1.0;
    }
  }

  private async generatePerformanceHistory(
    completedTasks: Task[],
    actions: ActionEvent[]
  ): Promise<DeadlinePerformanceHistory[]> {
    const history: DeadlinePerformanceHistory[] = [];
    
    for (const task of completedTasks) {
      const deadline = new Date(task.deadline);
      const completion = this.getTaskCompletionDate(task, actions);
      
      if (completion) {
        const variance = completion.getTime() - deadline.getTime();
        const accuracyScore = Math.max(0, 100 - Math.abs(variance) / (1000 * 60 * 60 * 24) * 10);
        
        history.push({
          taskId: task.id,
          taskName: task.name,
          originalDeadline: deadline,
          actualCompletion: completion,
          variance: variance / (1000 * 60), // Convert to minutes
          accuracyScore,
          category: task.categoryId || 'General',
          complexity: (task.duration || 1) > 2 ? 'high' : (task.duration || 1) > 1 ? 'medium' : 'low',
          successFactors: variance < 0 ? ['Completed early'] : ['Completed on time'],
          challenges: variance > 0 ? ['Completed late'] : []
        });
      }
    }
    
    return history.sort((a, b) => b.actualCompletion.getTime() - a.actualCompletion.getTime());
  }

  private generateOptimizationSuggestions(
    riskAssessments: DeadlineRiskAssessment[],
    patterns: PersonalDeadlinePattern
  ): DeadlineOptimizationSuggestion[] {
    const suggestions: DeadlineOptimizationSuggestion[] = [];
    
    // High-risk tasks need immediate attention
    const highRiskTasks = riskAssessments.filter(r => ['high', 'critical'].includes(r.riskLevel));
    highRiskTasks.forEach(task => {
      suggestions.push({
        type: 'prioritize',
        urgency: 'immediate',
        description: `Focus on ${task.taskName} - ${task.riskLevel} deadline risk`,
        expectedImpact: 'Prevent deadline miss',
        estimatedTimeInvestment: 30,
        successProbability: 85
      });
    });
    
    // Pattern-based suggestions
    if (patterns.patternType === 'last_minute') {
      suggestions.push({
        type: 'buffer_adjust',
        urgency: 'moderate',
        description: 'Increase buffer time for future tasks based on last-minute pattern',
        expectedImpact: 'Improve deadline accuracy',
        estimatedTimeInvestment: 15,
        successProbability: 70
      });
    }
    
    if (patterns.averageDeadlineAccuracy < 70) {
      suggestions.push({
        type: 'break_down',
        urgency: 'soon',
        description: 'Break complex tasks into smaller milestones',
        expectedImpact: 'Better progress tracking và deadline management',
        estimatedTimeInvestment: 45,
        successProbability: 80
      });
    }
    
    return suggestions.sort((a, b) => {
      const urgencyOrder = { 'immediate': 0, 'soon': 1, 'moderate': 2, 'low': 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }

  private analyzeUpcomingDeadlines(
    activeTasks: Task[],
    riskAssessments: DeadlineRiskAssessment[]
  ): {
    task: Task;
    daysRemaining: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    readinessScore: number;
  }[] {
    const now = new Date();
    
    return activeTasks.map(task => {
      const deadline = new Date(task.deadline);
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      const riskAssessment = riskAssessments.find(r => r.taskId === task.id);
      const riskLevel = riskAssessment?.riskLevel || 'medium';
      
      // Calculate readiness score based on progress và time remaining
      const progress = task.progress || 0;
      const estimatedDays = (task.duration || 1);
      const readinessScore = Math.min(100, (progress / 100) * 50 + (daysRemaining / estimatedDays) * 50);
      
      return {
        task,
        daysRemaining,
        riskLevel,
        readinessScore
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  private generateDeadlineReasoning(
    task: Task,
    estimatedCompletion: Date,
    bufferTime: number
  ): string[] {
    const reasoning: string[] = [];
    
    const estimatedDays = (task.duration || 1);
    reasoning.push(`Task estimated to require ${estimatedDays} day(s) of work`);
    
    if (bufferTime > 4 * 60) { // More than 4 hours buffer
      reasoning.push(`Added ${Math.round(bufferTime / 60)} hour buffer for unexpected challenges`);
    }
    
    if (this.userPatterns) {
      reasoning.push(`Adjusted based on your ${this.userPatterns.patternType.replace('_', ' ')} pattern`);
    }
    
    return reasoning;
  }

  private generateRiskMitigation(
    task: Task,
    originalDeadline: Date,
    recommendedDeadline: Date
  ): string[] {
    const mitigation: string[] = [];
    
    const timeDiff = recommendedDeadline.getTime() - originalDeadline.getTime();
    if (timeDiff > 0) {
      mitigation.push('Negotiate deadline extension with stakeholders');
      mitigation.push('Identify minimum viable deliverable if extension not possible');
    }
    
    mitigation.push('Set up daily progress checkpoints');
    mitigation.push('Prepare contingency plan for potential delays');
    
    return mitigation;
  }

  private generateAlternativeDeadlines(
    task: Task,
    estimatedCompletion: Date,
    requestedDeadline: Date
  ): {
    deadline: Date;
    tradeoffs: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }[] {
    const alternatives = [];
    
    // Aggressive timeline
    const aggressiveDeadline = new Date(estimatedCompletion.getTime() - 24 * 60 * 60 * 1000);
    alternatives.push({
      deadline: aggressiveDeadline,
      tradeoffs: ['Minimal buffer time', 'High stress potential', 'May sacrifice quality'],
      riskLevel: 'high' as const
    });
    
    // Conservative timeline
    const conservativeDeadline = new Date(estimatedCompletion.getTime() + 3 * 24 * 60 * 60 * 1000);
    alternatives.push({
      deadline: conservativeDeadline,
      tradeoffs: ['Longer timeline', 'Extra time for quality', 'Lower pressure'],
      riskLevel: 'low' as const
    });
    
    return alternatives;
  }
}

export default PersonalDeadlineIntelligence;
