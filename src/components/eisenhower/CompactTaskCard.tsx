"use client";

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import type { Task, AppSettings, Client, Collaborator, Category, Quote, QuoteTemplate } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, FlagOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, isValid } from 'date-fns';
import { vi as viLocale, enUS } from 'date-fns/locale';
import { TaskDetailsDialog } from '@/components/task-dialogs/TaskDetailsDialog';
import { TaskEditDialog } from '@/components/task-dialogs/TaskEditDialog';
import styles from './CompactTaskCard.module.css';
import { vi, en } from '@/lib/i18n';

interface CompactTaskCardProps {
  task: Task;
  onClearQuadrant: (taskId: string) => void;
  variant?: 'matrix' | 'uncategorized';
  // Props drilled down (optional for usages that don't provide them)
  settings?: AppSettings;
  clients?: Client[];
  collaborators?: Collaborator[];
  categories?: Category[];
  quoteTemplates?: QuoteTemplate[];
  quotes?: Quote[];
  collaboratorQuotes?: Quote[];
  handleEditTask?: (values: any, quoteColumns: any, collaboratorQuoteColumns: any, taskId: string) => void;
  handleDeleteTask?: (taskId: string) => void;
}

export function CompactTaskCard({ 
    task, 
    onClearQuadrant, 
    variant = 'matrix',
  settings,
  clients = [],
  collaborators = [],
  categories = [],
  quoteTemplates = [],
  quotes = [],
  collaboratorQuotes = [],
  handleEditTask,
  handleDeleteTask,
}: CompactTaskCardProps) {
  const containerId = task.eisenhowerQuadrant || 'uncategorized';
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ 
    id: task.id,
    data: {
      type: 'task',
      task,
      sortable: {
        containerId: containerId,
        index: 0
      }
    }
  });
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const hasQuadrant = Boolean(task.eisenhowerQuadrant);
  
  const handleClearQuadrant = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClearQuadrant(task.id);
  };
  
  const language = settings?.language ?? 'en';
  const T = language === 'vi' ? vi : en;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStatusDotColor = () => {
    const statusColors = settings.statusColors;
    return statusColors[task.status] || '#64748b';
  };

  const locale = language === 'vi' ? viLocale : enUS;

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDetailsOpen(true);
  };

  const handleEdit = () => {
    setIsDetailsOpen(false);
    setIsEditDialogOpen(true);
  };

  const taskQuote = quotes.find(q => q.id === task.quoteId);
  const taskCollaboratorQuotes = collaboratorQuotes.filter(q => q.id === (task as any).collaboratorQuoteId);
  const taskClient = clients.find(c => c.id === task.clientId);

  if (variant === 'uncategorized') {
    // Safely compute a deadline label to avoid RangeError from date-fns/format
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
      <>
        <Card 
          key={task.id}
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
                        {T.clearQuadrant}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={styles.statusDot} />
                  <span className="text-xs text-muted-foreground font-medium">
                    {deadlineLabel}
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
          quotes={quotes}
          collaboratorQuotes={taskCollaboratorQuotes}
          settings={settings}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          onEdit={handleEdit}
          onDelete={handleDeleteTask}
        />
        <TaskEditDialog
          task={task}
          quote={taskQuote}
          collaboratorQuotes={taskCollaboratorQuotes}
          clients={clients}
          collaborators={collaborators}
          categories={categories}
          quoteTemplates={quoteTemplates}
          settings={settings}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSubmit={handleEditTask}
        />
      </>
    );
  }

  // Matrix variant (compact for quadrants)
  return (
    <>
      <Card 
        key={task.id}
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
                  {(() => {
                    const toDate = (value: unknown): Date | null => {
                      if (!value) return null;
                      if (value instanceof Date) return isValid(value) ? value : null;
                      if (typeof value === 'string' || typeof value === 'number') {
                        const d = new Date(value as any);
                        return isValid(d) ? d : null;
                      }
                      return null;
                    };
                    const d = toDate((task as any).deadline);
                    return d ? format(d, 'dd/MM', { locale }) : '--';
                  })()}
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
                    {T.clearQuadrant}
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
        quotes={quotes}
        collaboratorQuotes={taskCollaboratorQuotes}
        settings={settings}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onEdit={handleEdit}
        onDelete={handleDeleteTask}
      />
      <TaskEditDialog
        task={task}
        quote={taskQuote}
        collaboratorQuotes={taskCollaboratorQuotes}
        clients={clients}
        collaborators={collaborators}
        categories={categories}
        quoteTemplates={quoteTemplates}
        settings={settings}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleEditTask}
      />
    </>
  );
}
