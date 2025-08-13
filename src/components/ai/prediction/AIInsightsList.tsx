"use client";
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, Zap, Clock, AlertTriangle, Scale } from 'lucide-react';
import type { StructuredInsight } from './types';

const insightMeta = {
  'Time Management': { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  'Task Prioritization': { icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  'Workload Balance': { icon: Scale, color: 'text-green-500', bg: 'bg-green-500/10' },
  'Productivity Habit': { icon: Lightbulb, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  'Risk': { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' }
};

const severityMeta = {
  low: 'border-l-transparent',
  medium: 'border-l-yellow-400',
  high: 'border-l-orange-500',
  critical: 'border-l-red-600'
};

interface AIInsightsListProps { insights: StructuredInsight[]; }

export function AIInsightsList({ insights }: AIInsightsListProps) {
  if (!insights || insights.length === 0) return null;
  return (
    <div className="space-y-4">
      {insights.map((item, index) => {
        const meta = (insightMeta as any)[item.category] || insightMeta['Productivity Habit'];
        const severityClass = (severityMeta as any)[item.severity] || severityMeta.low;
        const Icon = meta.icon;
        return (
          <Card key={index} className={`border-l-4 ${severityClass}`}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${meta.color}`} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{item.category}</p>
                  <p className="text-sm leading-relaxed">{item.insight}</p>
                  <p className="text-xs text-muted-foreground pt-1">{item.suggestion}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
