/**
 * Productivity Score Card
 * Displays productivity metrics with gauge and trend line
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '../../../contexts/dashboard-context';
import type { ProductivityMetrics } from '../../../ai/analytics/productivity-analyzer';

interface ProductivityScoreCardProps {
  metrics: ProductivityMetrics;
}

export function ProductivityScoreCard({ metrics }: ProductivityScoreCardProps) {
  const { T } = useDashboard() as any;
  const latestScore = metrics.dailyProductivity[metrics.dailyProductivity.length - 1]?.overallScore || 0;
  
  return (
    <Card>
      <CardHeader>
  <CardTitle>{T?.productivityAnalysis || 'Productivity Analysis'}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Gauge-like display */}
        <div className="text-center p-6 bg-secondary/50 rounded-lg">
          <div className="text-sm font-medium text-muted-foreground mb-2">{T?.productivityOverallScore || 'Overall Score'}</div>
          <div className="text-4xl font-bold text-primary mb-2">
            {latestScore.toFixed(0)}/100
          </div>
          <div className="text-sm text-muted-foreground">
            {T?.productivityTrend || 'Trend:'} {metrics.overallTrend}
          </div>
        </div>

        {/* Weekly trends mini chart */}
        <div className="mt-6">
          <div className="text-sm font-medium text-muted-foreground mb-3">{T?.weeklyTrends || 'Weekly Trends'}</div>
          <div className="flex items-end gap-1 h-16 border rounded p-2">
            {metrics.dailyProductivity.slice(-7).map((day, i) => {
              const getBarHeight = (score: number) => {
                if (score >= 90) return 'h-12';
                if (score >= 80) return 'h-10';
                if (score >= 70) return 'h-8';
                if (score >= 60) return 'h-6';
                if (score >= 50) return 'h-4';
                return 'h-2';
              };
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="text-xs text-muted-foreground mb-1">
                    {day.overallScore.toFixed(0)}
                  </div>
                  <div 
                    className={`w-full rounded-t ${
                      day.overallScore >= 80 ? 'bg-green-500' :
                      day.overallScore >= 60 ? 'bg-blue-500' :
                      day.overallScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    } ${getBarHeight(day.overallScore)}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            {metrics.dailyProductivity.slice(-7).map((day, i) => (
              <span key={i}>{new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}</span>
            ))}
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">{T?.tasksCompleted || 'Tasks Completed'}</div>
            <div className="text-lg font-bold">
              {metrics.dailyProductivity[metrics.dailyProductivity.length - 1]?.tasksCompleted || 0}
            </div>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">{T?.focusTimeShort || T?.focusTime || 'Focus Time'}</div>
            <div className="text-lg font-bold">
              {Math.round((metrics.dailyProductivity[metrics.dailyProductivity.length - 1]?.focusTime || 0) / 60)}h
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
