"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { useDashboard } from '@/contexts/dashboard-context';

type Period = 'all' | 'week' | 'month' | 'year';

interface PeriodRangeSelectorProps {
  date: DateRange | undefined;
  setDate: (range: DateRange | undefined) => void;
  className?: string;
}

export function PeriodRangeSelector({ date, setDate, className }: PeriodRangeSelectorProps) {
  const { T } = useDashboard() as any;
  const now = React.useMemo(() => new Date(), []);

  // derive initial period heuristically from provided date range
  const initialPeriod: Period = React.useMemo(() => {
    if (!date?.from || !date?.to) return 'all';
    const days = Math.ceil((date.to.getTime() - date.from.getTime()) / 86400000) + 1;
    if (days <= 7) return 'week';
    if (days <= 32 && date.from.getMonth() === date.to.getMonth() && date.from.getFullYear() === date.to.getFullYear()) return 'month';
    if (date.from.getFullYear() === date.to.getFullYear() && date.from.getMonth() === 0 && date.to.getMonth() === 11) return 'year';
    return 'month';
  }, [date]);

  const [period, setPeriod] = React.useState<Period>(initialPeriod);
  const [weekDate, setWeekDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [monthValue, setMonthValue] = React.useState<string>(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [yearValue, setYearValue] = React.useState<number>(now.getFullYear());

  const computeAndSet = React.useCallback((p: Period, w: string, m: string, y: number) => {
    if (p === 'all') { setDate(undefined); return; }
    if (p === 'week') {
      const anchor = new Date(w);
      if (isNaN(anchor.getTime())) { setDate(undefined); return; }
      const start = new Date(anchor);
      const day = start.getDay();
      const diff = (day + 6) % 7; // Monday as start
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      setDate({ from: start, to: end });
      return;
    }
    if (p === 'month') {
      const [yy, mm] = m.split('-').map(Number);
      if (!yy || !mm) { setDate(undefined); return; }
      const from = new Date(yy, (mm || 1) - 1, 1);
      const to = new Date(yy, (mm || 1), 0);
      to.setHours(23, 59, 59, 999);
      setDate({ from, to });
      return;
    }
    // year
    const from = new Date(y, 0, 1);
    const to = new Date(y, 11, 31);
    to.setHours(23, 59, 59, 999);
    setDate({ from, to });
  }, [setDate]);

  // recompute on changes
  React.useEffect(() => { computeAndSet(period, weekDate, monthValue, yearValue); }, [period, weekDate, monthValue, yearValue, computeAndSet]);

  return (
    <div className={cn('flex items-center gap-3 flex-wrap', className)}>
      <span className="text-sm font-medium text-foreground">{T?.period || 'Period'}</span>
      <div className="flex rounded-md border border-border overflow-hidden">
        {(['all','week','month','year'] as Period[]).map(p => (
          <Button
            key={p}
            variant="ghost"
            size="sm"
            className={`h-8 px-3 text-xs rounded-none border-r border-border/30 last:border-r-0 ${
              period === p ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-secondary/60'
            }`}
            onClick={() => setPeriod(p)}
          >
            {p === 'all' ? (T?.sinceBeginning || T?.allTime || 'All time') : p === 'week' ? (T?.week || 'Week') : p === 'month' ? (T?.month || 'Month') : (T?.year || 'Year')}
          </Button>
        ))}
      </div>

      {period !== 'all' && (
        <div className="flex items-center gap-2">
          {period === 'week' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{T?.weekOf || 'Week of'}:</span>
              <Input
                type="date"
                value={weekDate}
                onChange={(e) => setWeekDate(e.target.value)}
                className="h-8 text-xs w-[140px] bg-background border-border"
              />
            </div>
          )}
          {period === 'month' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{T?.month || 'Month'}:</span>
              <Select
                value={monthValue.split('-')[0]}
                onValueChange={(newYear) => {
                  const [, m] = monthValue.split('-');
                  setMonthValue(`${newYear}-${m || '01'}`);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[90px] bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 15 }).map((_, idx) => {
                    const y = now.getFullYear() - 10 + idx;
                    return <SelectItem key={y} value={String(y)}>{y}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <Select
                value={monthValue.split('-')[1]}
                onValueChange={(newMonth) => {
                  const [y] = monthValue.split('-');
                  const mm = String(newMonth).padStart(2, '0');
                  setMonthValue(`${y || String(now.getFullYear())}-${mm}`);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[90px] bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const mm = String(i + 1).padStart(2, '0');
                    return <SelectItem key={mm} value={mm}>{mm}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          {period === 'year' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{T?.year || 'Year'}:</span>
              <Select value={String(yearValue)} onValueChange={(v) => setYearValue(Number(v))}>
                <SelectTrigger className="h-8 text-xs w-[100px] bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 15 }).map((_, idx) => {
                    const y = now.getFullYear() - 10 + idx;
                    return <SelectItem key={y} value={String(y)}>{y}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PeriodRangeSelector;
