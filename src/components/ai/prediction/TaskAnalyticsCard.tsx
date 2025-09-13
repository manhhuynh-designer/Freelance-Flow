"use client";
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { PeriodRangeSelector } from './PeriodRangeSelector';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDashboard } from '../../../contexts/dashboard-context';
import * as H from './task-analytics.helpers';
import type { StatusColors } from '@/lib/types';
import { DateRange } from 'react-day-picker';
import { TaskTrendChart } from './TaskTrendChart';

interface TaskAnalyticsCardProps { 
  onAnalyticsUpdate?: (data: { 
    pie: H.PieChartData; 
    trend: H.TrendChartDataPoint[]; 
    range?: DateRange; 
    summary: { active: number; near: number; overdue: number }; 
    groupBy: H.GroupBy; 
  }) => void;
  dateRange: DateRange | undefined;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
}

export function TaskAnalyticsCard({ onAnalyticsUpdate, dateRange, setDateRange }: TaskAnalyticsCardProps) {
  const { appData, T } = useDashboard() as any;
  const { tasks = [], clients = [], categories = [] } = appData || {};
  const { statusSettings = [], statusColors = {} as StatusColors } = appData?.appSettings || {};
  const [groupBy, setGroupBy] = useState<H.GroupBy>('status');
  // dateRange is managed by parent now

  // Comparison presets extended
  type ComparisonMode = 'none' | 'previousPeriod' | 'previousWeek' | 'previousMonth' | 'previousYear';
  const [comparison, setComparison] = useState<ComparisonMode>('none');

  const filteredTasks = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return tasks;
    return tasks.filter((t: any) => {
      const created = t.createdAt ? new Date(t.createdAt) : (t.startDate ? new Date(t.startDate) : undefined);
      if (!created) return false;
      return created >= dateRange.from! && created <= dateRange.to!;
    });
  }, [tasks, dateRange]);

  const rawPieChartData = useMemo(() => H.calculatePieChartData(
    filteredTasks, groupBy, clients, categories, statusColors, new Set()
  ), [filteredTasks, groupBy, clients, categories, statusColors]);

  // Map status IDs to user-defined labels when grouping by status
  const pieChartData = useMemo(() => {
    if (groupBy !== 'status') return rawPieChartData;
    const map = (statusSettings || []).reduce((acc: any, s: any) => { acc[s.id] = s.label || s.id; return acc; }, {});
    return rawPieChartData.map(d => ({ ...d, name: map[d.name] || d.name }));
  }, [rawPieChartData, groupBy, statusSettings]);

  const trendData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [] as H.TrendChartDataPoint[];
    return H.calculateTrendForPeriod(filteredTasks, dateRange.from, dateRange.to);
  }, [filteredTasks, dateRange]);

  const compareTrendData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return undefined;
    if (comparison === 'none') return undefined;
    const { from, to } = { from: dateRange.from, to: dateRange.to };
    const lengthDays = Math.round((to.getTime() - from.getTime()) / 86400000);
    const oneDay = 86400000;
    let prevFrom: Date; let prevTo: Date;
    switch (comparison) {
      case 'previousPeriod':
        prevTo = new Date(from.getTime() - oneDay);
        prevFrom = new Date(prevTo.getTime() - lengthDays * oneDay);
        break;
      case 'previousWeek':
        prevFrom = new Date(from.getTime() - 7 * oneDay);
        prevTo = new Date(prevFrom.getTime() + lengthDays * oneDay);
        break;
      case 'previousMonth':
        prevFrom = new Date(from); prevFrom.setMonth(prevFrom.getMonth() - 1);
        prevTo = new Date(to); prevTo.setMonth(prevTo.getMonth() - 1);
        break;
      case 'previousYear':
        prevFrom = new Date(from); prevFrom.setFullYear(prevFrom.getFullYear() - 1);
        prevTo = new Date(to); prevTo.setFullYear(prevTo.getFullYear() - 1);
        break;
      default:
        return undefined;
    }
    return H.calculateTrendForPeriod(tasks, prevFrom, prevTo);
  }, [comparison, dateRange, tasks]);

  // Summary metrics for current date range
  const { activeCount, nearDeadlineCount, overdueCount } = useMemo(() => {
    const now = new Date();
    const nearThresholdMs = 3 * 24 * 60 * 60 * 1000; // 3 days
    let active = 0, near = 0, overdue = 0;
    filteredTasks.forEach((t: any) => {
      if (t.status === 'archived' || t.status === 'done') return; // not active
      active++;
      const deadline = t.deadline ? new Date(t.deadline) : null;
      if (deadline) {
        const diff = deadline.getTime() - now.getTime();
        if (diff < 0) overdue++;
        else if (diff <= nearThresholdMs) near++;
      }
    });
    return { activeCount: active, nearDeadlineCount: near, overdueCount: overdue };
  }, [filteredTasks]);

  // Notify parent when analytics data changes
  React.useEffect(() => {
    if (onAnalyticsUpdate) {
      onAnalyticsUpdate({ 
        pie: pieChartData, 
        trend: trendData, 
        range: dateRange, 
        summary: { active: activeCount, near: nearDeadlineCount, overdue: overdueCount },
        groupBy
      });
    }
  }, [onAnalyticsUpdate, pieChartData, trendData, dateRange, activeCount, nearDeadlineCount, overdueCount, groupBy]);

  return (
    <Card>
      <CardHeader>
    <div className="space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <CardTitle className="mr-4">{T?.taskAnalytics || 'Task Analytics'}</CardTitle>
            <div className="flex-shrink-0">
              <PeriodRangeSelector date={dateRange} setDate={setDateRange} />
            </div>
          </div>
          
          {/* Separate row for Group and Comparison filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={groupBy} onValueChange={v => setGroupBy(v as H.GroupBy)}>
              <SelectTrigger className="h-9 px-3 w-[130px] md:w-[140px] text-sm border border-border/50 shadow-none"><SelectValue placeholder={T?.groupLabel || 'Group'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="status">{T?.groupStatus || 'Status'}</SelectItem>
                <SelectItem value="client">{T?.groupClient || 'Client'}</SelectItem>
                <SelectItem value="category">{T?.groupCategory || 'Category'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={comparison} onValueChange={v => setComparison(v as ComparisonMode)}>
              <SelectTrigger className="h-9 px-3 w-[150px] md:w-[160px] text-sm border border-border/50 shadow-none"><SelectValue placeholder={T?.comparisonLabel || 'Comparison'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{T?.noComparison || 'No Comparison'}</SelectItem>
                <SelectItem value="previousPeriod">{T?.previousPeriod || 'Previous Period'}</SelectItem>
                <SelectItem value="previousWeek">{T?.previousWeek || 'Previous Week'}</SelectItem>
                <SelectItem value="previousMonth">{T?.previousMonth || 'Previous Month'}</SelectItem>
                <SelectItem value="previousYear">{T?.previousYear || 'Previous Year'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="w-full lg:w-1/2">
            <div className="w-full h-64 xl:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} paddingAngle={1}>
                    {pieChartData.map((entry, index) => (<Cell key={index} fill={entry.fill} />))}
                  </Pie>
                  <ReTooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="w-full lg:w-1/2 flex flex-col">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">{T?.creationTrend || 'Creation Trend'}</h4>
            <div className="flex-1">
              <TaskTrendChart 
                mainData={trendData} 
                compareData={compareTrendData} 
                mainLabel={T?.currentLabel || 'Current'} 
                compareLabel={T?.previousLabel || T?.previousPeriod || 'Previous'} 
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{T?.activeTasks || 'Active Tasks'}</p>
            <p className="text-2xl font-semibold mt-1">{activeCount}</p>
          </div>
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{T?.nearDeadline || 'Near Deadline (<=3d)'}</p>
            <p className="text-2xl font-semibold mt-1 text-amber-600 dark:text-amber-400">{nearDeadlineCount}</p>
          </div>
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{T?.overdue || 'Overdue'}</p>
            <p className="text-2xl font-semibold mt-1 text-red-600 dark:text-red-400">{overdueCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
