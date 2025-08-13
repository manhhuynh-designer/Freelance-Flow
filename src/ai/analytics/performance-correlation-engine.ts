/**
 * Performance Correlation Engine - Phase 4.3 Day 3
 * Advanced correlation analysis between energy, productivity, và performance factors
 */

import type { Task, Client } from '@/lib/types';
import type { ActionEvent, UserBehaviorPattern } from '../learning/behavior-tracker';
import type { DailyProductivityScore, ProductivityMetrics } from './productivity-analyzer';
import type { EnergyLevel, EnergyAnalytics } from './energy-tracker';

export interface CorrelationAnalysis {
  factor1: string;
  factor2: string;
  correlation: number; // -1 to 1
  strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
  direction: 'positive' | 'negative' | 'neutral';
  confidence: number; // 0-100
  sampleSize: number;
  significance: number; // p-value equivalent
}

export interface PerformancePattern {
  patternId: string;
  name: string;
  description: string;
  frequency: number; // how often this pattern occurs
  conditions: PerformanceCondition[];
  outcomes: PerformanceOutcome[];
  predictiveAccuracy: number; // 0-100
  actionableInsights: string[];
}

export interface PerformanceCondition {
  factor: string;
  operator: 'greater_than' | 'less_than' | 'equals' | 'between';
  value: number | [number, number];
  weight: number; // importance in pattern
}

export interface PerformanceOutcome {
  metric: string;
  expectedValue: number;
  variance: number;
  impactLevel: 'low' | 'medium' | 'high';
}

export interface MultiVariateAnalysis {
  targetMetric: string;
  contributingFactors: FactorContribution[];
  modelAccuracy: number; // 0-100
  explanation: string;
  recommendations: PerformanceRecommendation[];
}

export interface FactorContribution {
  factor: string;
  contribution: number; // percentage contribution to target metric
  direction: 'positive' | 'negative';
  importance: number; // 0-100
  interactionsWith: string[]; // other factors this interacts with
}

export interface PerformanceRecommendation {
  type: 'optimize' | 'maintain' | 'avoid' | 'experiment';
  action: string;
  expectedImprovement: number; // percentage
  confidence: number; // 0-100
  timeframe: 'immediate' | 'short_term' | 'long_term';
  difficulty: 'easy' | 'moderate' | 'challenging';
}

export interface PerformanceSegment {
  segmentId: string;
  name: string;
  criteria: PerformanceCondition[];
  metrics: {
    averageProductivity: number;
    averageEnergy: number;
    taskCompletionRate: number;
    qualityScore: number;
  };
  size: number; // number of data points
  characteristics: string[];
  optimizationOpportunities: string[];
}

export interface CausalRelationship {
  cause: string;
  effect: string;
  strength: number; // 0-100
  lag: number; // time delay in hours
  confidence: number; // 0-100
  mechanism: string; // explanation of how cause leads to effect
  examples: CausalExample[];
}

export interface CausalExample {
  timestamp: Date;
  causeValue: number;
  effectValue: number;
  context: string;
}

export interface PerformanceCorrelationResults {
  biVariateCorrelations: CorrelationAnalysis[];
  multiVariateAnalyses: MultiVariateAnalysis[];
  performancePatterns: PerformancePattern[];
  performanceSegments: PerformanceSegment[];
  causalRelationships: CausalRelationship[];
  keyInsights: {
    strongestPositiveCorrelations: CorrelationAnalysis[];
    strongestNegativeCorrelations: CorrelationAnalysis[];
    surprisingFindings: string[];
    actionableTakeaways: string[];
  };
  performanceOptimizationPlan: {
    quickWins: PerformanceRecommendation[];
    longTermStrategy: PerformanceRecommendation[];
    experimentsToTry: PerformanceRecommendation[];
  };
}

export class PerformanceCorrelationEngine {
  private correlationThresholds = {
    weak: 0.1,
    moderate: 0.3,
    strong: 0.5,
    very_strong: 0.7
  };

  constructor(private userId: string) {}

  /**
   * Analyze comprehensive performance correlations
   */
  async analyzePerformanceCorrelations(
    productivityData: ProductivityMetrics,
    energyData: EnergyAnalytics,
    actions: ActionEvent[],
    tasks: Task[],
    behaviorPatterns: UserBehaviorPattern[]
  ): Promise<PerformanceCorrelationResults> {
    // Prepare data matrix
    const dataMatrix = this.prepareDataMatrix(
      productivityData,
      energyData,
      actions,
      tasks,
      behaviorPatterns
    );

    // Bi-variate correlations
    const biVariateCorrelations = await this.analyzeBiVariateCorrelations(dataMatrix);

    // Multi-variate analyses
    const multiVariateAnalyses = await this.analyzeMultiVariateRelationships(dataMatrix);

    // Performance patterns
    const performancePatterns = await this.identifyPerformancePatterns(dataMatrix);

    // Performance segments
    const performanceSegments = await this.segmentPerformance(dataMatrix);

    // Causal relationships
    const causalRelationships = await this.analyzeCausalRelationships(dataMatrix);

    // Generate key insights
    const keyInsights = this.generateKeyInsights(
      biVariateCorrelations,
      multiVariateAnalyses,
      performancePatterns
    );

    // Generate optimization plan
    const performanceOptimizationPlan = this.generateOptimizationPlan(
      multiVariateAnalyses,
      performancePatterns,
      causalRelationships
    );

    return {
      biVariateCorrelations,
      multiVariateAnalyses,
      performancePatterns,
      performanceSegments,
      causalRelationships,
      keyInsights,
      performanceOptimizationPlan
    };
  }

  /**
   * Prepare data matrix for correlation analysis
   */
  private prepareDataMatrix(
    productivityData: ProductivityMetrics,
    energyData: EnergyAnalytics,
    actions: ActionEvent[],
    tasks: Task[],
    behaviorPatterns: UserBehaviorPattern[]
  ): Map<string, number[]> {
    const matrix = new Map<string, number[]>();

    // Extract productivity metrics
    const productivityScores = productivityData.dailyProductivity.map(d => d.overallScore);
    const tasksCompleted = productivityData.dailyProductivity.map(d => d.tasksCompleted);
    const timeEfficiency = productivityData.dailyProductivity.map(d => d.timeEfficiency);
    const qualityScores = productivityData.dailyProductivity.map(d => d.qualityScore);
    const focusTimes = productivityData.dailyProductivity.map(d => d.focusTime);
    const distractionEvents = productivityData.dailyProductivity.map(d => d.distractionEvents);

    matrix.set('productivity_score', productivityScores);
    matrix.set('tasks_completed', tasksCompleted);
    matrix.set('time_efficiency', timeEfficiency);
    matrix.set('quality_score', qualityScores);
    matrix.set('focus_time', focusTimes);
    matrix.set('distraction_events', distractionEvents);

    // Extract energy metrics
    const energyLevels = energyData.currentEnergyLevel ? 
      [energyData.currentEnergyLevel] : [];
    
    if (energyLevels.length > 0) {
      // Pad or truncate to match productivity data length
      const paddedEnergyLevels = this.padArray(energyLevels, productivityScores.length, energyData.currentEnergyLevel);
      matrix.set('energy_level', paddedEnergyLevels);
    }

    // Extract behavioral metrics
    const actionFrequency = this.calculateDailyActionFrequency(actions, productivityData.dailyProductivity.length);
    const contextSwitches = this.calculateDailyContextSwitches(actions, productivityData.dailyProductivity.length);
    const workDuration = productivityData.dailyProductivity.map(d => d.totalWorkTime);
    const breakTime = productivityData.dailyProductivity.map(d => d.breakTime);

    matrix.set('action_frequency', actionFrequency);
    matrix.set('context_switches', contextSwitches);
    matrix.set('work_duration', workDuration);
    matrix.set('break_time', breakTime);

    // Extract task complexity metrics
    const avgTaskComplexity = this.calculateDailyTaskComplexity(tasks, productivityData.dailyProductivity.length);
    const taskVariety = this.calculateDailyTaskVariety(tasks, productivityData.dailyProductivity.length);

    matrix.set('task_complexity', avgTaskComplexity);
    matrix.set('task_variety', taskVariety);

    // Extract temporal metrics
    const dayOfWeek = productivityData.dailyProductivity.map(d => d.date.getDay());
    const hourOfDay = productivityData.dailyProductivity.map(d => d.workStartTime ? d.workStartTime.getHours() : 9);

    matrix.set('day_of_week', dayOfWeek);
    matrix.set('hour_of_day', hourOfDay);

    return matrix;
  }

  /**
   * Analyze bi-variate correlations between all factors
   */
  private async analyzeBiVariateCorrelations(
    dataMatrix: Map<string, number[]>
  ): Promise<CorrelationAnalysis[]> {
    const correlations: CorrelationAnalysis[] = [];
    const factors = Array.from(dataMatrix.keys());

    for (let i = 0; i < factors.length; i++) {
      for (let j = i + 1; j < factors.length; j++) {
        const factor1 = factors[i];
        const factor2 = factors[j];
        
        const data1 = dataMatrix.get(factor1) || [];
        const data2 = dataMatrix.get(factor2) || [];

        if (data1.length === data2.length && data1.length > 2) {
          const correlation = this.calculateCorrelation(data1, data2);
          const strength = this.getCorrelationStrength(Math.abs(correlation));
          const direction = this.getCorrelationDirection(correlation);
          const confidence = this.calculateCorrelationConfidence(data1.length, Math.abs(correlation));
          const significance = this.calculateSignificance(correlation, data1.length);

          correlations.push({
            factor1,
            factor2,
            correlation,
            strength,
            direction,
            confidence,
            sampleSize: data1.length,
            significance
          });
        }
      }
    }

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /**
   * Analyze multi-variate relationships
   */
  private async analyzeMultiVariateRelationships(
    dataMatrix: Map<string, number[]>
  ): Promise<MultiVariateAnalysis[]> {
    const analyses: MultiVariateAnalysis[] = [];
    const targetMetrics = ['productivity_score', 'time_efficiency', 'quality_score', 'energy_level'];

    for (const target of targetMetrics) {
      const targetData = dataMatrix.get(target);
      if (!targetData || targetData.length < 5) continue;

      const predictorFactors = Array.from(dataMatrix.keys()).filter(key => key !== target);
      const contributingFactors: FactorContribution[] = [];

      for (const predictor of predictorFactors) {
        const predictorData = dataMatrix.get(predictor);
        if (!predictorData || predictorData.length !== targetData.length) continue;

        const correlation = this.calculateCorrelation(targetData, predictorData);
        const contribution = Math.abs(correlation) * 100; // Simplified contribution calculation
        
        if (contribution > 5) { // Only include meaningful contributors
          contributingFactors.push({
            factor: predictor,
            contribution,
            direction: correlation > 0 ? 'positive' : 'negative',
            importance: this.calculateFactorImportance(correlation, targetData.length),
            interactionsWith: this.findInteractingFactors(predictor, dataMatrix)
          });
        }
      }

      // Sort by contribution
      contributingFactors.sort((a, b) => b.contribution - a.contribution);

      // Calculate model accuracy (simplified R-squared approximation)
      const totalContribution = contributingFactors.reduce((sum, f) => sum + f.contribution, 0);
      const modelAccuracy = Math.min(100, totalContribution);

      const analysis: MultiVariateAnalysis = {
        targetMetric: target,
        contributingFactors: contributingFactors.slice(0, 8), // Top 8 factors
        modelAccuracy,
        explanation: this.generateMultiVariateExplanation(target, contributingFactors),
        recommendations: this.generateMultiVariateRecommendations(target, contributingFactors)
      };

      analyses.push(analysis);
    }

    return analyses;
  }

  /**
   * Identify performance patterns
   */
  private async identifyPerformancePatterns(
    dataMatrix: Map<string, number[]>
  ): Promise<PerformancePattern[]> {
    const patterns: PerformancePattern[] = [];
    const dataLength = dataMatrix.get('productivity_score')?.length || 0;

    if (dataLength < 5) return patterns;

    // Pattern 1: High Energy + High Productivity
    const highEnergyHighProductivity = this.identifyPattern(
      'high_energy_high_productivity',
      'High Energy Leading to High Productivity',
      [
        { factor: 'energy_level', operator: 'greater_than', value: 70, weight: 0.6 },
        { factor: 'focus_time', operator: 'greater_than', value: 120, weight: 0.4 }
      ],
      [
        { metric: 'productivity_score', expectedValue: 85, variance: 10, impactLevel: 'high' },
        { metric: 'quality_score', expectedValue: 80, variance: 15, impactLevel: 'medium' }
      ],
      dataMatrix
    );
    if (highEnergyHighProductivity) patterns.push(highEnergyHighProductivity);

    // Pattern 2: Break Time Optimization
    const breakTimeOptimal = this.identifyPattern(
      'optimal_break_pattern',
      'Optimal Break Time for Sustained Performance',
      [
        { factor: 'break_time', operator: 'between', value: [30, 90], weight: 0.5 },
        { factor: 'work_duration', operator: 'between', value: [240, 480], weight: 0.5 }
      ],
      [
        { metric: 'time_efficiency', expectedValue: 78, variance: 12, impactLevel: 'medium' },
        { metric: 'distraction_events', expectedValue: 5, variance: 3, impactLevel: 'low' }
      ],
      dataMatrix
    );
    if (breakTimeOptimal) patterns.push(breakTimeOptimal);

    // Pattern 3: Morning vs Evening Performance
    const morningPerformance = this.identifyPattern(
      'morning_peak_performance',
      'Morning Peak Performance Pattern',
      [
        { factor: 'hour_of_day', operator: 'between', value: [8, 11], weight: 0.7 },
        { factor: 'energy_level', operator: 'greater_than', value: 65, weight: 0.3 }
      ],
      [
        { metric: 'productivity_score', expectedValue: 82, variance: 8, impactLevel: 'high' },
        { metric: 'tasks_completed', expectedValue: 4, variance: 2, impactLevel: 'medium' }
      ],
      dataMatrix
    );
    if (morningPerformance) patterns.push(morningPerformance);

    // Pattern 4: Task Complexity Balance
    const complexityBalance = this.identifyPattern(
      'complexity_balance',
      'Optimal Task Complexity Balance',
      [
        { factor: 'task_complexity', operator: 'between', value: [2, 4], weight: 0.6 },
        { factor: 'task_variety', operator: 'greater_than', value: 2, weight: 0.4 }
      ],
      [
        { metric: 'quality_score', expectedValue: 85, variance: 10, impactLevel: 'high' },
        { metric: 'time_efficiency', expectedValue: 75, variance: 12, impactLevel: 'medium' }
      ],
      dataMatrix
    );
    if (complexityBalance) patterns.push(complexityBalance);

    // Pattern 5: Low Distraction High Focus
    const lowDistractionFocus = this.identifyPattern(
      'low_distraction_focus',
      'Low Distraction Periods Drive Focus',
      [
        { factor: 'distraction_events', operator: 'less_than', value: 3, weight: 0.7 },
        { factor: 'context_switches', operator: 'less_than', value: 5, weight: 0.3 }
      ],
      [
        { metric: 'focus_time', expectedValue: 180, variance: 30, impactLevel: 'high' },
        { metric: 'productivity_score', expectedValue: 80, variance: 12, impactLevel: 'medium' }
      ],
      dataMatrix
    );
    if (lowDistractionFocus) patterns.push(lowDistractionFocus);

    return patterns.filter(p => p.frequency > 0.1); // Only patterns that occur at least 10% of time
  }

  /**
   * Segment performance data into meaningful groups
   */
  private async segmentPerformance(
    dataMatrix: Map<string, number[]>
  ): Promise<PerformanceSegment[]> {
    const segments: PerformanceSegment[] = [];
    const productivity = dataMatrix.get('productivity_score') || [];
    const energy = dataMatrix.get('energy_level') || [];
    
    if (productivity.length === 0) return segments;

    // High Performers Segment
    const highPerformerIndices = productivity
      .map((score, index) => ({ score, index }))
      .filter(item => item.score > 80)
      .map(item => item.index);

    if (highPerformerIndices.length > 0) {
      segments.push({
        segmentId: 'high_performers',
        name: 'High Performance Days',
        criteria: [
          { factor: 'productivity_score', operator: 'greater_than', value: 80, weight: 1.0 }
        ],
        metrics: this.calculateSegmentMetrics(highPerformerIndices, dataMatrix),
        size: highPerformerIndices.length,
        characteristics: this.analyzeSegmentCharacteristics(highPerformerIndices, dataMatrix),
        optimizationOpportunities: [
          'Replicate conditions that lead to high performance',
          'Maintain consistency in successful patterns',
          'Scale successful approaches to other days'
        ]
      });
    }

    // Low Energy Days Segment
    const lowEnergyIndices = energy
      .map((level, index) => ({ level, index }))
      .filter(item => item.level < 50)
      .map(item => item.index);

    if (lowEnergyIndices.length > 0) {
      segments.push({
        segmentId: 'low_energy_days',
        name: 'Low Energy Days',
        criteria: [
          { factor: 'energy_level', operator: 'less_than', value: 50, weight: 1.0 }
        ],
        metrics: this.calculateSegmentMetrics(lowEnergyIndices, dataMatrix),
        size: lowEnergyIndices.length,
        characteristics: this.analyzeSegmentCharacteristics(lowEnergyIndices, dataMatrix),
        optimizationOpportunities: [
          'Implement energy restoration strategies',
          'Schedule lighter tasks during low energy periods',
          'Identify root causes of energy depletion'
        ]
      });
    }

    // Highly Focused Days Segment
    const focusTime = dataMatrix.get('focus_time') || [];
    const highFocusIndices = focusTime
      .map((time, index) => ({ time, index }))
      .filter(item => item.time > 180) // More than 3 hours
      .map(item => item.index);

    if (highFocusIndices.length > 0) {
      segments.push({
        segmentId: 'high_focus_days',
        name: 'High Focus Days',
        criteria: [
          { factor: 'focus_time', operator: 'greater_than', value: 180, weight: 1.0 }
        ],
        metrics: this.calculateSegmentMetrics(highFocusIndices, dataMatrix),
        size: highFocusIndices.length,
        characteristics: this.analyzeSegmentCharacteristics(highFocusIndices, dataMatrix),
        optimizationOpportunities: [
          'Understand what enables extended focus sessions',
          'Replicate focus-conducive conditions',
          'Protect and prioritize focus time'
        ]
      });
    }

    return segments;
  }

  /**
   * Analyze causal relationships with time lags
   */
  private async analyzeCausalRelationships(
    dataMatrix: Map<string, number[]>
  ): Promise<CausalRelationship[]> {
    const relationships: CausalRelationship[] = [];
    const factors = Array.from(dataMatrix.keys());

    // Define potential causal pairs with expected lags
    const causalPairs = [
      { cause: 'energy_level', effect: 'productivity_score', expectedLag: 0 },
      { cause: 'break_time', effect: 'energy_level', expectedLag: 1 },
      { cause: 'distraction_events', effect: 'focus_time', expectedLag: 0 },
      { cause: 'work_duration', effect: 'quality_score', expectedLag: 0 },
      { cause: 'focus_time', effect: 'tasks_completed', expectedLag: 0 }
    ];

    for (const pair of causalPairs) {
      const causeData = dataMatrix.get(pair.cause);
      const effectData = dataMatrix.get(pair.effect);

      if (!causeData || !effectData || causeData.length < 5) continue;

      const relationship = this.analyzeCausalPair(
        pair.cause,
        pair.effect,
        causeData,
        effectData,
        pair.expectedLag
      );

      if (relationship && relationship.strength > 30) {
        relationships.push(relationship);
      }
    }

    return relationships.sort((a, b) => b.strength - a.strength);
  }

  // Helper Methods

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

  private getCorrelationStrength(correlation: number): CorrelationAnalysis['strength'] {
    if (correlation >= this.correlationThresholds.very_strong) return 'very_strong';
    if (correlation >= this.correlationThresholds.strong) return 'strong';
    if (correlation >= this.correlationThresholds.moderate) return 'moderate';
    return 'weak';
  }

  private getCorrelationDirection(correlation: number): CorrelationAnalysis['direction'] {
    if (Math.abs(correlation) < 0.05) return 'neutral';
    return correlation > 0 ? 'positive' : 'negative';
  }

  private calculateCorrelationConfidence(sampleSize: number, correlation: number): number {
    // Simplified confidence calculation based on sample size và correlation strength
    const baseConfidence = Math.min(90, sampleSize * 5);
    const strengthBonus = Math.abs(correlation) * 20;
    return Math.min(100, baseConfidence + strengthBonus);
  }

  private calculateSignificance(correlation: number, sampleSize: number): number {
    // Simplified p-value approximation
    if (sampleSize < 3) return 1.0;
    
    const tStat = Math.abs(correlation) * Math.sqrt((sampleSize - 2) / (1 - correlation * correlation));
    // Very simplified p-value approximation
    return Math.max(0.001, 1 / (1 + tStat * tStat));
  }

  private calculateFactorImportance(correlation: number, sampleSize: number): number {
    return Math.min(100, Math.abs(correlation) * 100 + Math.min(20, sampleSize));
  }

  private findInteractingFactors(factor: string, dataMatrix: Map<string, number[]>): string[] {
    const factorData = dataMatrix.get(factor);
    if (!factorData) return [];

    const interactions: string[] = [];
    
    for (const [otherFactor, otherData] of dataMatrix.entries()) {
      if (otherFactor === factor || otherData.length !== factorData.length) continue;
      
      const correlation = this.calculateCorrelation(factorData, otherData);
      if (Math.abs(correlation) > 0.3) {
        interactions.push(otherFactor);
      }
    }

    return interactions.slice(0, 3); // Top 3 interactions
  }

  private generateMultiVariateExplanation(
    target: string,
    factors: FactorContribution[]
  ): string {
    const topFactors = factors.slice(0, 3);
    const factorNames = topFactors.map(f => f.factor.replace('_', ' ')).join(', ');
    
    return `${target.replace('_', ' ')} is primarily influenced by ${factorNames}. ` +
           `Together, these factors explain approximately ${factors.reduce((sum, f) => sum + f.contribution, 0).toFixed(1)}% of the variation.`;
  }

  private generateMultiVariateRecommendations(
    target: string,
    factors: FactorContribution[]
  ): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    factors.slice(0, 5).forEach(factor => {
      if (factor.contribution > 10) {
        recommendations.push({
          type: factor.direction === 'positive' ? 'optimize' : 'avoid',
          action: `${factor.direction === 'positive' ? 'Increase' : 'Reduce'} ${factor.factor.replace('_', ' ')}`,
          expectedImprovement: factor.contribution,
          confidence: factor.importance,
          timeframe: factor.contribution > 20 ? 'immediate' : 'short_term',
          difficulty: factor.importance > 70 ? 'easy' : 'moderate'
        });
      }
    });

    return recommendations;
  }

  private identifyPattern(
    patternId: string,
    name: string,
    conditions: PerformanceCondition[],
    outcomes: PerformanceOutcome[],
    dataMatrix: Map<string, number[]>
  ): PerformancePattern | null {
    const dataLength = dataMatrix.get('productivity_score')?.length || 0;
    if (dataLength === 0) return null;

    let matchingIndices: number[] = [];
    
    // Find indices that match all conditions
    for (let i = 0; i < dataLength; i++) {
      let matches = true;
      
      for (const condition of conditions) {
        const data = dataMatrix.get(condition.factor);
        if (!data || !this.checkCondition(data[i], condition)) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        matchingIndices.push(i);
      }
    }

    const frequency = matchingIndices.length / dataLength;
    
    if (frequency < 0.05) return null; // Pattern must occur at least 5% of time

    // Calculate predictive accuracy
    const predictiveAccuracy = this.calculatePredictiveAccuracy(matchingIndices, outcomes, dataMatrix);
    
    // Generate actionable insights
    const actionableInsights = this.generatePatternInsights(name, conditions, outcomes, frequency);

    return {
      patternId,
      name,
      description: `Pattern occurs ${(frequency * 100).toFixed(1)}% of the time`,
      frequency,
      conditions,
      outcomes,
      predictiveAccuracy,
      actionableInsights
    };
  }

  private checkCondition(value: number, condition: PerformanceCondition): boolean {
    switch (condition.operator) {
      case 'greater_than':
        return value > (condition.value as number);
      case 'less_than':
        return value < (condition.value as number);
      case 'equals':
        return Math.abs(value - (condition.value as number)) < 0.01;
      case 'between':
        const [min, max] = condition.value as [number, number];
        return value >= min && value <= max;
      default:
        return false;
    }
  }

  private calculatePredictiveAccuracy(
    matchingIndices: number[],
    outcomes: PerformanceOutcome[],
    dataMatrix: Map<string, number[]>
  ): number {
    if (matchingIndices.length === 0) return 0;

    let totalAccuracy = 0;
    let validOutcomes = 0;

    for (const outcome of outcomes) {
      const data = dataMatrix.get(outcome.metric);
      if (!data) continue;

      const actualValues = matchingIndices.map(i => data[i]);
      const avgActual = actualValues.reduce((sum, val) => sum + val, 0) / actualValues.length;
      
      const accuracy = Math.max(0, 100 - Math.abs(avgActual - outcome.expectedValue) / outcome.expectedValue * 100);
      totalAccuracy += accuracy;
      validOutcomes++;
    }

    return validOutcomes > 0 ? totalAccuracy / validOutcomes : 0;
  }

  private generatePatternInsights(
    name: string,
    conditions: PerformanceCondition[],
    outcomes: PerformanceOutcome[],
    frequency: number
  ): string[] {
    const insights: string[] = [];
    
    insights.push(`This pattern occurs ${(frequency * 100).toFixed(1)}% of the time`);
    
    const topCondition = conditions.reduce((max, c) => c.weight > max.weight ? c : max);
    insights.push(`Key factor: ${topCondition.factor.replace('_', ' ')}`);
    
    const topOutcome = outcomes.reduce((max, o) => o.impactLevel === 'high' ? o : max, outcomes[0]);
    if (topOutcome) {
      insights.push(`Primary benefit: improved ${topOutcome.metric.replace('_', ' ')}`);
    }

    return insights;
  }

  private calculateSegmentMetrics(
    indices: number[],
    dataMatrix: Map<string, number[]>
  ): PerformanceSegment['metrics'] {
    const getAverage = (metric: string): number => {
      const data = dataMatrix.get(metric);
      if (!data) return 0;
      const values = indices.map(i => data[i]).filter(v => !isNaN(v));
      return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    };

    return {
      averageProductivity: getAverage('productivity_score'),
      averageEnergy: getAverage('energy_level'),
      taskCompletionRate: getAverage('tasks_completed'),
      qualityScore: getAverage('quality_score')
    };
  }

  private analyzeSegmentCharacteristics(
    indices: number[],
    dataMatrix: Map<string, number[]>
  ): string[] {
    const characteristics: string[] = [];
    
    // Analyze common characteristics in this segment
    const focusTime = dataMatrix.get('focus_time');
    const breakTime = dataMatrix.get('break_time');
    const distractions = dataMatrix.get('distraction_events');

    if (focusTime) {
      const avgFocus = indices.map(i => focusTime[i]).reduce((sum, val) => sum + val, 0) / indices.length;
      if (avgFocus > 120) characteristics.push('Extended focus sessions');
    }

    if (breakTime) {
      const avgBreaks = indices.map(i => breakTime[i]).reduce((sum, val) => sum + val, 0) / indices.length;
      if (avgBreaks > 60) characteristics.push('Adequate break time');
    }

    if (distractions) {
      const avgDistractions = indices.map(i => distractions[i]).reduce((sum, val) => sum + val, 0) / indices.length;
      if (avgDistractions < 5) characteristics.push('Low distraction environment');
    }

    return characteristics;
  }

  private analyzeCausalPair(
    cause: string,
    effect: string,
    causeData: number[],
    effectData: number[],
    expectedLag: number
  ): CausalRelationship | null {
    if (causeData.length !== effectData.length) return null;

    // Apply lag if specified
    const adjustedEffectData = expectedLag > 0 && effectData.length > expectedLag
      ? effectData.slice(expectedLag)
      : effectData;
    
    const adjustedCauseData = expectedLag > 0 && causeData.length > expectedLag
      ? causeData.slice(0, -expectedLag)
      : causeData;

    const correlation = this.calculateCorrelation(adjustedCauseData, adjustedEffectData);
    const strength = Math.abs(correlation) * 100;
    
    if (strength < 20) return null; // Weak causal relationship

    const confidence = this.calculateCorrelationConfidence(adjustedCauseData.length, correlation);
    const mechanism = this.generateCausalMechanism(cause, effect, correlation);
    const examples = this.generateCausalExamples(adjustedCauseData, adjustedEffectData, cause, effect);

    return {
      cause,
      effect,
      strength,
      lag: expectedLag,
      confidence,
      mechanism,
      examples: examples.slice(0, 3)
    };
  }

  private generateCausalMechanism(cause: string, effect: string, correlation: number): string {
    const direction = correlation > 0 ? 'increases' : 'decreases';
    return `Higher ${cause.replace('_', ' ')} ${direction} ${effect.replace('_', ' ')} through direct performance impact`;
  }

  private generateCausalExamples(
    causeData: number[],
    effectData: number[],
    cause: string,
    effect: string
  ): CausalExample[] {
    const examples: CausalExample[] = [];
    
    for (let i = 0; i < Math.min(causeData.length, 5); i++) {
      examples.push({
        timestamp: new Date(Date.now() - (causeData.length - i) * 24 * 60 * 60 * 1000),
        causeValue: causeData[i],
        effectValue: effectData[i],
        context: `${cause}: ${causeData[i].toFixed(1)}, ${effect}: ${effectData[i].toFixed(1)}`
      });
    }

    return examples;
  }

  private generateKeyInsights(
    correlations: CorrelationAnalysis[],
    multiVariate: MultiVariateAnalysis[],
    patterns: PerformancePattern[]
  ): PerformanceCorrelationResults['keyInsights'] {
    const strongestPositive = correlations
      .filter(c => c.direction === 'positive')
      .slice(0, 3);

    const strongestNegative = correlations
      .filter(c => c.direction === 'negative')
      .slice(0, 3);

    const surprisingFindings: string[] = [];
    correlations.forEach(corr => {
      if (Math.abs(corr.correlation) > 0.6 && corr.significance < 0.05) {
        surprisingFindings.push(
          `Unexpected ${corr.strength} ${corr.direction} correlation between ${corr.factor1} and ${corr.factor2}`
        );
      }
    });

    const actionableTakeaways: string[] = [];
    patterns.slice(0, 3).forEach(pattern => {
      actionableTakeaways.push(...pattern.actionableInsights);
    });

    return {
      strongestPositiveCorrelations: strongestPositive,
      strongestNegativeCorrelations: strongestNegative,
      surprisingFindings: surprisingFindings.slice(0, 3),
      actionableTakeaways: actionableTakeaways.slice(0, 5)
    };
  }

  private generateOptimizationPlan(
    multiVariate: MultiVariateAnalysis[],
    patterns: PerformancePattern[],
    causal: CausalRelationship[]
  ): PerformanceCorrelationResults['performanceOptimizationPlan'] {
    const quickWins: PerformanceRecommendation[] = [];
    const longTermStrategy: PerformanceRecommendation[] = [];
    const experimentsToTry: PerformanceRecommendation[] = [];

    // Extract recommendations from multi-variate analyses
    multiVariate.forEach(analysis => {
      analysis.recommendations.forEach(rec => {
        if (rec.timeframe === 'immediate') quickWins.push(rec);
        else if (rec.timeframe === 'long_term') longTermStrategy.push(rec);
        else experimentsToTry.push(rec);
      });
    });

    // Add pattern-based recommendations
    patterns.forEach(pattern => {
      if (pattern.frequency > 0.3 && pattern.predictiveAccuracy > 70) {
        quickWins.push({
          type: 'optimize',
          action: `Replicate conditions from ${pattern.name}`,
          expectedImprovement: pattern.predictiveAccuracy,
          confidence: 80,
          timeframe: 'immediate',
          difficulty: 'moderate'
        });
      }
    });

    // Add causal relationship recommendations
    causal.forEach(rel => {
      if (rel.strength > 60) {
        longTermStrategy.push({
          type: 'optimize',
          action: `Focus on improving ${rel.cause} to enhance ${rel.effect}`,
          expectedImprovement: rel.strength,
          confidence: rel.confidence,
          timeframe: 'long_term',
          difficulty: 'moderate'
        });
      }
    });

    return {
      quickWins: quickWins.slice(0, 5),
      longTermStrategy: longTermStrategy.slice(0, 5),
      experimentsToTry: experimentsToTry.slice(0, 3)
    };
  }

  // Utility methods
  private padArray(array: number[], targetLength: number, fillValue: number): number[] {
    if (array.length >= targetLength) return array.slice(0, targetLength);
    
    const result = [...array];
    while (result.length < targetLength) {
      result.push(fillValue);
    }
    return result;
  }

  private calculateDailyActionFrequency(actions: ActionEvent[], days: number): number[] {
    const frequencies: number[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dayActions = actions.filter(action => 
        this.isSameDay(action.timestamp, date)
      );
      
      frequencies.push(dayActions.length);
    }

    return frequencies;
  }

  private calculateDailyContextSwitches(actions: ActionEvent[], days: number): number[] {
    const switches: number[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dayActions = actions.filter(action => 
        this.isSameDay(action.timestamp, date)
      );
      
      let dailySwitches = 0;
      let lastEntityId: string | null = null;

      dayActions.forEach(action => {
        if (action.entityType === 'task' && lastEntityId && action.entityId !== lastEntityId) {
          dailySwitches++;
        }
        if (action.entityType === 'task') {
          lastEntityId = action.entityId;
        }
      });

      switches.push(dailySwitches);
    }

    return switches;
  }

  private calculateDailyTaskComplexity(tasks: Task[], days: number): number[] {
    // Simplified: assume all tasks have uniform complexity
    return new Array(days).fill(2); // Medium complexity
  }

  private calculateDailyTaskVariety(tasks: Task[], days: number): number[] {
    // Simplified: assume moderate variety
    return new Array(days).fill(3); // Some variety
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }
}

export default PerformanceCorrelationEngine;
