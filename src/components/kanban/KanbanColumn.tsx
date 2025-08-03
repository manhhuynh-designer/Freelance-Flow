"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, AppSettings, Client, Category, Quote, Collaborator, QuoteTemplate } from '@/lib/types';
import { KanbanTaskCard } from './KanbanTaskCard';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  color?: string;
  // Drilled props
  appSettings: AppSettings;
  clients: Client[];
  categories: Category[];
  quotes: Quote[];
  collaboratorQuotes: Quote[];
  collaborators: Collaborator[];
  quoteTemplates: QuoteTemplate[];
  handleDeleteTask: (taskId: string) => void;
  handleEditTask: (values: any, quoteColumns: any, collaboratorQuoteColumns: any, taskId: string) => void;
  handleAddClientAndSelect: (data: Omit<Client, 'id'>) => Client;
}

function Droppable({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ 
    id: id,
    data: { containerId: id, type: 'column' }
  });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`flex-1 min-h-[400px] h-full transition-colors duration-200 ${
        isOver ? 'bg-primary/5 border-2 border-primary border-dashed rounded-md' : ''
      }`}
    >
      {children}
    </div>
  );
}

export function KanbanColumn({ 
    id, 
    title, 
    tasks, 
    color,
    appSettings,
    ...restOfDrilledProps 
}: KanbanColumnProps) {
  
  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `sortable-${id}`,
    data: { type: 'COLUMN', column: { id, label: title } },
    disabled: false
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setSortableNodeRef}
      style={style}
      className="flex flex-col flex-1 min-w-0 max-w-sm bg-card rounded-lg shadow-sm border h-full max-h-full"
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
        <div className="p-3 h-full overflow-y-auto overflow-x-hidden space-y-3">
          {tasks.length === 0 ? (
            <div className="h-full min-h-[350px] border-2 border-dashed border-muted-foreground/30 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="text-sm font-medium">Drop tasks here</div>
                <div className="text-xs mt-1 opacity-60">Drag any task to this column</div>
              </div>
            </div>
          ) : (
            <SortableContext
              items={tasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {tasks.map(task => (
                <KanbanTaskCard 
                    key={task.id} 
                    task={task} 
                    appSettings={appSettings} 
                    {...restOfDrilledProps}
                />
              ))}
            </SortableContext>
          )}
        </div>
      </Droppable>
    </div>
  );
}
