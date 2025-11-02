'use client';

import React, { useState } from 'react';
import { Table, CalendarDays, LayoutGrid, Columns3, LineChart, ChevronDown, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type ViewMode = 'table' | 'calendar' | 'gantt' | 'eisenhower' | 'kanban' | 'pert';

interface ViewModeToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  T: any; // Translation object
  className?: string;
}

export function ViewModeToggle({ 
  currentMode, 
  onModeChange,
  T,
  className 
}: ViewModeToggleProps) {
  const [open, setOpen] = useState(false);

  const options: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
    { value: 'table', label: T.tableView, icon: <Table className="h-4 w-4" /> },
    { value: 'calendar', label: T.calendarView, icon: <CalendarDays className="h-4 w-4" /> },
    { value: 'gantt', label: T.ganttView, icon: <LineChart className="h-4 w-4" /> },
    { value: 'eisenhower', label: T.eisenhowerView, icon: <LayoutGrid className="h-4 w-4" /> },
    { value: 'kanban', label: T.kanbanView, icon: <Columns3 className="h-4 w-4" /> },
    { value: 'pert', label: T.pertView, icon: <GitBranch className="h-4 w-4" /> },
  ];
  
  const selectedOption = options.find(opt => opt.value === currentMode);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("min-w-[180px] h-10 justify-between px-3", className)}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedOption?.icon}
            <span className="truncate">{selectedOption?.label}</span>
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-1">
        {options.map(opt => (
          <Button
            key={opt.value}
            variant={currentMode === opt.value ? 'secondary' : 'ghost'}
            onClick={() => {
              onModeChange(opt.value);
              setOpen(false);
            }}
            className="w-full justify-start gap-2 h-8 text-sm"
          >
            {opt.icon}
            <span className="truncate">{opt.label}</span>
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
