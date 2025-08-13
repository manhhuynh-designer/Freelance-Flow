/**
 * Analytics Navigation Integration - Phase 4.4
 * Integration component to add analytics to existing dashboard
 */

"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  Brain, 
  Target, 
  TrendingUp, 
  Zap,
  Calendar,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AnalyticsNavigationProps {
  userId: string;
  hasNewInsights?: boolean;
  className?: string;
}

export function AnalyticsNavigation({ 
  userId, 
  hasNewInsights = false,
  className = ""
}: AnalyticsNavigationProps) {
  const pathname = usePathname();

  const analyticsNavItems = [
    {
      name: 'Overview',
      href: '/dashboard/analytics',
      icon: BarChart3,
      description: 'Personal analytics dashboard',
      isActive: pathname === '/dashboard/analytics'
    },
    {
      name: 'Productivity',
      href: '/dashboard/analytics/productivity',
      icon: TrendingUp,
      description: 'Productivity trends and analysis',
      isActive: pathname === '/dashboard/analytics/productivity'
    },
    {
      name: 'Energy',
      href: '/dashboard/analytics/energy',
      icon: Zap,
      description: 'Energy levels and optimization',
      isActive: pathname === '/dashboard/analytics/energy'
    },
    {
      name: 'Habits',
      href: '/dashboard/analytics/habits',
      icon: Target,
      description: 'Habit analysis and recommendations',
      isActive: pathname === '/dashboard/analytics/habits'
    },
    {
      name: 'Insights',
      href: '/dashboard/analytics/insights',
      icon: Brain,
      description: 'AI-generated insights and reports',
      isActive: pathname === '/dashboard/analytics/insights',
      hasNotification: hasNewInsights
    }
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
          Analytics
        </h2>
        <div className="space-y-1">
          {analyticsNavItems.map((item) => (
            <Link key={item.name} href={item.href}>
              <Button
                variant={item.isActive ? "secondary" : "ghost"}
                className="w-full justify-start relative"
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
                {item.hasNotification && (
                  <Badge className="ml-auto h-5 w-5 p-0 text-xs">
                    !
                  </Badge>
                )}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Analytics Quick Actions - For main dashboard
 */
export function AnalyticsQuickActions({ userId }: { userId: string }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <Link href="/dashboard/analytics">
        <Button variant="outline" size="sm" className="w-full">
          <BarChart3 className="h-4 w-4 mr-2" />
          View Analytics
        </Button>
      </Link>
      <Link href="/dashboard/analytics/insights">
        <Button variant="outline" size="sm" className="w-full">
          <Brain className="h-4 w-4 mr-2" />
          Daily Insights
        </Button>
      </Link>
      <Link href="/dashboard/analytics/habits">
        <Button variant="outline" size="sm" className="w-full">
          <Target className="h-4 w-4 mr-2" />
          Habits
        </Button>
      </Link>
      <Button variant="outline" size="sm" className="w-full" disabled>
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Button>
    </div>
  );
}

/**
 * Analytics Header - For analytics pages
 */
export function AnalyticsHeader({ 
  title, 
  description,
  actions 
}: { 
  title: string; 
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export default AnalyticsNavigation;
