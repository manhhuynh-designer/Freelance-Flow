"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboard } from '@/contexts/dashboard-context';
import { i18n } from '@/lib/i18n';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, parseISO } from 'date-fns';
import { calculateMonthlyFinancials, calculateRevenueBreakdown } from '@/ai/analytics/business-intelligence-helpers';

// Data interfaces
interface BreakdownItem {
  name: string;
  value: number;
}

interface MonthlyFinancials {
  monthYear: string;
  revenue: number;
  costs: number;
  profit: number;
}

interface FinancialInsightsCardProps {
  breakdown: BreakdownItem[] | null;
  monthlyData?: MonthlyFinancials[] | null;
  currency?: string;
  locale?: string;
}

// Custom Y-axis tick to handle long text
const CustomYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={4} textAnchor="end" fill="#666" fontSize={12} width={70}>
                <title>{payload.value}</title>
                {payload.value.length > 10 ? `${payload.value.substring(0, 10)}...` : payload.value}
            </text>
        </g>
    );
};

// Custom Tooltip for Charts
const CustomTooltip = ({ active, payload, label, formatter, nameMap }: any) => {
  if (active && payload && payload.length) {
    const formattedLabel = label.includes('-') ? format(parseISO(`${label}-02`), 'MMM yyyy') : label;
    return (
      <div className="bg-background border shadow-sm rounded-lg p-2 text-sm z-50">
        <p className="font-bold mb-1">{formattedLabel}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} className="text-foreground" style={{ color: entry.color || entry.fill }}>
            {`${nameMap ? nameMap[entry.name] : entry.name}: ${formatter(entry.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

type Period = 'all' | 'week' | 'month' | 'year';

export function FinancialInsightsCard({ breakdown, monthlyData, currency = 'USD', locale = 'en-US' }: FinancialInsightsCardProps) {
  const { appData } = useDashboard();
  const T = i18n[appData?.appSettings?.language || 'en'];
  const now = new Date();
  const [period, setPeriod] = useState<Period>('all');
  const [weekDate, setWeekDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [monthValue, setMonthValue] = useState<string>(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  const [yearValue, setYearValue] = useState<number>(now.getFullYear());
  
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (tickItem: string) => {
    try {
      // Handles 'YYYY-MM' format
      return format(parseISO(`${tickItem}-02`), 'MMM yy');
    } catch {
      return tickItem;
    }
  };

  // Compute selected date window
  const selectedRange = useMemo(() => {
    if (period === 'all') return {} as { from?: Date; to?: Date };
    if (period === 'week') {
      const anchor = new Date(weekDate);
      const start = new Date(anchor);
      const day = start.getDay();
      const diff = (day + 6) % 7; // Monday
      start.setDate(start.getDate() - diff);
      start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23,59,59,999);
      return { from: start, to: end };
    }
    if (period === 'month') {
      const [y, m] = monthValue.split('-').map(Number);
      return { from: new Date(y, (m||1)-1, 1), to: new Date(y, (m||1), 0) };
    }
    // year
    return { from: new Date(yearValue, 0, 1), to: new Date(yearValue, 11, 31) };
  }, [period, weekDate, monthValue, yearValue]);

  // Recompute data based on period selection (fallback to props if appData not ready)
  const computedBreakdown = useMemo(() => {
    try {
      return appData ? calculateRevenueBreakdown(appData as any, selectedRange) : (breakdown || []);
    } catch {
      return breakdown || [];
    }
  }, [appData, selectedRange, breakdown]);

  const computedMonthly = useMemo(() => {
    try {
      return appData ? calculateMonthlyFinancials(appData as any, selectedRange) : (monthlyData || []);
    } catch {
      return monthlyData || [];
    }
  }, [appData, selectedRange, monthlyData]);

  const topClientsData = useMemo(() => computedBreakdown.slice(0, 8), [computedBreakdown]);
  const monthlyChartData = computedMonthly;
  
  const tooltipNameMap = {
      revenue: T.revenue,
      costs: T.costs,
      profit: T.profit,
      value: T.revenue
  };
  
  const hasMonthlyData = monthlyChartData.length > 0;
  const hasClientData = topClientsData.length > 0;

  const NoDataComponent = ({ message }: { message: string }) => (
    <div className="w-full h-[300px] flex items-center justify-center bg-secondary/30 rounded-lg mt-4">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );

  const getDefaultTab = () => {
    if (hasMonthlyData) return 'performance';
    if (hasClientData) return 'clients';
    return '';
  }

  // Control Tabs to ensure charts only mount when visible
  const initialTab = useMemo(() => getDefaultTab(), [hasMonthlyData, hasClientData]);
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Keep activeTab consistent with data availability changes
  useEffect(() => {
    const next = getDefaultTab();
    setActiveTab((prev) => {
      if (!prev) return next;
      // If current tab becomes invalid (e.g., data removed), switch to a valid one
      if (prev === 'performance' || prev === 'profit') {
        return hasMonthlyData ? prev : next;
      }
      if (prev === 'clients') {
        return hasClientData ? prev : next;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMonthlyData, hasClientData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{T.financialInsights || 'Financial Insights'}</CardTitle>
        <CardDescription>{T.visualAnalysisOfPerformance || 'Visual analysis of your financial performance'}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Elegant Period Selector */}
        <div className="mb-4">
          <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">Time Period</span>
                <div className="flex rounded-md border border-border overflow-hidden">
                  {(['all','week','month','year'] as Period[]).map(p => (
                    <Button 
                      key={p} 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 px-3 text-xs rounded-none border-r border-border/30 last:border-r-0 ${
                        period === p 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'hover:bg-secondary/60'
                      }`} 
                      onClick={() => setPeriod(p)}
                    >
                      {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              
              {period !== 'all' && (
                <div className="flex items-center gap-2">
                  {period === 'week' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Week of:</span>
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
                      <span className="text-xs text-muted-foreground">Month:</span>
                      <Input 
                        type="month" 
                        value={monthValue} 
                        onChange={(e) => setMonthValue(e.target.value)} 
                        className="h-8 text-xs w-[130px] bg-background border-border" 
                      />
                    </div>
                  )}
                  {period === 'year' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Year:</span>
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
          </div>
        </div>
        
        { !hasMonthlyData && !hasClientData ? (
             <NoDataComponent message={T.noDataAvailable} />
        ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="performance" disabled={!hasMonthlyData}>{T.monthlyPerformance || 'Monthly'}</TabsTrigger>
                <TabsTrigger value="profit" disabled={!hasMonthlyData}>{T.profitTrend || 'Profit'}</TabsTrigger>
                <TabsTrigger value="clients" disabled={!hasClientData}>{T.topClients || 'Clients'}</TabsTrigger>
              </TabsList>

              <div className="w-full h-[350px] pt-4">
                {/* Tab 1: Monthly Performance (Revenue vs Costs) */}
                <TabsContent value="performance" className="h-full">
                   {hasMonthlyData && activeTab === 'performance' && (
                    <div className="w-full h-full">
                      <ResponsiveContainer key={`chart-${activeTab}`} width="100%" height="100%">
                        <BarChart data={monthlyChartData} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="monthYear" tickFormatter={formatDate} fontSize={12} />
                            <YAxis tickFormatter={(val) => formatCurrency(val).replace(/(\$|€|₫)/, '')} fontSize={12} />
                            <Tooltip content={<CustomTooltip formatter={formatCurrency} nameMap={tooltipNameMap} />} />
                            <Legend />
                            <Bar dataKey="revenue" fill="#00C49F" name={T.revenue || 'Revenue'} />
                            <Bar dataKey="costs" fill="#FF8042" name={T.costs || 'Costs'} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                   )}
                </TabsContent>
                
                {/* Tab 2: Net Profit Trend */}
                <TabsContent value="profit" className="h-full">
                   {hasMonthlyData && activeTab === 'profit' && (
                    <div className="w-full h-full">
                      <ResponsiveContainer key={`chart-${activeTab}`} width="100%" height="100%">
                        <LineChart data={monthlyChartData} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="monthYear" tickFormatter={formatDate} fontSize={12} />
                            <YAxis tickFormatter={(val) => formatCurrency(val).replace(/(\$|€|₫)/, '')} fontSize={12}/>
                            <Tooltip content={<CustomTooltip formatter={formatCurrency} nameMap={tooltipNameMap} />} />
                            <Legend />
                            <Line type="monotone" dataKey="profit" stroke="#0088FE" name={T.profit || 'Profit'} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 3: Top Clients by Revenue */}
                <TabsContent value="clients" className="h-full">
                  {hasClientData && activeTab === 'clients' && (
                    <div className="w-full h-full">
                      <ResponsiveContainer key={`chart-${activeTab}`} width="100%" height="100%">
                       <BarChart layout="vertical" data={topClientsData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(val) => formatCurrency(val).replace(/(\$|€|₫)/, '')} fontSize={12}/>
                            <YAxis type="category" width={80} dataKey="name" tick={<CustomYAxisTick />} />
                            <Tooltip content={<CustomTooltip formatter={formatCurrency} nameMap={tooltipNameMap} />} />
                            <Bar dataKey="value" name={T.revenue || 'Revenue'} fill="#AF19FF" />
                       </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
        )}
      </CardContent>
    </Card>
  );
}