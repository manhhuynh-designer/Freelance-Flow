"use client";

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Task } from '@/lib/types';
import { useDashboard } from '@/contexts/dashboard-context';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, FlagOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { TaskDetailsDialog } from '@/components/task-dialogs/TaskDetailsDialog';
import styles from './CompactTaskCard.module.css';

interface CompactTaskCardProps {
  task: Task;
  onClearQuadrant: (taskId: string) => void;
  variant?: 'matrix' | 'uncategorized';
}

export function CompactTaskCard({ task, onClearQuadrant, variant = 'matrix' }: CompactTaskCardProps) {
  const containerId = task.eisenhowerQuadrant || 'uncategorized';
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ 
    id: task.id,
    data: {
      type: 'task',
      task,
      sortable: {
        containerId: containerId,
        index: 0 // This will be set by SortableContext
      }
    }
  });
  const dashboard = useDashboard();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Force re-render key to ensure component updates when eisenhowerQuadrant changes
  const hasQuadrant = Boolean(task.eisenhowerQuadrant);
  
  // Debug log to track quadrant state changes
  React.useEffect(() => {
    console.log(`Task ${task.name}: eisenhowerQuadrant = ${task.eisenhowerQuadrant}, hasQuadrant = ${hasQuadrant}, variant = ${variant}`);
    // Force a re-render to ensure dropdown visibility updates
    setForceUpdate(prev => prev + 1);
  }, [task.eisenhowerQuadrant, hasQuadrant, task.name, variant]);

  const handleClearQuadrant = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClearQuadrant(task.id);
  };
  
  if (!dashboard) return null;
  
  const { appSettings, clients, collaborators, categories, quoteTemplates, quotes, collaboratorQuotes, handleEditTask, handleDeleteTask } = dashboard;
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

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDetailsOpen(true);
  };

  const handleEdit = () => {
    setIsDetailsOpen(false);
    // Implement edit logic if needed
  };

  const taskQuote = quotes.find(q => q.id === task.quoteId);
  const taskCollaboratorQuotes = collaboratorQuotes.filter(q => q.id === (task as any).collaboratorQuoteId);
  const taskClient = clients.find(c => c.id === task.clientId);

  if (variant === 'uncategorized') {
    return (
      <>
        <Card 
          key={`${task.id}-${hasQuadrant}-${forceUpdate}`}
          ref={setNodeRef} 
          style={{
            ...style,
            '--status-color': getStatusDotColor(),
          } as React.CSSProperties}
          {...attributes} 
          {...listeners}
          className="cursor-move  transition-all duration-200 w-full bg-card/50 hover:bg-card border border-border/50"
        >
          <CardContent className="p-3" onClick={handleCardClick}>
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium leading-tight line-clamp-2 text-foreground flex-1">{task.name}</h4>
                {hasQuadrant && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 opacity-60 hover:opacity-100 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={handleClearQuadrant} className="text-sm">
                        <FlagOff className="mr-2 h-3 w-3" />
                        Xóa phân loại
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={styles.statusDot} />
                  <span className="text-xs text-muted-foreground font-medium">
                    {format(new Date(task.deadline), 'dd/MM', { locale })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <TaskDetailsDialog
          task={task}
          client={taskClient}
          clients={clients}
          collaborators={collaborators}
          categories={categories}
          quote={taskQuote}
          collaboratorQuotes={taskCollaboratorQuotes}
          settings={settings}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          onEdit={handleEdit}
          onDelete={handleDeleteTask}
        />
      </>
    );
  }

  // Matrix variant (compact for quadrants)
  return (
    <>
      <Card 
        key={`${task.id}-${hasQuadrant}-${forceUpdate}`}
        ref={setNodeRef} 
        style={{
          ...style,
          '--status-color': getStatusDotColor(),
        } as React.CSSProperties}
        {...attributes} 
        {...listeners}
        className={`cursor-move  transition-all duration-200 ${styles.matrixCard}`}
      >
        <CardContent className="p-2" onClick={handleCardClick}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-medium truncate leading-tight">{task.name}</h4>
              <div className="flex items-center gap-1 mt-1">
                <div className={styles.statusDotSmall} />
                <span className="text-xs text-muted-foreground truncate">
                  {format(new Date(task.deadline), 'dd/MM', { locale })}
                </span>
              </div>
            </div>
            {hasQuadrant && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleClearQuadrant}>
                    <FlagOff className="mr-2 h-3 w-3" />
                    Xóa phân loại
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>
      
      <TaskDetailsDialog
        task={task}
        client={taskClient}
        clients={clients}
        collaborators={collaborators}
        categories={categories}
        quote={taskQuote}
        collaboratorQuotes={taskCollaboratorQuotes}
        settings={settings}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onEdit={handleEdit}
        onDelete={handleDeleteTask}
      />
    </>
  );
}
