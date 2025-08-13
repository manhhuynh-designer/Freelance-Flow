/**
 * Work Time Statistics Card
 * Displays work time metrics and weekly chart
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '../../../contexts/dashboard-context';

export function WorkTimeStatsCard() {
  const { workTime, T } = useDashboard() as any;
  
  return (
    <Card>
      <CardHeader>
  <CardTitle>{T?.workTimeStatistics || 'Work Time Statistics'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-secondary/50 rounded-lg">
            <div className="text-sm font-medium text-muted-foreground">{T?.weeklyHours || 'Weekly Hours'}</div>
            <div className="text-2xl font-bold text-primary">
              {workTime?.stats?.weeklyTotalHours?.toFixed(1) || '0.0'}h
            </div>
          </div>
          <div className="text-center p-4 bg-secondary/50 rounded-lg">
            <div className="text-sm font-medium text-muted-foreground">{T?.dailyAverage || 'Daily Average'}</div>
            <div className="text-2xl font-bold text-blue-600">
              {workTime?.stats?.dailyAverageHours?.toFixed(1) || '0.0'}h
            </div>
          </div>
        </div>
        
        {/* Simple 7-day chart placeholder */}
        <div className="mt-6">
          <div className="text-sm font-medium text-muted-foreground mb-3">{T?.last7Days || 'Last 7 Days'}</div>
          <div className="flex items-end gap-2 h-20">
            {['h-8', 'h-16', 'h-12', 'h-20', 'h-6', 'h-14', 'h-18'].map((height, i) => (
              <div key={i} className={`flex-1 bg-primary/20 rounded-t ${height}`} />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            {[
              {k:'weekdayMon', f:'Mon'},
              {k:'weekdayTue', f:'Tue'},
              {k:'weekdayWed', f:'Wed'},
              {k:'weekdayThu', f:'Thu'},
              {k:'weekdayFri', f:'Fri'},
              {k:'weekdaySat', f:'Sat'},
              {k:'weekdaySun', f:'Sun'}
            ].map(d => (<span key={d.k}>{T?.[d.k] || d.f}</span>))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
