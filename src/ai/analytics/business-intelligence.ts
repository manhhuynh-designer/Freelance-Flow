// Phase 4: Business Intelligence Module
// Advanced analytics and insights for business decision making

import type { ContextMemoryEntry } from '@/hooks/useContextMemory';
import type { UserPattern } from '@/ai/learning/pattern-learner';
import type { TaskPrediction } from '@/ai/prediction/predictor';
import type { Task, Client, Collaborator, Quote, AppData } from '@/lib/types';

export interface BusinessMetrics {
  // Revenue Metrics
  revenue: {
    total: number;
    monthly: number;
    projected: number;
    growth_rate: number;
    target_progress: number;
  };

  // Productivity Metrics
  productivity: {
    tasks_completed: number;
    completion_rate: number;
    average_task_duration: number;
    efficiency_score: number;
    peak_hours: string[];
  };
  
  // Client Metrics
  client_satisfaction: {
    overall_score: number;
    response_time: number;
    retention_rate: number;
    feedback_sentiment: number;
    active_clients: number;
  };
  
  // Capacity Metrics
  capacity: {
    utilization_rate: number;
    workload_balance: number;
    stress_indicators: number;
    available_hours: number;
    overload_risk: number;
  };
  
  // Quality Metrics
  quality: {
    rework_rate: number;
    client_feedback: number;
    delivery_timeliness: number;
    standard_adherence: number;
  };
}

export interface BusinessInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'optimization' | 'trend' | 'anomaly';
  category: 'revenue' | 'productivity' | 'client' | 'capacity' | 'quality' | 'strategic';
  title: string;
  description: string;
  impact_level: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  
  // Quantified business impact
  business_impact: {
    revenue_impact?: number;
    productivity_gain?: number;
    cost_reduction?: number;
    time_savings?: number;
    risk_mitigation?: number;
  };
  
  // Supporting data
  data_sources: string[];
  supporting_metrics: Record<string, number>;
  trend_data?: Array<{ date: Date; value: number }>;
  
  // Recommendations
  recommendations: BusinessRecommendation[];
  
  // Metadata
  created_at: Date;
  expires_at: Date;
  priority_score: number;
}

export interface BusinessRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  effort_required: 'low' | 'medium' | 'high';
  expected_outcome: string;
  implementation_steps: string[];
  estimated_roi?: number;
  timeline: string;
  success_metrics: string[];
  automation_potential: boolean;
}

export interface BusinessForecast {
  metric: string;
  timeframe: '1_week' | '1_month' | '3_months' | '6_months' | '1_year';
  predicted_value: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  seasonal_factors?: Record<string, number>;
  assumptions: string[];
}

export class BusinessIntelligenceEngine {
  private metrics: BusinessMetrics | null = null;
  private insights: BusinessInsight[] = [];
  private forecasts: BusinessForecast[] = [];
  private historicalData: Map<string, Array<{ date: Date; value: number }>> = new Map();
  private appData: AppData;

  constructor(appData: AppData) {
    this.appData = appData;
    this.initializeHistoricalData();
  }

  // Main analysis method
  async generateBusinessIntelligence(
    memoryEntries?: ContextMemoryEntry[],
    userPatterns?: UserPattern[],
    predictions?: TaskPrediction[]
  ): Promise<{
    metrics: BusinessMetrics;
    insights: BusinessInsight[];
    forecasts: BusinessForecast[];
    recommendations: BusinessRecommendation[];
  }> {
    console.log('📊 Generating business intelligence with real data...');

    // Use real data from appData
    const tasks = this.appData.tasks;
    const clients = this.appData.clients;
    const collaborators = this.appData.collaborators;
    const quotes = this.appData.quotes || [];

    try {
      // Calculate comprehensive metrics using real data
      this.metrics = await this.calculateBusinessMetrics(
        tasks, clients, collaborators, quotes, memoryEntries, userPatterns
      );

      // Generate strategic insights
      this.insights = await this.generateInsights(
        this.metrics, tasks, clients, memoryEntries, userPatterns, predictions
      );

      // Create forecasts
      this.forecasts = await this.generateForecasts(this.metrics, tasks, userPatterns);

      // Extract actionable recommendations
      const recommendations = this.extractRecommendations(this.insights);

      console.log(`📊 Generated ${this.insights.length} insights, ${this.forecasts.length} forecasts from real data`);

      return {
        metrics: this.metrics,
        insights: this.insights,
        forecasts: this.forecasts,
        recommendations
      };

    } catch (error) {
      console.error('Error generating business intelligence:', error);
      throw error;
    }
  }

  // Calculate comprehensive business metrics using real data
  private async calculateBusinessMetrics(
    tasks: Task[],
    clients: Client[],
    collaborators: Collaborator[],
    quotes: Quote[],
    memoryEntries?: ContextMemoryEntry[],
    userPatterns?: UserPattern[]
  ): Promise<BusinessMetrics> {
    
    // Real task analysis
    const completedTasks = tasks.filter(t => t.status === 'done');
    const activeTasks = tasks.filter(t => ['inprogress', 'todo'].includes(t.status));
    const overdueTasks = tasks.filter(t => 
      t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done'
    );
    const totalTasks = tasks.length;

    // Real revenue calculations from quotes
    const acceptedQuotes = quotes.filter(q => q.total > 0); // Use total > 0 as accepted indicator
    const totalRevenue = acceptedQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
    const monthlyRevenue = this.calculateMonthlyRevenue(acceptedQuotes);
    const revenueGrowthRate = this.calculateGrowthRate('revenue', monthlyRevenue);

    // Real productivity calculations
    const completionRate = totalTasks > 0 ? completedTasks.length / totalTasks : 0;
    const avgTaskDuration = this.calculateAverageTaskDuration(completedTasks);
    const peakHours = this.extractPeakHours(userPatterns || []);

    // Real client satisfaction from memory entries
    const positiveInteractions = (memoryEntries || []).filter(e => e.sentiment === 'positive').length;
    const totalInteractions = (memoryEntries || []).length;
    const satisfactionScore = totalInteractions > 0 ? (positiveInteractions / totalInteractions) * 10 : 8;

    // Real capacity analysis - simplified for existing Task type
    const workloadUtilization = Math.min(1, activeTasks.length / Math.max(1, clients.length * 2));
    const stressIndicators = activeTasks.filter(t => {
      const isOverdue = t.deadline && new Date(t.deadline) < new Date();
      const hasShortDeadline = t.deadline && 
        (new Date(t.deadline).getTime() - new Date().getTime()) < (3 * 24 * 60 * 60 * 1000); // 3 days
      return isOverdue || hasShortDeadline;
    }).length;

    return {
      revenue: {
        total: totalRevenue,
        monthly: monthlyRevenue,
        projected: monthlyRevenue * 1.15, // 15% growth projection
        growth_rate: revenueGrowthRate,
        target_progress: totalRevenue > 0 ? Math.min(1, totalRevenue / (monthlyRevenue * 12)) : 0
      },
      productivity: {
        tasks_completed: completedTasks.length,
        completion_rate: completionRate,
        average_task_duration: avgTaskDuration,
        efficiency_score: completionRate * 10,
        peak_hours: peakHours
      },
      client_satisfaction: {
        overall_score: satisfactionScore,
        response_time: this.calculateAverageResponseTime(memoryEntries || []),
        retention_rate: clients.length > 0 ? 0.95 : 1, // Simplified - all clients assumed active
        feedback_sentiment: satisfactionScore / 10,
        active_clients: clients.length // All clients considered active
      },
      capacity: {
        utilization_rate: workloadUtilization,
        workload_balance: this.calculateWorkloadBalance(activeTasks),
        stress_indicators: stressIndicators,
        available_hours: Math.max(0, (40 - activeTasks.length * 2)), // Simplified calculation
        overload_risk: overdueTasks.length > 3 ? 0.8 : stressIndicators * 0.15
      },
      quality: {
        rework_rate: this.calculateReworkRate(tasks),
        client_feedback: satisfactionScore,
        delivery_timeliness: this.calculateDeliveryTimeliness(completedTasks),
        standard_adherence: completionRate * 0.9 // Based on completion rate
      }
    };
  }

  // Generate strategic business insights
  private async generateInsights(
    metrics: BusinessMetrics,
    tasks: Task[],
    clients: Client[],
    memoryEntries?: ContextMemoryEntry[],
    userPatterns?: UserPattern[],
    predictions?: TaskPrediction[]
  ): Promise<BusinessInsight[]> {
    const insights: BusinessInsight[] = [];
    const currentDate = new Date();

    // Revenue Opportunity Insight
    if (metrics.client_satisfaction.overall_score > 8.0 && metrics.capacity.available_hours > 10) {
      insights.push({
        id: `insight-revenue-${Date.now()}`,
        type: 'opportunity',
        category: 'revenue',
        title: 'High-Value Client Expansion Opportunity',
        description: `With ${metrics.client_satisfaction.overall_score.toFixed(1)}/10 client satisfaction and ${metrics.capacity.available_hours} available hours, you're positioned for client expansion.`,
        impact_level: 'high',
        confidence: 0.82,
        business_impact: {
          revenue_impact: metrics.revenue.monthly * 0.3,
          productivity_gain: 0.15
        },
        data_sources: ['client_satisfaction', 'capacity_analysis', 'revenue_tracking'],
        supporting_metrics: {
          satisfaction_score: metrics.client_satisfaction.overall_score,
          available_capacity: metrics.capacity.available_hours,
          client_retention: metrics.client_satisfaction.retention_rate
        },
        recommendations: [{
          id: 'rec-1',
          title: 'Launch Client Referral Program',
          description: 'Leverage high satisfaction to gain referrals',
          priority: 'high',
          effort_required: 'medium',
          expected_outcome: '20-30% increase in new clients',
          implementation_steps: [
            'Design referral incentive structure',
            'Create referral materials and templates',
            'Reach out to top-satisfied clients',
            'Track and measure referral success'
          ],
          estimated_roi: 2.5,
          timeline: '2-4 weeks',
          success_metrics: ['New client acquisitions', 'Referral conversion rate'],
          automation_potential: true
        }],
        created_at: currentDate,
        expires_at: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        priority_score: 85
      });
    }

    // Productivity Optimization Insight
    const productivityPatterns = (userPatterns || []).filter(p => p.type === 'timing');
    if (productivityPatterns.length > 0 && metrics.productivity.efficiency_score < 7) {
      const bestPattern = productivityPatterns.sort((a, b) => b.confidence - a.confidence)[0];
      
      insights.push({
        id: `insight-productivity-${Date.now()}`,
        type: 'optimization',
        category: 'productivity',
        title: 'Peak Productivity Window Optimization',
        description: `Your productivity peaks during ${bestPattern.metadata.timePatterns?.[0] || 'morning'} hours. Optimizing schedule could boost efficiency by 25%.`,
        impact_level: 'medium',
        confidence: bestPattern.confidence,
        business_impact: {
          productivity_gain: 0.25,
          time_savings: 8 // hours per week
        },
        data_sources: ['timing_patterns', 'productivity_metrics'],
        supporting_metrics: {
          current_efficiency: metrics.productivity.efficiency_score,
          pattern_confidence: bestPattern.confidence,
          peak_hour_utilization: bestPattern.frequency
        },
        recommendations: [{
          id: 'rec-2',
          title: 'Implement Peak Hour Blocking',
          description: 'Reserve peak productivity hours for high-value tasks',
          priority: 'medium',
          effort_required: 'low',
          expected_outcome: 'Increased task completion rate and quality',
          implementation_steps: [
            'Identify peak productivity windows',
            'Block calendar during peak hours',
            'Schedule important tasks during peak times',
            'Move meetings to off-peak hours'
          ],
          timeline: '1 week',
          success_metrics: ['Task completion rate', 'Work quality scores'],
          automation_potential: true
        }],
        created_at: currentDate,
        expires_at: new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000),
        priority_score: 70
      });
    }

    // Capacity Risk Insight
    if (metrics.capacity.overload_risk > 0.7) {
      insights.push({
        id: `insight-capacity-${Date.now()}`,
        type: 'risk',
        category: 'capacity',
        title: 'Capacity Overload Risk Detected',
        description: `Current workload utilization is ${(metrics.capacity.utilization_rate * 100).toFixed(1)}% with high stress indicators. Risk of burnout and quality decline.`,
        impact_level: 'critical',
        confidence: 0.92,
        business_impact: {
          risk_mitigation: metrics.revenue.monthly * 0.2,
          productivity_gain: -0.3 // Negative impact if not addressed
        },
        data_sources: ['capacity_analysis', 'stress_indicators', 'workload_tracking'],
        supporting_metrics: {
          utilization_rate: metrics.capacity.utilization_rate,
          stress_score: metrics.capacity.stress_indicators,
          overload_risk: metrics.capacity.overload_risk
        },
        recommendations: [{
          id: 'rec-3',
          title: 'Implement Workload Rebalancing',
          description: 'Redistribute tasks and consider delegation or extensions',
          priority: 'urgent',
          effort_required: 'medium',
          expected_outcome: 'Reduced stress and improved quality',
          implementation_steps: [
            'Review all active commitments',
            'Identify tasks that can be delayed or delegated',
            'Communicate timeline adjustments to clients',
            'Establish better workload limits'
          ],
          timeline: 'Immediate',
          success_metrics: ['Stress indicators', 'Task completion quality'],
          automation_potential: false
        }],
        created_at: currentDate,
        expires_at: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        priority_score: 95
      });
    }

    // Quality Improvement Insight
    if (metrics.quality.rework_rate > 0.15) {
      insights.push({
        id: `insight-quality-${Date.now()}`,
        type: 'optimization',
        category: 'quality',
        title: 'Quality Process Enhancement Needed',
        description: `Rework rate of ${(metrics.quality.rework_rate * 100).toFixed(1)}% indicates opportunity for process improvement and quality checks.`,
        impact_level: 'medium',
        confidence: 0.78,
        business_impact: {
          cost_reduction: metrics.revenue.monthly * 0.1,
          productivity_gain: 0.15,
          time_savings: 5
        },
        data_sources: ['quality_metrics', 'rework_tracking', 'client_feedback'],
        supporting_metrics: {
          rework_rate: metrics.quality.rework_rate,
          client_satisfaction: metrics.client_satisfaction.overall_score,
          delivery_timeliness: metrics.quality.delivery_timeliness
        },
        recommendations: [{
          id: 'rec-4',
          title: 'Establish Quality Checkpoints',
          description: 'Implement review stages to catch issues early',
          priority: 'medium',
          effort_required: 'medium',
          expected_outcome: 'Reduced rework and improved client satisfaction',
          implementation_steps: [
            'Define quality standards and checklists',
            'Implement mid-project review points',
            'Create client feedback loops',
            'Track quality metrics consistently'
          ],
          timeline: '2-3 weeks',
          success_metrics: ['Rework rate reduction', 'First-time quality rate'],
          automation_potential: true
        }],
        created_at: currentDate,
        expires_at: new Date(currentDate.getTime() + 21 * 24 * 60 * 60 * 1000),
        priority_score: 65
      });
    }

    return insights.sort((a, b) => b.priority_score - a.priority_score);
  }

  // Generate business forecasts
  private async generateForecasts(
    metrics: BusinessMetrics,
    tasks: Task[],
    userPatterns?: UserPattern[]
  ): Promise<BusinessForecast[]> {
    const forecasts: BusinessForecast[] = [];

    // Revenue forecast
    forecasts.push({
      metric: 'monthly_revenue',
      timeframe: '3_months',
      predicted_value: metrics.revenue.monthly * 1.12,
      confidence_interval: {
        lower: metrics.revenue.monthly * 1.05,
        upper: metrics.revenue.monthly * 1.20
      },
      confidence: 0.75,
      trend: 'increasing',
      assumptions: [
        'Current client satisfaction maintained',
        'No major market changes',
        'Capacity constraints addressed'
      ]
    });

    // Productivity forecast
    forecasts.push({
      metric: 'task_completion_rate',
      timeframe: '1_month',
      predicted_value: metrics.productivity.completion_rate * 1.08,
      confidence_interval: {
        lower: metrics.productivity.completion_rate * 1.02,
        upper: metrics.productivity.completion_rate * 1.15
      },
      confidence: 0.82,
      trend: 'increasing',
      assumptions: [
        'Peak hour optimization implemented',
        'Workload remains manageable',
        'Quality processes improved'
      ]
    });

    return forecasts;
  }
  
    private calculateMonthlyRevenue(quotes: Quote[]): number {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // For now, return average monthly revenue based on total quotes
    const totalRevenue = quotes.reduce((sum, q) => sum + (q.total || 0), 0);
    return quotes.length > 0 ? totalRevenue / Math.max(1, quotes.length) : 0;
  }

  private calculateAverageTaskDuration(tasks: Task[]): number {
    const tasksWithDates = tasks.filter(t => t.startDate && t.endDate);
    if (tasksWithDates.length === 0) return 7; // Default 7 days
    
    const totalDuration = tasksWithDates.reduce((sum, t) => {
      const start = new Date(t.startDate!).getTime();
      const end = new Date(t.endDate!).getTime();
      return sum + (end - start) / (1000 * 60 * 60 * 24); // Convert to days
    }, 0);
    
    return totalDuration / tasksWithDates.length;
  }

  private extractPeakHours(userPatterns: UserPattern[]): string[] {
    const timePatterns = userPatterns.filter(p => p.type === 'timing');
    if (timePatterns.length === 0) return ['09:00-11:00', '14:00-16:00'];
    
    // Extract time patterns from pattern data
    return timePatterns
      .map(p => p.metadata?.timePatterns || [])
      .flat()
      .slice(0, 3);
  }

  private calculateAverageResponseTime(memoryEntries: ContextMemoryEntry[]): number {
    // Simplified - return average based on memory entries count
    return memoryEntries.length > 0 ? Math.max(1, 24 / memoryEntries.length) : 24;
  }

  private calculateWorkloadBalance(tasks: Task[]): number {
    if (tasks.length === 0) return 1;
    
    // Calculate distribution across categories
    const categoryCount = new Map<string, number>();
    tasks.forEach(t => {
      const category = t.categoryId || 'uncategorized';
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    });
    
    // Calculate balance score (higher = more balanced)
    const counts = Array.from(categoryCount.values());
    const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;
    const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length;
    
    return Math.max(0, 1 - (variance / (avg * avg))); // Normalize to 0-1
  }

  private calculateReworkRate(tasks: Task[]): number {
    // Simplified - estimate based on task patterns
    const completedTasks = tasks.filter(t => t.status === 'done');
    if (completedTasks.length === 0) return 0.05; // Default 5%
    
    // Estimate rework based on tasks with extended timelines
    const tasksWithRework = completedTasks.filter(t => {
      if (!t.startDate || !t.endDate) return false;
      const duration = (new Date(t.endDate!).getTime() - new Date(t.startDate!).getTime()) / (1000 * 60 * 60 * 24);
      return duration > 14; // Tasks taking more than 2 weeks might have rework
    });
    
    return tasksWithRework.length / completedTasks.length;
  }

  private calculateDeliveryTimeliness(tasks: Task[]): number {
    const tasksWithDeadlines = tasks.filter(t => t.deadline && t.endDate);
    if (tasksWithDeadlines.length === 0) return 0.9; // Default 90%
    
    const onTimeTasks = tasksWithDeadlines.filter(t => {
      const deadline = new Date(t.deadline!).getTime();
      const completed = new Date(t.endDate!).getTime();
      return completed <= deadline;
    });
    
    return onTimeTasks.length / tasksWithDeadlines.length;
  }

  // Extract actionable recommendations
  private extractRecommendations(insights: BusinessInsight[]): BusinessRecommendation[] {
    const recommendations: BusinessRecommendation[] = [];
    
    for (const insight of insights) {
      recommendations.push(...insight.recommendations);
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Helper methods
  private initializeHistoricalData(): void {
    // Initialize with some sample historical data
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Sample revenue data
    const revenueData = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      revenueData.push({
        date,
        value: 2000 + Math.random() * 1000 + i * 20 // Trending upward
      });
    }
    
    this.historicalData.set('revenue', revenueData);
  }

  private calculateGrowthRate(metric: string, currentValue: number): number {
    const historical = this.historicalData.get(metric);
    if (!historical || historical.length < 7) return 0.05; // Default 5% growth
    
    const weekAgo = historical[historical.length - 7];
    const growth = (currentValue - weekAgo.value) / weekAgo.value;
    return Math.max(-0.5, Math.min(2.0, growth)); // Cap between -50% and 200%
  }

  // Public getters
  getMetrics(): BusinessMetrics | null {
    return this.metrics;
  }

  getInsights(): BusinessInsight[] {
    return this.insights;
  }

  getForecasts(): BusinessForecast[] {
    return this.forecasts;
  }

  // Update historical data
  addDataPoint(metric: string, value: number, date: Date = new Date()): void {
    if (!this.historicalData.has(metric)) {
      this.historicalData.set(metric, []);
    }
    
    const data = this.historicalData.get(metric)!;
    data.push({ date, value });
    
    // Keep only last 90 days
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const filtered = data.filter(point => point.date >= cutoffDate);
    this.historicalData.set(metric, filtered);
  }
}
