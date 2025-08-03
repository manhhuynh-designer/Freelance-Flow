"use client";

import { Suspense, useState, useRef, useMemo } from 'react';
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
import { cn } from "@/lib/utils";
import { i18n } from '@/lib/i18n';

export function DashboardHeader() {
    const { 
        appData, isTaskFormOpen, setIsTaskFormOpen, handleAddTask, 
        handleAddClientAndSelect, cycleTaskFormSize, taskFormSize, 
        handleEventSubmit, backupStatusText, handleExport 
    } = useDashboard();
    
    const T = useMemo(() => {
        const lang = appData.appSettings.language;
        return {
            ...i18n[lang],
            confirmClose: (i18n[lang] as any)?.confirmClose || "Confirm Close",
            confirmCloseDescription: (i18n[lang] as any)?.confirmCloseDescription || "You have unsaved changes. What would you like to do?",
            saveDraft: (i18n[lang] as any)?.saveDraft || "Save Draft",
            closeWithoutSaving: (i18n[lang] as any)?.closeWithoutSaving || "Close Without Saving",
        };
    }, [appData.appSettings.language]);

    const [isTaskFormDirty, setIsTaskFormDirty] = useState(false);
    const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
    const createTaskFormRef = useRef<CreateTaskFormRef>(null);

    const handleRequestClose = () => {
        if (isTaskFormDirty) {
            setIsConfirmCloseOpen(true);
        } else {
            setIsTaskFormOpen(false);
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

    return (
        <>
            <header className="flex items-center justify-between p-4 border-b">
                 <div className="flex items-center gap-4">
                   <SidebarTrigger />
                   <h1 className="text-2xl font-bold font-headline">
                     <Suspense fallback={null}>
                         <PageTitle />
                     </Suspense>
                   </h1>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground hidden sm:block text-right">
                        <div>{T.lastBackup}: {backupStatusText}</div>
                    </div>
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={handleExport}>
                                    <Download className="h-4 w-4" />
                                    <span className="sr-only">{T.backupData}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{T.backupData}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <AddEventButton tasks={appData.tasks} onSubmit={handleEventSubmit} />
                    <Dialog open={isTaskFormOpen} onOpenChange={handleSetOpen}>
                        <DialogTrigger asChild><Button size="icon" className="sm:hidden"><PlusCircle className="h-4 w-4" /><span className="sr-only">{T.addTask}</span></Button></DialogTrigger>
                        <DialogTrigger asChild><Button className="hidden sm:inline-flex"><PlusCircle className="mr-2 h-4 w-4" />{T.addTask}</Button></DialogTrigger>
                        <DialogContent 
                            className={cn("max-h-[90vh] overflow-y-auto", {"sm:max-w-2xl md:max-w-5xl":"default"===taskFormSize,"sm:max-w-4xl md:max-w-7xl":"large"===taskFormSize,"w-screen h-screen max-w-none max-h-none rounded-none border-0":"fullscreen"===taskFormSize})}
                            onInteractOutside={(e) => {
                                if (isTaskFormDirty) {
                                    e.preventDefault();
                                    handleRequestClose();
                                }
                            }}
                            onEscapeKeyDown={(e) => {
                                if (isTaskFormDirty) {
                                    e.preventDefault();
                                    handleRequestClose();
                                }
                            }}
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
                                    onSubmit={handleAddTask} 
                                    clients={appData.clients} 
                                    onAddClient={handleAddClientAndSelect} 
                                    quoteTemplates={appData.quoteTemplates} 
                                    collaborators={appData.collaborators} 
                                    settings={appData.appSettings} 
                                    categories={appData.categories} 
                                    onDirtyChange={setIsTaskFormDirty}
                                    onRequestConfirmClose={handleRequestClose}
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                 </div>
            </header>
            <AlertDialog open={isConfirmCloseOpen} onOpenChange={setIsConfirmCloseOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{T.confirmClose}</AlertDialogTitle>
                  <AlertDialogDescription>{T.confirmCloseDescription}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setIsConfirmCloseOpen(false)}>{T.cancel}</AlertDialogCancel>
                   <Button variant="outline" onClick={handleConfirmSaveDraft}>{T.saveDraft}</Button>
                   <Button variant="destructive" onClick={handleConfirmCloseNoSave}>{T.closeWithoutSaving}</Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </>
    );
}