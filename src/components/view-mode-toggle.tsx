'use client';


import React from 'react';
import { Table, CalendarDays, LayoutGrid, Columns3, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboard } from '@/contexts/dashboard-context';
import { i18n } from '@/lib/i18n';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

type ViewMode = 'table' | 'calendar' | 'gantt' | 'eisenhower' | 'kanban';

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

  const options: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
    { value: 'table', label: T.tableView, icon: <Table className="h-4 w-4 mr-2" /> },
    { value: 'calendar', label: T.calendarView, icon: <CalendarDays className="h-4 w-4 mr-2" /> },
    { value: 'gantt', label: T.ganttView, icon: <LineChart className="h-4 w-4 mr-2" /> },
    { value: 'eisenhower', label: T.eisenhowerView, icon: <LayoutGrid className="h-4 w-4 mr-2" /> },
    { value: 'kanban', label: T.kanbanView, icon: <Columns3 className="h-4 w-4 mr-2" /> },
  ];

  return (
    <Select value={currentMode} onValueChange={onModeChange}>
      <SelectTrigger className={cn("min-w-[120px] max-w-full h-9", className)}>
        <SelectValue>
          <span className="flex items-center gap-2 pl-1 truncate">
            {options.find(opt => opt.value === currentMode)?.icon}
            <span className="truncate">{options.find(opt => opt.value === currentMode)?.label}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[120px] max-w-[260px] w-auto">
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value} className="flex items-center gap-2 px-2 py-2 truncate">
            <span className="flex items-center gap-2 truncate">
              {opt.icon}
              <span className="truncate">{opt.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
