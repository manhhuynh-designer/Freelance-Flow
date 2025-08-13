"use client";

import React, { useRef, useState, useCallback } from 'react';
import type { Task, Quote, Client, QuoteColumn, QuoteTemplate, Collaborator, AppSettings, Category } from '@/lib/types';
import { EditTaskForm, type TaskFormValues } from '../edit-task-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Expand, Shrink } from "lucide-react";
import { i18n } from "@/lib/i18n";

export interface TaskEditDialogProps {
  task: Task | null;
  quote?: Quote;
  collaboratorQuotes?: Quote[]; // Changed to array
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
  collaboratorQuotes,
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
  const [isDirty, setIsDirty] = useState(false);
  const dirtyCheckRef = React.useRef<() => boolean>(() => isDirty);
  const externalSubmitRef = useRef<() => void>();
  // When true, we are saving and should bypass the unsaved-changes guard
  const isSavingRef = useRef(false);
  const [pendingClose, setPendingClose] = useState(false);
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);

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
  // Mark we are saving to bypass any close guards
  isSavingRef.current = true;
    onSubmit(values, quoteColumns, collaboratorQuoteColumns, taskId);
    // After save, close this dialog and emit event so parent can open details dialog
    onOpenChange(false);
  // Reset dirty after successful submit
  setIsDirty(false);
    if (typeof window !== 'undefined') {
      try {
        const savedId = taskId || task?.id;
        if (savedId) {
          window.dispatchEvent(new CustomEvent('task:saved', { detail: { taskId: savedId } }));
        }
      } catch {}
    }
  // Clear saving flag on next tick
  setTimeout(() => { isSavingRef.current = false; }, 0);
  };

  const T = (i18n as any)[settings.language] || i18n.en;

  const isCreate = !task;
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      // If closing due to save, bypass guard
      if (isSavingRef.current) {
        onOpenChange(open);
        return;
      }
      // Attempt to close; if dirty, show confirmation dialog
      const dirty = dirtyCheckRef.current ? dirtyCheckRef.current() : isDirty;
      if (dirty) {
        setIsConfirmCloseOpen(true);
        return; // Don't close yet
      }
    }
    onOpenChange(open);
  }, [isDirty, onOpenChange]);

  const handleConfirmSave = () => {
    // Trigger external submit
  isSavingRef.current = true;
    externalSubmitRef.current?.();
    setIsConfirmCloseOpen(false);
    // Dialog will close after submit completes
  };

  const handleConfirmCloseNoSave = () => {
    setIsDirty(false);
    setIsConfirmCloseOpen(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        onInteractOutside={(e) => {
          // Prevent closing via outside click when dirty; show confirm dialog instead
          if (isSavingRef.current) return;
          const dirty = dirtyCheckRef.current ? dirtyCheckRef.current() : isDirty;
          if (dirty) {
            e.preventDefault();
            setIsConfirmCloseOpen(true);
          }
        }}
        onPointerDownOutside={(e) => {
          if (isSavingRef.current) return;
          const dirty = dirtyCheckRef.current ? dirtyCheckRef.current() : isDirty;
          if (dirty) {
            e.preventDefault();
            setIsConfirmCloseOpen(true);
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isSavingRef.current) return;
          const dirty = dirtyCheckRef.current ? dirtyCheckRef.current() : isDirty;
          if (dirty) {
            e.preventDefault();
            setIsConfirmCloseOpen(true);
          }
        }}
        className={cn(
        "max-h-[90vh] overflow-y-auto",
        {
          'sm:max-w-2xl md:max-w-5xl': editDialogSize === 'default',
          'sm:max-w-4xl md:max-w-7xl': editDialogSize === 'large',
          'w-screen h-screen max-w-none max-h-none rounded-none border-0': editDialogSize === 'fullscreen',
        }
      )}
      >
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
            setOpen={handleOpenChange} 
            taskToEdit={task} 
            onSubmit={handleTaskFormSubmit} 
            quote={quote} 
            collaboratorQuotes={collaboratorQuotes} 
            clients={clients} 
            onAddClient={onAddClient || (() => ({ id: '', name: '', email: [], phone: [] } as unknown as Client))} 
            quoteTemplates={quoteTemplates} 
            collaborators={collaborators} 
            settings={settings}
            categories={categories}
            defaultDate={defaultDate}
            onDirtyChange={setIsDirty}
            onRegisterDirtyCheck={(fn) => { dirtyCheckRef.current = fn; }}
            onRegisterExternalSubmit={(fn) => { externalSubmitRef.current = fn; }}
          />
        </div>
      </DialogContent>

      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={isConfirmCloseOpen} onOpenChange={setIsConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{T.unsavedConfirmTitle || "Confirm Close"}</AlertDialogTitle>
            <AlertDialogDescription>
              {T.unsavedConfirmDescription || "You have unsaved changes. What would you like to do?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmCloseOpen(false)}>
              {T.unsavedCancel || T.cancel || "Cancel"}
            </AlertDialogCancel>
            <Button variant="outline" onClick={handleConfirmSave}>
              {T.unsavedSave || T.save || "Save"}
            </Button>
            <Button variant="destructive" onClick={handleConfirmCloseNoSave}>
              {T.unsavedCloseWithoutSaving || T.closeWithoutSaving || "Close Without Saving"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
