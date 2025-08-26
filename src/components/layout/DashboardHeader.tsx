"use client";

import React, { Suspense, useState, useRef, useMemo, useEffect } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AddEventButton } from "@/components/event-dialogs/AddEventButton";
import { CreateTaskForm, type CreateTaskFormRef } from "@/components/create-task-form-new";
import { PageTitle } from "@/components/page-title";
import { SidebarTrigger } from '@/components/ui/sidebar';
import { PlusCircle, Download } from "lucide-react";
import { WorkTimeTracker } from '@/components/features/WorkTimeTracker';
import { cn } from "@/lib/utils";
import { i18n } from '@/lib/i18n';

export function DashboardHeader() {
  const { appData, isTaskFormOpen, setIsTaskFormOpen, handleAddTask, handleAddClientAndSelect, cycleTaskFormSize, taskFormSize, handleEventSubmit, backupStatusText, handleExport, handleViewTask, defaultExportFormat } = useDashboard();

  const T = useMemo(() => {
    const lang = appData.appSettings.language as 'en' | 'vi';
    return {
      ...i18n[lang],
      unsavedConfirmTitle: (i18n[lang] as any)?.unsavedConfirmTitle || (i18n[lang] as any)?.confirmClose || 'Unsaved changes',
      unsavedConfirmDescription: (i18n[lang] as any)?.unsavedConfirmDescription || (i18n[lang] as any)?.confirmCloseDescription || 'You have unsaved changes. What would you like to do?',
      unsavedCancel: (i18n[lang] as any)?.unsavedCancel || (i18n[lang] as any)?.cancel || 'Cancel',
      unsavedCloseWithoutSaving: (i18n[lang] as any)?.unsavedCloseWithoutSaving || (i18n[lang] as any)?.closeWithoutSaving || 'Close Without Saving',
      saveDraft: (i18n[lang] as any)?.saveDraft || 'Save Draft',
    };
  }, [appData.appSettings.language]);

  const [isTaskFormDirty, setIsTaskFormDirty] = useState(false);
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
  const isSavingRef = useRef(false);
  const lastSaveTs = useRef<number | null>(null);
  const createTaskFormRef = useRef<CreateTaskFormRef>(null);

  // Auto-trigger save-draft for debugging when URL contains ?autoSaveTest=1
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      if (params.get('autoSaveTest') === '1') {
        // Open the dialog, wait briefly then call handleSaveDraft
        setIsTaskFormOpen(true);
        setTimeout(() => {
          try { void fetch('/api/_trace-saving', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source: 'DashboardHeader', event: 'autoSaveTest-trigger', ts: Date.now() }) }); } catch (e) {}
          createTaskFormRef.current?.handleSaveDraft();
        }, 300);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleRequestClose = () => {
    try { void fetch('/api/_trace-saving', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source: 'DashboardHeader', event: 'handleRequestClose', ts: Date.now(), isDirty: isTaskFormDirty }) }); } catch(e) {}
    const now = Date.now();
    if (lastSaveTs.current && (now - lastSaveTs.current) < 1000) {
      setIsTaskFormOpen(false);
      setIsTaskFormDirty(false);
      return;
    }
    if (isSavingRef.current) {
      setIsTaskFormOpen(false);
      setIsTaskFormDirty(false);
      return;
    }
    if (isTaskFormDirty) setIsConfirmCloseOpen(true);
    else setIsTaskFormOpen(false);
  };

  const handleSubmitSuccess = (newTaskId?: string) => {
  try { void fetch('/api/_trace-saving', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source: 'DashboardHeader', event: 'handleSubmitSuccess', ts: Date.now() }) }); } catch(e) {}
    setIsConfirmCloseOpen(false);
    setIsTaskFormOpen(false);
    setIsTaskFormDirty(false);
    setTimeout(() => (isSavingRef.current = false), 50);
    if (newTaskId) setTimeout(() => handleViewTask?.(newTaskId), 0);
  };

  const handleConfirmSaveDraft = () => {
    isSavingRef.current = true;
  try { void fetch('/api/_trace-saving', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source: 'DashboardHeader', event: 'handleConfirmSaveDraft', ts: Date.now() }) }); } catch(e) {}
    createTaskFormRef.current?.handleSaveDraft();
    setIsConfirmCloseOpen(false);
    setTimeout(() => (isSavingRef.current = false), 50);
  };

  const handleConfirmCloseNoSave = () => {
    setIsTaskFormDirty(false);
    setIsConfirmCloseOpen(false);
    setIsTaskFormOpen(false);
  };

  const handleSetOpen = (open: boolean) => {
    if (open) {
      setIsTaskFormOpen(true);
      return;
    }

    // Defer close decision to next microtask so child form can call onStartSaving()
    // which sets isSavingRef.current = true. This avoids a race where the
    // Dialog reports close before the saving handshake runs and shows the
    // unsaved-confirm dialog incorrectly (observed when quote tables exist).
    Promise.resolve().then(() => {
      if (isSavingRef.current) {
        // explicit save in progress: close without prompting
        setIsTaskFormOpen(false);
        setIsTaskFormDirty(false);
        return;
      }
      handleRequestClose();
    });
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger />
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold leading-tight"><Suspense fallback={null}><PageTitle /></Suspense></h1>
            <div className="text-sm text-muted-foreground hidden sm:block">{T.lastBackup}: {backupStatusText}</div>
          </div>
        </div>

        <div className="flex items-center gap-5">
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
                  className={cn("max-h-[90vh] overflow-y-auto", { "sm:max-w-2xl md:max-w-5xl": "default" === taskFormSize, "sm:max-w-4xl md:max-w-7xl": "large" === taskFormSize, "w-screen h-screen max-w-none max-h-none rounded-none border-0": "fullscreen" === taskFormSize })}
                  onInteractOutside={(e) => { if (isTaskFormDirty) { e.preventDefault(); handleRequestClose(); } }}
                  onEscapeKeyDown={(e) => { if (isTaskFormDirty) { e.preventDefault(); handleRequestClose(); } }}
                >
                  <DialogHeader className="text-center pt-6 sm:px-10"><DialogTitle>{T.createTask}</DialogTitle><DialogDescription>{T.createTaskDesc}</DialogDescription></DialogHeader>
                  <div className="p-1">
                    <CreateTaskForm
                      ref={createTaskFormRef}
                      onStartSaving={() => { isSavingRef.current = true; lastSaveTs.current = Date.now(); }}
                      setOpen={handleSetOpen}
                      onSubmit={(values, quoteColumns, collaboratorQuoteColumns) => {
                        isSavingRef.current = true;
                        lastSaveTs.current = Date.now();
                        return handleAddTask(values as any, quoteColumns, collaboratorQuoteColumns);
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
            <div className="text-sm text-muted-foreground">{T.unsavedConfirmDescription}</div>
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