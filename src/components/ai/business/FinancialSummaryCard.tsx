"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

interface FinancialSummaryCardProps {
  summary: {
    revenue: number;
    costs: number;
    profit: number;
  } | null;
}

export function FinancialSummaryCard({ summary }: FinancialSummaryCardProps) {
  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Loading financial data...
          </p>
        </CardContent>
      </Card>
    );
  }

  const { revenue, costs, profit } = summary;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 grid-cols-3">
        <div className="flex flex-col items-start gap-1">
          <p className="text-xs text-muted-foreground">Revenue</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold">{formatCurrency(revenue)}</h3>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
        </div>
        <div className="flex flex-col items-start gap-1">
          <p className="text-xs text-muted-foreground">Costs</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold">{formatCurrency(costs)}</h3>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
        </div>
        <div className="flex flex-col items-start gap-1">
          <p className="text-xs text-muted-foreground">Profit</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold">{formatCurrency(profit)}</h3>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}