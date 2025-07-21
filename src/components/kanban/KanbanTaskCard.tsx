"use client";
// Mapping text mức độ ưu tiên Eisenhower cho tooltip
const eisenhowerTooltip: Record<string, string> = {
  do: 'Ưu tiên cao (Do)',
  decide: 'Quan trọng (Decide)',
  delegate: 'Ủy quyền (Delegate)',
  delete: 'Không quan trọng (Delete)',
  none: 'Không ưu tiên',
};


import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Task, Category, Client } from '@/lib/types';
import { format, isPast, isToday, isTomorrow } from 'date-fns'; // Import date-fns functions
import { Badge } from '@/components/ui/badge';
import { useDashboard } from '@/contexts/dashboard-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TaskDetailsDialog } from '@/components/task-dialogs/TaskDetailsDialog';
import { Pencil, Trash2, Flag, FlagOff } from 'lucide-react';
  // Eisenhower flag color logic giống Table view
  const eisenhowerSchemes = {
    colorScheme1: {
      do: '#ef4444',
      decide: '#3b82f6',
      delegate: '#f59e42',
      delete: '#6b7280',
    },
    colorScheme2: {
      do: '#d8b4fe',
      decide: '#bbf7d0',
      delegate: '#fed7aa',
      delete: '#bfdbfe',
    },
    colorScheme3: {
      do: '#99f6e4',
      decide: '#fbcfe8',
      delegate: '#fde68a',
      delete: '#c7d2fe',
    },
  };

  // Đặt scheme và getFlagColor vào trong component để dùng appSettings từ dashboardContext

import { Button, buttonVariants } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { i18n } from '@/lib/i18n';
import { EditTaskForm, TaskFormValues } from '../edit-task-form';
import { TaskEditDialog } from '@/components/task-dialogs/TaskEditDialog';


interface KanbanTaskCardProps {
  task: Task;
}


export function KanbanTaskCard({ task }: KanbanTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const dashboardContext = useDashboard();
  if (!dashboardContext) return null;

  const { 
    clients, 
    categories, 
    quotes, 
    collaboratorQuotes, 
    appSettings, 
    handleDeleteTask,
    handleEditTask,
    handleAddClientAndSelect, // Corrected from onAddClient
    quoteTemplates,
  } = dashboardContext;

  const scheme = appSettings?.eisenhowerColorScheme || 'colorScheme1';
  type EisenhowerQuadrant = 'do' | 'decide' | 'delegate' | 'delete';

  function getFlagColor(quadrant?: EisenhowerQuadrant) {
    if (!quadrant) return '#e5e7eb';
    const flagColors = eisenhowerSchemes[scheme] || eisenhowerSchemes['colorScheme1'];
    return flagColors[quadrant] || '#e5e7eb';
  }

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const T = i18n[appSettings.language];

  const category = categories.find(c => c.id === task.categoryId);
  const client = clients.find(c => c.id === task.clientId);
  const quote = quotes.find(q => q.id === task.quoteId);
  const taskCollaboratorQuotes = collaboratorQuotes.filter(cq => task.collaboratorQuotes?.some(tcq => tcq.quoteId === cq.id));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isValidDeadline = task.deadline && !isNaN(new Date(task.deadline).getTime());
  const deadlineDate = isValidDeadline ? new Date(task.deadline) : null;

  const getDeadlineColor = () => {
    if (!deadlineDate) return '';
    if (isPast(deadlineDate) && !isToday(deadlineDate)) return 'text-red-500 font-bold'; // Quá hạn
    if (isToday(deadlineDate)) return 'text-orange-500 font-bold'; // Hôm nay
    if (isTomorrow(deadlineDate)) return 'text-yellow-500'; // Ngày mai
    return ''; // Mặc định
  };

  const handleEditClick = () => {
    setIsDetailsOpen(false);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = () => {
    setIsDetailsOpen(false);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    handleDeleteTask(task.id);
    setIsDeleteDialogOpen(false);
  };

  const handleEditFormSubmit = (values: TaskFormValues, quoteCols: any[], collabQuoteCols: any[], taskId: string) => {
    handleEditTask(values, quoteCols, collabQuoteCols, taskId);
    setIsEditDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogTrigger asChild>
          <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-2">
            <div className="relative">
              {/* Flag icon ưu tiên + tooltip tách khỏi Card để không bị overflow-hidden */}
              <div className="absolute left-2 top-2 z-20 group">
                {task.eisenhowerQuadrant ? (
                  <>
                    <Flag size={16} color={getFlagColor(task.eisenhowerQuadrant)} fill={getFlagColor(task.eisenhowerQuadrant)} className="drop-shadow" />
                    <span className="pointer-events-none fixed z-50 left-auto ml-2 mt-1 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      style={{ minWidth: 120 }}
                    >
                      {eisenhowerTooltip[task.eisenhowerQuadrant] || eisenhowerTooltip.none}
                    </span>
                  </>
                ) : (
                  <>
                    <FlagOff size={16} color="#e5e7eb" className="drop-shadow" />
                    <span className="pointer-events-none fixed z-50 left-auto ml-2 mt-1 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      style={{ minWidth: 120 }}
                    >
                      {eisenhowerTooltip.none}
                    </span>
                  </>
                )}
              </div>
              <Card className="p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative w-full max-w-full overflow-hidden">
                <p className="font-semibold text-sm mb-2 pl-6 break-words">{task.name}</p>
                <div className="flex flex-wrap gap-2 text-xs overflow-hidden">
                  {category && <Badge variant="secondary" className="shrink-0">{category.name}</Badge>}
                  {client && <Badge variant="outline" className="shrink-0">{client.name}</Badge>}
                </div>
                {isValidDeadline && (
                  <p className={cn("text-xs text-muted-foreground mt-2", getDeadlineColor())}>
                    {format(deadlineDate!, "MMM dd, yyyy")}
                  </p>
                )}
              </Card>
            </div>
          </div>
        </DialogTrigger>
        <TaskDetailsDialog
          task={task}
          client={client}
          clients={clients}
          collaborators={dashboardContext.collaborators}
          categories={categories}
          quote={quote}
          collaboratorQuotes={taskCollaboratorQuotes}
          settings={appSettings}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
        />
      </Dialog>

      {/* Edit Dialog - dùng TaskEditDialog chuẩn */}
      <TaskEditDialog
        task={task}
        quote={quote}
        collaboratorQuotes={taskCollaboratorQuotes}
        clients={clients}
        collaborators={dashboardContext.collaborators}
        categories={categories}
        quoteTemplates={quoteTemplates}
        settings={appSettings}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleEditTask}
        onAddClient={handleAddClientAndSelect}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{T.moveToTrash}?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            {T.moveToTrashDescription}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{T.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={confirmDelete}
            >
              {T.confirmMoveToTrash}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}