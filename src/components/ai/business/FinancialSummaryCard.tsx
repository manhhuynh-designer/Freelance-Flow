"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  DollarSign,
  TrendingDown, 
  TrendingUp, 
  Eye, 
  HelpCircle, 
  Settings, 
  Plus, 
  Trash2, 
  Edit2 
} from 'lucide-react';
import { useDashboard } from '@/contexts/dashboard-context';
import { i18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import type { FixedCost } from '@/lib/types';
import type { AppData } from '@/lib/types';
import { format } from 'date-fns';
import { 
  calculateFinancialSummary,
  calculateTaskDetails,
  calculateAdditionalFinancials,
  calculateAdditionalTaskDetails
} from '@/ai/analytics/business-intelligence-helpers';

interface TaskDetail {
  id: string;
  name: string;
  clientName: string;
  amount: number;
  type: 'revenue' | 'cost' | 'future-revenue' | 'lost-revenue';
  status?: string;
}

interface FinancialSummaryCardProps {
  summary: {
    revenue: number;
    costs: number;
    profit: number;
  } | null;
  currency?: string; // e.g., 'USD' | 'VND'
  locale?: string;   // e.g., 'en-US' | 'vi-VN'
  taskDetails?: {
    revenueItems: TaskDetail[];
    costItems: TaskDetail[];
  };
  additionalFinancials?: {
    futureRevenue: number;
    lostRevenue: number;
  };
  additionalTaskDetails?: {
    futureRevenueItems: TaskDetail[];
    lostRevenueItems: TaskDetail[];
  };
  onTaskClick?: (taskId: string) => void;
}
type Period = 'all' | 'week' | 'month' | 'year';

export function FinancialSummaryCard({ summary, currency = 'USD', locale, taskDetails, additionalFinancials, additionalTaskDetails, onTaskClick }: FinancialSummaryCardProps) {
  const { appData, setAppData } = useDashboard();
  const T = i18n[appData?.appSettings?.language as keyof typeof i18n || 'en'];
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'revenue' | 'costs' | 'future-revenue' | 'lost-revenue' | 'fixed-costs' | null>(null);
  const [period, setPeriod] = useState<Period>('all');
  // Anchors for period selection
  const now = new Date();
  const [weekDate, setWeekDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [monthValue, setMonthValue] = useState<string>(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  const [yearValue, setYearValue] = useState<number>(now.getFullYear());
  
  // Fixed costs management state
  const [editingCost, setEditingCost] = useState<FixedCost | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as 'once' | 'weekly' | 'monthly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isActive: true
  });

  const fixedCosts = appData?.fixedCosts || [];

  // Calculate fixed costs for the selected period
  const totalFixedCosts = useMemo(() => {
    if (!appData?.fixedCosts || appData.fixedCosts.length === 0) return 0;

    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    if (period === 'all') {
      fromDate = undefined; toDate = undefined;
    } else if (period === 'week') {
      const anchor = new Date(weekDate);
      const start = new Date(anchor);
      const day = start.getDay();
      const diff = (day + 6) % 7; // Monday
      start.setDate(start.getDate() - diff);
      start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23,59,59,999);
      fromDate = start; toDate = end;
    } else if (period === 'month') {
      const [y, m] = monthValue.split('-').map(Number);
      fromDate = new Date(y, (m||1)-1, 1);
      toDate = new Date(y, (m||1), 0);
    } else {
      fromDate = new Date(yearValue, 0, 1);
      toDate = new Date(yearValue, 11, 31);
    }

    const rangeDays = fromDate && toDate ? (Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000*60*60*24)) + 1) : undefined;

    return appData.fixedCosts.reduce((total: number, cost: FixedCost) => {
      if (!cost.isActive) return total;
      const startDate = new Date(cost.startDate);
      const endDate = cost.endDate ? new Date(cost.endDate) : null;

      // All-time: approximate across active period
      if (!fromDate || !toDate) {
        switch (cost.frequency) {
          case 'once': return total + cost.amount;
          case 'weekly': {
            const until = endDate && endDate < now ? endDate : now;
            const days = Math.max(0, Math.ceil((until.getTime() - startDate.getTime()) / (1000*60*60*24)) + 1);
            return total + cost.amount * (days/7);
          }
          case 'monthly': {
            const until = endDate && endDate < now ? endDate : now;
            const months = (until.getFullYear() - startDate.getFullYear()) * 12 + (until.getMonth() - startDate.getMonth()) + 1;
            return total + cost.amount * Math.max(0, months);
          }
          case 'yearly': {
            const until = endDate && endDate < now ? endDate : now;
            const years = (until.getFullYear() - startDate.getFullYear()) + 1;
            return total + cost.amount * Math.max(0, years);
          }
        }
      }

      // Bounded period overlap check
      if ((fromDate && startDate > toDate!) || (endDate && fromDate && endDate < fromDate)) return total;

      let dailyRate = 0;
      switch (cost.frequency) {
        case 'weekly': dailyRate = cost.amount / 7; break;
        case 'monthly': dailyRate = cost.amount / 30.44; break;
        case 'yearly': dailyRate = cost.amount / 365.25; break;
        case 'once':
          if (fromDate && toDate && startDate >= fromDate && startDate <= toDate) return total + cost.amount;
          return total;
      }
      const costForRange = rangeDays ? dailyRate * rangeDays : 0;
      return total + costForRange;
    }, 0);
  }, [appData?.fixedCosts, period, weekDate, monthValue, yearValue]);

  // Derive dateRange from selected period and anchors
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
      const from = new Date(y, (m||1)-1, 1);
      const to = new Date(y, (m||1), 0);
      return { from, to };
    }
    // year
    return { from: new Date(yearValue, 0, 1), to: new Date(yearValue, 11, 31) };
  }, [period, weekDate, monthValue, yearValue]);

  // Compute period-based metrics
  const viewSummary = useMemo(() => {
    return appData ? calculateFinancialSummary(appData as any, selectedRange) : summary || { revenue: 0, costs: 0, profit: 0 };
  }, [appData, selectedRange, summary]);

  const viewAdditionalFinancials = useMemo(() => {
    return appData ? calculateAdditionalFinancials(appData as any, selectedRange) : additionalFinancials || { futureRevenue: 0, lostRevenue: 0 };
  }, [appData, selectedRange, additionalFinancials]);

  const viewTaskDetails = useMemo(() => {
    return appData ? calculateTaskDetails(appData as any, selectedRange) : taskDetails || { revenueItems: [], costItems: [] };
  }, [appData, selectedRange, taskDetails]);

  const viewAdditionalTaskDetails = useMemo(() => {
    return appData ? calculateAdditionalTaskDetails(appData as any, selectedRange) : additionalTaskDetails || { futureRevenueItems: [], lostRevenueItems: [] };
  }, [appData, selectedRange, additionalTaskDetails]);

  const frequencyLabels = {
    once: 'One time',
    weekly: 'Weekly', 
    monthly: 'Monthly',
    yearly: 'Yearly'
  };

  const handleCardClick = (type: 'revenue' | 'costs' | 'future-revenue' | 'lost-revenue' | 'fixed-costs') => {
    setDialogType(type);
    setDialogOpen(true);
  };

  const handleAddCost = () => {
    setEditingCost(null);
    setFormData({
      name: '',
      amount: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      isActive: true
    });
  };

  const handleEditCost = (cost: FixedCost) => {
    setEditingCost(cost);
    setFormData({
      name: cost.name,
      amount: cost.amount.toString(),
      frequency: cost.frequency,
      startDate: cost.startDate.split('T')[0],
      endDate: cost.endDate ? cost.endDate.split('T')[0] : '',
      isActive: cost.isActive
    });
  };

  const handleDeleteCost = (costId: string) => {
    const updatedCosts = fixedCosts.filter((cost: FixedCost) => cost.id !== costId);
    setAppData((prev: AppData) => ({ ...prev, fixedCosts: updatedCosts }));
    toast({
      title: 'Success',
      description: 'Fixed cost deleted successfully',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.amount.trim()) {
      toast({
        variant: "destructive",
        title: T.error || 'Error',
        description: 'Please fill in all required fields',
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive", 
        title: T.error || 'Error',
        description: 'Please enter a valid amount',
      });
      return;
    }

    const now = new Date().toISOString();
    const costData: FixedCost = {
      id: editingCost?.id || `fixed-cost-${Date.now()}`,
      name: formData.name.trim(),
      amount,
      frequency: formData.frequency,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
      isActive: formData.isActive,
      createdAt: editingCost?.createdAt || now,
      updatedAt: now
    };

    let updatedCosts;
    if (editingCost) {
      updatedCosts = fixedCosts.map((cost: FixedCost) => 
        cost.id === editingCost.id ? costData : cost
      );
    } else {
      updatedCosts = [...fixedCosts, costData];
    }

    setAppData((prev: AppData) => ({ ...prev, fixedCosts: updatedCosts }));
    
    // Reset form but keep dialog open
    setFormData({
      name: '',
      amount: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      isActive: true
    });
    setEditingCost(null);
    
    toast({
      title: T.success || 'Success',
      description: editingCost 
        ? 'Fixed cost updated successfully'
        : 'Fixed cost added successfully',
    });
  };

  if (!summary && !appData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{T.financialSummary}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Loading financial data...
          </p>
        </CardContent>
      </Card>
    );
  }

  const { revenue, costs, profit } = viewSummary;

  const resolvedLocale = locale || (currency === 'VND' ? 'vi-VN' : 'en-US');
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(resolvedLocale, { 
      style: 'currency', 
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);

  return (
    <TooltipProvider>
      <Card className="bg-gradient-to-br from-background to-muted/30 border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            {T.financialSummary}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          {/* Elegant Period Selector */}
          <div className="lg:col-span-3 mb-4">
            <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">{T.period}</span>
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
                        {p === 'all' ? (T.sinceBeginning || T.allTime) : p === 'week' ? T.week : p === 'month' ? T.month : T.year}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {period !== 'all' && (
                  <div className="flex items-center gap-2">
                    {period === 'week' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{T.weekOf}:</span>
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
                        <span className="text-xs text-muted-foreground">{T.month}:</span>
                        {/* Year Select for month period */}
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
                        {/* Month Select */}
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
                        <span className="text-xs text-muted-foreground">{T.year}:</span>
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
        
        <div 
          className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800 cursor-pointer hover:shadow-lg transition-shadow group"
          onClick={() => handleCardClick('revenue')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">{T.revenue}</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-green-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {'Chỉ tính doanh thu từ quotes có trạng thái "Đã thanh toán"'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0" />
              <Eye className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-green-800 dark:text-green-200 break-all">{formatCurrency(revenue)}</h3>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">{T.totalIncomeFromTasks}</p>
        </div>
        
        <div 
          className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800 cursor-pointer hover:shadow-lg transition-shadow group"
          onClick={() => handleCardClick('costs')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{T.costs}</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-red-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {'Chỉ tính chi phí cộng tác viên và chi tiêu có trạng thái "Đã thanh toán"'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600 flex-shrink-0" />
              <Eye className="w-4 h-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-red-800 dark:text-red-200 break-all">{formatCurrency(costs)}</h3>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">{T.collaboratorsAndExpenses}</p>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{T.profit}</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-blue-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {'Lợi nhuận = Doanh thu đã nhận - Chi phí đã thanh toán'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-blue-800 dark:text-blue-200 break-all">{formatCurrency(profit)}</h3>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">{T.netRevenueAfterCosts}</p>
        </div>
        </CardContent>

      {/* Additional Financial Metrics */}
  {viewAdditionalFinancials && (
        <CardContent className="pt-0">
          <div className="grid gap-3 grid-cols-1 lg:grid-cols-3 mt-4 pt-4 border-t">
            <div 
              className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800 cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => handleCardClick('future-revenue')}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">{T.futureRevenue || 'Future Revenue'}</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 text-yellow-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {'Doanh thu tương lai = Tổng giá trị quotes có trạng thái "Chưa thanh toán"'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <Eye className="w-3 h-3 text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <h4 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 break-all">{formatCurrency(viewAdditionalFinancials.futureRevenue)}</h4>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">{T.scheduledPayments || 'Scheduled payments'}</p>
            </div>
            
            <div 
              className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800 cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => handleCardClick('lost-revenue')}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">{T.lostRevenue || 'Lost Revenue'}</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 text-orange-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {'Doanh thu mất = Tổng giá trị quotes có trạng thái "On-hold"'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  <Eye className="w-3 h-3 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <h4 className="text-lg font-bold text-orange-800 dark:text-orange-200 break-all">{formatCurrency(viewAdditionalFinancials.lostRevenue)}</h4>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">{T.onHoldTasks || 'On-hold tasks'}</p>
            </div>

            {/* Fixed Costs Card */}
            <div 
              className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800 cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => handleCardClick('fixed-costs')}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Fixed Costs</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 text-purple-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {'Chi phí cố định được tính theo thời gian đã chọn'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <Eye className="w-3 h-3 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <h4 className="text-lg font-bold text-purple-800 dark:text-purple-200 break-all">{formatCurrency(totalFixedCosts)}</h4>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">For selected period</p>
            </div>
          </div>
        </CardContent>
      )}

      {/* Dialog for viewing details */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogType === 'revenue' && <DollarSign className="w-5 h-5 text-green-600" />}
              {dialogType === 'costs' && <TrendingDown className="w-5 h-5 text-red-600" />}
              {dialogType === 'future-revenue' && <DollarSign className="w-5 h-5 text-yellow-600" />}
              {dialogType === 'lost-revenue' && <TrendingDown className="w-5 h-5 text-orange-600" />}
              {dialogType === 'fixed-costs' && <Settings className="w-5 h-5 text-purple-600" />}
              {dialogType === 'revenue' && 'Revenue Details'}
              {dialogType === 'costs' && 'Cost Details'}
              {dialogType === 'future-revenue' && (T.futureRevenue || 'Future Revenue')}
              {dialogType === 'lost-revenue' && (T.lostRevenue || 'Lost Revenue')}
              {dialogType === 'fixed-costs' && 'Fixed Costs Management'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {dialogType === 'fixed-costs' ? (
              <>
                {/* Add/Edit Form - Compact Version */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      {editingCost ? 'Edit Fixed Cost' : 'Add New Fixed Cost'}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleAddCost}
                        disabled={!!editingCost}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        New
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label htmlFor="name" className="text-xs">Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Cost name"
                            className="h-8 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="amount" className="text-xs">Amount ({currency}) *</Label>
                          <Input
                            id="amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="0.00"
                            className="h-8 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="frequency" className="text-xs">Frequency</Label>
                          <Select 
                            value={formData.frequency} 
                            onValueChange={(value: any) => setFormData(prev => ({ ...prev, frequency: value }))}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="once">{frequencyLabels.once}</SelectItem>
                              <SelectItem value="weekly">{frequencyLabels.weekly}</SelectItem>
                              <SelectItem value="monthly">{frequencyLabels.monthly}</SelectItem>
                              <SelectItem value="yearly">{frequencyLabels.yearly}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button type="submit" size="sm" className="h-8 w-full">
                            {editingCost ? 'Update' : 'Add'}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="startDate" className="text-xs">Start Date *</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                            className="h-8 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="endDate" className="text-xs">End Date (Optional)</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex items-center pt-5">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="isActive"
                              checked={formData.isActive}
                              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                              className="rounded text-sm"
                              aria-label="Set cost as active"
                            />
                            <Label htmlFor="isActive" className="text-xs">Active</Label>
                          </div>
                        </div>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Summary of All Fixed Costs */}
                {fixedCosts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        Fixed Costs Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Total Per Day</p>
                          <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                            {(() => {
                              const totalDaily = fixedCosts.filter((cost: FixedCost) => cost.isActive).reduce((total: number, cost: FixedCost) => {
                                let dailyRate = 0;
                                switch (cost.frequency) {
                                  case 'once':
                                    dailyRate = 0; // One-time costs don't contribute to daily recurring
                                    break;
                                  case 'weekly':
                                    dailyRate = cost.amount / 7;
                                    break;
                                  case 'monthly':
                                    dailyRate = cost.amount / 30.44;
                                    break;
                                  case 'yearly':
                                    dailyRate = cost.amount / 365.25;
                                    break;
                                }
                                return total + dailyRate;
                              }, 0);
                              return formatCurrency(totalDaily);
                            })()}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-xs text-green-600 dark:text-green-400 mb-1">Total Per Month</p>
                          <p className="text-lg font-bold text-green-800 dark:text-green-200">
                            {(() => {
                              const totalMonthly = fixedCosts.filter((cost: FixedCost) => cost.isActive).reduce((total: number, cost: FixedCost) => {
                                let monthlyRate = 0;
                                switch (cost.frequency) {
                                  case 'once':
                                    monthlyRate = 0; // One-time costs don't contribute to monthly recurring
                                    break;
                                  case 'weekly':
                                    monthlyRate = cost.amount * 4.33;
                                    break;
                                  case 'monthly':
                                    monthlyRate = cost.amount;
                                    break;
                                  case 'yearly':
                                    monthlyRate = cost.amount / 12;
                                    break;
                                }
                                return total + monthlyRate;
                              }, 0);
                              return formatCurrency(totalMonthly);
                            })()}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                          <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Total Per Year</p>
                          <p className="text-lg font-bold text-purple-800 dark:text-purple-200">
                            {(() => {
                              const totalYearly = fixedCosts.filter((cost: FixedCost) => cost.isActive).reduce((total: number, cost: FixedCost) => {
                                let yearlyRate = 0;
                                switch (cost.frequency) {
                                  case 'once':
                                    yearlyRate = 0; // One-time costs don't contribute to yearly recurring
                                    break;
                                  case 'weekly':
                                    yearlyRate = cost.amount * 52.14;
                                    break;
                                  case 'monthly':
                                    yearlyRate = cost.amount * 12;
                                    break;
                                  case 'yearly':
                                    yearlyRate = cost.amount;
                                    break;
                                }
                                return total + yearlyRate;
                              }, 0);
                              return formatCurrency(totalYearly);
                            })()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Fixed Costs Table */}
                {fixedCosts.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Current Fixed Costs ({fixedCosts.length} items)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Name</TableHead>
                            <TableHead className="text-xs">Amount</TableHead>
                            <TableHead className="text-xs">Frequency</TableHead>
                            <TableHead className="text-xs">Start Date</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fixedCosts.map((cost: FixedCost) => (
                            <TableRow key={cost.id}>
                              <TableCell className="font-medium text-sm">{cost.name}</TableCell>
                              <TableCell className="text-sm">{formatCurrency(cost.amount)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {frequencyLabels[cost.frequency as keyof typeof frequencyLabels]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {format(new Date(cost.startDate), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell>
                                <Badge variant={cost.isActive ? 'default' : 'secondary'} className="text-xs">
                                  {cost.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditCost(cost)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteCost(cost.id)}
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No fixed costs added yet</p>
                  </div>
                )}
              </>
            ) : (
              // Existing task details logic
              (dialogType === 'revenue' && viewTaskDetails) ? (
                viewTaskDetails.revenueItems.length > 0 ? (
                  viewTaskDetails.revenueItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors"
                      onClick={() => onTaskClick?.(item.id)}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-green-800 dark:text-green-200">{item.name}</h4>
                        <p className="text-sm text-green-600 dark:text-green-400">{item.clientName}</p>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {formatCurrency(item.amount)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">{T.noRevenueTasksFound || 'No revenue tasks found'}</p>
                )
              ) : (dialogType === 'costs' && viewTaskDetails) ? (
                viewTaskDetails.costItems.length > 0 ? (
                  viewTaskDetails.costItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                      onClick={() => onTaskClick?.(item.id)}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-red-800 dark:text-red-200">{item.name}</h4>
                        <p className="text-sm text-red-600 dark:text-red-400">{item.clientName}</p>
                      </div>
                      <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        {formatCurrency(item.amount)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">{T.noCostTasksFound || 'No cost tasks found'}</p>
                )
              ) : (dialogType === 'future-revenue' && viewAdditionalTaskDetails) ? (
                viewAdditionalTaskDetails.futureRevenueItems.length > 0 ? (
                  viewAdditionalTaskDetails.futureRevenueItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-950/30 transition-colors"
                      onClick={() => onTaskClick?.(item.id)}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-yellow-800 dark:text-yellow-200">{item.name}</h4>
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">{item.clientName}</p>
                        <p className="text-xs text-yellow-500 dark:text-yellow-500 mt-1">Status: {item.status}</p>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        {formatCurrency(item.amount)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">{'No future revenue tasks found'}</p>
                )
              ) : (dialogType === 'lost-revenue' && viewAdditionalTaskDetails) ? (
                viewAdditionalTaskDetails.lostRevenueItems.length > 0 ? (
                  viewAdditionalTaskDetails.lostRevenueItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors"
                      onClick={() => onTaskClick?.(item.id)}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-orange-800 dark:text-orange-200">{item.name}</h4>
                        <p className="text-sm text-orange-600 dark:text-orange-400">{item.clientName}</p>
                        <p className="text-xs text-orange-500 dark:text-orange-500 mt-1">Status: {item.status}</p>
                      </div>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                        {formatCurrency(item.amount)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">{'No lost revenue tasks found'}</p>
                )
              ) : (
                <p className="text-center text-muted-foreground py-8">{T.noDataAvailable || 'No data available'}</p>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
    </TooltipProvider>
  );
}