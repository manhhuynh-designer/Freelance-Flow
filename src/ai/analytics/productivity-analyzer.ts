/**
 * Productivity Analyzer - Phase 4.3 Day 1
 * Deep individual productivity analysis engine
 */

import type { Task, Client } from '@/lib/types';
import type { ActionEvent, UserBehaviorPattern, PerformanceMetrics } from '../learning/behavior-tracker';

export interface DailyProductivityScore {
  date: Date;
  overallScore: number; // 0-100
  tasksCompleted: number;
  timeEfficiency: number;
  qualityScore: number;
  focusTime: number; // minutes
  distractionEvents: number;
  workStartTime?: Date;
  workEndTime?: Date;
  totalWorkTime: number; // minutes
  breakTime: number; // minutes
}

export interface WeeklyTrendAnalysis {
  weekStart: Date;
  weekEnd: Date;
  averageProductivity: number;
  trend: 'improving' | 'declining' | 'stable';
  bestDay: string;
  worstDay: string;
  consistencyScore: number; // 0-100
  peakProductivityDay: string;
  recommendedRestDay: string;
}

export interface MonthlyProductivityComparison {
  currentMonth: {
    average: number;
    totalTasks: number;
    efficiency: number;
  };
  previousMonth: {
    average: number;
    totalTasks: number;
    efficiency: number;
  };
  improvement: number; // percentage change
  insights: string[];
  milestones: ProductivityMilestone[];
}

export interface TimeSlot {
  startHour: number;
  endHour: number;
  day?: string; // 'monday', 'tuesday', etc.
  productivity: number; // 0-100
  consistency: number; // 0-100
}

export interface FactorImpactAnalysis {
  factor: string;
  impact: number; // -100 to +100
  confidence: number; // 0-100
  examples: string[];
  recommendations: string[];
}

export interface ProductivityMilestone {
  date: Date;
  achievement: string;
  score: number;
  description: string;
}

export interface ProductivityMetrics {
  dailyProductivity: DailyProductivityScore[];
  weeklyTrends: WeeklyTrendAnalysis[];
  monthlyComparison: MonthlyProductivityComparison;
  peakPerformanceTimes: TimeSlot[];
  productivityFactors: FactorImpactAnalysis[];
  overallTrend: 'improving' | 'declining' | 'stable';
  currentStreak: {
    type: 'productive' | 'unproductive';
    days: number;
    startDate: Date;
  };
}

export class ProductivityAnalyzer {
  private dailyScores: Map<string, DailyProductivityScore> = new Map();
  private productivityBaseline = 70; // Initial baseline score

  constructor(private userId: string) {}

  /**
   * Analyze daily productivity từ action events và task data
   */
  async analyzeDailyProductivity(
    date: Date,
    actions: ActionEvent[],
    tasks: Task[],
    behaviorPatterns: UserBehaviorPattern[]
  ): Promise<DailyProductivityScore> {
    const dateKey = this.getDateKey(date);
    
    // Filter actions cho specific date
    const dayActions = actions.filter(action => 
      this.isSameDay(action.timestamp, date)
    );

    // Filter completed tasks for the day
    const completedTasks = tasks.filter(task => 
      task.status === 'done' && 
      task.createdAt && 
      this.isSameDay(new Date(task.createdAt), date)
    );

    // Calculate work time boundaries
    const workTimes = this.calculateWorkTimes(dayActions);
    
    // Calculate focus time (continuous work periods)
    const focusTime = this.calculateFocusTime(dayActions);
    
    // Calculate distraction events
    const distractionEvents = this.calculateDistractionEvents(dayActions);
    
    // Calculate time efficiency
    const timeEfficiency = this.calculateTimeEfficiency(dayActions, completedTasks);
    
    // Calculate quality score based on task completion và feedback
    const qualityScore = this.calculateQualityScore(completedTasks, dayActions);
    
    // Calculate overall productivity score
    const overallScore = this.calculateOverallProductivityScore({
      tasksCompleted: completedTasks.length,
      timeEfficiency,
      qualityScore,
      focusTime,
      distractionEvents,
      totalWorkTime: workTimes.totalWorkTime
    });

    const dailyScore: DailyProductivityScore = {
      date,
      overallScore,
      tasksCompleted: completedTasks.length,
      timeEfficiency,
      qualityScore,
      focusTime,
      distractionEvents,
      workStartTime: workTimes.startTime,
      workEndTime: workTimes.endTime,
      totalWorkTime: workTimes.totalWorkTime,
      breakTime: workTimes.breakTime
    };

    // Store dla future analysis
    this.dailyScores.set(dateKey, dailyScore);
    
    return dailyScore;
  }

  /**
   * Analyze weekly productivity trends
   */
  async analyzeWeeklyTrends(
    weekStart: Date,
    dailyScores: DailyProductivityScore[]
  ): Promise<WeeklyTrendAnalysis> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Filter scores for the week
    const weekScores = dailyScores.filter(score => 
      score.date >= weekStart && score.date <= weekEnd
    );

    if (weekScores.length === 0) {
      return this.getDefaultWeeklyTrends(weekStart, weekEnd);
    }

    // Calculate average productivity
    const averageProductivity = weekScores.reduce((sum, score) => 
      sum + score.overallScore, 0) / weekScores.length;

    // Find best và worst days
    const bestDay = weekScores.reduce((best, current) => 
      current.overallScore > best.overallScore ? current : best
    );
    const worstDay = weekScores.reduce((worst, current) => 
      current.overallScore < worst.overallScore ? current : worst
    );

    // Calculate consistency score
    const consistencyScore = this.calculateConsistencyScore(weekScores);
    
    // Determine trend
    const trend = this.determineTrend(weekScores);
    
    // Find peak productivity day
    const dayProductivity = this.groupProductivityByDay(weekScores);
    const peakProductivityDay = this.findPeakDay(dayProductivity);
    
    // Recommend rest day
    const recommendedRestDay = this.recommendRestDay(dayProductivity);

    return {
      weekStart,
      weekEnd,
      averageProductivity,
      trend,
      bestDay: this.getDayName(bestDay.date),
      worstDay: this.getDayName(worstDay.date),
      consistencyScore,
      peakProductivityDay,
      recommendedRestDay
    };
  }

  /**
   * Compare monthly productivity
   */
  async analyzeMonthlyProductivity(
    currentMonthScores: DailyProductivityScore[],
    previousMonthScores: DailyProductivityScore[]
  ): Promise<MonthlyProductivityComparison> {
    const currentMonth = this.calculateMonthlyStats(currentMonthScores);
    const previousMonth = this.calculateMonthlyStats(previousMonthScores);
    
    const improvement = previousMonth.average > 0 
      ? ((currentMonth.average - previousMonth.average) / previousMonth.average) * 100
      : 0;

    const insights = this.generateMonthlyInsights(currentMonth, previousMonth, improvement);
    const milestones = this.identifyProductivityMilestones(currentMonthScores);

    return {
      currentMonth,
      previousMonth,
      improvement,
      insights,
      milestones
    };
  }

  /**
   * Identify peak performance time slots
   */
  async identifyPeakPerformanceTimes(
    dailyScores: DailyProductivityScore[],
    actions: ActionEvent[]
  ): Promise<TimeSlot[]> {
    const hourlyProductivity = new Map<number, number[]>();

    // Group productivity by hour
    actions.forEach(action => {
      const hour = action.timestamp.getHours();
      const dayKey = this.getDateKey(action.timestamp);
      const dayScore = dailyScores.find(score => 
        this.getDateKey(score.date) === dayKey
      );

      if (dayScore) {
        if (!hourlyProductivity.has(hour)) {
          hourlyProductivity.set(hour, []);
        }
        hourlyProductivity.get(hour)!.push(dayScore.overallScore);
      }
    });

    // Calculate average productivity per hour
    const timeSlots: TimeSlot[] = [];
    hourlyProductivity.forEach((scores, hour) => {
      const averageProductivity = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const consistency = this.calculateHourlyConsistency(scores);

      if (averageProductivity > this.productivityBaseline) {
        timeSlots.push({
          startHour: hour,
          endHour: hour + 1,
          productivity: averageProductivity,
          consistency
        });
      }
    });

    // Sort by productivity và return top slots
    return timeSlots
      .sort((a, b) => b.productivity - a.productivity)
      .slice(0, 5);
  }

  /**
   * Analyze factors that impact productivity
   */
  async analyzeProductivityFactors(
    dailyScores: DailyProductivityScore[],
    actions: ActionEvent[],
    behaviorPatterns: UserBehaviorPattern[]
  ): Promise<FactorImpactAnalysis[]> {
    const factors: FactorImpactAnalysis[] = [];

    // Analyze task completion factor
    factors.push(this.analyzeTaskCompletionFactor(dailyScores));
    
    // Analyze focus time factor
    factors.push(this.analyzeFocusTimeFactor(dailyScores));
    
    // Analyze distraction factor
    factors.push(this.analyzeDistractionFactor(dailyScores));
    
    // Analyze work duration factor
    factors.push(this.analyzeWorkDurationFactor(dailyScores));
    
    // Analyze behavioral pattern factors
    behaviorPatterns.forEach(pattern => {
      const factor = this.analyzeBehaviorPatternFactor(pattern, dailyScores);
      if (factor) factors.push(factor);
    });

    return factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }

  /**
   * Get comprehensive productivity metrics
   */
  async getProductivityMetrics(
    actions: ActionEvent[],
    tasks: Task[],
    behaviorPatterns: UserBehaviorPattern[]
  ): Promise<ProductivityMetrics> {
    // Generate daily scores for last 30 days
    const dailyScores: DailyProductivityScore[] = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dayScore = await this.analyzeDailyProductivity(date, actions, tasks, behaviorPatterns);
      dailyScores.push(dayScore);
    }

    // Generate weekly trends (last 4 weeks)
    const weeklyTrends: WeeklyTrendAnalysis[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (i * 7) - 6);
      
      const weekTrend = await this.analyzeWeeklyTrends(weekStart, dailyScores);
      weeklyTrends.push(weekTrend);
    }

    // Monthly comparison
    const currentMonthScores = dailyScores.slice(-30);
    const previousMonthScores: DailyProductivityScore[] = []; // Would get from storage
    const monthlyComparison = await this.analyzeMonthlyProductivity(
      currentMonthScores, 
      previousMonthScores
    );

    // Peak performance times
    const peakPerformanceTimes = await this.identifyPeakPerformanceTimes(dailyScores, actions);

    // Productivity factors
    const productivityFactors = await this.analyzeProductivityFactors(
      dailyScores, 
      actions, 
      behaviorPatterns
    );

    // Overall trend
    const overallTrend = this.calculateOverallTrend(weeklyTrends);

    // Current streak
    const currentStreak = this.calculateCurrentStreak(dailyScores);

    return {
      dailyProductivity: dailyScores,
      weeklyTrends,
      monthlyComparison,
      peakPerformanceTimes,
      productivityFactors,
      overallTrend,
      currentStreak
    };
  }

  // Helper methods
  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return this.getDateKey(date1) === this.getDateKey(date2);
  }

  private calculateWorkTimes(actions: ActionEvent[]): {
    startTime?: Date;
    endTime?: Date;
    totalWorkTime: number;
    breakTime: number;
  } {
    if (actions.length === 0) {
      return { totalWorkTime: 0, breakTime: 0 };
    }

    const workActions = actions.filter(action => 
      ['create', 'edit', 'complete'].includes(action.actionType)
    );

    if (workActions.length === 0) {
      return { totalWorkTime: 0, breakTime: 0 };
    }

    const startTime = new Date(Math.min(...workActions.map(a => a.timestamp.getTime())));
    const endTime = new Date(Math.max(...workActions.map(a => a.timestamp.getTime())));
    
    const totalTimeSpan = endTime.getTime() - startTime.getTime();
    const activeWorkTime = workActions.length * 5; // Assume 5 min per action
    const breakTime = Math.max(0, totalTimeSpan / (1000 * 60) - activeWorkTime);

    return {
      startTime,
      endTime,
      totalWorkTime: activeWorkTime,
      breakTime
    };
  }

  private calculateFocusTime(actions: ActionEvent[]): number {
    // Calculate continuous work periods
    let focusTime = 0;
    let currentFocusStart: Date | null = null;
    const FOCUS_BREAK_THRESHOLD = 15 * 60 * 1000; // 15 minutes

    const sortedActions = actions
      .filter(action => ['create', 'edit', 'complete'].includes(action.actionType))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let i = 0; i < sortedActions.length; i++) {
      const action = sortedActions[i];
      const nextAction = sortedActions[i + 1];

      if (!currentFocusStart) {
        currentFocusStart = action.timestamp;
      }

      if (nextAction) {
        const gap = nextAction.timestamp.getTime() - action.timestamp.getTime();
        if (gap > FOCUS_BREAK_THRESHOLD) {
          // Focus session ended
          focusTime += action.timestamp.getTime() - currentFocusStart.getTime();
          currentFocusStart = null;
        }
      } else {
        // Last action
        if (currentFocusStart) {
          focusTime += action.timestamp.getTime() - currentFocusStart.getTime();
        }
      }
    }

    return Math.round(focusTime / (1000 * 60)); // Convert to minutes
  }

  private calculateDistractionEvents(actions: ActionEvent[]): number {
    // Count context switches và non-productive actions
    let distractions = 0;
    const distractionActions = ['navigate', 'search', 'view'];
    
    actions.forEach(action => {
      if (distractionActions.includes(action.actionType)) {
        distractions++;
      }
    });

    return distractions;
  }

  private calculateTimeEfficiency(actions: ActionEvent[], completedTasks: Task[]): number {
    if (completedTasks.length === 0) return 0;

    // Calculate average time per task completion
    const totalTimeSpent = actions
      .filter(action => action.actionType === 'complete')
      .reduce((sum, action) => sum + (action.duration || 30), 0); // Default 30 min

    const averageTimePerTask = totalTimeSpent / completedTasks.length;
    
    // Compare với estimated times
    const estimatedTimes = completedTasks
      .filter(task => task.duration) // Use duration instead of estimatedDuration
      .map(task => (task.duration || 1) * 60); // Convert days to minutes

    if (estimatedTimes.length === 0) return 70; // Default efficiency

    const averageEstimated = estimatedTimes.reduce((sum, time) => sum + time, 0) / estimatedTimes.length;
    
    // Calculate efficiency (lower actual time = higher efficiency)
    const efficiency = Math.max(0, 100 - Math.abs(averageTimePerTask - averageEstimated) / averageEstimated * 100);
    
    return Math.min(100, efficiency);
  }

  private calculateQualityScore(completedTasks: Task[], actions: ActionEvent[]): number {
    if (completedTasks.length === 0) return 0;

    // Base quality on task completion rate và edit frequency
    const editActions = actions.filter(action => action.actionType === 'edit').length;
    const completionActions = actions.filter(action => action.actionType === 'complete').length;
    
    // Lower edit-to-completion ratio = higher quality
    const editRatio = completionActions > 0 ? editActions / completionActions : 0;
    const qualityScore = Math.max(0, 100 - editRatio * 20);
    
    return Math.min(100, qualityScore);
  }

  private calculateOverallProductivityScore(metrics: {
    tasksCompleted: number;
    timeEfficiency: number;
    qualityScore: number;
    focusTime: number;
    distractionEvents: number;
    totalWorkTime: number;
  }): number {
    const weights = {
      tasks: 0.3,
      efficiency: 0.25,
      quality: 0.2,
      focus: 0.15,
      distractions: 0.1
    };

    // Normalize task completion (assume 3-5 tasks per day is optimal)
    const taskScore = Math.min(100, (metrics.tasksCompleted / 4) * 100);
    
    // Normalize focus time (2-4 hours is optimal)
    const focusScore = Math.min(100, (metrics.focusTime / 240) * 100);
    
    // Distraction penalty
    const distractionPenalty = Math.min(50, metrics.distractionEvents * 5);

    const score = (
      taskScore * weights.tasks +
      metrics.timeEfficiency * weights.efficiency +
      metrics.qualityScore * weights.quality +
      focusScore * weights.focus
    ) - distractionPenalty * weights.distractions;

    return Math.max(0, Math.min(100, score));
  }

  private calculateConsistencyScore(scores: DailyProductivityScore[]): number {
    if (scores.length < 2) return 100;

    const mean = scores.reduce((sum, score) => sum + score.overallScore, 0) / scores.length;
    const variance = scores.reduce((sum, score) => 
      sum + Math.pow(score.overallScore - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower standard deviation = higher consistency
    return Math.max(0, 100 - standardDeviation);
  }

  private determineTrend(scores: DailyProductivityScore[]): 'improving' | 'declining' | 'stable' {
    if (scores.length < 3) return 'stable';

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((sum, s) => sum + s.overallScore, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.overallScore, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;

    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  private groupProductivityByDay(scores: DailyProductivityScore[]): Map<string, number> {
    const dayProductivity = new Map<string, number>();
    
    scores.forEach(score => {
      const dayName = this.getDayName(score.date);
      const current = dayProductivity.get(dayName) || 0;
      dayProductivity.set(dayName, current + score.overallScore);
    });

    return dayProductivity;
  }

  private findPeakDay(dayProductivity: Map<string, number>): string {
    let peakDay = 'Monday';
    let peakScore = 0;

    dayProductivity.forEach((score, day) => {
      if (score > peakScore) {
        peakScore = score;
        peakDay = day;
      }
    });

    return peakDay;
  }

  private recommendRestDay(dayProductivity: Map<string, number>): string {
    let restDay = 'Sunday';
    let lowestScore = Infinity;

    dayProductivity.forEach((score, day) => {
      if (score < lowestScore) {
        lowestScore = score;
        restDay = day;
      }
    });

    return restDay;
  }

  private getDayName(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  private calculateMonthlyStats(scores: DailyProductivityScore[]): {
    average: number;
    totalTasks: number;
    efficiency: number;
  } {
    if (scores.length === 0) {
      return { average: 0, totalTasks: 0, efficiency: 0 };
    }

    const average = scores.reduce((sum, score) => sum + score.overallScore, 0) / scores.length;
    const totalTasks = scores.reduce((sum, score) => sum + score.tasksCompleted, 0);
    const efficiency = scores.reduce((sum, score) => sum + score.timeEfficiency, 0) / scores.length;

    return { average, totalTasks, efficiency };
  }

  private generateMonthlyInsights(
    current: any,
    previous: any,
    improvement: number
  ): string[] {
    const insights: string[] = [];

    if (improvement > 10) {
      insights.push(`Excellent progress! Productivity improved by ${improvement.toFixed(1)}%`);
    } else if (improvement > 0) {
      insights.push(`Good improvement of ${improvement.toFixed(1)}% this month`);
    } else if (improvement < -10) {
      insights.push(`Productivity declined by ${Math.abs(improvement).toFixed(1)}%. Consider reviewing your approach.`);
    } else {
      insights.push('Productivity remained stable this month');
    }

    if (current.totalTasks > previous.totalTasks) {
      insights.push(`Completed ${current.totalTasks - previous.totalTasks} more tasks than last month`);
    }

    if (current.efficiency > previous.efficiency + 5) {
      insights.push('Time efficiency has significantly improved');
    }

    return insights;
  }

  private identifyProductivityMilestones(scores: DailyProductivityScore[]): ProductivityMilestone[] {
    const milestones: ProductivityMilestone[] = [];

    // Find highest productivity day
    const highest = scores.reduce((max, score) => 
      score.overallScore > max.overallScore ? score : max
    );
    
    if (highest.overallScore > 85) {
      milestones.push({
        date: highest.date,
        achievement: 'Peak Productivity Day',
        score: highest.overallScore,
        description: `Achieved exceptional productivity score of ${highest.overallScore.toFixed(1)}`
      });
    }

    // Find productivity streaks
    let currentStreak = 0;
    let streakStart: Date | null = null;
    
    scores.forEach(score => {
      if (score.overallScore > 75) {
        if (currentStreak === 0) {
          streakStart = score.date;
        }
        currentStreak++;
      } else {
        if (currentStreak >= 5 && streakStart) {
          milestones.push({
            date: streakStart,
            achievement: 'Productivity Streak',
            score: currentStreak,
            description: `Maintained high productivity for ${currentStreak} consecutive days`
          });
        }
        currentStreak = 0;
        streakStart = null;
      }
    });

    return milestones;
  }

  private calculateHourlyConsistency(scores: number[]): number {
    if (scores.length < 2) return 100;
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    
    return Math.max(0, 100 - Math.sqrt(variance));
  }

  private analyzeTaskCompletionFactor(scores: DailyProductivityScore[]): FactorImpactAnalysis {
    const taskCounts = scores.map(s => s.tasksCompleted);
    const productivityScores = scores.map(s => s.overallScore);
    
    const correlation = this.calculateCorrelation(taskCounts, productivityScores);
    
    return {
      factor: 'Task Completion Rate',
      impact: correlation * 100,
      confidence: 85,
      examples: [
        `Days với ${Math.max(...taskCounts)} tasks had highest productivity`,
        `Average productivity increases với more completed tasks`
      ],
      recommendations: [
        'Aim to complete 3-5 tasks per day for optimal productivity',
        'Break large tasks into smaller, manageable pieces'
      ]
    };
  }

  private analyzeFocusTimeFactor(scores: DailyProductivityScore[]): FactorImpactAnalysis {
    const focusTimes = scores.map(s => s.focusTime);
    const productivityScores = scores.map(s => s.overallScore);
    
    const correlation = this.calculateCorrelation(focusTimes, productivityScores);
    
    return {
      factor: 'Focus Time Duration',
      impact: correlation * 100,
      confidence: 90,
      examples: [
        `Peak focus time: ${Math.max(...focusTimes)} minutes`,
        'Longer focus sessions correlate với higher productivity'
      ],
      recommendations: [
        'Aim for 2-4 hour focus sessions',
        'Use time-blocking techniques to maintain focus'
      ]
    };
  }

  private analyzeDistractionFactor(scores: DailyProductivityScore[]): FactorImpactAnalysis {
    const distractions = scores.map(s => s.distractionEvents);
    const productivityScores = scores.map(s => s.overallScore);
    
    const correlation = this.calculateCorrelation(distractions, productivityScores) * -1; // Negative correlation
    
    return {
      factor: 'Distraction Events',
      impact: correlation * 100,
      confidence: 80,
      examples: [
        `Days với fewer distractions had ${Math.abs(correlation * 20).toFixed(1)}% higher productivity`,
        'Context switching reduces overall efficiency'
      ],
      recommendations: [
        'Minimize interruptions during focus time',
        'Use website blockers và notification management'
      ]
    };
  }

  private analyzeWorkDurationFactor(scores: DailyProductivityScore[]): FactorImpactAnalysis {
    const workTimes = scores.map(s => s.totalWorkTime);
    const productivityScores = scores.map(s => s.overallScore);
    
    const correlation = this.calculateCorrelation(workTimes, productivityScores);
    
    return {
      factor: 'Total Work Duration',
      impact: correlation * 100,
      confidence: 75,
      examples: [
        `Optimal work duration appears to be ${Math.round(workTimes.reduce((a, b) => a + b, 0) / workTimes.length)} minutes`,
        'Productivity doesn\'t always increase với longer work hours'
      ],
      recommendations: [
        'Find your optimal work duration sweet spot',
        'Quality over quantity - focus on effective work time'
      ]
    };
  }

  private analyzeBehaviorPatternFactor(
    pattern: UserBehaviorPattern,
    scores: DailyProductivityScore[]
  ): FactorImpactAnalysis | null {
    // This would require correlation analysis between pattern occurrence và productivity
    // Simplified implementation
    return {
      factor: pattern.patternType,
      impact: pattern.strength * 100, // Simplified impact calculation
      confidence: pattern.confidence * 100,
      examples: [
        pattern.description,
        `Pattern observed with ${pattern.frequency} frequency`
      ],
      recommendations: [
        `Optimize workflow based on ${pattern.patternType} pattern`,
        'Monitor pattern consistency để improve productivity'
      ]
    };
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

  private calculateOverallTrend(weeklyTrends: WeeklyTrendAnalysis[]): 'improving' | 'declining' | 'stable' {
    if (weeklyTrends.length < 2) return 'stable';

    const improvingWeeks = weeklyTrends.filter(week => week.trend === 'improving').length;
    const decliningWeeks = weeklyTrends.filter(week => week.trend === 'declining').length;

    if (improvingWeeks > decliningWeeks) return 'improving';
    if (decliningWeeks > improvingWeeks) return 'declining';
    return 'stable';
  }

  private calculateCurrentStreak(scores: DailyProductivityScore[]): {
    type: 'productive' | 'unproductive';
    days: number;
    startDate: Date;
  } {
    if (scores.length === 0) {
      return { type: 'productive', days: 0, startDate: new Date() };
    }

    const threshold = 70;
    let streakDays = 0;
    let streakType: 'productive' | 'unproductive' = 'productive';
    let startDate = scores[scores.length - 1].date;

    // Count from most recent day backwards
    for (let i = scores.length - 1; i >= 0; i--) {
      const score = scores[i];
      const isProductive = score.overallScore >= threshold;

      if (streakDays === 0) {
        // Start của streak
        streakType = isProductive ? 'productive' : 'unproductive';
        streakDays = 1;
        startDate = score.date;
      } else {
        // Continue streak if same type
        const continuingStreak = 
          (streakType === 'productive' && isProductive) ||
          (streakType === 'unproductive' && !isProductive);

        if (continuingStreak) {
          streakDays++;
          startDate = score.date;
        } else {
          break;
        }
      }
    }

    return { type: streakType, days: streakDays, startDate };
  }

  private getDefaultWeeklyTrends(weekStart: Date, weekEnd: Date): WeeklyTrendAnalysis {
    return {
      weekStart,
      weekEnd,
      averageProductivity: 0,
      trend: 'stable',
      bestDay: 'Monday',
      worstDay: 'Sunday',
      consistencyScore: 0,
      peakProductivityDay: 'Monday',
      recommendedRestDay: 'Sunday'
    };
  }
}

export default ProductivityAnalyzer;
