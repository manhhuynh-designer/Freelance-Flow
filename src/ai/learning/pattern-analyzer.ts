/**
 * Pattern Analyzer - Phase 4.2
 * Advanced pattern recognition for user behavior analysis
 */

import type { ActionEvent, UserBehaviorPattern, PatternType } from './behavior-tracker';

export interface PatternInsight {
  id: string;
  type: PatternType;
  description: string;
  confidence: number;
  strength: number;
  frequency: number;
  examples: string[];
  impact: 'positive' | 'negative' | 'neutral';
  recommendations: string[];
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface WorkflowSequence {
  sequence: string[];
  frequency: number;
  avgDuration: number;
  successRate: number;
  timeContext: string[];
}

export interface ProductivityCycle {
  peakHours: string[];
  lowHours: string[];
  weeklyPattern: Record<string, number>;
  monthlyTrend: number[];
  seasonalFactors: Record<string, number>;
}

export interface DecisionPattern {
  decisionType: string;
  factors: string[];
  outcomes: Record<string, number>;
  timeToDecision: number; // average seconds
  changeFrequency: number; // how often decisions are reversed
}

export class PatternAnalyzer {
  private patterns: Map<string, PatternInsight> = new Map();
  private workflowSequences: WorkflowSequence[] = [];
  private productivityCycles: ProductivityCycle | null = null;
  private decisionPatterns: DecisionPattern[] = [];

  constructor(private userId: string) {}

  // Compatibility wrapper used by older call sites
  async analyzePatterns(actions: ActionEvent[]): Promise<PatternInsight[]> {
    return this.analyzeAllPatterns(actions);
  }

  /**
   * Analyze all patterns from action history
   */
  async analyzeAllPatterns(actions: ActionEvent[]): Promise<PatternInsight[]> {
    // Reset patterns for fresh analysis
    this.patterns.clear();

    // Analyze different pattern types
    await this.analyzeWorkflowPatterns(actions);
    await this.analyzeTimeBasedPatterns(actions);
    await this.analyzeProductivityPatterns(actions);
    await this.analyzeDecisionPatterns(actions);
    await this.analyzeAIInteractionPatterns(actions);
    await this.analyzeProcrastinationPatterns(actions);
    await this.analyzeTaskClusteringPatterns(actions);

    return Array.from(this.patterns.values());
  }

  /**
   * Workflow Sequence Analysis
   */
  private async analyzeWorkflowPatterns(actions: ActionEvent[]): Promise<void> {
    const sequences = this.extractWorkflowSequences(actions);
    
    for (const sequence of sequences) {
      if (sequence.frequency >= 3 && sequence.successRate > 0.7) {
        const pattern: PatternInsight = {
          id: `workflow_${sequence.sequence.join('_')}`,
          type: 'workflow_sequence',
          description: `Người dùng thường thực hiện sequence: ${sequence.sequence.join(' → ')}`,
          confidence: Math.min(0.95, sequence.frequency / 10 + sequence.successRate * 0.3),
          strength: sequence.successRate,
          frequency: sequence.frequency,
          examples: [`Lần gần nhất: ${sequence.timeContext.slice(0, 3).join(', ')}`],
          impact: sequence.successRate > 0.8 ? 'positive' : 'neutral',
          recommendations: this.generateWorkflowRecommendations(sequence),
          trend: this.calculateTrend(actions, sequence.sequence)
        };
        
        this.patterns.set(pattern.id, pattern);
      }
    }
  }

  /**
   * Time-based Pattern Analysis
   */
  private async analyzeTimeBasedPatterns(actions: ActionEvent[]): Promise<void> {
    const timeGroups = this.groupActionsByTime(actions);
    
    // Analyze daily patterns
    const dailyPattern = this.analyzeDailyPattern(timeGroups);
    if (dailyPattern.peakHours.length > 0) {
      const pattern: PatternInsight = {
        id: 'time_daily_peak',
        type: 'time_preference',
        description: `Thời gian làm việc hiệu quả nhất: ${dailyPattern.peakHours.join(', ')}`,
        confidence: 0.85,
        strength: this.calculateTimePatternStrength(dailyPattern.peakHours, timeGroups),
        frequency: this.countActionsInTimeSlots(dailyPattern.peakHours, actions),
        examples: [`Số task hoàn thành trong peak hours: ${this.countActionsInTimeSlots(dailyPattern.peakHours, actions)}`],
        impact: 'positive',
        recommendations: [
          `Lên lịch các task quan trọng vào ${dailyPattern.peakHours[0]}`,
          'Tránh meeting trong low-energy hours',
          'Sử dụng peak hours cho deep work'
        ],
        trend: 'stable'
      };
      this.patterns.set(pattern.id, pattern);
    }

    // Analyze weekly patterns
    const weeklyPattern = this.analyzeWeeklyPattern(timeGroups);
    const productiveDays = Object.entries(weeklyPattern)
      .filter(([_, score]) => score > 0.7)
      .map(([day, _]) => day);
    
    if (productiveDays.length > 0) {
      const pattern: PatternInsight = {
        id: 'time_weekly_pattern',
        type: 'productivity_cycle',
        description: `Ngày làm việc hiệu quả nhất: ${productiveDays.join(', ')}`,
        confidence: 0.8,
        strength: Math.max(...Object.values(weeklyPattern)),
        frequency: productiveDays.length,
        examples: [`Productivity score các ngày: ${JSON.stringify(weeklyPattern)}`],
        impact: 'positive',
        recommendations: [
          'Lên lịch deadline vào productive days',
          'Dành low-energy days cho planning và admin tasks'
        ],
        trend: 'stable'
      };
      this.patterns.set(pattern.id, pattern);
    }
  }

  /**
   * Productivity Pattern Analysis
   */
  private async analyzeProductivityPatterns(actions: ActionEvent[]): Promise<void> {
    const productivityMetrics = this.calculateProductivityMetrics(actions);
    
    // Task completion clustering
    const completionClusters = this.analyzeTaskCompletionClustering(actions);
    if (completionClusters.batchCompletion > 0.6) {
      const pattern: PatternInsight = {
        id: 'productivity_batch_completion',
        type: 'task_clustering',
        description: 'Người dùng có xu hướng hoàn thành tasks theo batch (nhóm)',
        confidence: completionClusters.batchCompletion,
        strength: completionClusters.averageBatchSize,
        frequency: completionClusters.batchCount,
        examples: [`Average batch size: ${completionClusters.averageBatchSize} tasks`],
        impact: 'positive',
        recommendations: [
          'Organize similar tasks together',
          'Block time cho batch processing',
          'Minimize context switching'
        ],
        trend: 'increasing'
      };
      this.patterns.set(pattern.id, pattern);
    }

    // Deep work sessions
    const deepWorkSessions = this.analyzeDeepWorkSessions(actions);
    if (deepWorkSessions.averageLength > 25) { // 25+ minutes
      const pattern: PatternInsight = {
        id: 'productivity_deep_work',
        type: 'productivity_cycle',
        description: `Thường có deep work sessions dài ${deepWorkSessions.averageLength} phút`,
        confidence: 0.75,
        strength: deepWorkSessions.consistencyScore,
        frequency: deepWorkSessions.sessionCount,
        examples: [`Longest session: ${deepWorkSessions.maxLength} phút`],
        impact: 'positive',
        recommendations: [
          'Maintain deep work blocks',
          'Eliminate distractions during sessions',
          'Schedule challenging tasks during these periods'
        ],
        trend: 'stable'
      };
      this.patterns.set(pattern.id, pattern);
    }
  }

  /**
   * Decision Pattern Analysis
   */
  private async analyzeDecisionPatterns(actions: ActionEvent[]): Promise<void> {
    const decisions = this.extractDecisionEvents(actions);
    
    // Task prioritization decisions
    const prioritizationPattern = this.analyzePrioritizationDecisions(decisions);
    if (prioritizationPattern.changeFrequency > 0.3) {
      const pattern: PatternInsight = {
        id: 'decision_prioritization_instability',
        type: 'decision_making',
        description: 'Thường thay đổi priority của tasks (instability)',
        confidence: prioritizationPattern.changeFrequency,
        strength: 1 - prioritizationPattern.changeFrequency, // inverse strength
        frequency: decisions.length,
        examples: [`Change rate: ${(prioritizationPattern.changeFrequency * 100).toFixed(1)}%`],
        impact: 'negative',
        recommendations: [
          'Spend more time on initial planning',
          'Use Eisenhower matrix for prioritization',
          'Review priorities weekly, not daily'
        ],
        trend: 'stable'
      };
      this.patterns.set(pattern.id, pattern);
    }
  }

  /**
   * AI Interaction Pattern Analysis
   */
  private async analyzeAIInteractionPatterns(actions: ActionEvent[]): Promise<void> {
    const aiActions = actions.filter(a => a.actionType === 'ai_query' || a.entityType === 'ai_prediction');
    
    if (aiActions.length < 5) return; // Not enough data

    const acceptanceRate = this.calculateAIAcceptanceRate(aiActions);
    const trustLevel = this.calculateAITrustLevel(aiActions);

    if (acceptanceRate < 0.5) {
      const pattern: PatternInsight = {
        id: 'ai_low_acceptance',
        type: 'ai_interaction',
        description: `Tỷ lệ chấp nhận AI recommendations thấp (${(acceptanceRate * 100).toFixed(1)}%)`,
        confidence: 0.8,
        strength: 1 - acceptanceRate,
        frequency: aiActions.length,
        examples: [`Trust level: ${(trustLevel * 100).toFixed(1)}%`],
        impact: 'negative',
        recommendations: [
          'AI đang học và cải thiện, hãy thử give feedback',
          'Start với small AI suggestions',
          'Review accuracy của past predictions'
        ],
        trend: trustLevel > acceptanceRate ? 'increasing' : 'decreasing'
      };
      this.patterns.set(pattern.id, pattern);
    }
  }

  /**
   * Procrastination Pattern Analysis
   */
  private async analyzeProcrastinationPatterns(actions: ActionEvent[]): Promise<void> {
    const procrastinationSignals = this.detectProcrastinationSignals(actions);
    
    if (procrastinationSignals.delayedStartRatio > 0.4) {
      const pattern: PatternInsight = {
        id: 'procrastination_delayed_start',
        type: 'procrastination',
        description: 'Xu hướng trì hoãn start tasks (procrastination)',
        confidence: procrastinationSignals.delayedStartRatio,
        strength: procrastinationSignals.averageDelay,
        frequency: procrastinationSignals.delayedTasks,
        examples: [`Average delay: ${procrastinationSignals.averageDelay} ngày`],
        impact: 'negative',
        recommendations: [
          'Break large tasks into smaller ones',
          'Set artificial shorter deadlines',
          'Use pomodoro technique for starting',
          'Identify và address blockers early'
        ],
        trend: procrastinationSignals.isIncreasing ? 'increasing' : 'decreasing'
      };
      this.patterns.set(pattern.id, pattern);
    }
  }

  /**
   * Task Clustering Pattern Analysis
   */
  private async analyzeTaskClusteringPatterns(actions: ActionEvent[]): Promise<void> {
    const clusters = this.analyzeTaskClusters(actions);
    
    if (clusters.categoryClusterStrength > 0.7) {
      const pattern: PatternInsight = {
        id: 'clustering_by_category',
        type: 'task_clustering',
        description: 'Thường nhóm tasks theo category khi làm việc',
        confidence: clusters.categoryClusterStrength,
        strength: clusters.categoryClusterStrength,
        frequency: clusters.clusteringSessions,
        examples: [`Cluster efficiency: ${(clusters.efficiency * 100).toFixed(1)}%`],
        impact: 'positive',
        recommendations: [
          'Continue grouping similar tasks',
          'Create themed work sessions',
          'Batch similar activities together'
        ],
        trend: 'stable'
      };
      this.patterns.set(pattern.id, pattern);
    }
  }

  // Helper methods for pattern analysis
  private extractWorkflowSequences(actions: ActionEvent[]): WorkflowSequence[] {
    // Group actions into sessions and extract common sequences
    const sequences: WorkflowSequence[] = [];
    const sessionGroups = this.groupActionsBySessions(actions);
    
    for (const session of sessionGroups) {
      const actionSequence = session.map(a => a.actionType);
      if (actionSequence.length >= 3) {
        // Find existing sequence or create new one
        const existingSequence = sequences.find(s => 
          JSON.stringify(s.sequence) === JSON.stringify(actionSequence)
        );
        
        if (existingSequence) {
          existingSequence.frequency++;
        } else {
          sequences.push({
            sequence: actionSequence,
            frequency: 1,
            avgDuration: session.reduce((sum, a) => sum + (a.duration || 0), 0) / session.length,
            successRate: session.filter(a => a.outcome === 'success').length / session.length,
            timeContext: session.map(a => a.timestamp.toISOString())
          });
        }
      }
    }
    
    return sequences.filter(s => s.frequency >= 2);
  }

  private groupActionsByTime(actions: ActionEvent[]): Record<string, ActionEvent[]> {
    const groups: Record<string, ActionEvent[]> = {};
    
    actions.forEach(action => {
      const hour = action.timestamp.getHours();
      const timeSlot = `${hour}:00-${hour + 1}:00`;
      
      if (!groups[timeSlot]) groups[timeSlot] = [];
      groups[timeSlot].push(action);
    });
    
    return groups;
  }

  private analyzeDailyPattern(timeGroups: Record<string, ActionEvent[]>): {
    peakHours: string[];
    lowHours: string[];
  } {
    const hourlyScores = Object.entries(timeGroups).map(([timeSlot, actions]) => ({
      timeSlot,
      score: actions.filter(a => a.outcome === 'success').length / Math.max(actions.length, 1)
    }));
    
    hourlyScores.sort((a, b) => b.score - a.score);
    
    return {
      peakHours: hourlyScores.slice(0, 3).map(h => h.timeSlot),
      lowHours: hourlyScores.slice(-2).map(h => h.timeSlot)
    };
  }

  private analyzeWeeklyPattern(timeGroups: Record<string, ActionEvent[]>): Record<string, number> {
    const weeklyScores: Record<string, number> = {};
    
    Object.values(timeGroups).flat().forEach(action => {
      const dayOfWeek = action.timestamp.toLocaleDateString('en-US', { weekday: 'long' });
      if (!weeklyScores[dayOfWeek]) weeklyScores[dayOfWeek] = 0;
      weeklyScores[dayOfWeek] += action.outcome === 'success' ? 1 : 0;
    });
    
    // Normalize scores
    const maxScore = Math.max(...Object.values(weeklyScores));
    Object.keys(weeklyScores).forEach(day => {
      weeklyScores[day] = weeklyScores[day] / maxScore;
    });
    
    return weeklyScores;
  }

  private calculateProductivityMetrics(actions: ActionEvent[]): {
    completionRate: number;
    averageTaskDuration: number;
    focusScore: number;
  } {
    const taskActions = actions.filter(a => a.entityType === 'task');
    const completions = taskActions.filter(a => a.actionType === 'complete');
    
    return {
      completionRate: taskActions.length > 0 ? completions.length / taskActions.length : 0,
      averageTaskDuration: completions.reduce((sum, a) => sum + (a.duration || 0), 0) / Math.max(completions.length, 1),
      focusScore: this.calculateFocusScore(actions)
    };
  }

  private calculateFocusScore(actions: ActionEvent[]): number {
    // Calculate focus based on context switching frequency
    let contextSwitches = 0;
    let currentContext = '';
    
    actions.forEach(action => {
      const context = `${action.entityType}_${action.actionType}`;
      if (currentContext && currentContext !== context) {
        contextSwitches++;
      }
      currentContext = context;
    });
    
    return Math.max(0, 1 - (contextSwitches / Math.max(actions.length, 1)));
  }

  private generateWorkflowRecommendations(sequence: WorkflowSequence): string[] {
    const recommendations = [];
    
    if (sequence.successRate > 0.9) {
      recommendations.push(`Workflow này rất hiệu quả, hãy template hóa nó`);
    }
    
    if (sequence.avgDuration > 120) { // > 2 hours
      recommendations.push(`Consider breaking this workflow into smaller chunks`);
    }
    
    recommendations.push(`Schedule time blocks cho workflow này`);
    
    return recommendations;
  }

  private calculateTrend(actions: ActionEvent[], sequence: string[]): 'increasing' | 'decreasing' | 'stable' {
    // Analyze frequency over time
    const recentActions = actions.filter(a => 
      a.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const olderActions = actions.filter(a => 
      a.timestamp <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    const recentFreq = this.countSequenceOccurrences(recentActions, sequence);
    const olderFreq = this.countSequenceOccurrences(olderActions, sequence);
    
    if (recentFreq > olderFreq * 1.2) return 'increasing';
    if (recentFreq < olderFreq * 0.8) return 'decreasing';
    return 'stable';
  }

  // Additional helper methods would be implemented here...
  private countSequenceOccurrences(actions: ActionEvent[], sequence: string[]): number {
    // Implementation for counting sequence occurrences
    return 0;
  }

  private groupActionsBySessions(actions: ActionEvent[]): ActionEvent[][] {
    // Implementation for grouping actions by sessions
    return [];
  }

  private calculateTimePatternStrength(peakHours: string[], timeGroups: Record<string, ActionEvent[]>): number {
    // Implementation for calculating time pattern strength
    return 0.8;
  }

  private countActionsInTimeSlots(timeSlots: string[], actions: ActionEvent[]): number {
    // Implementation for counting actions in specific time slots
    return 0;
  }

  private analyzeTaskCompletionClustering(actions: ActionEvent[]): {
    batchCompletion: number;
    averageBatchSize: number;
    batchCount: number;
  } {
    // Implementation for analyzing task completion clustering
    return { batchCompletion: 0.7, averageBatchSize: 3, batchCount: 5 };
  }

  private analyzeDeepWorkSessions(actions: ActionEvent[]): {
    averageLength: number;
    consistencyScore: number;
    sessionCount: number;
    maxLength: number;
  } {
    // Implementation for analyzing deep work sessions
    return { averageLength: 45, consistencyScore: 0.8, sessionCount: 10, maxLength: 90 };
  }

  private extractDecisionEvents(actions: ActionEvent[]): ActionEvent[] {
    // Implementation for extracting decision events
    return actions.filter(a => a.actionType === 'edit' && a.entityType === 'task');
  }

  private analyzePrioritizationDecisions(decisions: ActionEvent[]): {
    changeFrequency: number;
  } {
    // Implementation for analyzing prioritization decisions
    return { changeFrequency: 0.4 };
  }

  private calculateAIAcceptanceRate(aiActions: ActionEvent[]): number {
    // Implementation for calculating AI acceptance rate
    const acceptances = aiActions.filter(a => a.outcome === 'success');
    return aiActions.length > 0 ? acceptances.length / aiActions.length : 0;
  }

  private calculateAITrustLevel(aiActions: ActionEvent[]): number {
    // Implementation for calculating AI trust level
    return 0.6;
  }

  private detectProcrastinationSignals(actions: ActionEvent[]): {
    delayedStartRatio: number;
    averageDelay: number;
    delayedTasks: number;
    isIncreasing: boolean;
  } {
    // Implementation for detecting procrastination signals
    return {
      delayedStartRatio: 0.3,
      averageDelay: 2,
      delayedTasks: 5,
      isIncreasing: false
    };
  }

  private analyzeTaskClusters(actions: ActionEvent[]): {
    categoryClusterStrength: number;
    clusteringSessions: number;
    efficiency: number;
  } {
    // Implementation for analyzing task clusters
    return {
      categoryClusterStrength: 0.8,
      clusteringSessions: 8,
      efficiency: 0.85
    };
  }
}

export default PatternAnalyzer;
