/**
 * Energy Tracker - Phase 4.3 Day 3
 * Advanced energy level tracking và performance correlation analysis
 */

import type { Task, Client } from '@/lib/types';
import type { ActionEvent, UserBehaviorPattern } from '../learning/behavior-tracker';

export interface EnergyLevel {
  timestamp: Date;
  level: number; // 0-100 (0 = depleted, 100 = peak energy)
  source: 'explicit' | 'inferred' | 'calculated';
  context: EnergyContext;
  confidence: number; // 0-100
}

export interface EnergyContext {
  timeOfDay: 'early_morning' | 'morning' | 'late_morning' | 'afternoon' | 'evening' | 'night';
  workload: 'light' | 'moderate' | 'heavy' | 'overwhelming';
  taskComplexity: 'low' | 'medium' | 'high';
  recentBreak: boolean;
  consecutiveWorkHours: number;
  lastMealTime?: Date;
  weatherCondition?: 'sunny' | 'cloudy' | 'rainy' | 'stormy';
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
}

export interface EnergyCycle {
  type: 'daily' | 'weekly' | 'monthly';
  pattern: EnergyPattern[];
  consistency: number; // 0-100
  peakTimes: TimeWindow[];
  lowTimes: TimeWindow[];
  recoveryRate: number; // energy units per hour
  depletionRate: number; // energy units per hour during work
}

export interface EnergyPattern {
  timeSlot: TimeWindow;
  averageLevel: number;
  variability: number;
  frequency: number; // how often this pattern occurs
  influencingFactors: string[];
}

export interface TimeWindow {
  start: number; // hour (0-23)
  end: number; // hour (0-23)
  dayOfWeek?: string;
  description?: string;
}

export interface EnergyDrainFactor {
  factor: string;
  impact: number; // -100 to 0 (negative energy impact)
  frequency: number; // how often this occurs
  mitigation: string[];
  examples: string[];
}

export interface EnergyBoostFactor {
  factor: string;
  impact: number; // 0 to 100 (positive energy impact)
  frequency: number;
  implementation: string[];
  examples: string[];
}

export interface RecoveryPattern {
  activityType: 'break' | 'light_task' | 'physical_activity' | 'social_interaction' | 'meditation';
  duration: number; // minutes
  energyRecovery: number; // energy units recovered
  effectiveness: number; // 0-100
  personalizedTips: string[];
}

export interface EnergyProductivityCorrelation {
  energyLevel: number;
  productivity: number;
  taskType: string;
  timeOfDay: string;
  correlation: number; // -1 to 1
  confidence: number; // 0-100
  sampleSize: number;
}

export interface EnergyAnalytics {
  currentEnergyLevel: number;
  energyCycles: EnergyCycle[];
  drainFactors: EnergyDrainFactor[];
  boostFactors: EnergyBoostFactor[];
  recoveryPatterns: RecoveryPattern[];
  productivityCorrelations: EnergyProductivityCorrelation[];
  optimalWorkSchedule: {
    highEnergyTasks: TimeWindow[];
    lowEnergyTasks: TimeWindow[];
    recommendedBreaks: TimeWindow[];
  };
  energyForecast: {
    next24Hours: EnergyLevel[];
    next7Days: { date: Date; predictedPeakEnergy: number; predictedLowEnergy: number }[];
  };
}

export class EnergyTracker {
  private energyHistory: EnergyLevel[] = [];
  private energyBaseline = 70; // Default energy level
  private productivityCache = new Map<string, number>();

  constructor(private userId: string) {}

  /**
   * Infer energy level from user actions và context
   */
  async inferEnergyLevel(
    timestamp: Date,
    actions: ActionEvent[],
    tasks: Task[]
  ): Promise<EnergyLevel> {
    const context = this.analyzeEnergyContext(timestamp, actions, tasks);
    const level = this.calculateInferredEnergyLevel(timestamp, actions, context);
    
    const energyLevel: EnergyLevel = {
      timestamp,
      level,
      source: 'inferred',
      context,
      confidence: this.calculateInferenceConfidence(actions, context)
    };

    this.energyHistory.push(energyLevel);
    return energyLevel;
  }

  /**
   * Track explicit energy input from user
   */
  async trackExplicitEnergy(
    timestamp: Date,
    level: number,
    context?: Partial<EnergyContext>
  ): Promise<EnergyLevel> {
    const fullContext = {
      ...this.analyzeEnergyContext(timestamp, [], []),
      ...context
    };

    const energyLevel: EnergyLevel = {
      timestamp,
      level,
      source: 'explicit',
      context: fullContext,
      confidence: 95 // High confidence for explicit input
    };

    this.energyHistory.push(energyLevel);
    return energyLevel;
  }

  /**
   * Analyze daily energy cycles
   */
  async analyzeDailyEnergyCycle(
    energyHistory: EnergyLevel[]
  ): Promise<EnergyCycle> {
    const dailyPatterns = this.groupEnergyByHour(energyHistory);
    const patterns: EnergyPattern[] = [];

    // Analyze each hour slot
    for (let hour = 0; hour < 24; hour++) {
      const hourData = dailyPatterns.get(hour) || [];
      if (hourData.length === 0) continue;

      const averageLevel = hourData.reduce((sum, e) => sum + e.level, 0) / hourData.length;
      const variability = this.calculateVariability(hourData.map(e => e.level));
      const frequency = hourData.length / energyHistory.length;
      const influencingFactors = this.identifyInfluencingFactors(hourData);

      patterns.push({
        timeSlot: { start: hour, end: hour + 1 },
        averageLevel,
        variability,
        frequency,
        influencingFactors
      });
    }

    // Identify peak và low times
    const peakTimes = this.identifyPeakEnergyTimes(patterns);
    const lowTimes = this.identifyLowEnergyTimes(patterns);

    // Calculate rates
    const recoveryRate = this.calculateRecoveryRate(energyHistory);
    const depletionRate = this.calculateDepletionRate(energyHistory);
    const consistency = this.calculateCycleConsistency(patterns);

    return {
      type: 'daily',
      pattern: patterns,
      consistency,
      peakTimes,
      lowTimes,
      recoveryRate,
      depletionRate
    };
  }

  /**
   * Identify energy drain factors
   */
  async identifyEnergyDrainFactors(
    energyHistory: EnergyLevel[],
    actions: ActionEvent[],
    tasks: Task[]
  ): Promise<EnergyDrainFactor[]> {
    const drainFactors: EnergyDrainFactor[] = [];

    // Analyze task-related drains
    drainFactors.push(...this.analyzeTaskDrains(energyHistory, tasks));
    
    // Analyze action-related drains
    drainFactors.push(...this.analyzeActionDrains(energyHistory, actions));
    
    // Analyze time-based drains
    drainFactors.push(...this.analyzeTimeDrains(energyHistory));
    
    // Analyze context-based drains
    drainFactors.push(...this.analyzeContextDrains(energyHistory));

    return drainFactors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }

  /**
   * Identify energy boost factors
   */
  async identifyEnergyBoostFactors(
    energyHistory: EnergyLevel[],
    actions: ActionEvent[]
  ): Promise<EnergyBoostFactor[]> {
    const boostFactors: EnergyBoostFactor[] = [];

    // Analyze break patterns
    boostFactors.push(...this.analyzeBreakBoosts(energyHistory, actions));
    
    // Analyze completion boosts
    boostFactors.push(...this.analyzeCompletionBoosts(energyHistory, actions));
    
    // Analyze time-based boosts
    boostFactors.push(...this.analyzeTimeBoosts(energyHistory));

    return boostFactors.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Analyze recovery patterns
   */
  async analyzeRecoveryPatterns(
    energyHistory: EnergyLevel[],
    actions: ActionEvent[]
  ): Promise<RecoveryPattern[]> {
    const patterns: RecoveryPattern[] = [];

    // Identify recovery periods
    const recoveryPeriods = this.identifyRecoveryPeriods(energyHistory);
    
    for (const period of recoveryPeriods) {
      const activityType = this.classifyRecoveryActivity(period, actions);
      const duration = this.calculateRecoveryDuration(period);
      const energyRecovery = this.calculateEnergyRecovery(period);
      const effectiveness = this.calculateRecoveryEffectiveness(period);
      const personalizedTips = this.generateRecoveryTips(activityType, effectiveness);

      patterns.push({
        activityType,
        duration,
        energyRecovery,
        effectiveness,
        personalizedTips
      });
    }

    return patterns.sort((a, b) => b.effectiveness - a.effectiveness);
  }

  /**
   * Analyze energy-productivity correlations
   */
  async analyzeEnergyProductivityCorrelation(
    energyHistory: EnergyLevel[],
    productivityData: { timestamp: Date; productivity: number; taskType: string }[]
  ): Promise<EnergyProductivityCorrelation[]> {
    const correlations: EnergyProductivityCorrelation[] = [];
    
    // Group by task type
    const taskTypes = [...new Set(productivityData.map(p => p.taskType))];
    
    for (const taskType of taskTypes) {
      const taskData = productivityData.filter(p => p.taskType === taskType);
      
      // Group by time of day
      const timeSlots = ['morning', 'afternoon', 'evening'];
      
      for (const timeSlot of timeSlots) {
        const timeData = taskData.filter(p => 
          this.getTimeSlot(p.timestamp) === timeSlot
        );
        
        if (timeData.length < 3) continue; // Need minimum data points
        
        // Find corresponding energy levels
        const energyProductivityPairs = timeData.map(p => {
          const nearestEnergy = this.findNearestEnergyLevel(p.timestamp, energyHistory);
          return nearestEnergy ? {
            energy: nearestEnergy.level,
            productivity: p.productivity
          } : null;
        }).filter(pair => pair !== null) as { energy: number; productivity: number }[];
        
        if (energyProductivityPairs.length < 3) continue;
        
        const energyLevels = energyProductivityPairs.map(p => p.energy);
        const productivityLevels = energyProductivityPairs.map(p => p.productivity);
        
        const correlation = this.calculateCorrelation(energyLevels, productivityLevels);
        const averageEnergy = energyLevels.reduce((sum, e) => sum + e, 0) / energyLevels.length;
        const averageProductivity = productivityLevels.reduce((sum, p) => sum + p, 0) / productivityLevels.length;
        
        correlations.push({
          energyLevel: averageEnergy,
          productivity: averageProductivity,
          taskType,
          timeOfDay: timeSlot,
          correlation,
          confidence: this.calculateCorrelationConfidence(energyProductivityPairs.length),
          sampleSize: energyProductivityPairs.length
        });
      }
    }

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /**
   * Generate comprehensive energy analytics
   */
  async getEnergyAnalytics(
    actions: ActionEvent[],
    tasks: Task[],
    productivityData: { timestamp: Date; productivity: number; taskType: string }[] = []
  ): Promise<EnergyAnalytics> {
    // Infer energy levels for recent period
    const today = new Date();
    const energyHistory: EnergyLevel[] = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dayActions = actions.filter(action => 
        this.isSameDay(action.timestamp, date)
      );
      
      if (dayActions.length > 0) {
        const energyLevel = await this.inferEnergyLevel(date, dayActions, tasks);
        energyHistory.push(energyLevel);
      }
    }

    this.energyHistory = energyHistory;

    // Analyze cycles
    const dailyCycle = await this.analyzeDailyEnergyCycle(energyHistory);
    const energyCycles = [dailyCycle];

    // Identify factors
    const drainFactors = await this.identifyEnergyDrainFactors(energyHistory, actions, tasks);
    const boostFactors = await this.identifyEnergyBoostFactors(energyHistory, actions);
    
    // Analyze patterns
    const recoveryPatterns = await this.analyzeRecoveryPatterns(energyHistory, actions);
    
    // Correlation analysis
    const productivityCorrelations = await this.analyzeEnergyProductivityCorrelation(
      energyHistory, 
      productivityData
    );

    // Generate optimal schedule
    const optimalWorkSchedule = this.generateOptimalWorkSchedule(
      dailyCycle, 
      productivityCorrelations
    );

    // Generate forecast
    const energyForecast = this.generateEnergyForecast(energyHistory, dailyCycle);

    // Current energy level
    const currentEnergyLevel = energyHistory.length > 0 
      ? energyHistory[energyHistory.length - 1].level 
      : this.energyBaseline;

    return {
      currentEnergyLevel,
      energyCycles,
      drainFactors,
      boostFactors,
      recoveryPatterns,
      productivityCorrelations,
      optimalWorkSchedule,
      energyForecast
    };
  }

  // Helper Methods
  private analyzeEnergyContext(
    timestamp: Date,
    actions: ActionEvent[],
    tasks: Task[]
  ): EnergyContext {
    const hour = timestamp.getHours();
    let timeOfDay: EnergyContext['timeOfDay'];
    
    if (hour >= 5 && hour < 8) timeOfDay = 'early_morning';
    else if (hour >= 8 && hour < 11) timeOfDay = 'morning';
    else if (hour >= 11 && hour < 14) timeOfDay = 'late_morning';
    else if (hour >= 14 && hour < 18) timeOfDay = 'afternoon';
    else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    // Calculate workload based on recent actions
    const recentActions = actions.filter(action => 
      Math.abs(action.timestamp.getTime() - timestamp.getTime()) < 2 * 60 * 60 * 1000 // 2 hours
    );
    
    let workload: EnergyContext['workload'] = 'light';
    if (recentActions.length > 15) workload = 'overwhelming';
    else if (recentActions.length > 10) workload = 'heavy';
    else if (recentActions.length > 5) workload = 'moderate';

    // Determine task complexity
    const activeTasks = tasks.filter(task => 
      task.status === 'inprogress' && (task.duration || 1) > 1
    );
    let taskComplexity: EnergyContext['taskComplexity'] = 'low';
    if (activeTasks.some(task => (task.duration || 1) > 3)) taskComplexity = 'high';
    else if (activeTasks.some(task => (task.duration || 1) > 1)) taskComplexity = 'medium';

    // Check for recent breaks
    const breakActions = actions.filter(action => 
      action.actionType === 'view' && 
      Math.abs(action.timestamp.getTime() - timestamp.getTime()) < 30 * 60 * 1000 // 30 minutes
    );
    const recentBreak = breakActions.length < recentActions.length * 0.2;

    // Calculate consecutive work hours
    let consecutiveWorkHours = 0;
    const workActions = actions.filter(action => 
      ['create', 'edit', 'complete'].includes(action.actionType)
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    for (const action of workActions) {
      const hoursDiff = (timestamp.getTime() - action.timestamp.getTime()) / (1000 * 60 * 60);
      if (hoursDiff <= 1) {
        consecutiveWorkHours++;
      } else {
        break;
      }
    }

    return {
      timeOfDay,
      workload,
      taskComplexity,
      recentBreak,
      consecutiveWorkHours
    };
  }

  private calculateInferredEnergyLevel(
    timestamp: Date,
    actions: ActionEvent[],
    context: EnergyContext
  ): number {
    let energy = this.energyBaseline;

    // Time of day adjustments
    const timeMultipliers = {
      'early_morning': 0.7,
      'morning': 1.0,
      'late_morning': 0.95,
      'afternoon': 0.8,
      'evening': 0.6,
      'night': 0.4
    };
    energy *= timeMultipliers[context.timeOfDay];

    // Workload adjustments
    const workloadAdjustments = {
      'light': 5,
      'moderate': 0,
      'heavy': -10,
      'overwhelming': -25
    };
    energy += workloadAdjustments[context.workload];

    // Task complexity adjustments
    const complexityAdjustments = {
      'low': 5,
      'medium': 0,
      'high': -15
    };
    energy += complexityAdjustments[context.taskComplexity];

    // Break adjustments
    if (context.recentBreak) {
      energy += 10;
    }

    // Consecutive work hours penalty
    energy -= context.consecutiveWorkHours * 5;

    // Action frequency adjustments
    const recentActionCount = actions.filter(action => 
      Math.abs(action.timestamp.getTime() - timestamp.getTime()) < 60 * 60 * 1000 // 1 hour
    ).length;
    
    if (recentActionCount > 10) energy -= 10;
    else if (recentActionCount < 2) energy -= 5; // Too little activity might indicate low energy

    return Math.max(0, Math.min(100, energy));
  }

  private calculateInferenceConfidence(
    actions: ActionEvent[],
    context: EnergyContext
  ): number {
    let confidence = 50; // Base confidence

    // More recent actions = higher confidence
    confidence += Math.min(30, actions.length * 3);

    // Known patterns = higher confidence
    if (context.timeOfDay === 'morning' || context.timeOfDay === 'afternoon') {
      confidence += 15;
    }

    // Clear workload indicators = higher confidence
    if (context.workload === 'overwhelming' || context.workload === 'light') {
      confidence += 10;
    }

    return Math.min(100, confidence);
  }

  private groupEnergyByHour(energyHistory: EnergyLevel[]): Map<number, EnergyLevel[]> {
    const grouped = new Map<number, EnergyLevel[]>();
    
    energyHistory.forEach(energy => {
      const hour = energy.timestamp.getHours();
      if (!grouped.has(hour)) {
        grouped.set(hour, []);
      }
      grouped.get(hour)!.push(energy);
    });

    return grouped;
  }

  private calculateVariability(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private identifyInfluencingFactors(hourData: EnergyLevel[]): string[] {
    const factors: string[] = [];
    
    // Analyze common contexts
    const contexts = hourData.map(e => e.context);
    
    // Check workload patterns
    const heavyWorkload = contexts.filter(c => ['heavy', 'overwhelming'].includes(c.workload)).length;
    if (heavyWorkload > contexts.length * 0.5) {
      factors.push('High workload periods');
    }

    // Check break patterns
    const withBreaks = contexts.filter(c => c.recentBreak).length;
    if (withBreaks > contexts.length * 0.7) {
      factors.push('Recent break time');
    }

    // Check task complexity
    const complexTasks = contexts.filter(c => c.taskComplexity === 'high').length;
    if (complexTasks > contexts.length * 0.3) {
      factors.push('Complex task periods');
    }

    return factors;
  }

  private identifyPeakEnergyTimes(patterns: EnergyPattern[]): TimeWindow[] {
    const sortedPatterns = patterns.sort((a, b) => b.averageLevel - a.averageLevel);
    const threshold = sortedPatterns[0]?.averageLevel * 0.8 || 80;
    
    return sortedPatterns
      .filter(pattern => pattern.averageLevel >= threshold)
      .map(pattern => ({
        ...pattern.timeSlot,
        description: `Peak energy: ${pattern.averageLevel.toFixed(1)}`
      }))
      .slice(0, 3);
  }

  private identifyLowEnergyTimes(patterns: EnergyPattern[]): TimeWindow[] {
    const sortedPatterns = patterns.sort((a, b) => a.averageLevel - b.averageLevel);
    const threshold = sortedPatterns[0]?.averageLevel * 1.2 || 50;
    
    return sortedPatterns
      .filter(pattern => pattern.averageLevel <= threshold)
      .map(pattern => ({
        ...pattern.timeSlot,
        description: `Low energy: ${pattern.averageLevel.toFixed(1)}`
      }))
      .slice(0, 3);
  }

  private calculateRecoveryRate(energyHistory: EnergyLevel[]): number {
    // Calculate average energy increase per hour during recovery periods
    let totalRecovery = 0;
    let recoveryPeriods = 0;

    for (let i = 1; i < energyHistory.length; i++) {
      const current = energyHistory[i];
      const previous = energyHistory[i - 1];
      
      if (current.level > previous.level) {
        const timeDiff = (current.timestamp.getTime() - previous.timestamp.getTime()) / (1000 * 60 * 60);
        const energyIncrease = current.level - previous.level;
        
        if (timeDiff > 0) {
          totalRecovery += energyIncrease / timeDiff;
          recoveryPeriods++;
        }
      }
    }

    return recoveryPeriods > 0 ? totalRecovery / recoveryPeriods : 5; // Default 5 units per hour
  }

  private calculateDepletionRate(energyHistory: EnergyLevel[]): number {
    // Calculate average energy decrease per hour during work periods
    let totalDepletion = 0;
    let depletionPeriods = 0;

    for (let i = 1; i < energyHistory.length; i++) {
      const current = energyHistory[i];
      const previous = energyHistory[i - 1];
      
      if (current.level < previous.level) {
        const timeDiff = (current.timestamp.getTime() - previous.timestamp.getTime()) / (1000 * 60 * 60);
        const energyDecrease = previous.level - current.level;
        
        if (timeDiff > 0) {
          totalDepletion += energyDecrease / timeDiff;
          depletionPeriods++;
        }
      }
    }

    return depletionPeriods > 0 ? totalDepletion / depletionPeriods : 8; // Default 8 units per hour
  }

  private calculateCycleConsistency(patterns: EnergyPattern[]): number {
    if (patterns.length < 2) return 0;
    
    // Calculate consistency based on pattern variability
    const avgVariability = patterns.reduce((sum, p) => sum + p.variability, 0) / patterns.length;
    
    return Math.max(0, 100 - avgVariability * 2);
  }

  private analyzeTaskDrains(energyHistory: EnergyLevel[], tasks: Task[]): EnergyDrainFactor[] {
    const drains: EnergyDrainFactor[] = [];
    
    // High complexity tasks
    const complexTasks = tasks.filter(task => (task.duration || 1) > 2);
    if (complexTasks.length > 0) {
      drains.push({
        factor: 'Complex Tasks',
        impact: -20,
        frequency: complexTasks.length / Math.max(tasks.length, 1),
        mitigation: [
          'Break complex tasks into smaller chunks',
          'Schedule complex tasks during peak energy times',
          'Take regular breaks during complex work'
        ],
        examples: complexTasks.slice(0, 3).map(task => task.name)
      });
    }

    return drains;
  }

  private analyzeActionDrains(energyHistory: EnergyLevel[], actions: ActionEvent[]): EnergyDrainFactor[] {
    const drains: EnergyDrainFactor[] = [];
    
    // Context switching
    const contextSwitches = this.countContextSwitches(actions);
    if (contextSwitches > 10) {
      drains.push({
        factor: 'Context Switching',
        impact: -15,
        frequency: contextSwitches / Math.max(actions.length, 1),
        mitigation: [
          'Batch similar tasks together',
          'Use time-blocking techniques',
          'Minimize interruptions'
        ],
        examples: [`${contextSwitches} context switches detected`]
      });
    }

    return drains;
  }

  private analyzeTimeDrains(energyHistory: EnergyLevel[]): EnergyDrainFactor[] {
    const drains: EnergyDrainFactor[] = [];
    
    // Late work sessions
    const lateWorkSessions = energyHistory.filter(e => 
      e.timestamp.getHours() > 20 && e.level < 50
    );
    
    if (lateWorkSessions.length > 0) {
      drains.push({
        factor: 'Late Work Sessions',
        impact: -25,
        frequency: lateWorkSessions.length / energyHistory.length,
        mitigation: [
          'Set hard stop times for work',
          'Plan important tasks earlier in the day',
          'Establish evening wind-down routine'
        ],
        examples: [`${lateWorkSessions.length} late work sessions detected`]
      });
    }

    return drains;
  }

  private analyzeContextDrains(energyHistory: EnergyLevel[]): EnergyDrainFactor[] {
    const drains: EnergyDrainFactor[] = [];
    
    // Overwhelming workload periods
    const overwhelmingPeriods = energyHistory.filter(e => 
      e.context.workload === 'overwhelming'
    );
    
    if (overwhelmingPeriods.length > 0) {
      drains.push({
        factor: 'Overwhelming Workload',
        impact: -30,
        frequency: overwhelmingPeriods.length / energyHistory.length,
        mitigation: [
          'Prioritize tasks more effectively',
          'Delegate or defer non-essential work',
          'Set realistic daily limits'
        ],
        examples: [`${overwhelmingPeriods.length} overwhelming periods detected`]
      });
    }

    return drains;
  }

  private analyzeBreakBoosts(energyHistory: EnergyLevel[], actions: ActionEvent[]): EnergyBoostFactor[] {
    const boosts: EnergyBoostFactor[] = [];
    
    // Recent break periods
    const breakPeriods = energyHistory.filter(e => e.context.recentBreak);
    
    if (breakPeriods.length > 0) {
      const avgBoost = breakPeriods.reduce((sum, e) => sum + e.level, 0) / breakPeriods.length;
      
      boosts.push({
        factor: 'Regular Breaks',
        impact: Math.max(0, avgBoost - this.energyBaseline),
        frequency: breakPeriods.length / energyHistory.length,
        implementation: [
          'Schedule 15-minute breaks every 2 hours',
          'Step away from workspace during breaks',
          'Do light physical activity or stretching'
        ],
        examples: [`${breakPeriods.length} effective break periods detected`]
      });
    }

    return boosts;
  }

  private analyzeCompletionBoosts(energyHistory: EnergyLevel[], actions: ActionEvent[]): EnergyBoostFactor[] {
    const boosts: EnergyBoostFactor[] = [];
    
    const completionActions = actions.filter(a => a.actionType === 'complete');
    
    if (completionActions.length > 0) {
      boosts.push({
        factor: 'Task Completion',
        impact: 15,
        frequency: completionActions.length / Math.max(actions.length, 1),
        implementation: [
          'Celebrate small wins',
          'Track completed tasks visually',
          'Set achievable daily goals'
        ],
        examples: [`${completionActions.length} task completions boost energy`]
      });
    }

    return boosts;
  }

  private analyzeTimeBoosts(energyHistory: EnergyLevel[]): EnergyBoostFactor[] {
    const boosts: EnergyBoostFactor[] = [];
    
    // Morning energy patterns
    const morningEnergy = energyHistory.filter(e => 
      e.context.timeOfDay === 'morning' && e.level > this.energyBaseline
    );
    
    if (morningEnergy.length > 0) {
      const avgMorningBoost = morningEnergy.reduce((sum, e) => sum + e.level, 0) / morningEnergy.length;
      
      boosts.push({
        factor: 'Morning Fresh Start',
        impact: avgMorningBoost - this.energyBaseline,
        frequency: morningEnergy.length / energyHistory.length,
        implementation: [
          'Start with most important tasks in the morning',
          'Maintain consistent sleep schedule',
          'Morning routine for energy preparation'
        ],
        examples: [`Morning energy averages ${avgMorningBoost.toFixed(1)}`]
      });
    }

    return boosts;
  }

  private identifyRecoveryPeriods(energyHistory: EnergyLevel[]): EnergyLevel[][] {
    const periods: EnergyLevel[][] = [];
    let currentPeriod: EnergyLevel[] = [];

    for (let i = 1; i < energyHistory.length; i++) {
      const current = energyHistory[i];
      const previous = energyHistory[i - 1];

      if (current.level > previous.level) {
        // Energy is increasing
        if (currentPeriod.length === 0) {
          currentPeriod.push(previous);
        }
        currentPeriod.push(current);
      } else {
        // Energy stopped increasing
        if (currentPeriod.length > 1) {
          periods.push([...currentPeriod]);
        }
        currentPeriod = [];
      }
    }

    // Add final period if it exists
    if (currentPeriod.length > 1) {
      periods.push(currentPeriod);
    }

    return periods;
  }

  private classifyRecoveryActivity(
    period: EnergyLevel[],
    actions: ActionEvent[]
  ): RecoveryPattern['activityType'] {
    const periodStart = period[0].timestamp;
    const periodEnd = period[period.length - 1].timestamp;
    
    const periodActions = actions.filter(action => 
      action.timestamp >= periodStart && action.timestamp <= periodEnd
    );

    if (periodActions.length === 0) return 'break';
    
    const actionTypes = periodActions.map(a => a.actionType);
    
    if (actionTypes.includes('complete')) return 'light_task';
    if (actionTypes.every(type => ['view', 'navigate'].includes(type))) return 'break';
    
    return 'light_task';
  }

  private calculateRecoveryDuration(period: EnergyLevel[]): number {
    const start = period[0].timestamp;
    const end = period[period.length - 1].timestamp;
    
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // Minutes
  }

  private calculateEnergyRecovery(period: EnergyLevel[]): number {
    return period[period.length - 1].level - period[0].level;
  }

  private calculateRecoveryEffectiveness(period: EnergyLevel[]): number {
    const recovery = this.calculateEnergyRecovery(period);
    const duration = this.calculateRecoveryDuration(period);
    
    return duration > 0 ? Math.min(100, (recovery / duration) * 10) : 0;
  }

  private generateRecoveryTips(
    activityType: RecoveryPattern['activityType'],
    effectiveness: number
  ): string[] {
    const baseTips: Record<RecoveryPattern['activityType'], string[]> = {
      'break': [
        'Step away from your workspace',
        'Do some light stretching',
        'Get some fresh air'
      ],
      'light_task': [
        'Choose easy, satisfying tasks',
        'Organize your workspace',
        'Review completed work'
      ],
      'physical_activity': [
        'Take a short walk',
        'Do desk exercises',
        'Practice deep breathing'
      ],
      'social_interaction': [
        'Chat with colleagues',
        'Take a team coffee break',
        'Share your progress'
      ],
      'meditation': [
        'Practice mindfulness',
        'Use breathing exercises',
        'Try a short meditation app'
      ]
    };

    const tips = [...baseTips[activityType]];
    
    if (effectiveness > 80) {
      tips.push('This activity works well for you - continue!');
    } else if (effectiveness < 40) {
      tips.push('Consider trying different recovery activities');
    }

    return tips;
  }

  private getTimeSlot(timestamp: Date): string {
    const hour = timestamp.getHours();
    
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'evening';
  }

  private findNearestEnergyLevel(
    timestamp: Date,
    energyHistory: EnergyLevel[]
  ): EnergyLevel | null {
    let nearest: EnergyLevel | null = null;
    let minDiff = Infinity;

    for (const energy of energyHistory) {
      const diff = Math.abs(energy.timestamp.getTime() - timestamp.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        nearest = energy;
      }
    }

    // Only return if within 2 hours
    return minDiff < 2 * 60 * 60 * 1000 ? nearest : null;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateCorrelationConfidence(sampleSize: number): number {
    return Math.min(100, sampleSize * 10);
  }

  private generateOptimalWorkSchedule(
    dailyCycle: EnergyCycle,
    correlations: EnergyProductivityCorrelation[]
  ): EnergyAnalytics['optimalWorkSchedule'] {
    const highEnergyTasks: TimeWindow[] = [];
    const lowEnergyTasks: TimeWindow[] = [];
    const recommendedBreaks: TimeWindow[] = [];

    // Use peak times for high energy tasks
    dailyCycle.peakTimes.forEach(peak => {
      highEnergyTasks.push({
        ...peak,
        description: 'Schedule complex/important tasks here'
      });
    });

    // Use low times for light tasks
    dailyCycle.lowTimes.forEach(low => {
      lowEnergyTasks.push({
        ...low,
        description: 'Schedule routine/administrative tasks here'
      });
    });

    // Recommend breaks between energy cycles
    for (let hour = 8; hour < 18; hour += 3) {
      recommendedBreaks.push({
        start: hour,
        end: hour + 0.25, // 15 minutes
        description: 'Recommended break time'
      });
    }

    return {
      highEnergyTasks,
      lowEnergyTasks,
      recommendedBreaks
    };
  }

  private generateEnergyForecast(
    energyHistory: EnergyLevel[],
    dailyCycle: EnergyCycle
  ): EnergyAnalytics['energyForecast'] {
    const now = new Date();
    const next24Hours: EnergyLevel[] = [];
    const next7Days: { date: Date; predictedPeakEnergy: number; predictedLowEnergy: number }[] = [];

    // Forecast next 24 hours
    for (let hour = 0; hour < 24; hour++) {
      const forecastTime = new Date(now);
      forecastTime.setHours(now.getHours() + hour);
      
      const hourPattern = dailyCycle.pattern.find(p => 
        forecastTime.getHours() >= p.timeSlot.start && 
        forecastTime.getHours() < p.timeSlot.end
      );
      
      const predictedLevel = hourPattern ? hourPattern.averageLevel : this.energyBaseline;
      
      next24Hours.push({
        timestamp: forecastTime,
        level: predictedLevel,
        source: 'calculated',
        context: this.analyzeEnergyContext(forecastTime, [], []),
        confidence: 60
      });
    }

    // Forecast next 7 days
    for (let day = 1; day <= 7; day++) {
      const forecastDate = new Date(now);
      forecastDate.setDate(now.getDate() + day);
      
      const peakEnergy = Math.max(...dailyCycle.pattern.map(p => p.averageLevel));
      const lowEnergy = Math.min(...dailyCycle.pattern.map(p => p.averageLevel));
      
      next7Days.push({
        date: forecastDate,
        predictedPeakEnergy: peakEnergy,
        predictedLowEnergy: lowEnergy
      });
    }

    return {
      next24Hours,
      next7Days
    };
  }

  private countContextSwitches(actions: ActionEvent[]): number {
    let switches = 0;
    let lastEntityId: string | null = null;

    actions.forEach(action => {
      if (action.entityType === 'task' && lastEntityId && action.entityId !== lastEntityId) {
        switches++;
      }
      if (action.entityType === 'task') {
        lastEntityId = action.entityId;
      }
    });

    return switches;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }
}

export default EnergyTracker;
