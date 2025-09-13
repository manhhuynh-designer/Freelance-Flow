"use client";

import React, { createContext, useContext, useMemo, useState } from 'react';

export type Period = 'all' | 'week' | 'month' | 'year';

interface AnalyticsRangeContextValue {
  period: Period;
  weekDate: string; // ISO yyyy-MM-dd
  monthValue: string; // yyyy-MM
  yearValue: number;
  setPeriod: (p: Period) => void;
  setWeekDate: (d: string) => void;
  setMonthValue: (m: string) => void;
  setYearValue: (y: number) => void;
  selectedRange: { from?: Date; to?: Date };
}

const AnalyticsRangeContext = createContext<AnalyticsRangeContextValue | null>(null);

export function AnalyticsRangeProvider({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const [period, setPeriod] = useState<Period>('all');
  const [weekDate, setWeekDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [monthValue, setMonthValue] = useState<string>(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [yearValue, setYearValue] = useState<number>(now.getFullYear());

  const selectedRange = useMemo(() => {
    if (period === 'all') return {} as { from?: Date; to?: Date };
    if (period === 'week') {
      const anchor = new Date(weekDate);
      const start = new Date(anchor);
      const day = start.getDay();
      const diff = (day + 6) % 7; // Monday
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    }
    if (period === 'month') {
      const [y, m] = monthValue.split('-').map(Number);
      return { from: new Date(y, (m || 1) - 1, 1), to: new Date(y, m || 1, 0) };
    }
    return { from: new Date(yearValue, 0, 1), to: new Date(yearValue, 11, 31) };
  }, [period, weekDate, monthValue, yearValue]);

  const value: AnalyticsRangeContextValue = {
    period,
    weekDate,
    monthValue,
    yearValue,
    setPeriod,
    setWeekDate,
    setMonthValue,
    setYearValue,
    selectedRange,
  };

  return (
    <AnalyticsRangeContext.Provider value={value}>{children}</AnalyticsRangeContext.Provider>
  );
}

export function useAnalyticsRange() {
  return useContext(AnalyticsRangeContext);
}
