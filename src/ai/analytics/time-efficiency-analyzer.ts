/**
 * Time Efficiency Analyzer - Phase 4.3 Day 2
 * Phân tích hiệu quả thời gian và độ chính xác ước lượng
 */

import type { Task, Client } from '@/lib/types';
import type { ActionEvent, UserBehaviorPattern } from '../learning/behavior-tracker';

export interface TaskEstimationAccuracy {
  taskId: string;
  taskTitle: string;
  estimatedDuration: number; // minutes
  actualDuration: number; // minutes
  accuracyPercentage: number; // 0-100
  variance: number; // +/- minutes
  category: string;
  complexity: 'low' | 'medium' | 'high';
  estimationQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface TimeAllocationAnalysis {
  category: string;
  allocatedTime: number; // minutes per week
  actualTime: number; // minutes per week
  efficiency: number; // 0-100
  trend: 'improving' | 'declining' | 'stable';
  recommendations: string[];
  optimalAllocation: number; // suggested minutes per week
}

export interface TaskTimePattern {
  taskType: string;
  averageDuration: number; // minutes
  standardDeviation: number;
  peakEfficiencyTime: {
    startHour: number;
    endHour: number;
    efficiencyBoost: number; // percentage
  };
  complexityMultiplier: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface WorkflowEfficiency {
  workflowName: string;
  steps: WorkflowStep[];
  totalDuration: number;
  bottlenecks: WorkflowBottleneck[];
  optimizationPotential: number; // percentage time savings
  suggestedImprovements: string[];
}

export interface WorkflowStep {
  stepName: string;
  averageDuration: number;
  frequency: number; // times per day/week
  efficiency: number;
  isBottleneck: boolean;
}

export interface WorkflowBottleneck {
  stepName: string;
  delayMinutes: number;
  frequency: number;
  impact: 'high' | 'medium' | 'low';
  solutions: string[];
}

export interface TimeEfficiencyMetrics {
  overallEfficiency: number; // 0-100
  estimationAccuracy: TaskEstimationAccuracy[];
  timeAllocation: TimeAllocationAnalysis[];
  taskPatterns: TaskTimePattern[];
  workflowEfficiency: WorkflowEfficiency[];
  timeWastageAreas: {
    area: string;
    minutesPerDay: number;
    impact: number;
    solutions: string[];
  }[];
  productiveHours: {
    startTime: number;
    endTime: number;
    efficiencyScore: number;
  }[];
}

export class TimeEfficiencyAnalyzer {
  private taskDurations: Map<string, number[]> = new Map();
  private workflowTimes: Map<string, number[]> = new Map();
  
  constructor(private userId: string) {}

  /**
   * Analyze task estimation accuracy
   */
  async analyzeEstimationAccuracy(
    tasks: Task[],
    actions: ActionEvent[]
  ): Promise<TaskEstimationAccuracy[]> {
    const completedTasks = tasks.filter(task => task.status === 'done');
    const accuracyAnalysis: TaskEstimationAccuracy[] = [];

    for (const task of completedTasks) {
      const taskActions = actions.filter(action => 
        action.entityType === 'task' && action.entityId === task.id
      );

      if (taskActions.length === 0) continue;

      // Calculate actual duration from actions
      const actualDuration = this.calculateActualTaskDuration(taskActions);
      const estimatedDuration = (task.duration || 1) * 8 * 60; // Convert days to minutes
      
      // Calculate accuracy
      const variance = actualDuration - estimatedDuration;
      const accuracyPercentage = Math.max(0, 100 - Math.abs(variance) / estimatedDuration * 100);
      
      // Determine estimation quality
      const estimationQuality = this.getEstimationQuality(accuracyPercentage);
      
      // Determine complexity
      const complexity = this.determineTaskComplexity(task, taskActions);

      accuracyAnalysis.push({
        taskId: task.id,
        taskTitle: task.name,
        estimatedDuration,
        actualDuration,
        accuracyPercentage,
        variance,
        category: task.categoryId || 'General',
        complexity,
        estimationQuality
      });
    }

    return accuracyAnalysis.sort((a, b) => b.accuracyPercentage - a.accuracyPercentage);
  }

  /**
   * Analyze time allocation across categories
   */
  async analyzeTimeAllocation(
    tasks: Task[],
    actions: ActionEvent[]
  ): Promise<TimeAllocationAnalysis[]> {
    const categoryTime = new Map<string, { allocated: number; actual: number }>();
    
    // Group tasks by category
    tasks.forEach(task => {
      const category = task.categoryId || 'General';
      const allocated = (task.duration || 1) * 8 * 60; // Convert to minutes
      
      if (!categoryTime.has(category)) {
        categoryTime.set(category, { allocated: 0, actual: 0 });
      }
      
      const current = categoryTime.get(category)!;
      current.allocated += allocated;
      
      // Calculate actual time spent
      const taskActions = actions.filter(action => 
        action.entityType === 'task' && action.entityId === task.id
      );
      const actualTime = this.calculateActualTaskDuration(taskActions);
      current.actual += actualTime;
    });

    const allocationAnalysis: TimeAllocationAnalysis[] = [];
    
    categoryTime.forEach((times, category) => {
      const efficiency = times.allocated > 0 
        ? Math.min(100, (times.allocated / times.actual) * 100)
        : 0;
        
      const trend = this.calculateAllocationTrend(category, tasks);
      const recommendations = this.generateAllocationRecommendations(category, efficiency, times);
      const optimalAllocation = this.calculateOptimalAllocation(times.actual, efficiency);

      allocationAnalysis.push({
        category,
        allocatedTime: times.allocated,
        actualTime: times.actual,
        efficiency,
        trend,
        recommendations,
        optimalAllocation
      });
    });

    return allocationAnalysis.sort((a, b) => b.actualTime - a.actualTime);
  }

  /**
   * Identify task time patterns
   */
  async analyzeTaskTimePatterns(
    tasks: Task[],
    actions: ActionEvent[]
  ): Promise<TaskTimePattern[]> {
    const taskTypePatterns = new Map<string, number[]>();
    const taskTimesByHour = new Map<string, Map<number, number[]>>();
    
    // Group task durations by type
    for (const task of tasks.filter(t => t.status === 'done')) {
      const taskType = this.categorizeTaskType(task);
      const taskActions = actions.filter(action => 
        action.entityType === 'task' && action.entityId === task.id
      );
      
      if (taskActions.length === 0) continue;
      
      const duration = this.calculateActualTaskDuration(taskActions);
      
      // Store duration by type
      if (!taskTypePatterns.has(taskType)) {
        taskTypePatterns.set(taskType, []);
      }
      taskTypePatterns.get(taskType)!.push(duration);
      
      // Store duration by hour
      if (!taskTimesByHour.has(taskType)) {
        taskTimesByHour.set(taskType, new Map());
      }
      
      taskActions.forEach(action => {
        const hour = action.timestamp.getHours();
        const hourMap = taskTimesByHour.get(taskType)!;
        
        if (!hourMap.has(hour)) {
          hourMap.set(hour, []);
        }
        hourMap.get(hour)!.push(duration);
      });
    }

    const patterns: TaskTimePattern[] = [];
    
    taskTypePatterns.forEach((durations, taskType) => {
      const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const standardDeviation = this.calculateStandardDeviation(durations);
      
      // Find peak efficiency time
      const peakEfficiencyTime = this.findPeakEfficiencyTime(
        taskTimesByHour.get(taskType) || new Map()
      );
      
      // Calculate complexity multipliers
      const complexityMultiplier = this.calculateComplexityMultipliers(taskType, durations);

      patterns.push({
        taskType,
        averageDuration,
        standardDeviation,
        peakEfficiencyTime,
        complexityMultiplier
      });
    });

    return patterns.sort((a, b) => b.averageDuration - a.averageDuration);
  }

  /**
   * Analyze workflow efficiency
   */
  async analyzeWorkflowEfficiency(
    actions: ActionEvent[]
  ): Promise<WorkflowEfficiency[]> {
    const workflows = this.identifyWorkflows(actions);
    const efficiencyAnalysis: WorkflowEfficiency[] = [];

    for (const [workflowName, workflowActions] of workflows.entries()) {
      const steps = this.analyzeWorkflowSteps(workflowActions);
      const totalDuration = steps.reduce((sum, step) => sum + step.averageDuration, 0);
      const bottlenecks = this.identifyBottlenecks(steps);
      const optimizationPotential = this.calculateOptimizationPotential(steps, bottlenecks);
      const suggestedImprovements = this.generateWorkflowImprovements(bottlenecks);

      efficiencyAnalysis.push({
        workflowName,
        steps,
        totalDuration,
        bottlenecks,
        optimizationPotential,
        suggestedImprovements
      });
    }

    return efficiencyAnalysis.sort((a, b) => b.optimizationPotential - a.optimizationPotential);
  }

  /**
   * Get comprehensive time efficiency metrics
   */
  async getTimeEfficiencyMetrics(
    tasks: Task[],
    actions: ActionEvent[]
  ): Promise<TimeEfficiencyMetrics> {
    const estimationAccuracy = await this.analyzeEstimationAccuracy(tasks, actions);
    const timeAllocation = await this.analyzeTimeAllocation(tasks, actions);
    const taskPatterns = await this.analyzeTaskTimePatterns(tasks, actions);
    const workflowEfficiency = await this.analyzeWorkflowEfficiency(actions);
    
    // Calculate overall efficiency
    const overallEfficiency = this.calculateOverallEfficiency(
      estimationAccuracy,
      timeAllocation,
      workflowEfficiency
    );
    
    // Identify time wastage areas
    const timeWastageAreas = this.identifyTimeWastage(actions, taskPatterns);
    
    // Find productive hours
    const productiveHours = this.identifyProductiveHours(actions, tasks);

    return {
      overallEfficiency,
      estimationAccuracy,
      timeAllocation,
      taskPatterns,
      workflowEfficiency,
      timeWastageAreas,
      productiveHours
    };
  }

  // Helper Methods
  private calculateActualTaskDuration(actions: ActionEvent[]): number {
    if (actions.length === 0) return 0;
    
    // Sort actions by timestamp
    const sortedActions = actions.sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    // Calculate total time span
    const startTime = sortedActions[0].timestamp;
    const endTime = sortedActions[sortedActions.length - 1].timestamp;
    
    return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }

  private getEstimationQuality(accuracyPercentage: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (accuracyPercentage >= 90) return 'excellent';
    if (accuracyPercentage >= 75) return 'good';
    if (accuracyPercentage >= 60) return 'fair';
    return 'poor';
  }

  private determineTaskComplexity(task: Task, actions: ActionEvent[]): 'low' | 'medium' | 'high' {
    const actionCount = actions.length;
    const editActions = actions.filter(a => a.actionType === 'edit').length;
    const estimatedHours = (task.duration || 1) * 8;
    
    // Complexity based on multiple factors
    const complexityScore = 
      (actionCount > 10 ? 1 : 0) +
      (editActions > 5 ? 1 : 0) +
      (estimatedHours > 16 ? 1 : 0);
    
    if (complexityScore >= 2) return 'high';
    if (complexityScore === 1) return 'medium';
    return 'low';
  }

  private calculateAllocationTrend(category: string, tasks: Task[]): 'improving' | 'declining' | 'stable' {
    // Simple trend analysis - could be enhanced với historical data
    const categoryTasks = tasks.filter(t => (t.categoryId || 'General') === category);
    const recentTasks = categoryTasks.slice(-5);
    const olderTasks = categoryTasks.slice(0, -5);
    
    if (recentTasks.length === 0 || olderTasks.length === 0) return 'stable';
    
    const recentAvg = recentTasks.reduce((sum, t) => sum + (t.duration || 1), 0) / recentTasks.length;
    const olderAvg = olderTasks.reduce((sum, t) => sum + (t.duration || 1), 0) / olderTasks.length;
    
    if (recentAvg > olderAvg * 1.1) return 'declining'; // Taking more time
    if (recentAvg < olderAvg * 0.9) return 'improving'; // Taking less time
    return 'stable';
  }

  private generateAllocationRecommendations(
    category: string,
    efficiency: number,
    times: { allocated: number; actual: number }
  ): string[] {
    const recommendations: string[] = [];
    
    if (efficiency < 70) {
      recommendations.push(`Increase time allocation for ${category} by ${Math.round((times.actual - times.allocated) / 60)} hours`);
    }
    
    if (efficiency > 120) {
      recommendations.push(`Consider reducing allocated time for ${category} - you're completing tasks faster than estimated`);
    }
    
    if (times.actual > 480) { // More than 8 hours per week
      recommendations.push(`${category} is consuming significant time - consider breaking down into smaller tasks`);
    }
    
    return recommendations;
  }

  private calculateOptimalAllocation(actualTime: number, efficiency: number): number {
    // Suggest optimal allocation based on actual time và efficiency
    if (efficiency < 80) {
      return Math.round(actualTime * 1.2); // Add 20% buffer
    } else if (efficiency > 110) {
      return Math.round(actualTime * 0.9); // Reduce by 10%
    }
    return actualTime;
  }

  private categorizeTaskType(task: Task): string {
    // Simple categorization - could be enhanced với ML
    const title = task.name.toLowerCase();
    
    if (title.includes('meeting') || title.includes('call')) return 'Communication';
    if (title.includes('code') || title.includes('develop')) return 'Development';
    if (title.includes('design') || title.includes('ui')) return 'Design';
    if (title.includes('review') || title.includes('test')) return 'Review';
    if (title.includes('research') || title.includes('analysis')) return 'Research';
    
    return task.categoryId || 'General';
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private findPeakEfficiencyTime(hourlyDurations: Map<number, number[]>): {
    startHour: number;
    endHour: number;
    efficiencyBoost: number;
  } {
    let bestHour = 9; // Default
    let bestEfficiency = 0;
    
    hourlyDurations.forEach((durations, hour) => {
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const efficiency = 1 / avgDuration; // Lower duration = higher efficiency
      
      if (efficiency > bestEfficiency) {
        bestEfficiency = efficiency;
        bestHour = hour;
      }
    });
    
    return {
      startHour: bestHour,
      endHour: bestHour + 2,
      efficiencyBoost: 20 // Default boost percentage
    };
  }

  private calculateComplexityMultipliers(taskType: string, durations: number[]): {
    low: number;
    medium: number;
    high: number;
  } {
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    
    return {
      low: 0.7,      // Low complexity tasks take 70% of average
      medium: 1.0,   // Medium complexity is average
      high: 1.5      // High complexity takes 150% of average
    };
  }

  private identifyWorkflows(actions: ActionEvent[]): Map<string, ActionEvent[]> {
    const workflows = new Map<string, ActionEvent[]>();
    
    // Group actions by common patterns
    const userSessions = this.groupActionsBySessions(actions);
    
    userSessions.forEach((sessionActions, sessionId) => {
      const workflowName = this.identifyWorkflowPattern(sessionActions);
      
      if (!workflows.has(workflowName)) {
        workflows.set(workflowName, []);
      }
      
      workflows.get(workflowName)!.push(...sessionActions);
    });
    
    return workflows;
  }

  private groupActionsBySessions(actions: ActionEvent[]): Map<string, ActionEvent[]> {
    const sessions = new Map<string, ActionEvent[]>();
    const SESSION_GAP = 30 * 60 * 1000; // 30 minutes
    
    let currentSessionId = 'session_1';
    let lastActionTime: Date | null = null;
    
    actions.forEach(action => {
      if (lastActionTime && action.timestamp.getTime() - lastActionTime.getTime() > SESSION_GAP) {
        // Start new session
        const sessionCount = sessions.size + 1;
        currentSessionId = `session_${sessionCount}`;
      }
      
      if (!sessions.has(currentSessionId)) {
        sessions.set(currentSessionId, []);
      }
      
      sessions.get(currentSessionId)!.push(action);
      lastActionTime = action.timestamp;
    });
    
    return sessions;
  }

  private identifyWorkflowPattern(actions: ActionEvent[]): string {
    const actionTypes = actions.map(a => a.actionType);
    const pattern = actionTypes.join(' -> ');
    
    // Common workflow patterns
    if (pattern.includes('create') && pattern.includes('edit') && pattern.includes('complete')) {
      return 'Task Completion Workflow';
    }
    if (pattern.includes('navigate') && pattern.includes('view')) {
      return 'Information Gathering Workflow';
    }
    if (actionTypes.filter(t => t === 'edit').length > 3) {
      return 'Iterative Development Workflow';
    }
    
    return 'General Workflow';
  }

  private analyzeWorkflowSteps(actions: ActionEvent[]): WorkflowStep[] {
    const stepMap = new Map<string, { durations: number[]; count: number }>();
    
    // Group actions by type
    actions.forEach(action => {
      const stepName = action.actionType;
      
      if (!stepMap.has(stepName)) {
        stepMap.set(stepName, { durations: [], count: 0 });
      }
      
      const step = stepMap.get(stepName)!;
      step.durations.push(action.duration || 5);
      step.count++;
    });
    
    const steps: WorkflowStep[] = [];
    
    stepMap.forEach((data, stepName) => {
      const averageDuration = data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length;
      const frequency = data.count;
      const efficiency = Math.max(0, 100 - averageDuration); // Simplified efficiency calculation
      const isBottleneck = averageDuration > 15; // Steps taking more than 15 min
      
      steps.push({
        stepName,
        averageDuration,
        frequency,
        efficiency,
        isBottleneck
      });
    });
    
    return steps.sort((a, b) => b.averageDuration - a.averageDuration);
  }

  private identifyBottlenecks(steps: WorkflowStep[]): WorkflowBottleneck[] {
    return steps
      .filter(step => step.isBottleneck)
      .map(step => ({
        stepName: step.stepName,
        delayMinutes: step.averageDuration - 10, // Assume 10 min is baseline
        frequency: step.frequency,
        impact: step.averageDuration > 30 ? 'high' as const : 
               step.averageDuration > 20 ? 'medium' as const : 'low' as const,
        solutions: this.generateBottleneckSolutions(step.stepName, step.averageDuration)
      }));
  }

  private generateBottleneckSolutions(stepName: string, duration: number): string[] {
    const solutions: string[] = [];
    
    if (stepName === 'edit') {
      solutions.push('Use code snippets và templates');
      solutions.push('Improve IDE setup và shortcuts');
    } else if (stepName === 'navigate') {
      solutions.push('Organize workspace better');
      solutions.push('Use quick navigation shortcuts');
    } else if (stepName === 'create') {
      solutions.push('Create task templates');
      solutions.push('Streamline creation process');
    }
    
    if (duration > 30) {
      solutions.push('Break down into smaller steps');
    }
    
    return solutions;
  }

  private calculateOptimizationPotential(steps: WorkflowStep[], bottlenecks: WorkflowBottleneck[]): number {
    const totalTime = steps.reduce((sum, step) => sum + step.averageDuration, 0);
    const bottleneckTime = bottlenecks.reduce((sum, bottleneck) => sum + bottleneck.delayMinutes, 0);
    
    return totalTime > 0 ? Math.round((bottleneckTime / totalTime) * 100) : 0;
  }

  private generateWorkflowImprovements(bottlenecks: WorkflowBottleneck[]): string[] {
    const improvements: string[] = [];
    
    bottlenecks.forEach(bottleneck => {
      improvements.push(`Optimize ${bottleneck.stepName} step - potential ${bottleneck.delayMinutes} minute savings`);
      improvements.push(...bottleneck.solutions);
    });
    
    if (bottlenecks.length > 3) {
      improvements.push('Consider workflow redesign - too many bottlenecks detected');
    }
    
    return [...new Set(improvements)]; // Remove duplicates
  }

  private calculateOverallEfficiency(
    estimationAccuracy: TaskEstimationAccuracy[],
    timeAllocation: TimeAllocationAnalysis[],
    workflowEfficiency: WorkflowEfficiency[]
  ): number {
    // Weight different efficiency metrics
    const weights = {
      estimation: 0.3,
      allocation: 0.4,
      workflow: 0.3
    };
    
    const avgEstimationAccuracy = estimationAccuracy.length > 0
      ? estimationAccuracy.reduce((sum, acc) => sum + acc.accuracyPercentage, 0) / estimationAccuracy.length
      : 70;
    
    const avgAllocationEfficiency = timeAllocation.length > 0
      ? timeAllocation.reduce((sum, alloc) => sum + alloc.efficiency, 0) / timeAllocation.length
      : 70;
    
    const avgWorkflowEfficiency = workflowEfficiency.length > 0
      ? workflowEfficiency.reduce((sum, wf) => sum + (100 - wf.optimizationPotential), 0) / workflowEfficiency.length
      : 70;
    
    return Math.round(
      avgEstimationAccuracy * weights.estimation +
      avgAllocationEfficiency * weights.allocation +
      avgWorkflowEfficiency * weights.workflow
    );
  }

  private identifyTimeWastage(actions: ActionEvent[], patterns: TaskTimePattern[]): {
    area: string;
    minutesPerDay: number;
    impact: number;
    solutions: string[];
  }[] {
    const wastageAreas = [];
    
    // Identify excessive navigation
    const navigationActions = actions.filter(a => a.actionType === 'navigate');
    if (navigationActions.length > 20) {
      wastageAreas.push({
        area: 'Excessive Navigation',
        minutesPerDay: navigationActions.length * 2, // Assume 2 min per navigation
        impact: 15,
        solutions: ['Improve workspace organization', 'Use bookmarks và shortcuts']
      });
    }
    
    // Identify context switching
    const contextSwitches = this.countContextSwitches(actions);
    if (contextSwitches > 10) {
      wastageAreas.push({
        area: 'Context Switching',
        minutesPerDay: contextSwitches * 3, // 3 min per switch
        impact: 25,
        solutions: ['Time blocking', 'Batch similar tasks', 'Minimize interruptions']
      });
    }
    
    return wastageAreas;
  }

  private countContextSwitches(actions: ActionEvent[]): number {
    let switches = 0;
    let lastTaskId: string | null = null;
    
    actions.forEach(action => {
      const taskId = action.entityType === 'task' ? action.entityId : null;
      if (taskId && lastTaskId && taskId !== lastTaskId) {
        switches++;
      }
      if (taskId) {
        lastTaskId = taskId;
      }
    });
    
    return switches;
  }

  private identifyProductiveHours(actions: ActionEvent[], tasks: Task[]): {
    startTime: number;
    endTime: number;
    efficiencyScore: number;
  }[] {
    const hourlyEfficiency = new Map<number, number[]>();
    
    // Calculate efficiency by hour
    actions.forEach(action => {
      const hour = action.timestamp.getHours();
      const efficiency = action.actionType === 'complete' ? 100 : 70; // Simplified
      
      if (!hourlyEfficiency.has(hour)) {
        hourlyEfficiency.set(hour, []);
      }
      hourlyEfficiency.get(hour)!.push(efficiency);
    });
    
    const productiveHours: {
      startTime: number;
      endTime: number;
      efficiencyScore: number;
    }[] = [];
    
    hourlyEfficiency.forEach((efficiencies, hour) => {
      const avgEfficiency = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
      
      if (avgEfficiency > 80) {
        productiveHours.push({
          startTime: hour,
          endTime: hour + 1,
          efficiencyScore: avgEfficiency
        });
      }
    });
    
    return productiveHours.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
  }
}

export default TimeEfficiencyAnalyzer;
