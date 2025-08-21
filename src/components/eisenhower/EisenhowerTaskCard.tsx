"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Task } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { getStatusInfo } from '@/lib/utils'; // Assuming this utility exists
import { useDashboard } from '@/contexts/dashboard-context';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, FlagOff } from 'lucide-react'; // Icons for menu
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, isValid } from 'date-fns';
import { vi, enUS } from 'date-fns/locale'; // Import locales

interface EisenhowerTaskCardProps {
  task: Task;
  onClearQuadrant: (taskId: string) => void;
}

export function EisenhowerTaskCard({ task, onClearQuadrant }: EisenhowerTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const dashboard = useDashboard();
  if (!dashboard) return null;
  
  const { appSettings } = dashboard;
  const settings = appSettings;
  const language = appSettings.language;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStatusDotColor = () => {
    const statusColors = settings.statusColors;
    return statusColors[task.status] || '#64748b';
  };

  const locale = language === 'vi' ? vi : enUS;
  const toDate = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return isValid(value) ? value : null;
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value as any);
      return isValid(d) ? d : null;
    }
    return null;
  };
  const deadlineDate = toDate((task as any).deadline);
  const deadlineLabel = deadlineDate ? format(deadlineDate, 'dd/MM', { locale }) : '--';

  return (
    <Card 
      ref={setNodeRef} 
      style={{
        ...style,
        borderLeftColor: getStatusDotColor(),
      }}
      {...attributes} 
      {...listeners}
      className="cursor-move transition-all duration-200 border-l-4 mx-2 mb-2 p-2"
    >
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-2 ">
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-medium truncate leading-tight">{task.name}</h4>
            <div className="flex items-center gap-1 mt-1">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0" 
                style={{ backgroundColor: getStatusDotColor() }}
              />
              <span className="text-xs text-muted-foreground truncate">
                {deadlineLabel}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-60 hover:opacity-100">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onClearQuadrant(task.id)}>
                <FlagOff className="mr-2 h-3 w-3" />
                Xóa phân loại
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}