'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, CalendarDays, LayoutGrid, Columns3 } from 'lucide-react'; // Import Columns3 icon for Kanban
import { cn } from '@/lib/utils';
import { useDashboard } from '@/contexts/dashboard-context';
import { i18n } from '@/lib/i18n';

type ViewMode = 'table' | 'calendar' | 'eisenhower' | 'kanban'; // Add 'kanban' to ViewMode type

interface ViewModeToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewModeToggle({ 
  currentMode, 
  onModeChange, 
  className 
}: ViewModeToggleProps) {
  const dashboardContext = useDashboard();
  const T = dashboardContext ? i18n[dashboardContext.language] : i18n.en;

  return (
    <div className={cn(
      "grid grid-cols-2 gap-1 bg-muted/50 dark:bg-muted/30 rounded-lg p-1 border border-border/50",
      "transition-colors duration-200",
      className
    )}>
      <Button
        variant={currentMode === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('table')}
        className={cn(
          "h-8 px-3 text-xs transition-all duration-200 border-0",
          "focus:ring-2 focus:ring-ring focus:ring-offset-1",
          currentMode === 'table' 
            ? "bg-background text-foreground shadow-sm hover:bg-background/90" 
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <Table className="h-3 w-3 mr-1.5" />
        <span className="hidden sm:inline">{T.tableView}</span>
      </Button>
      <Button
        variant={currentMode === 'calendar' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('calendar')}
        className={cn(
          "h-8 px-3 text-xs transition-all duration-200 border-0",
          "focus:ring-2 focus:ring-ring focus:ring-offset-1",
          currentMode === 'calendar' 
            ? "bg-background text-foreground shadow-sm hover:bg-background/90" 
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <CalendarDays className="h-3 w-3 mr-1.5" />
        <span className="hidden sm:inline">{T.calendarView}</span>
      </Button>
      <Button
        variant={currentMode === 'eisenhower' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('eisenhower')}
        className={cn(
          "h-8 px-3 text-xs transition-all duration-200 border-0",
          "focus:ring-2 focus:ring-ring focus:ring-offset-1",
          currentMode === 'eisenhower' 
            ? "bg-background text-foreground shadow-sm hover:bg-background/90" 
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <LayoutGrid className="h-3 w-3 mr-1.5" />
        <span className="hidden sm:inline">{T.eisenhowerView}</span>
      </Button>
      <Button
        variant={currentMode === 'kanban' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('kanban')}
        className={cn(
          "h-8 px-3 text-xs transition-all duration-200 border-0",
          "focus:ring-2 focus:ring-ring focus:ring-offset-1",
          currentMode === 'kanban' 
            ? "bg-background text-foreground shadow-sm hover:bg-background/90" 
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <Columns3 className="h-3 w-3 mr-1.5" />
        <span className="hidden sm:inline">{T.kanbanView}</span>
      </Button>
    </div>
  );
}
