"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/lib/types';
import { KanbanTaskCard } from './KanbanTaskCard';
import { useDashboard } from '@/contexts/dashboard-context';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  color?: string;
}

// Droppable wrapper component
function Droppable({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ 
    id,
    data: { containerId: id }
  });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`flex-1 transition-colors duration-200 ${
        isOver ? 'bg-primary/10 border-2 border-primary border-dashed rounded-md' : ''
      }`}
    >
      {children}
    </div>
  );
}

export function KanbanColumn({ id, title, tasks, color }: KanbanColumnProps) {
  const dashboardContext = useDashboard();
  const appSettings = dashboardContext?.appSettings;
  
  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({ 
    id,
    data: { type: 'column', containerId: id }
  });
  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: id, 
    data: { type: 'COLUMN', column: { id, label: title } },
    disabled: false // Allow dragging all columns
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!appSettings) return null;

  // Main status columns layout
  return (
    <div 
      ref={setSortableNodeRef}
      style={style}
      className="flex flex-col min-w-[280px] max-w-[350px] w-full bg-card rounded-lg shadow-sm border flex-shrink-0 sm:min-w-[300px] sm:max-w-[380px] overflow-hidden"
      {...attributes}
    >
      {/* Column Header */}
      <div
        className="p-3 font-medium text-sm rounded-t-lg text-white cursor-grab active:cursor-grabbing"
        style={{ backgroundColor: color }}
        {...listeners}
      >
        <div className="flex justify-between items-center">
          <span>{title}</span>
          <span className="bg-white/20 px-2 py-1 rounded text-xs">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <Droppable id={id}>
        <div className="flex-1 p-3 overflow-y-auto overflow-x-hidden min-h-[200px] max-h-[calc(100vh-250px)] space-y-3">
          <SortableContext
            items={tasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map(task => (
              <KanbanTaskCard key={task.id} task={task} />
            ))}
          </SortableContext>
          
          {tasks.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed border-muted-foreground/20 rounded-lg">
              Drop tasks here
            </div>
          )}
        </div>
      </Droppable>
    </div>
  );
}
