"use client";

import React, { useState } from 'react';
import type { Task, Quote, Client, QuoteColumn, QuoteTemplate, Collaborator, AppSettings, Category } from '@/lib/types';
import { EditTaskForm, type TaskFormValues } from '../edit-task-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Expand, Shrink } from "lucide-react";
import { i18n } from "@/lib/i18n";

export interface TaskEditDialogProps {
  task: Task | null;
  quote?: Quote;
  collaboratorQuote?: Quote;
  clients: Client[];
  collaborators: Collaborator[];
  categories: Category[];
  quoteTemplates: QuoteTemplate[];
  settings: AppSettings;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    values: TaskFormValues, 
    quoteColumns: QuoteColumn[],
    collaboratorQuoteColumns: QuoteColumn[],
    taskId: string
  ) => void;
  onAddClient?: (data: Omit<Client, 'id'>) => Client;
  defaultDate?: Date | null;
}

export function TaskEditDialog({ 
  task, 
  quote,
  collaboratorQuote,
  clients,
  collaborators,
  categories,
  quoteTemplates,
  settings,
  isOpen, 
  onOpenChange, 
  onSubmit,
  onAddClient,
  defaultDate
}: TaskEditDialogProps) {
  const [editDialogSize, setEditDialogSize] = useState<'default' | 'large' | 'fullscreen'>('default');

  const cycleEditDialogSize = () => {
    setEditDialogSize(current => {
      if (current === 'default') return 'large';
      if (current === 'large') return 'fullscreen';
      return 'default';
    });
  };

  const handleTaskFormSubmit = (
    values: TaskFormValues, 
    quoteColumns: QuoteColumn[], 
    collaboratorQuoteColumns: QuoteColumn[],
    taskId: string
  ) => {
    onSubmit(values, quoteColumns, collaboratorQuoteColumns, taskId);
    onOpenChange(false);
  };

  const T = (i18n as any)[settings.language] || i18n.en;

  const isCreate = !task;
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-h-[90vh] overflow-y-auto",
        {
          'sm:max-w-2xl md:max-w-5xl': editDialogSize === 'default',
          'sm:max-w-4xl md:max-w-7xl': editDialogSize === 'large',
          'w-screen h-screen max-w-none max-h-none rounded-none border-0': editDialogSize === 'fullscreen',
        }
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-4 h-6 w-6"
          onClick={cycleEditDialogSize}
        >
          {editDialogSize === 'fullscreen' ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          <span className="sr-only">Toggle dialog size</span>
        </Button>
        <DialogHeader className="text-center pt-6 sm:px-10">
          <DialogTitle>{isCreate ? T.createTask : T.editTask}</DialogTitle>
          <DialogDescription>{isCreate ? T.createTaskDesc || 'Create a new task below.' : (T.saveChanges + ' for your task below.')}</DialogDescription>
        </DialogHeader>
        <div className="p-1">
          <EditTaskForm 
            key={task ? task.id : `create-${defaultDate?.toISOString?.() || 'no-date'}`}
            setOpen={onOpenChange} 
            taskToEdit={task} 
            onSubmit={handleTaskFormSubmit} 
            quote={quote} 
            collaboratorQuote={collaboratorQuote} 
            clients={clients} 
            onAddClient={onAddClient || (() => ({ id: '', name: '', email: '', phone: '' } as Client))} 
            quoteTemplates={quoteTemplates} 
            collaborators={collaborators} 
            settings={settings}
            categories={categories}
            defaultDate={defaultDate}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
