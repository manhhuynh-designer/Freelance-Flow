/**
 * Personal Analytics Dashboard - Phase 4.3 Day 4
 * Comprehensive dashboard for personal productivity và energy analytics
 */

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  Zap, 
  Brain,
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  RefreshCw
} from 'lucide-react';

// Import our analytics engines
import ProductivityAnalyzer, { type ProductivityMetrics, type DailyProductivityScore } from '../ai/analytics/productivity-analyzer';
import EnergyTracker, { type EnergyAnalytics, type EnergyLevel } from '../ai/analytics/energy-tracker';
import PerformanceCorrelationEngine, { type PerformanceCorrelationResults } from '../ai/analytics/performance-correlation-engine';
import type { ActionEvent, UserBehaviorPattern } from '../ai/learning/behavior-tracker';
import type { Task } from '@/lib/types';

export interface PersonalAnalyticsDashboardProps {
  userId: string;
  actions: ActionEvent[];
  tasks: Task[];
  behaviorPatterns: UserBehaviorPattern[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface DashboardMetrics {
  productivity: ProductivityMetrics;
  energy: EnergyAnalytics;
  correlations: PerformanceCorrelationResults;
  summary: AnalyticsSummary;
}

export interface AnalyticsSummary {
  currentProductivityScore: number;
  currentEnergyLevel: number;
  weeklyTrend: 'improving' | 'declining' | 'stable';
  topInsights: string[];
  recommendedActions: RecommendedAction[];
  upcomingChallenges: string[];
  achievements: Achievement[];
}

export interface RecommendedAction {
  id: string;
  title: string;
  description: string;
  category: 'productivity' | 'energy' | 'habits' | 'scheduling';
  priority: 'high' | 'medium' | 'low';
  expectedImpact: number; // 0-100
  timeToImplement: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: Date;
  score: number;
  badge: string;
}

const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  muted: '#6b7280'
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const PersonalAnalyticsDashboard: React.FC<PersonalAnalyticsDashboardProps> = ({
  userId,
  actions,
  tasks,
  behaviorPatterns,
  dateRange
}) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  const productivityAnalyzer = useMemo(() => new ProductivityAnalyzer(userId), [userId]);
  const energyTracker = useMemo(() => new EnergyTracker(userId), [userId]);
  const correlationEngine = useMemo(() => new PerformanceCorrelationEngine(userId), [userId]);

  useEffect(() => {
    loadAnalytics();
  }, [userId, actions, tasks, behaviorPatterns, dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Load all analytics in parallel
      const [productivity, energy, correlations] = await Promise.all([
        productivityAnalyzer.getProductivityMetrics(actions, tasks, behaviorPatterns),
        energyTracker.getEnergyAnalytics(actions, tasks, []),
        correlationEngine.analyzePerformanceCorrelations(
          await productivityAnalyzer.getProductivityMetrics(actions, tasks, behaviorPatterns),
          await energyTracker.getEnergyAnalytics(actions, tasks, []),
          actions,
          tasks,
          behaviorPatterns
        )
      ]);

      const summary = generateAnalyticsSummary(productivity, energy, correlations);

      setMetrics({
        productivity,
        energy,
        correlations,
        summary
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAnalyticsSummary = (
    productivity: ProductivityMetrics,
    energy: EnergyAnalytics,
    correlations: PerformanceCorrelationResults
  ): AnalyticsSummary => {
    const currentProductivityScore = productivity.dailyProductivity.length > 0 
      ? productivity.dailyProductivity[productivity.dailyProductivity.length - 1].overallScore 
      : 0;

    const topInsights = [
      ...correlations.keyInsights.actionableTakeaways.slice(0, 3),
      ...correlations.keyInsights.surprisingFindings.slice(0, 2)
    ];

    const recommendedActions: RecommendedAction[] = [
      ...correlations.performanceOptimizationPlan.quickWins.map((rec, index) => ({
        id: `quick-${index}`,
        title: rec.action,
        description: `Expected improvement: ${rec.expectedImprovement.toFixed(1)}%`,
        category: 'productivity' as const,
        priority: rec.confidence > 80 ? 'high' as const : 'medium' as const,
        expectedImpact: rec.expectedImprovement,
        timeToImplement: rec.timeframe,
        difficulty: rec.difficulty
      })),
      ...correlations.performanceOptimizationPlan.longTermStrategy.slice(0, 2).map((rec, index) => ({
        id: `long-${index}`,
        title: rec.action,
        description: `Long-term strategy for sustained improvement`,
        category: 'habits' as const,
        priority: 'medium' as const,
        expectedImpact: rec.expectedImprovement,
        timeToImplement: rec.timeframe,
        difficulty: rec.difficulty
      }))
    ];

    const achievements: Achievement[] = productivity.monthlyComparison.milestones.map((milestone, index) => ({
      id: `achievement-${index}`,
      title: milestone.achievement,
      description: milestone.description,
      date: milestone.date,
      score: milestone.score,
      badge: milestone.achievement.includes('Peak') ? '🏆' : '🔥'
    }));

    return {
      currentProductivityScore,
      currentEnergyLevel: energy.currentEnergyLevel,
      weeklyTrend: productivity.overallTrend,
      topInsights,
      recommendedActions,
      upcomingChallenges: [
        'Energy levels tend to drop in afternoons',
        'Context switching reduces focus efficiency',
        'Workload balance needs optimization'
      ],
      achievements
    };
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading analytics...</span>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center text-red-600">
        Failed to load analytics data. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personal Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your productivity và energy patterns
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Productivity Score"
          value={metrics.summary.currentProductivityScore}
          icon={<Target className="h-4 w-4" />}
          trend={metrics.summary.weeklyTrend}
          format="percentage"
        />
        <MetricCard
          title="Energy Level"
          value={metrics.summary.currentEnergyLevel}
          icon={<Zap className="h-4 w-4" />}
          trend="stable"
          format="percentage"
        />
        <MetricCard
          title="Focus Time"
          value={metrics.productivity.dailyProductivity[metrics.productivity.dailyProductivity.length - 1]?.focusTime || 0}
          icon={<Brain className="h-4 w-4" />}
          trend="improving"
          format="minutes"
        />
        <MetricCard
          title="Tasks Completed"
          value={metrics.productivity.dailyProductivity[metrics.productivity.dailyProductivity.length - 1]?.tasksCompleted || 0}
          icon={<CheckCircle className="h-4 w-4" />}
          trend="stable"
          format="number"
        />
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="energy">Energy</TabsTrigger>
          <TabsTrigger value="correlations">Correlations</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab metrics={metrics} />
        </TabsContent>

        <TabsContent value="productivity" className="space-y-4">
          <ProductivityTab productivity={metrics.productivity} />
        </TabsContent>

        <TabsContent value="energy" className="space-y-4">
          <EnergyTab energy={metrics.energy} />
        </TabsContent>

        <TabsContent value="correlations" className="space-y-4">
          <CorrelationsTab correlations={metrics.correlations} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <InsightsTab 
            summary={metrics.summary} 
            correlations={metrics.correlations}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Component: MetricCard
interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend: 'improving' | 'declining' | 'stable';
  format: 'percentage' | 'number' | 'minutes';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, trend, format }) => {
  const formatValue = (val: number) => {
    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'minutes':
        const hours = Math.floor(val / 60);
        const mins = val % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      default:
        return val.toString();
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        <div className="flex items-center text-xs text-muted-foreground">
          {getTrendIcon()}
          <span className="ml-1 capitalize">{trend}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Component: OverviewTab
const OverviewTab: React.FC<{ metrics: DashboardMetrics }> = ({ metrics }) => {
  const productivityChartData = metrics.productivity.dailyProductivity.slice(-14).map((day, index) => ({
    date: day.date.toLocaleDateString(),
    productivity: day.overallScore,
    energy: 75, // Placeholder - would get from energy data
    focus: day.focusTime / 60 // Convert to hours
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Productivity Trend Chart */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            14-Day Productivity & Energy Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={productivityChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="productivity" 
                stroke={COLORS.primary} 
                strokeWidth={2}
                name="Productivity Score"
              />
              <Line 
                type="monotone" 
                dataKey="energy" 
                stroke={COLORS.secondary} 
                strokeWidth={2}
                name="Energy Level"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.summary.topInsights.slice(0, 4).map((insight, index) => (
            <div key={index} className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">{insight}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recommended Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Recommended Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.summary.recommendedActions.slice(0, 4).map((action) => (
            <div key={action.id} className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
              <Badge 
                variant={action.priority === 'high' ? 'destructive' : action.priority === 'medium' ? 'default' : 'secondary'}
                className="ml-2"
              >
                {action.priority}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

// Component: ProductivityTab
const ProductivityTab: React.FC<{ productivity: ProductivityMetrics }> = ({ productivity }) => {
  const weeklyData = productivity.weeklyTrends.map((week, index) => ({
    week: `Week ${index + 1}`,
    average: week.averageProductivity,
    consistency: week.consistencyScore,
    bestDay: week.bestDay,
    trend: week.trend
  }));

  const factorData = productivity.productivityFactors.slice(0, 6).map(factor => ({
    factor: factor.factor.replace(/([A-Z])/g, ' $1').trim(),
    impact: Math.abs(factor.impact),
    direction: factor.impact > 0 ? 'Positive' : 'Negative'
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Weekly Trends */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Weekly Productivity Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="average" fill={COLORS.primary} name="Average Score" />
              <Bar dataKey="consistency" fill={COLORS.secondary} name="Consistency" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Factor Impact Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Factor Impact Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={factorData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="factor" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="impact" fill={COLORS.accent} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Peak Performance Times */}
      <Card>
        <CardHeader>
          <CardTitle>Peak Performance Times</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {productivity.peakPerformanceTimes.slice(0, 5).map((slot, index) => (
            <div key={index} className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {slot.startHour}:00 - {slot.endHour}:00
                </p>
                <p className="text-sm text-muted-foreground">
                  Consistency: {slot.consistency.toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{slot.productivity.toFixed(1)}%</p>
                <Progress value={slot.productivity} className="w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

// Component: EnergyTab
const EnergyTab: React.FC<{ energy: EnergyAnalytics }> = ({ energy }) => {
  const energyCycleData = energy.energyCycles[0]?.pattern.map(pattern => ({
    time: `${pattern.timeSlot.start}:00`,
    energy: pattern.averageLevel,
    variability: pattern.variability
  })) || [];

  const drainFactorData = energy.drainFactors.slice(0, 5).map(factor => ({
    factor: factor.factor,
    impact: Math.abs(factor.impact),
    frequency: factor.frequency * 100
  }));

  const boostFactorData = energy.boostFactors.slice(0, 5).map(factor => ({
    factor: factor.factor,
    impact: factor.impact,
    frequency: factor.frequency * 100
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Energy Cycle */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Daily Energy Cycle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={energyCycleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="energy" 
                stroke={COLORS.secondary} 
                strokeWidth={3}
                name="Energy Level"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Energy Drain Factors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
            Energy Drain Factors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {energy.drainFactors.slice(0, 5).map((factor, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{factor.factor}</span>
                <span className="text-sm text-red-600">
                  {Math.abs(factor.impact).toFixed(1)}% impact
                </span>
              </div>
              <Progress 
                value={Math.abs(factor.impact)} 
                className="h-2"
                // Customize color for negative impact
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Energy Boost Factors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
            Energy Boost Factors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {energy.boostFactors.slice(0, 5).map((factor, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{factor.factor}</span>
                <span className="text-sm text-green-600">
                  +{factor.impact.toFixed(1)}% boost
                </span>
              </div>
              <Progress 
                value={factor.impact} 
                className="h-2"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

// Component: CorrelationsTab
const CorrelationsTab: React.FC<{ correlations: PerformanceCorrelationResults }> = ({ correlations }) => {
  const correlationData = correlations.biVariateCorrelations.slice(0, 10).map(corr => ({
    factors: `${corr.factor1} ↔ ${corr.factor2}`,
    correlation: Math.abs(corr.correlation),
    direction: corr.direction,
    strength: corr.strength
  }));

  const patternData = correlations.performancePatterns.slice(0, 6).map(pattern => ({
    pattern: pattern.name,
    frequency: pattern.frequency * 100,
    accuracy: pattern.predictiveAccuracy
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Correlation Strength */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Performance Factor Correlations</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={correlationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="factors" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar 
                dataKey="correlation" 
                fill={COLORS.primary}
                name="Correlation Strength"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Patterns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {correlations.performancePatterns.slice(0, 5).map((pattern, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{pattern.name}</span>
                <Badge variant="secondary">
                  {(pattern.frequency * 100).toFixed(1)}% frequency
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{pattern.description}</p>
              <div className="flex justify-between text-xs">
                <span>Accuracy: {pattern.predictiveAccuracy.toFixed(1)}%</span>
                <Progress value={pattern.predictiveAccuracy} className="w-20 h-2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Performance Segments */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Segments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {correlations.performanceSegments.map((segment, index) => (
            <div key={index} className="p-3 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">{segment.name}</h4>
                <Badge variant="outline">{segment.size} days</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Productivity: {segment.metrics.averageProductivity.toFixed(1)}</div>
                <div>Energy: {segment.metrics.averageEnergy.toFixed(1)}</div>
                <div>Quality: {segment.metrics.qualityScore.toFixed(1)}</div>
                <div>Tasks: {segment.metrics.taskCompletionRate.toFixed(1)}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

// Component: InsightsTab
const InsightsTab: React.FC<{ 
  summary: AnalyticsSummary; 
  correlations: PerformanceCorrelationResults;
}> = ({ summary, correlations }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Optimization Plan */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Performance Optimization Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="quickWins" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quickWins">Quick Wins</TabsTrigger>
              <TabsTrigger value="longTerm">Long Term</TabsTrigger>
              <TabsTrigger value="experiments">Experiments</TabsTrigger>
            </TabsList>
            
            <TabsContent value="quickWins" className="space-y-3 mt-4">
              {correlations.performanceOptimizationPlan.quickWins.map((rec, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{rec.action}</h4>
                    <Badge variant="secondary">
                      +{rec.expectedImprovement.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Difficulty: {rec.difficulty}</span>
                    <span>Confidence: {rec.confidence}%</span>
                  </div>
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="longTerm" className="space-y-3 mt-4">
              {correlations.performanceOptimizationPlan.longTermStrategy.map((rec, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{rec.action}</h4>
                    <Badge variant="secondary">
                      +{rec.expectedImprovement.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Timeframe: {rec.timeframe}</span>
                    <span>Confidence: {rec.confidence}%</span>
                  </div>
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="experiments" className="space-y-3 mt-4">
              {correlations.performanceOptimizationPlan.experimentsToTry.map((rec, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{rec.action}</h4>
                    <Badge variant="outline">Experimental</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Try this approach và measure impact over 1-2 weeks
                  </p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.achievements.map((achievement) => (
            <div key={achievement.id} className="flex items-start space-x-3">
              <div className="text-2xl">{achievement.badge}</div>
              <div className="flex-1">
                <h4 className="font-medium">{achievement.title}</h4>
                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {achievement.date.toLocaleDateString()}
                </p>
              </div>
              <Badge variant="secondary">{achievement.score}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Upcoming Challenges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Areas for Improvement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.upcomingChallenges.map((challenge, index) => (
            <div key={index} className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{challenge}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonalAnalyticsDashboard;
