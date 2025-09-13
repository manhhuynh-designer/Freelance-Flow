'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '../../../contexts/dashboard-context';
import { PeriodRangeSelector } from './PeriodRangeSelector';
import { ProductivityChart } from './ProductivityChart';
import { buildWorkTimeStats } from '@/lib/helpers/time-analyzer';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';

const StatDisplay = ({ title, value, subtext }: { title: string; value: string; subtext?: string }) => (
    <div className="text-center p-3 bg-secondary/50 rounded-lg">
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
        <div className="text-2xl font-bold text-primary">{value}</div>
        {subtext && <div className="text-xs text-muted-foreground">{subtext}</div>}
    </div>
);

interface EnhancedWorkTimeStatsCardProps {
  onStats?: (data: { range?: DateRange; stats: any | null }) => void;
  externalRange?: DateRange; // allow parent to control
  setExternalRange?: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
}

export function EnhancedWorkTimeStatsCard({ onStats, externalRange, setExternalRange }: EnhancedWorkTimeStatsCardProps) {
  const { workTime, T } = useDashboard() as any;
  const { sessions = [] } = workTime || {};

  const [internalRange, setInternalRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -6),
    to: new Date(),
  });
  const dateRange = externalRange !== undefined ? externalRange : internalRange;
  const setDateRange = setExternalRange || setInternalRange;

  const stats = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return null;
    return buildWorkTimeStats(sessions, dateRange.from, dateRange.to);
  }, [sessions, dateRange]);

  // Notify parent of stats for AI context (effect, not during render)
  useEffect(() => {
    if (onStats) {
      onStats({ range: dateRange, stats });
    }
  }, [stats, dateRange, onStats]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>{T?.productivityAnalysis || 'Productivity Analysis'}</CardTitle>
            <PeriodRangeSelector date={dateRange} setDate={setDateRange} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {stats && (
            <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatDisplay title={T?.totalWorkHoursLabel || 'Total Work Hours'} value={stats.totalWorkHours.toFixed(1) + 'h'} />
                    <StatDisplay title={T?.totalFocusHoursLabel || 'Total Focus Hours'} value={stats.totalFocusHours.toFixed(1) + 'h'} />
                    <StatDisplay title={T?.pomodorosDone || 'Pomodoros Done'} value={String(stats.completedPomodoros)} subtext="sessions" />
                </div>
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">{T?.dailyBreakdown || 'Daily Breakdown'}</h4>
                    <ProductivityChart data={stats.dailyBreakdown} />
                </div>
            </>
        )}
      </CardContent>
    </Card>
  );
}
