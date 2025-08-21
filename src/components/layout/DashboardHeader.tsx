"use client";

import React, { Suspense, useState, useRef, useMemo, useEffect } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AddEventButton } from "@/components/event-dialogs/AddEventButton";
import { CreateTaskForm, type CreateTaskFormRef } from "@/components/create-task-form-new";
import { PageTitle } from "@/components/page-title";
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Expand, Shrink, PlusCircle, Download } from "lucide-react";
import { WorkTimeTracker } from '@/components/features/WorkTimeTracker';
import { cn } from "@/lib/utils";
import { i18n } from '@/lib/i18n';

export function DashboardHeader() {
  const { 
    appData, isTaskFormOpen, setIsTaskFormOpen, handleAddTask, 
    handleAddClientAndSelect, cycleTaskFormSize, taskFormSize, 
    handleEventSubmit, backupStatusText, handleExport, handleViewTask,
    defaultExportFormat
  } = useDashboard();
    
  const T = useMemo(() => {
    const lang = appData.appSettings.language as 'en' | 'vi';
        return {
            ...i18n[lang],
            // Back-compat fallbacks; unified keys are unsaved*
            unsavedConfirmTitle: (i18n[lang] as any)?.unsavedConfirmTitle || (i18n[lang] as any)?.confirmClose || "Unsaved changes",
            unsavedConfirmDescription: (i18n[lang] as any)?.unsavedConfirmDescription || (i18n[lang] as any)?.confirmCloseDescription || "You have unsaved changes. What would you like to do?",
            unsavedCancel: (i18n[lang] as any)?.unsavedCancel || (i18n[lang] as any)?.cancel || "Cancel",
            unsavedCloseWithoutSaving: (i18n[lang] as any)?.unsavedCloseWithoutSaving || (i18n[lang] as any)?.closeWithoutSaving || "Close Without Saving",
            saveDraft: (i18n[lang] as any)?.saveDraft || "Save Draft",
        };
  }, [appData.appSettings.language]);

    const [isTaskFormDirty, setIsTaskFormDirty] = useState(false);
    const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
    const createTaskFormRef = useRef<CreateTaskFormRef>(null);

    const [openDetailsAfterCreateId, setOpenDetailsAfterCreateId] = useState<string | null>(null);

    const handleRequestClose = () => {
        if (isTaskFormDirty) {
            setIsConfirmCloseOpen(true);
        } else {
            setIsTaskFormOpen(false);
        }
    };
    
    const handleSubmitSuccess = (newTaskId?: string) => {
        // Close dialog directly without triggering warning logic
        setIsTaskFormOpen(false);
        setIsTaskFormDirty(false);
        // If created via duplicate flow, store id to open details after close
        if (newTaskId) {
          setOpenDetailsAfterCreateId(newTaskId);
        }
    };
    
    const handleConfirmSaveDraft = () => {
        createTaskFormRef.current?.handleSaveDraft();
        setIsConfirmCloseOpen(false);
    };

    const handleConfirmCloseNoSave = () => {
        setIsTaskFormDirty(false);
        setIsConfirmCloseOpen(false);
        setIsTaskFormOpen(false);
    };

  const handleSetOpen = (open: boolean) => {
        if (open) {
            setIsTaskFormOpen(true);
        } else {
            handleRequestClose();
        }
    }

  // Open create form prefilled from a duplicate payload
  useEffect(() => {
    function onDuplicateOpen(e: any) {
      try {
        const payload = e?.detail;
        if (!payload) return;
        setIsTaskFormOpen(true);
        // Mark that next successful create should open details
        setOpenDetailsAfterCreateId('PENDING');
        // Let dialog mount, then prefill
        setTimeout(() => {
          createTaskFormRef.current?.setInitialValues(payload.values || {}, {
            columns: payload.columns,
            collaboratorColumns: payload.collaboratorColumns,
          });
        }, 0);
      } catch (err) {
        console.error('Failed to open duplicate task form:', err);
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('task:duplicateOpen', onDuplicateOpen);
      return () => window.removeEventListener('task:duplicateOpen', onDuplicateOpen);
    }
  }, []);

  // After closing create form, if we have a created task id, open its details
  useEffect(() => {
    if (!isTaskFormOpen && openDetailsAfterCreateId && openDetailsAfterCreateId !== 'PENDING') {
      try {
        // Use dashboard context to open details dialog
        const id = openDetailsAfterCreateId;
        setOpenDetailsAfterCreateId(null);
    // handleViewTask is available from context
    handleViewTask?.(id);
      } catch (e) {
        // Fallback: dispatch an event other parts can listen to
        try { window.dispatchEvent(new CustomEvent('task:view', { detail: { id: openDetailsAfterCreateId } })); } catch {}
        setOpenDetailsAfterCreateId(null);
      }
    }
  }, [isTaskFormOpen, openDetailsAfterCreateId, handleViewTask]);

    return (
        <>
      <header className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3 min-w-0">
                   <SidebarTrigger />
                   <div className="flex flex-col">
                     <h1 className="text-xl font-semibold leading-tight">
                       <Suspense fallback={null}>
                           <PageTitle />
                       </Suspense>
                     </h1>
                     <div className="text-sm text-muted-foreground hidden sm:block">
                       {T.lastBackup}: {backupStatusText}
                     </div>
                   </div>
                </div>
                
                <div className="flex items-center gap-5">
                  {/* Middle cluster: time + segmented actions */}
                  <div className="flex items-center gap-3">
                    <div className="hidden md:block"><WorkTimeTracker /></div>
                    <div className="hidden md:inline-flex items-stretch rounded-2xl overflow-hidden bg-primary text-primary-foreground shadow-sm divide-x divide-primary-foreground/15 border-2">
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AddEventButton variant="segmented" tasks={appData.tasks} onSubmit={handleEventSubmit} />
                          </TooltipTrigger>
                          <TooltipContent><p>Add Event</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Dialog open={isTaskFormOpen} onOpenChange={handleSetOpen}>
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-10 w-12 rounded-none bg-transparent hover:bg-primary/90 text-primary-foreground">
                                  <PlusCircle className="h-5 w-5" />
                                  <span className="sr-only">Add Task</span>
                                </Button>
                              </DialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent><p>Add Task</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <DialogContent 
                          className={cn("max-h-[90vh] overflow-y-auto", {"sm:max-w-2xl md:max-w-5xl":"default"===taskFormSize,"sm:max-w-4xl md:max-w-7xl":"large"===taskFormSize,"w-screen h-screen max-w-none max-h-none rounded-none border-0":"fullscreen"===taskFormSize})}
                          onInteractOutside={(e) => { if (isTaskFormDirty) { e.preventDefault(); handleRequestClose(); } }}
                          onEscapeKeyDown={(e) => { if (isTaskFormDirty) { e.preventDefault(); handleRequestClose(); } }}
                        >
                          <Button variant="ghost" size="icon" className="absolute left-4 top-4 h-6 w-6" onClick={cycleTaskFormSize}>
                            {"fullscreen"===taskFormSize?<Shrink className="h-4 w-4" />:<Expand className="h-4 w-4" />}
                            <span className="sr-only">Toggle dialog size</span>
                          </Button>
                          <DialogHeader className="text-center pt-6 sm:px-10"><DialogTitle>{T.createTask}</DialogTitle><DialogDescription>{T.createTaskDesc}</DialogDescription></DialogHeader>
                          <div className="p-1">
                            <CreateTaskForm 
                              ref={createTaskFormRef}
                              setOpen={handleSetOpen} 
                              onSubmit={(values, quoteColumns, collaboratorQuoteColumns) => {
                                // handleAddTask in context returns id
                                return handleAddTask(values as any);
                              }} 
                              clients={appData.clients} 
                              onAddClient={handleAddClientAndSelect} 
                              quoteTemplates={appData.quoteTemplates} 
                              collaborators={appData.collaborators} 
                              settings={appData.appSettings} 
                              categories={appData.categories} 
                              onDirtyChange={setIsTaskFormDirty}
                              onSubmitSuccess={handleSubmitSuccess}
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  {/* Simple export button using settings */}
                  <div className="flex items-center h-10 pl-5 border-l">
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => handleExport()}>
                            <Download className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Export Data ({defaultExportFormat?.toUpperCase() || 'EXCEL'})</p>
                          <p className="text-xs text-muted-foreground">Configure format in Settings</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
            </header>
            <AlertDialog open={isConfirmCloseOpen} onOpenChange={setIsConfirmCloseOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{T.unsavedConfirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{T.unsavedConfirmDescription}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setIsConfirmCloseOpen(false)}>{T.unsavedCancel}</AlertDialogCancel>
                   <Button variant="outline" onClick={handleConfirmSaveDraft}>{T.saveDraft}</Button>
                   <Button variant="destructive" onClick={handleConfirmCloseNoSave}>{T.unsavedCloseWithoutSaving}</Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </>
    );
}