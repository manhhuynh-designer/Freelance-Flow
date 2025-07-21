"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { Task } from '@/lib/types';
import { CompactTaskCard } from './CompactTaskCard';
import { EisenhowerQuadrantType } from './EisenhowerView';
import { i18n } from '@/lib/i18n';
import styles from './EisenhowerQuadrant.module.css';
import { useDashboard } from '@/contexts/dashboard-context';

interface EisenhowerQuadrantProps {
  id: EisenhowerQuadrantType | 'uncategorized';
  title: string;
  description: string;
  tasks: Task[];
  onClearQuadrant: (taskId: string) => void;
  className?: string;
}

export function EisenhowerQuadrant({ id, title, description, tasks, onClearQuadrant, className }: EisenhowerQuadrantProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: {
      type: 'quadrant',
      accepts: ['task'],
      id: id
    }
  });

  const dashboardContext = useDashboard();
  const T = dashboardContext ? i18n[dashboardContext.language] : i18n.en;
  
  return (
    <TooltipProvider>
      <Card className={`flex flex-col h-full transition-all duration-200 relative rounded-none ${className} ${isOver ? 'ring-2 ring-primary ring-offset-1' : ''}`}>
        <CardHeader className="pb-3 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-foreground">{title}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded-full">
                {tasks.length}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>{description}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden p-1" ref={setNodeRef}>
        {/* Invisible large drop zone overlay for better drop detection */}
        <div className={`absolute inset-0 z-0 ${isOver ? 'bg-primary/5' : ''}`} />
        
        <SortableContext items={tasks.map(task => task.id)} strategy={rectSortingStrategy}>
          <div className={`${styles.dropZone} relative h-full transition-all duration-200 rounded-lg z-10`}>
            {tasks.length === 0 ? (
              <div className={`${styles.emptyDropZone} text-muted-foreground text-center py-8 px-4 rounded-lg border-2 border-dashed transition-all duration-200 h-full flex items-center justify-center ${isOver ? 'border-primary bg-primary/10 text-primary' : 'border-muted-foreground/20'}`}>
                <div className="flex flex-col items-center gap-2">
                                  <p className="text-sm font-medium">{T.eisenhower.dragTaskHere}</p>
               
                </div>
              </div>
            ) : (
              <div className={`flex flex-col flex-1 h-full min-h-[120px] max-h-full p-2 ${isOver ? 'bg-primary/5 rounded-lg border-2 border-dashed border-primary' : ''}`}
              >
                <div className={'flex-1 flex flex-col min-h-0 h-full'}>
                  <div className={`flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto min-h-0`}>
                    {tasks.map(task => (
                      <div key={task.id} className="w-full p-2">
                        <CompactTaskCard 
                          task={task} 
                          onClearQuadrant={onClearQuadrant} 
                          variant="matrix" 
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Ghost drop zones for better detection */}
                <div className={`w-full h-2 ${isOver ? 'border-2 border-dashed border-primary/50 rounded-lg bg-primary/5' : ''}`} />
              </div>
            )}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}