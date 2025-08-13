/**
 * Insight Report Generator - Phase 4.3 Day 4
 * Advanced automated insight generation và reporting system
 */

import type { Task } from '@/lib/types';
import type { ActionEvent, UserBehaviorPattern } from '../learning/behavior-tracker';
import type { ProductivityMetrics, DailyProductivityScore } from '../analytics/productivity-analyzer';
import type { EnergyAnalytics, EnergyLevel } from '../analytics/energy-tracker';
import type { PerformanceCorrelationResults, PerformancePattern } from '../analytics/performance-correlation-engine';

export interface InsightReport {
  id: string;
  title: string;
  generatedAt: Date;
  period: ReportPeriod;
  insights: Insight[];
  summary: ReportSummary;
  recommendations: ReportRecommendation[];
  trends: TrendAnalysis[];
  predictions: PredictionInsight[];
  visualizations: VisualizationData[];
}

export interface ReportPeriod {
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  startDate: Date;
  endDate: Date;
  comparison?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface Insight {
  id: string;
  type: 'performance' | 'energy' | 'pattern' | 'correlation' | 'anomaly';
  category: 'productivity' | 'efficiency' | 'wellbeing' | 'habits' | 'optimization';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number; // 0-100
  evidence: Evidence[];
  relatedMetrics: string[];
  actionability: number; // 0-100 how actionable this insight is
}

export interface Evidence {
  type: 'data_point' | 'correlation' | 'pattern' | 'comparison';
  description: string;
  value: number | string;
  context: string;
}

export interface ReportSummary {
  overallScore: number; // 0-100
  keyHighlights: string[];
  majorChanges: string[];
  accomplishments: string[];
  areasForImprovement: string[];
  scoreBreakdown: {
    productivity: number;
    efficiency: number;
    energy: number;
    consistency: number;
  };
}

export interface ReportRecommendation {
  id: string;
  type: 'immediate' | 'short_term' | 'long_term' | 'experimental';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  rationale: string;
  expectedOutcome: string;
  implementationSteps: string[];
  timeframe: string;
  effort: 'minimal' | 'moderate' | 'significant';
  relatedInsights: string[];
}

export interface TrendAnalysis {
  metric: string;
  direction: 'improving' | 'declining' | 'stable' | 'volatile';
  magnitude: number; // percentage change
  significance: 'strong' | 'moderate' | 'weak';
  timeframe: string;
  interpretation: string;
  factors: string[];
}

export interface PredictionInsight {
  metric: string;
  prediction: number;
  confidence: number; // 0-100
  timeframe: string;
  factors: PredictionFactor[];
  scenarios: PredictionScenario[];
}

export interface PredictionFactor {
  factor: string;
  impact: number; // -100 to +100
  likelihood: number; // 0-100
}

export interface PredictionScenario {
  name: string;
  description: string;
  probability: number; // 0-100
  outcome: number;
}

export interface VisualizationData {
  id: string;
  type: 'line_chart' | 'bar_chart' | 'heatmap' | 'radar_chart' | 'scatter_plot';
  title: string;
  data: any[];
  config: {
    xAxis?: string;
    yAxis?: string;
    groupBy?: string;
    colorScheme?: string[];
  };
  insights: string[];
}

export class InsightReportGenerator {
  constructor(private userId: string) {}

  /**
   * Generate comprehensive insight report
   */
  async generateReport(
    period: ReportPeriod,
    productivityData: ProductivityMetrics,
    energyData: EnergyAnalytics,
    correlationData: PerformanceCorrelationResults,
    actions: ActionEvent[],
    tasks: Task[],
    behaviorPatterns: UserBehaviorPattern[]
  ): Promise<InsightReport> {
    const reportId = this.generateReportId(period);
    
    // Generate all report components
    const insights = await this.generateInsights(
      productivityData,
      energyData,
      correlationData,
      actions,
      tasks,
      behaviorPatterns
    );

    const summary = this.generateReportSummary(productivityData, energyData, insights);
    const recommendations = this.generateRecommendations(insights, correlationData);
    const trends = this.analyzeTrends(productivityData, energyData);
    const predictions = this.generatePredictions(productivityData, energyData, correlationData);
    const visualizations = this.generateVisualizations(productivityData, energyData, correlationData);

    return {
      id: reportId,
      title: this.generateReportTitle(period),
      generatedAt: new Date(),
      period,
      insights,
      summary,
      recommendations,
      trends,
      predictions,
      visualizations
    };
  }

  /**
   * Generate actionable insights from all data sources
   */
  private async generateInsights(
    productivityData: ProductivityMetrics,
    energyData: EnergyAnalytics,
    correlationData: PerformanceCorrelationResults,
    actions: ActionEvent[],
    tasks: Task[],
    behaviorPatterns: UserBehaviorPattern[]
  ): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Performance insights
    insights.push(...this.generatePerformanceInsights(productivityData));
    
    // Energy insights
    insights.push(...this.generateEnergyInsights(energyData));
    
    // Pattern insights
    insights.push(...this.generatePatternInsights(correlationData.performancePatterns));
    
    // Correlation insights
    insights.push(...this.generateCorrelationInsights(correlationData));
    
    // Anomaly detection
    insights.push(...this.detectAnomalies(productivityData, energyData));
    
    // Behavioral insights
    insights.push(...this.generateBehavioralInsights(behaviorPatterns, productivityData));

    // Sort by impact và confidence
    return insights.sort((a, b) => {
      const aScore = this.calculateInsightScore(a);
      const bScore = this.calculateInsightScore(b);
      return bScore - aScore;
    });
  }

  /**
   * Generate performance-related insights
   */
  private generatePerformanceInsights(data: ProductivityMetrics): Insight[] {
    const insights: Insight[] = [];
    
    // Productivity trend insight
    if (data.overallTrend === 'improving') {
      insights.push({
        id: 'productivity-trend-positive',
        type: 'performance',
        category: 'productivity',
        title: 'Productivity is on an upward trajectory',
        description: `Your productivity has shown consistent improvement over the analysis period. This positive trend indicates effective workflow optimization và habit formation.`,
        impact: 'high',
        confidence: 85,
        evidence: [
          {
            type: 'data_point',
            description: 'Weekly productivity trends',
            value: data.overallTrend,
            context: 'Consistent improvement across multiple weeks'
          }
        ],
        relatedMetrics: ['productivity_score', 'weekly_trends'],
        actionability: 75
      });
    }

    // Current streak insight
    if (data.currentStreak.days >= 5 && data.currentStreak.type === 'productive') {
      insights.push({
        id: 'productive-streak',
        type: 'performance',
        category: 'productivity',
        title: `Excellent ${data.currentStreak.days}-day productive streak`,
        description: `You've maintained high productivity for ${data.currentStreak.days} consecutive days. This demonstrates strong consistency và effective daily habits.`,
        impact: 'high',
        confidence: 90,
        evidence: [
          {
            type: 'data_point',
            description: 'Consecutive productive days',
            value: data.currentStreak.days,
            context: `Started on ${data.currentStreak.startDate.toLocaleDateString()}`
          }
        ],
        relatedMetrics: ['current_streak', 'daily_productivity'],
        actionability: 80
      });
    }

    // Peak performance times insight
    if (data.peakPerformanceTimes.length > 0) {
      const bestTime = data.peakPerformanceTimes[0];
      insights.push({
        id: 'peak-performance-time',
        type: 'performance',
        category: 'efficiency',
        title: `Peak performance detected at ${bestTime.startHour}:00-${bestTime.endHour}:00`,
        description: `Your highest productivity consistently occurs during ${bestTime.startHour}:00-${bestTime.endHour}:00 with ${bestTime.productivity.toFixed(1)}% average performance.`,
        impact: 'medium',
        confidence: bestTime.consistency,
        evidence: [
          {
            type: 'data_point',
            description: 'Peak productivity time',
            value: `${bestTime.productivity.toFixed(1)}%`,
            context: `Consistency: ${bestTime.consistency.toFixed(1)}%`
          }
        ],
        relatedMetrics: ['peak_performance_times'],
        actionability: 90
      });
    }

    // Factor analysis insights
    data.productivityFactors.slice(0, 3).forEach((factor, index) => {
      if (Math.abs(factor.impact) > 20) {
        insights.push({
          id: `factor-impact-${index}`,
          type: 'correlation',
          category: factor.impact > 0 ? 'productivity' : 'efficiency',
          title: `${factor.factor} significantly ${factor.impact > 0 ? 'boosts' : 'hinders'} productivity`,
          description: `${factor.factor} shows a ${Math.abs(factor.impact).toFixed(1)}% ${factor.impact > 0 ? 'positive' : 'negative'} impact on your overall productivity.`,
          impact: Math.abs(factor.impact) > 30 ? 'high' : 'medium',
          confidence: factor.confidence,
          evidence: [
            {
              type: 'correlation',
              description: 'Factor impact analysis',
              value: `${factor.impact.toFixed(1)}%`,
              context: `Confidence: ${factor.confidence}%`
            }
          ],
          relatedMetrics: ['productivity_factors'],
          actionability: 85
        });
      }
    });

    return insights;
  }

  /**
   * Generate energy-related insights
   */
  private generateEnergyInsights(data: EnergyAnalytics): Insight[] {
    const insights: Insight[] = [];

    // Energy cycle insight
    if (data.energyCycles.length > 0) {
      const cycle = data.energyCycles[0];
      const peakPattern = cycle.peakTimes[0];
      const lowPattern = cycle.lowTimes[0];

      if (peakPattern && lowPattern) {
        insights.push({
          id: 'energy-cycle-pattern',
          type: 'energy',
          category: 'wellbeing',
          title: 'Clear energy cycle pattern identified',
          description: `Your energy peaks at ${peakPattern.start}:00 và dips at ${lowPattern.start}:00. Aligning demanding tasks với your energy peaks could boost productivity.`,
          impact: 'high',
          confidence: cycle.consistency,
          evidence: [
            {
              type: 'pattern',
              description: 'Daily energy cycle',
              value: `Peak: ${peakPattern.start}:00, Low: ${lowPattern.start}:00`,
              context: `Cycle consistency: ${cycle.consistency.toFixed(1)}%`
            }
          ],
          relatedMetrics: ['energy_cycles'],
          actionability: 95
        });
      }
    }

    // Energy drain insights
    data.drainFactors.slice(0, 2).forEach((drain, index) => {
      if (Math.abs(drain.impact) > 15) {
        insights.push({
          id: `energy-drain-${index}`,
          type: 'energy',
          category: 'wellbeing',
          title: `${drain.factor} significantly drains energy`,
          description: `${drain.factor} reduces your energy by ${Math.abs(drain.impact).toFixed(1)}% on average. Consider implementing mitigation strategies.`,
          impact: Math.abs(drain.impact) > 25 ? 'high' : 'medium',
          confidence: 80,
          evidence: [
            {
              type: 'data_point',
              description: 'Energy drain factor',
              value: `${drain.impact.toFixed(1)}%`,
              context: `Frequency: ${(drain.frequency * 100).toFixed(1)}%`
            }
          ],
          relatedMetrics: ['drain_factors'],
          actionability: 85
        });
      }
    });

    // Energy boost insights
    data.boostFactors.slice(0, 2).forEach((boost, index) => {
      if (boost.impact > 10) {
        insights.push({
          id: `energy-boost-${index}`,
          type: 'energy',
          category: 'wellbeing',
          title: `${boost.factor} effectively boosts energy`,
          description: `${boost.factor} increases your energy by ${boost.impact.toFixed(1)}% on average. Consider incorporating this more frequently.`,
          impact: boost.impact > 20 ? 'high' : 'medium',
          confidence: 75,
          evidence: [
            {
              type: 'data_point',
              description: 'Energy boost factor',
              value: `+${boost.impact.toFixed(1)}%`,
              context: `Frequency: ${(boost.frequency * 100).toFixed(1)}%`
            }
          ],
          relatedMetrics: ['boost_factors'],
          actionability: 90
        });
      }
    });

    return insights;
  }

  /**
   * Generate pattern-based insights
   */
  private generatePatternInsights(patterns: PerformancePattern[]): Insight[] {
    const insights: Insight[] = [];

    patterns.slice(0, 3).forEach((pattern, index) => {
      if (pattern.frequency > 0.2 && pattern.predictiveAccuracy > 70) {
        insights.push({
          id: `pattern-${index}`,
          type: 'pattern',
          category: 'habits',
          title: `Reliable pattern: ${pattern.name}`,
          description: `${pattern.description} This pattern occurs ${(pattern.frequency * 100).toFixed(1)}% of the time với ${pattern.predictiveAccuracy.toFixed(1)}% predictive accuracy.`,
          impact: pattern.frequency > 0.4 ? 'high' : 'medium',
          confidence: pattern.predictiveAccuracy,
          evidence: [
            {
              type: 'pattern',
              description: 'Performance pattern',
              value: `${(pattern.frequency * 100).toFixed(1)}% frequency`,
              context: `${pattern.predictiveAccuracy.toFixed(1)}% accuracy`
            }
          ],
          relatedMetrics: ['performance_patterns'],
          actionability: 85
        });
      }
    });

    return insights;
  }

  /**
   * Generate correlation-based insights
   */
  private generateCorrelationInsights(data: PerformanceCorrelationResults): Insight[] {
    const insights: Insight[] = [];

    // Strong correlations
    data.biVariateCorrelations.slice(0, 3).forEach((corr, index) => {
      if (corr.strength === 'strong' || corr.strength === 'very_strong') {
        insights.push({
          id: `correlation-${index}`,
          type: 'correlation',
          category: 'optimization',
          title: `Strong ${corr.direction} correlation: ${corr.factor1} ↔ ${corr.factor2}`,
          description: `${corr.factor1} và ${corr.factor2} show a ${corr.strength} ${corr.direction} correlation (${(corr.correlation * 100).toFixed(1)}%). This relationship could be leveraged for optimization.`,
          impact: corr.strength === 'very_strong' ? 'high' : 'medium',
          confidence: corr.confidence,
          evidence: [
            {
              type: 'correlation',
              description: 'Factor correlation',
              value: `${(corr.correlation * 100).toFixed(1)}%`,
              context: `${corr.strength} ${corr.direction} correlation`
            }
          ],
          relatedMetrics: ['correlations'],
          actionability: 75
        });
      }
    });

    return insights;
  }

  /**
   * Detect anomalies in data
   */
  private detectAnomalies(
    productivityData: ProductivityMetrics,
    energyData: EnergyAnalytics
  ): Insight[] {
    const insights: Insight[] = [];

    // Productivity anomalies
    const scores = productivityData.dailyProductivity.map(d => d.overallScore);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const stdDev = Math.sqrt(scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length);

    const anomalies = productivityData.dailyProductivity.filter(day => 
      Math.abs(day.overallScore - mean) > 2 * stdDev
    );

    if (anomalies.length > 0) {
      const isPositive = anomalies[0].overallScore > mean;
      insights.push({
        id: 'productivity-anomaly',
        type: 'anomaly',
        category: 'productivity',
        title: `${isPositive ? 'Exceptional' : 'Unusual'} productivity detected`,
        description: `${anomalies.length} day(s) showed ${isPositive ? 'exceptionally high' : 'unusually low'} productivity (${isPositive ? 'above' : 'below'} normal range). Investigating these days could reveal optimization opportunities.`,
        impact: 'medium',
        confidence: 70,
        evidence: [
          {
            type: 'data_point',
            description: 'Productivity anomaly',
            value: `${anomalies[0].overallScore.toFixed(1)}%`,
            context: `${Math.abs(anomalies[0].overallScore - mean).toFixed(1)} points from average`
          }
        ],
        relatedMetrics: ['daily_productivity'],
        actionability: 60
      });
    }

    return insights;
  }

  /**
   * Generate behavioral insights
   */
  private generateBehavioralInsights(
    patterns: UserBehaviorPattern[],
    productivityData: ProductivityMetrics
  ): Insight[] {
    const insights: Insight[] = [];

    patterns.forEach((pattern, index) => {
      if (pattern.confidence > 0.7 && pattern.strength > 0.6) {
        insights.push({
          id: `behavior-${index}`,
          type: 'pattern',
          category: 'habits',
          title: `Behavioral pattern: ${pattern.patternType}`,
          description: `${pattern.description} This pattern shows ${(pattern.strength * 100).toFixed(1)}% strength và occurs ${pattern.frequency} times.`,
          impact: pattern.strength > 0.8 ? 'high' : 'medium',
          confidence: pattern.confidence * 100,
          evidence: [
            {
              type: 'pattern',
              description: 'Behavioral pattern',
              value: `${(pattern.strength * 100).toFixed(1)}% strength`,
              context: `${pattern.frequency} occurrences`
            }
          ],
          relatedMetrics: ['behavior_patterns'],
          actionability: 70
        });
      }
    });

    return insights;
  }

  /**
   * Generate report summary
   */
  private generateReportSummary(
    productivityData: ProductivityMetrics,
    energyData: EnergyAnalytics,
    insights: Insight[]
  ): ReportSummary {
    const currentProductivity = productivityData.dailyProductivity.length > 0 
      ? productivityData.dailyProductivity[productivityData.dailyProductivity.length - 1].overallScore 
      : 0;

    const avgEfficiency = productivityData.dailyProductivity
      .reduce((sum, day) => sum + day.timeEfficiency, 0) / productivityData.dailyProductivity.length;

    const overallScore = Math.round((currentProductivity + avgEfficiency + energyData.currentEnergyLevel) / 3);

    const keyHighlights = insights
      .filter(i => i.impact === 'high')
      .slice(0, 3)
      .map(i => i.title);

    const accomplishments = [
      `Completed ${productivityData.dailyProductivity.reduce((sum, day) => sum + day.tasksCompleted, 0)} tasks in the analysis period`,
      productivityData.overallTrend === 'improving' ? 'Productivity trend is improving' : 'Maintaining consistent productivity',
      `Current productive streak: ${productivityData.currentStreak.days} days`
    ];

    const areasForImprovement = insights
      .filter(i => i.type === 'energy' && i.title.includes('drain'))
      .slice(0, 2)
      .map(i => i.title);

    return {
      overallScore,
      keyHighlights,
      majorChanges: [`Overall trend: ${productivityData.overallTrend}`],
      accomplishments,
      areasForImprovement,
      scoreBreakdown: {
        productivity: currentProductivity,
        efficiency: avgEfficiency,
        energy: energyData.currentEnergyLevel,
        consistency: productivityData.weeklyTrends.length > 0 
          ? productivityData.weeklyTrends[productivityData.weeklyTrends.length - 1].consistencyScore 
          : 0
      }
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    insights: Insight[],
    correlationData: PerformanceCorrelationResults
  ): ReportRecommendation[] {
    const recommendations: ReportRecommendation[] = [];

    // Convert optimization plan to recommendations
    correlationData.performanceOptimizationPlan.quickWins.forEach((rec, index) => {
      recommendations.push({
        id: `quick-win-${index}`,
        type: 'immediate',
        priority: rec.confidence > 80 ? 'high' : 'medium',
        title: rec.action,
        description: `Implementation can lead to ${rec.expectedImprovement.toFixed(1)}% improvement`,
        rationale: `Based on correlation analysis với ${rec.confidence}% confidence`,
        expectedOutcome: `${rec.expectedImprovement.toFixed(1)}% productivity improvement`,
        implementationSteps: [
          'Assess current state',
          'Implement change gradually',
          'Monitor impact for 1-2 weeks',
          'Adjust based on results'
        ],
        timeframe: rec.timeframe,
        effort: rec.difficulty === 'easy' ? 'minimal' : 'moderate',
        relatedInsights: insights.filter(i => i.type === 'correlation').map(i => i.id).slice(0, 2)
      });
    });

    // Generate energy-based recommendations
    const energyInsights = insights.filter(i => i.type === 'energy');
    energyInsights.forEach((insight, index) => {
      if (insight.title.includes('drain')) {
        recommendations.push({
          id: `energy-rec-${index}`,
          type: 'short_term',
          priority: insight.impact === 'high' ? 'high' : 'medium',
          title: `Mitigate ${insight.title.split(' ')[0]} energy drain`,
          description: `Address the energy drain identified in your patterns`,
          rationale: insight.description,
          expectedOutcome: 'Improved energy levels và sustained performance',
          implementationSteps: [
            'Identify specific triggers',
            'Develop mitigation strategies',
            'Implement gradually',
            'Track energy levels'
          ],
          timeframe: '2-4 weeks',
          effort: 'moderate',
          relatedInsights: [insight.id]
        });
      }
    });

    return recommendations.slice(0, 8); // Limit to top 8 recommendations
  }

  /**
   * Analyze trends across metrics
   */
  private analyzeTrends(
    productivityData: ProductivityMetrics,
    energyData: EnergyAnalytics
  ): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];

    // Productivity trend
    const weeklyTrends = productivityData.weeklyTrends;
    if (weeklyTrends.length >= 2) {
      const recentAvg = weeklyTrends.slice(-2).reduce((sum, week) => sum + week.averageProductivity, 0) / 2;
      const earlierAvg = weeklyTrends.slice(0, 2).reduce((sum, week) => sum + week.averageProductivity, 0) / 2;
      const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;

      trends.push({
        metric: 'Productivity Score',
        direction: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
        magnitude: Math.abs(change),
        significance: Math.abs(change) > 10 ? 'strong' : Math.abs(change) > 5 ? 'moderate' : 'weak',
        timeframe: 'Recent weeks',
        interpretation: `Productivity has ${change > 0 ? 'increased' : change < 0 ? 'decreased' : 'remained stable'} by ${Math.abs(change).toFixed(1)}%`,
        factors: ['Task completion', 'Time efficiency', 'Focus periods']
      });
    }

    return trends;
  }

  /**
   * Generate predictions based on current patterns
   */
  private generatePredictions(
    productivityData: ProductivityMetrics,
    energyData: EnergyAnalytics,
    correlationData: PerformanceCorrelationResults
  ): PredictionInsight[] {
    const predictions: PredictionInsight[] = [];

    // Predict next week's productivity
    const recentScores = productivityData.dailyProductivity.slice(-7).map(d => d.overallScore);
    const avgRecent = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const trend = productivityData.overallTrend;
    
    let predictedScore = avgRecent;
    if (trend === 'improving') predictedScore *= 1.05;
    else if (trend === 'declining') predictedScore *= 0.95;

    predictions.push({
      metric: 'Next Week Productivity',
      prediction: Math.min(100, Math.max(0, predictedScore)),
      confidence: 75,
      timeframe: 'Next 7 days',
      factors: [
        {
          factor: 'Current trend',
          impact: trend === 'improving' ? 5 : trend === 'declining' ? -5 : 0,
          likelihood: 80
        },
        {
          factor: 'Historical consistency',
          impact: productivityData.weeklyTrends.length > 0 
            ? productivityData.weeklyTrends[productivityData.weeklyTrends.length - 1].consistencyScore / 10
            : 0,
          likelihood: 70
        }
      ],
      scenarios: [
        {
          name: 'Optimistic',
          description: 'All factors align positively',
          probability: 30,
          outcome: Math.min(100, predictedScore * 1.1)
        },
        {
          name: 'Expected',
          description: 'Current patterns continue',
          probability: 50,
          outcome: predictedScore
        },
        {
          name: 'Conservative',
          description: 'Some challenges arise',
          probability: 20,
          outcome: Math.max(0, predictedScore * 0.9)
        }
      ]
    });

    return predictions;
  }

  /**
   * Generate visualization data
   */
  private generateVisualizations(
    productivityData: ProductivityMetrics,
    energyData: EnergyAnalytics,
    correlationData: PerformanceCorrelationResults
  ): VisualizationData[] {
    const visualizations: VisualizationData[] = [];

    // Productivity trend line chart
    visualizations.push({
      id: 'productivity-trend',
      type: 'line_chart',
      title: 'Productivity Trend Over Time',
      data: productivityData.dailyProductivity.map(day => ({
        date: day.date.toLocaleDateString(),
        productivity: day.overallScore,
        efficiency: day.timeEfficiency,
        focus: day.focusTime / 60 // Convert to hours
      })),
      config: {
        xAxis: 'date',
        yAxis: 'productivity',
        colorScheme: ['#3b82f6', '#10b981', '#f59e0b']
      },
      insights: ['Clear upward trend visible', 'Efficiency correlates với productivity']
    });

    // Factor impact bar chart
    visualizations.push({
      id: 'factor-impact',
      type: 'bar_chart',
      title: 'Productivity Factor Impact Analysis',
      data: productivityData.productivityFactors.slice(0, 6).map(factor => ({
        factor: factor.factor.replace(/([A-Z])/g, ' $1').trim(),
        impact: Math.abs(factor.impact),
        direction: factor.impact > 0 ? 'Positive' : 'Negative'
      })),
      config: {
        xAxis: 'factor',
        yAxis: 'impact',
        groupBy: 'direction',
        colorScheme: ['#10b981', '#ef4444']
      },
      insights: ['Focus time has strongest positive impact', 'Distractions significantly reduce productivity']
    });

    return visualizations;
  }

  // Helper methods
  private generateReportId(period: ReportPeriod): string {
    const timestamp = Date.now();
    const periodType = period.type.charAt(0).toUpperCase();
    return `RPT-${periodType}${timestamp}`;
  }

  private generateReportTitle(period: ReportPeriod): string {
    const periodStr = period.type.charAt(0).toUpperCase() + period.type.slice(1);
    return `${periodStr} Personal Analytics Report`;
  }

  private calculateInsightScore(insight: Insight): number {
    const impactScore = insight.impact === 'high' ? 3 : insight.impact === 'medium' ? 2 : 1;
    const confidenceScore = insight.confidence / 100;
    const actionabilityScore = insight.actionability / 100;
    
    return impactScore * 40 + confidenceScore * 30 + actionabilityScore * 30;
  }
}

export default InsightReportGenerator;
