"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useDashboard } from '@/contexts/dashboard-context';
import { i18n } from '@/lib/i18n';

// Assuming the breakdown data looks like this, per the spec
interface BreakdownItem {
  name: string;
  value: number;
}

interface RevenueBreakdownCardProps {
  breakdown: BreakdownItem[] | null;
}

export function RevenueBreakdownCard({ breakdown }: RevenueBreakdownCardProps) {
  const { appData } = useDashboard();
  const T = i18n[appData?.appSettings?.language || 'en'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{T.revenueBreakdown}</CardTitle>
        <CardDescription>{T.revenueDistributionByClient}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[300px] flex items-center justify-center bg-secondary/30 rounded-lg">
            {breakdown ? (
               // In a real implementation, a chart component like Recharts would go here.
              <p className="text-sm text-muted-foreground">{T.chartPlaceholder}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{T.noBreakdownDataAvailable}</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
}