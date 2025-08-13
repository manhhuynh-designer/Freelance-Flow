import type { Task, Client } from '@/lib/types';
import type { UserPattern } from '@/ai/learning/pattern-learner';
import type { ContextMemoryEntry } from '@/hooks/useContextMemory';
import type { 
  PredictionContext, 
  UserAnalysis, 
  TaskPatternAnalysis, 
  WorkloadAnalysis, 
  ClientAnalysis,
  PerformanceMetrics,
  CurrentWorkloadState
} from './prediction-context-types';

interface ContextBuilderInput {
  tasks: Task[];
  clients: Client[];
  userPatterns: UserPattern[];
  memoryEntries: ContextMemoryEntry[];
  actionHistory: any[];
  taskAnalysis: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
    upcomingDeadlineCount: number;
    activeTasks: Task[];
    completedTasks: Task[];
    overdueTasks: Task[];
    upcomingDeadlines: Task[];
  };
}

export class PredictionContextBuilder {
  private tasks: Task[];
  private clients: Client[];
  private userPatterns: UserPattern[];
  private memoryEntries: ContextMemoryEntry[];
  private actionHistory: any[];
  private taskAnalysis: any;

  constructor(input: ContextBuilderInput) {
    this.tasks = input.tasks || [];
    this.clients = input.clients || [];
    this.userPatterns = input.userPatterns || [];
    this.memoryEntries = input.memoryEntries || [];
    this.actionHistory = input.actionHistory || [];
    this.taskAnalysis = input.taskAnalysis;
  }

  /**
   * Build comprehensive context for AI predictions
   */
  public buildContext(): PredictionContext {
    const dataQuality = this.calculateDataQuality();
    const analysisDepth = this.determineAnalysisDepth(dataQuality);

    return {
      userProfile: this.analyzeUserProfile(),
      taskPatterns: this.analyzeTaskPatterns(),
      workloadInsights: this.analyzeWorkload(),
      clientRelationships: this.analyzeClientRelationships(),
      historicalPerformance: this.analyzePerformanceMetrics(),
      currentState: this.analyzeCurrentWorkloadState(),
      contextMetadata: {
        dataQuality,
        analysisDepth,
        lastUpdated: new Date(),
        predictionScope: this.determinePredictionScope()
      }
    };
  }

  /**
   * Analyze user working patterns and preferences
   */
  private analyzeUserProfile(): UserAnalysis {
    const timingPatterns = this.userPatterns.filter(p => p.type === 'timing');
    const workflowPatterns = this.userPatterns.filter(p => p.type === 'workflow');
    
    // Calculate working hours from patterns
    const workingHours = timingPatterns.length > 0 
      ? timingPatterns[0].metadata.timePatterns || ['09:00-17:00']
      : ['09:00-17:00'];

    // Determine peak productivity time
    const peakProductivityTime = timingPatterns.length > 0
      ? this.extractPeakTime(timingPatterns)
      : 'morning';

    // Calculate average tasks per day
    const averageTasksPerDay = this.calculateAverageTasksPerDay();

    // Calculate completion rate history
    const completionRateHistory = this.taskAnalysis.total > 0 
      ? (this.taskAnalysis.completed / this.taskAnalysis.total) * 100
      : 0;

    // Extract preferred task types from patterns
    const preferredTaskTypes = workflowPatterns
      .map(p => p.pattern)
      .slice(0, 5); // Top 5 preferred types

    // Determine working style
    const workingStyle = this.determineWorkingStyle();

    // Assess stress indicators
    const stressIndicators = this.assessStressIndicators();

    return {
      workingHours,
      peakProductivityTime,
      averageTasksPerDay,
      completionRateHistory,
      preferredTaskTypes,
      workingStyle,
      stressIndicators
    };
  }

  /**
   * Analyze task completion patterns and efficiency
   */
  private analyzeTaskPatterns(): TaskPatternAnalysis {
    // Calculate typical duration by task type
    const typicalDuration = this.calculateTypicalDurations();

    // Identify complexity factors
    const complexityFactors = this.identifyComplexityFactors();

    // Analyze seasonal patterns
    const seasonalPatterns = this.analyzeSeasonalPatterns();

    // Map task dependencies
    const dependencyPatterns = this.analyzeDependencyPatterns();

    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics();

    return {
      typicalDuration,
      complexityFactors,
      seasonalPatterns,
      dependencyPatterns,
      qualityMetrics
    };
  }

  /**
   * Analyze current workload and capacity
   */
  private analyzeWorkload(): WorkloadAnalysis {
    const currentCapacity = {
      activeTasks: this.taskAnalysis.active,
      upcomingDeadlines: this.taskAnalysis.upcomingDeadlineCount,
      availableHours: this.calculateAvailableHours(),
      commitmentLevel: this.calculateCommitmentLevel()
    };

    const historicalPerformance = this.analyzeHistoricalPerformance();
    const bottleneckAnalysis = this.analyzeBottlenecks();

    return {
      currentCapacity,
      historicalPerformance,
      bottleneckAnalysis
    };
  }

  /**
   * Analyze client relationships and opportunities
   */
  private analyzeClientRelationships(): ClientAnalysis {
    const relationshipHealth: Record<string, any> = {};
    const opportunityMapping: Record<string, any> = {};
    const riskAssessment: Record<string, any> = {};

    this.clients.forEach(client => {
      const clientTasks = this.tasks.filter(task => task.clientId === client.id);
      
      // Analyze relationship health
      relationshipHealth[client.id] = this.analyzeClientHealth(client, clientTasks);
      
      // Map opportunities
      opportunityMapping[client.id] = this.mapClientOpportunities(client, clientTasks);
      
      // Assess risks
      riskAssessment[client.id] = this.assessClientRisks(client, clientTasks);
    });

    return {
      relationshipHealth,
      opportunityMapping,
      riskAssessment
    };
  }

  /**
   * Analyze historical performance metrics
   */
  private analyzePerformanceMetrics(): PerformanceMetrics {
    const now = new Date();
    const thisWeekStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const lastWeekStart = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));

    const tasksCompletedThisWeek = this.tasks.filter(task => 
      task.status === 'done' && 
      task.endDate && 
      new Date(task.endDate) >= thisWeekStart
    ).length;

    const tasksCompletedLastWeek = this.tasks.filter(task => 
      task.status === 'done' && 
      task.endDate && 
      new Date(task.endDate) >= lastWeekStart &&
      new Date(task.endDate) < thisWeekStart
    ).length;

    return {
      productivity: {
        tasksCompletedThisWeek,
        tasksCompletedLastWeek,
        weekOverWeekGrowth: this.calculateWeekOverWeekGrowth(tasksCompletedThisWeek, tasksCompletedLastWeek),
        monthlyTrend: this.calculateMonthlyTrend()
      },
      quality: {
        clientFeedbackScore: this.calculateClientFeedbackScore(),
        revisionRequests: this.calculateRevisionRequests(),
        deliveryAccuracy: this.calculateDeliveryAccuracy()
      },
      efficiency: {
        timePerTask: this.calculateTimePerTask(),
        resourceUtilization: this.calculateResourceUtilization(),
        multitaskingEffectiveness: this.calculateMultitaskingEffectiveness()
      },
      business: {
        revenueThisMonth: this.calculateRevenueThisMonth(),
        revenueLastMonth: this.calculateRevenueLastMonth(),
        averageProjectValue: this.calculateAverageProjectValue(),
        clientRetentionRate: this.calculateClientRetentionRate()
      }
    };
  }

  /**
   * Analyze current workload state
   */
  private analyzeCurrentWorkloadState(): CurrentWorkloadState {
    const activeTasks = this.taskAnalysis.activeTasks.map((task: Task) => ({
      id: task.id,
      title: task.name,
      priority: 'medium' as const, // Default since priority doesn't exist in Task interface
      estimatedTimeRemaining: this.estimateTimeRemaining(task),
      blockers: this.identifyTaskBlockers(task),
      clientExpectations: this.getClientExpectations(task)
    }));

    const upcomingDeadlines = this.taskAnalysis.upcomingDeadlines.map((task: Task) => ({
      taskId: task.id,
      deadline: new Date(task.deadline || Date.now()),
      preparedness: this.calculatePreparedness(task),
      riskLevel: this.assessDeadlineRisk(task)
    }));

    return {
      activeTasks,
      upcomingDeadlines,
      resourceConstraints: {
        timeAvailability: this.calculateTimeAvailability(),
        skillGaps: this.identifySkillGaps(),
        toolLimitations: this.identifyToolLimitations(),
        externalDependencies: this.identifyExternalDependencies()
      },
      marketConditions: {
        demandLevel: 'medium', // Would need market data integration
        competitionLevel: 'medium',
        seasonalFactors: this.identifySeasonalFactors(),
        industryTrends: this.identifyIndustryTrends()
      }
    };
  }

  // Helper methods for analysis
  private calculateDataQuality(): number {
    let score = 0;
    const maxScore = 100;

    // Task data quality (40 points)
    if (this.tasks.length > 0) score += 10;
    if (this.tasks.length > 10) score += 10;
    if (this.taskAnalysis.completed > 0) score += 10;
    if (this.taskAnalysis.completed > 5) score += 10;

    // User patterns (20 points)
    if (this.userPatterns.length > 0) score += 10;
    if (this.userPatterns.length > 3) score += 10;

    // Action history (20 points)
    if (this.actionHistory.length > 0) score += 10;
    if (this.actionHistory.length > 20) score += 10;

    // Client data (20 points)
    if (this.clients.length > 0) score += 10;
    if (this.clients.length > 3) score += 10;

    return score / maxScore;
  }

  private determineAnalysisDepth(dataQuality: number): 'basic' | 'standard' | 'comprehensive' {
    if (dataQuality >= 0.8) return 'comprehensive';
    if (dataQuality >= 0.5) return 'standard';
    return 'basic';
  }

  private determinePredictionScope(): 'task' | 'project' | 'business' | 'strategic' {
    if (this.tasks.length > 20 && this.clients.length > 5) return 'strategic';
    if (this.tasks.length > 10 && this.clients.length > 2) return 'business';
    if (this.tasks.length > 5) return 'project';
    return 'task';
  }

  private extractPeakTime(patterns: UserPattern[]): string {
    // Extract peak time from timing patterns
    const timePatterns = patterns[0]?.metadata?.timePatterns || [];
    if (timePatterns.includes('morning')) return 'morning';
    if (timePatterns.includes('afternoon')) return 'afternoon';
    if (timePatterns.includes('evening')) return 'evening';
    return 'morning';
  }

  private calculateAverageTasksPerDay(): number {
    if (this.tasks.length === 0) return 0;
    
    const completedTasks = this.tasks.filter(task => task.status === 'done' && task.endDate);
    if (completedTasks.length === 0) return 0;

    const dates = completedTasks.map(task => new Date(task.endDate!));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const daysDiff = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));

    return completedTasks.length / daysDiff;
  }

  private determineWorkingStyle(): 'focused' | 'multitask' | 'flexible' {
    // Analyze patterns to determine working style
    const workflowPatterns = this.userPatterns.filter(p => p.type === 'workflow');
    if (workflowPatterns.length === 0) return 'flexible';

    // Simple heuristic - would need more sophisticated analysis
    const averageFrequency = workflowPatterns.reduce((sum, p) => sum + p.frequency, 0) / workflowPatterns.length;
    
    if (averageFrequency > 0.8) return 'focused';
    if (averageFrequency > 0.5) return 'multitask';
    return 'flexible';
  }

  private assessStressIndicators() {
    const activeTasksRatio = this.taskAnalysis.active / Math.max(1, this.taskAnalysis.total);
    const overdueRatio = this.taskAnalysis.overdue / Math.max(1, this.taskAnalysis.total);

    let overloadRisk: 'low' | 'medium' | 'high' = 'low';
    const burnoutSignals: string[] = [];

    if (activeTasksRatio > 0.8) {
      overloadRisk = 'high';
      burnoutSignals.push('High active task ratio');
    } else if (activeTasksRatio > 0.6) {
      overloadRisk = 'medium';
    }

    if (overdueRatio > 0.2) {
      burnoutSignals.push('High overdue task ratio');
    }

    return {
      overloadRisk,
      burnoutSignals,
      capacityUtilization: activeTasksRatio
    };
  }

  // Placeholder implementations for complex calculations
  private calculateTypicalDurations(): Record<string, number> {
    // Group tasks by category/type and calculate average completion times
    const durations: Record<string, number> = {};
    const completedTasks = this.tasks.filter(task => task.status === 'done');

    completedTasks.forEach(task => {
      const category = task.categoryId || 'General';
      if (!durations[category]) durations[category] = 0;
      
      // Use duration if available, otherwise estimate from creation to end date
      if (task.duration) {
        durations[category] = (durations[category] + task.duration) / 2; // Running average
      } else if (task.createdAt && task.endDate) {
        const days = Math.ceil((new Date(task.endDate).getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        durations[category] = (durations[category] + days) / 2; // Running average
      }
    });

    return durations;
  }

  private identifyComplexityFactors(): Record<string, number> {
    // Analyze factors that increase task completion time
    return {
      'client_communication': 1.2,
      'technical_complexity': 1.5,
      'unclear_requirements': 1.8,
      'external_dependencies': 1.3,
      'first_time_project_type': 1.4
    };
  }

  private analyzeSeasonalPatterns(): Array<{ period: string; taskTypes: string[]; volumeMultiplier: number; }> {
    // Analyze task volumes by time periods
    return [
      { period: 'Q1', taskTypes: ['planning', 'strategy'], volumeMultiplier: 0.8 },
      { period: 'Q2', taskTypes: ['development', 'implementation'], volumeMultiplier: 1.2 },
      { period: 'Q3', taskTypes: ['development', 'testing'], volumeMultiplier: 1.0 },
      { period: 'Q4', taskTypes: ['delivery', 'maintenance'], volumeMultiplier: 1.1 }
    ];
  }

  private analyzeDependencyPatterns(): Array<{ taskType: string; commonDependencies: string[]; blockingFactors: string[]; }> {
    // Analyze common dependencies and blocking factors
    return [
      {
        taskType: 'design',
        commonDependencies: ['client_approval', 'content_delivery'],
        blockingFactors: ['unclear_requirements', 'delayed_feedback']
      },
      {
        taskType: 'development',
        commonDependencies: ['design_completion', 'asset_delivery'],
        blockingFactors: ['technical_issues', 'scope_changes']
      }
    ];
  }

  private calculateQualityMetrics() {
    const completedTasks = this.tasks.filter(task => task.status === 'done');
    
    return {
      revisionRate: 0.15, // 15% of tasks require revisions (placeholder)
      clientSatisfactionScore: 4.5, // Out of 5 (placeholder)
      onTimeDeliveryRate: completedTasks.length > 0 ? 0.85 : 0 // 85% on-time delivery (placeholder)
    };
  }

  // Additional helper methods would be implemented here...
  private calculateAvailableHours(): number { return 40; } // Placeholder
  private calculateCommitmentLevel(): number { return 0.75; } // Placeholder
  private analyzeHistoricalPerformance(): any { return {}; } // Placeholder
  private analyzeBottlenecks(): any { return {}; } // Placeholder
  private analyzeClientHealth(client: Client, tasks: Task[]): any { return {}; } // Placeholder
  private mapClientOpportunities(client: Client, tasks: Task[]): any { return {}; } // Placeholder
  private assessClientRisks(client: Client, tasks: Task[]): any { return {}; } // Placeholder
  private calculateWeekOverWeekGrowth(thisWeek: number, lastWeek: number): number { return 0; } // Placeholder
  private calculateMonthlyTrend(): 'up' | 'down' | 'stable' { return 'stable'; } // Placeholder
  private calculateClientFeedbackScore(): number { return 4.5; } // Placeholder
  private calculateRevisionRequests(): number { return 2; } // Placeholder
  private calculateDeliveryAccuracy(): number { return 0.85; } // Placeholder
  private calculateTimePerTask(): Record<string, number> { return {}; } // Placeholder
  private calculateResourceUtilization(): number { return 0.8; } // Placeholder
  private calculateMultitaskingEffectiveness(): number { return 0.7; } // Placeholder
  private calculateRevenueThisMonth(): number { return 5000; } // Placeholder
  private calculateRevenueLastMonth(): number { return 4500; } // Placeholder
  private calculateAverageProjectValue(): number { return 2500; } // Placeholder
  private calculateClientRetentionRate(): number { return 0.9; } // Placeholder
  private estimateTimeRemaining(task: Task): number { return 8; } // Placeholder
  private identifyTaskBlockers(task: Task): string[] { return []; } // Placeholder
  private getClientExpectations(task: Task): string { return 'Standard delivery'; } // Placeholder
  private calculatePreparedness(task: Task): number { return 0.7; } // Placeholder
  private assessDeadlineRisk(task: Task): 'low' | 'medium' | 'high' { return 'medium'; } // Placeholder
  private calculateTimeAvailability(): number { return 40; } // Placeholder
  private identifySkillGaps(): string[] { return []; } // Placeholder
  private identifyToolLimitations(): string[] { return []; } // Placeholder
  private identifyExternalDependencies(): string[] { return []; } // Placeholder
  private identifySeasonalFactors(): string[] { return []; } // Placeholder
  private identifyIndustryTrends(): string[] { return []; } // Placeholder
}
