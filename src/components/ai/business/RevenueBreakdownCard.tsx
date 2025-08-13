"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Assuming the breakdown data looks like this, per the spec
interface BreakdownItem {
  name: string;
  value: number;
}

interface RevenueBreakdownCardProps {
  breakdown: BreakdownItem[] | null;
}

export function RevenueBreakdownCard({ breakdown }: RevenueBreakdownCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Breakdown</CardTitle>
        <CardDescription>Revenue distribution by client</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[300px] flex items-center justify-center bg-secondary/30 rounded-lg">
            {breakdown ? (
               // In a real implementation, a chart component like Recharts would go here.
              <p className="text-sm text-muted-foreground">Chart Placeholder</p>
            ) : (
              <p className="text-sm text-muted-foreground">No breakdown data available.</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
}