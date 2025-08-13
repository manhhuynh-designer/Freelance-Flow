/**
 * Analytics Widgets - Phase 4.4 Dashboard Integration
 * Modular analytics components for main dashboard
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Battery, 
  Clock, 
  Target,
  BarChart3,
  Zap,
  Brain,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Import analytics types
import type { PersonalAnalyticsData } from '@/ai/analytics/personal-analytics-system';
import type { DailyProductivityScore } from '@/ai/analytics/productivity-analyzer';
import type { InsightReport } from '@/ai/analytics/insight-report-generator';

interface AnalyticsWidgetsProps {
  userId: string;
  showDetailedView?: boolean;
  onNavigateToFullDashboard?: () => void;
}

export function AnalyticsWidgets({ 
  userId, 
  showDetailedView = false,
  onNavigateToFullDashboard 
}: AnalyticsWidgetsProps) {
  const [analyticsData, setAnalyticsData] = useState<PersonalAnalyticsData | null>(null);
  const [dailyInsights, setDailyInsights] = useState<InsightReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [userId]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      // Simulate API call - would integrate with actual analytics system
      const mockData = generateMockAnalyticsData();
      setAnalyticsData(mockData);
      
      const mockInsights = generateMockDailyInsights();
      setDailyInsights(mockInsights);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <AnalyticsLoadingSkeleton />;
  }

  if (!analyticsData) {
    return <AnalyticsErrorState onRetry={loadAnalyticsData} />;
  }

  return (
    <div className="space-y-6">
      {/* Quick Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProductivityScoreWidget 
          score={analyticsData.productivity.dailyProductivity[analyticsData.productivity.dailyProductivity.length - 1]?.overallScore || 75}
          trend={analyticsData.productivity.overallTrend}
        />
        <EnergyLevelWidget 
          level={analyticsData.energy.currentEnergyLevel}
          forecast={70}
        />
        <TaskEfficiencyWidget 
          efficiency={analyticsData.timeEfficiency.overallEfficiency}
          completedToday={analyticsData.productivity.dailyProductivity[analyticsData.productivity.dailyProductivity.length - 1]?.tasksCompleted || 0}
        />
        <StreakWidget 
          streak={analyticsData.productivity.currentStreak}
        />
      </div>

      {/* Main Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductivityTrendWidget 
          data={analyticsData.productivity.dailyProductivity.slice(-7)}
          showDetailedView={showDetailedView}
        />
        <InsightsWidget 
          insights={dailyInsights?.insights.slice(0, 3) || []}
          onViewMore={onNavigateToFullDashboard}
        />
      </div>

      {/* Additional Widgets (conditional) */}
      {showDetailedView && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <HabitsWidget 
            habits={analyticsData.habits}
          />
          <EnergyPatternWidget 
            energyData={analyticsData.energy}
          />
          <RecommendationsWidget 
            recommendations={analyticsData.recommendations.immediate.slice(0, 3)}
          />
        </div>
      )}

      {/* View Full Dashboard Button */}
      {!showDetailedView && onNavigateToFullDashboard && (
        <div className="flex justify-center">
          <Button 
            onClick={onNavigateToFullDashboard}
            className="flex items-center gap-2"
            variant="outline"
          >
            <BarChart3 className="h-4 w-4" />
            View Full Analytics Dashboard
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Individual Widget Components

function ProductivityScoreWidget({ score, trend }: { score: number; trend: string }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <TrendingUp className="h-4 w-4 text-gray-500" />;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Productivity Score</CardTitle>
        <Target className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
            {score}%
          </div>
          {getTrendIcon(trend)}
        </div>
        <Progress value={score} className="mt-2" />
        <p className="text-xs text-muted-foreground mt-1">
          {trend === 'improving' ? '+5.2%' : trend === 'declining' ? '-2.1%' : '+0.5%'} from last week
        </p>
      </CardContent>
    </Card>
  );
}

function EnergyLevelWidget({ level, forecast }: { level: number; forecast: number }) {
  const getEnergyColor = (level: number) => {
    if (level >= 75) return 'text-green-600';
    if (level >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Energy Level</CardTitle>
        <Battery className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getEnergyColor(level)}`}>
          {level}%
        </div>
        <Progress value={level} className="mt-2" />
        <p className="text-xs text-muted-foreground mt-1">
          Forecast: {forecast}% in next hour
        </p>
      </CardContent>
    </Card>
  );
}

function TaskEfficiencyWidget({ efficiency, completedToday }: { efficiency: number; completedToday: number }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Task Efficiency</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{efficiency}%</div>
        <Progress value={efficiency} className="mt-2" />
        <p className="text-xs text-muted-foreground mt-1">
          {completedToday} tasks completed today
        </p>
      </CardContent>
    </Card>
  );
}

function StreakWidget({ streak }: { streak: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
        <Zap className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-orange-600">
          {streak?.days || 0}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {streak?.type === 'productive' ? 'Productive days' : 'Days active'}
        </p>
        <Badge variant={streak?.type === 'productive' ? 'default' : 'secondary'} className="mt-2">
          {streak?.type === 'productive' ? '🔥 On Fire!' : '📈 Building'}
        </Badge>
      </CardContent>
    </Card>
  );
}

function ProductivityTrendWidget({ data, showDetailedView }: { data: DailyProductivityScore[]; showDetailedView: boolean }) {
  const chartData = data.map(day => ({
    date: day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    productivity: day.overallScore,
    efficiency: day.timeEfficiency,
    focus: Math.round(day.focusTime / 60) // Convert to hours
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          7-Day Productivity Trend
        </CardTitle>
        <CardDescription>
          Your productivity pattern over the last week
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis hide />
            <Line 
              type="monotone" 
              dataKey="productivity" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            {showDetailedView && (
              <Line 
                type="monotone" 
                dataKey="efficiency" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">Productivity</span>
            </div>
            {showDetailedView && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Efficiency</span>
              </div>
            )}
          </div>
          <Badge variant="outline">
            {data[data.length - 1]?.overallScore > data[0]?.overallScore ? '↗️ Improving' : '📊 Stable'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightsWidget({ insights, onViewMore }: { insights: any[]; onViewMore?: () => void }) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Today's Insights
        </CardTitle>
        <CardDescription>
          Key insights from your productivity analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.length > 0 ? (
            insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge className={`${getImpactColor(insight.impact)} text-xs`}>
                  {insight.impact}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {insight.description.substring(0, 80)}...
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {insight.confidence}% confidence
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {insight.category}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No insights available yet</p>
              <p className="text-xs">Continue using the system to generate insights</p>
            </div>
          )}
        </div>
        {onViewMore && insights.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onViewMore}
            className="w-full mt-4"
          >
            View All Insights
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function HabitsWidget({ habits }: { habits: any }) {
  const topHabits = [
    ...(habits?.productiveHabits?.slice(0, 2) || []),
    ...(habits?.counterproductiveHabits?.slice(0, 1) || [])
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Habit Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {topHabits.map((habit, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded border">
              <div className="flex-1">
                <p className="text-sm font-medium">{habit.name}</p>
                <p className="text-xs text-muted-foreground">
                  {habit.frequency}% frequency
                </p>
              </div>
              <Badge variant={habit.category === 'productive' ? 'default' : 'destructive'}>
                {habit.impact > 0 ? '+' : ''}{habit.impact}%
              </Badge>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium">Habit Score</p>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={habits?.overallHabitScore || 70} className="flex-1" />
            <span className="text-sm">{habits?.overallHabitScore || 70}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EnergyPatternWidget({ energyData }: { energyData: any }) {
  const peakTimes = energyData?.energyCycles?.[0]?.peakTimes || [];
  const lowTimes = energyData?.energyCycles?.[0]?.lowTimes || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Battery className="h-5 w-5" />
          Energy Pattern
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-green-600">Peak Energy</p>
            {peakTimes.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {peakTimes[0].start}:00 - {peakTimes[0].end}:00
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No pattern detected</p>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-red-600">Low Energy</p>
            {lowTimes.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {lowTimes[0].start}:00 - {lowTimes[0].end}:00
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No pattern detected</p>
            )}
          </div>
          <div className="pt-2 border-t">
            <p className="text-sm font-medium">Optimization Score</p>
            <Progress value={energyData?.optimalWorkSchedule?.efficiency || 65} className="mt-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationsWidget({ recommendations }: { recommendations: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Wins
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <div key={index} className="p-3 rounded border">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={rec.priority === 'high' ? 'default' : 'secondary'}>
                  {rec.priority}
                </Badge>
                <Badge variant="outline">
                  {rec.effort}
                </Badge>
              </div>
              <p className="text-sm font-medium">{rec.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Expected: +{rec.impact}% improvement
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Loading and Error States

function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded animate-pulse mb-2"></div>
              <div className="h-2 bg-muted rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-muted rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AnalyticsErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Failed to load analytics</h3>
        <p className="text-muted-foreground mb-4 text-center">
          There was an error loading your analytics data. Please try again.
        </p>
        <Button onClick={onRetry}>
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}

// Mock Data Generators (for development/testing)

function generateMockAnalyticsData(): PersonalAnalyticsData {
  return {
    userId: 'user-123',
    lastUpdated: new Date(),
    productivity: {
      dailyProductivity: [
        { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), overallScore: 72, tasksCompleted: 4, timeEfficiency: 75, qualityScore: 80, focusTime: 180, distractionEvents: 3, totalWorkTime: 480, breakTime: 60 },
        { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), overallScore: 78, tasksCompleted: 5, timeEfficiency: 82, qualityScore: 85, focusTime: 200, distractionEvents: 2, totalWorkTime: 500, breakTime: 45 },
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), overallScore: 81, tasksCompleted: 6, timeEfficiency: 88, qualityScore: 78, focusTime: 220, distractionEvents: 4, totalWorkTime: 520, breakTime: 40 },
        { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), overallScore: 75, tasksCompleted: 3, timeEfficiency: 70, qualityScore: 82, focusTime: 160, distractionEvents: 5, totalWorkTime: 450, breakTime: 75 },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), overallScore: 85, tasksCompleted: 7, timeEfficiency: 90, qualityScore: 88, focusTime: 240, distractionEvents: 1, totalWorkTime: 540, breakTime: 30 },
        { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), overallScore: 83, tasksCompleted: 6, timeEfficiency: 85, qualityScore: 86, focusTime: 210, distractionEvents: 2, totalWorkTime: 510, breakTime: 45 },
        { date: new Date(), overallScore: 79, tasksCompleted: 4, timeEfficiency: 80, qualityScore: 84, focusTime: 190, distractionEvents: 3, totalWorkTime: 480, breakTime: 50 }
      ],
      weeklyTrends: [],
      monthlyComparison: {} as any,
      peakPerformanceTimes: [],
      productivityFactors: [],
      overallTrend: 'improving',
      currentStreak: { type: 'productive', days: 5, startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
    } as any,
    timeEfficiency: { overallEfficiency: 82 } as any,
    deadlineIntelligence: {} as any,
    energy: {
      currentEnergyLevel: 75,
      energyCycles: [{
        peakTimes: [{ start: 9, end: 11 }],
        lowTimes: [{ start: 14, end: 16 }],
        consistency: 80
      }],
      optimalWorkSchedule: { efficiency: 85 },
      energyForecast: { next24Hours: 78 }
    } as any,
    performance: {} as any,
    habits: {
      productiveHabits: [
        { name: 'Morning Planning', frequency: 85, impact: 25, category: 'productive' },
        { name: 'Regular Breaks', frequency: 70, impact: 15, category: 'productive' }
      ],
      counterproductiveHabits: [
        { name: 'Social Media', frequency: 40, impact: -18, category: 'counterproductive' }
      ],
      overallHabitScore: 72
    } as any,
    insights: {} as any,
    recommendations: {
      immediate: [
        { title: 'Block social media during work hours', priority: 'high', effort: 'minimal', impact: 15 },
        { title: 'Schedule deep work at 9-11 AM', priority: 'high', effort: 'minimal', impact: 20 },
        { title: 'Take breaks every 90 minutes', priority: 'medium', effort: 'minimal', impact: 10 }
      ]
    } as any,
    dataQuality: {} as any,
    systemHealth: {} as any
  };
}

function generateMockDailyInsights(): InsightReport {
  return {
    id: 'daily-123',
    title: 'Daily Analytics Report',
    generatedAt: new Date(),
    period: { type: 'daily', startDate: new Date(), endDate: new Date() },
    insights: [
      {
        id: 'insight-1',
        type: 'performance',
        category: 'productivity',
        title: 'Peak performance detected at 9:00-11:00',
        description: 'Your highest productivity consistently occurs during 9:00-11:00 with 85% average performance.',
        impact: 'high',
        confidence: 90,
        evidence: [],
        relatedMetrics: ['peak_performance'],
        actionability: 95
      },
      {
        id: 'insight-2',
        type: 'energy',
        category: 'wellbeing',
        title: 'Energy dip detected after lunch',
        description: 'Your energy levels consistently drop by 20% between 2-4 PM.',
        impact: 'medium',
        confidence: 85,
        evidence: [],
        relatedMetrics: ['energy_cycles'],
        actionability: 80
      },
      {
        id: 'insight-3',
        type: 'pattern',
        category: 'habits',
        title: 'Strong correlation between breaks and productivity',
        description: 'Taking regular breaks improves your productivity by 15% on average.',
        impact: 'medium',
        confidence: 78,
        evidence: [],
        relatedMetrics: ['break_patterns'],
        actionability: 90
      }
    ],
    summary: {} as any,
    recommendations: [],
    trends: [],
    predictions: [],
    visualizations: []
  };
}

export default AnalyticsWidgets;
