'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'table' | 'calendar';

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
  return (
    <div className={cn(
      "flex bg-muted/50 dark:bg-muted/30 rounded-lg p-1 border border-border/50",
      "transition-colors duration-200",
      className
    )}>
      <Button
        variant={currentMode === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('table')}
        className={cn(
          "h-7 px-3 text-xs transition-all duration-200 border-0",
          "focus:ring-2 focus:ring-ring focus:ring-offset-1",
          currentMode === 'table' 
            ? "bg-background text-foreground shadow-sm hover:bg-background/90" 
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <Table className="h-3 w-3 mr-1.5" />
        <span className="hidden sm:inline">Table</span>
      </Button>
      <Button
        variant={currentMode === 'calendar' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('calendar')}
        className={cn(
          "h-7 px-3 text-xs transition-all duration-200 border-0",
          "focus:ring-2 focus:ring-ring focus:ring-offset-1",
          currentMode === 'calendar' 
            ? "bg-background text-foreground shadow-sm hover:bg-background/90" 
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <CalendarDays className="h-3 w-3 mr-1.5" />
        <span className="hidden sm:inline">Calendar</span>
      </Button>
    </div>
  );
}
