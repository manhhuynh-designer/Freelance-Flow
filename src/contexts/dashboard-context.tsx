"use client";

import { createContext, ReactNode, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useAppData } from '@/hooks/useAppData';
import { useWorkTimeData } from '@/hooks/useWorkTimeData';
import { useActionBuffer } from '@/hooks/useActionBuffer';
import { initialAppData } from '@/lib/data';
import { BackupService } from '@/lib/backup-service';
import type { AppData, AppEvent, AppSettings, Category, Client, Collaborator, Quote, CollaboratorQuote, Task, QuoteTemplate } from '@/lib/types';

// Create a client once
const queryClient = new QueryClient();

// Keep the type open to quickly restore functionality; refine later if needed
type DashboardContextType = any;

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// A new inner component that can safely call useAppData because its parent is QueryClientProvider
function DashboardDataProvider({ children }: { children: ReactNode }) {
    const data = useAppData();
    const workTime = useWorkTimeData(data.appData?.workSessions);

    // Local UI states for managers and dialogs
    const [isClientManagerOpen, setIsClientManagerOpen] = useState(false);
    const [isCollaboratorManagerOpen, setIsCollaboratorManagerOpen] = useState(false);
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);

    // Task form dialog state and size (for DashboardHeader)
    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [taskFormSize, setTaskFormSize] = useState<'default' | 'large' | 'fullscreen'>('default');
    const cycleTaskFormSize = useCallback(() => {
        setTaskFormSize(prev => (prev === 'default' ? 'large' : prev === 'large' ? 'fullscreen' : 'default'));
    }, []);

    // Install prompt handling (PWA)
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setInstallPromptEvent(e);
            if (typeof window !== 'undefined' && localStorage.getItem('hidePwaInstallPrompt') !== 'true') {
                setShowInstallPrompt(true);
            }
        };
        window.addEventListener('beforeinstallprompt', handler as any);
        return () => window.removeEventListener('beforeinstallprompt', handler as any);
    }, []);
    const handleInstallClick = useCallback(async () => {
        try {
            if (installPromptEvent?.prompt) {
                await installPromptEvent.prompt();
                setShowInstallPrompt(false);
                setInstallPromptEvent(null);
            }
        } catch {}
    }, [installPromptEvent]);

    // Action buffer for tracking changes
    const actionBuffer = useActionBuffer();

    // Task details viewing state
    const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
    const viewingTaskDetails = useMemo(() => {
        const appData = data.appData;
        if (!appData || !viewingTaskId) return null;
        const task = appData.tasks.find((t: Task) => t.id === viewingTaskId);
        if (!task) return null;
        const client = appData.clients.find((c: Client) => c.id === task.clientId);
        const quote = appData.quotes.find((q: Quote) => q.id === task.quoteId);
        return { task, client, quote };
    }, [data.appData, viewingTaskId]);
    const handleViewTask = useCallback((taskId: string) => {
        setViewingTaskId(taskId);
    }, []);
    const handleCloseTaskDetails = useCallback(() => setViewingTaskId(null), []);
    const handleEditTaskClick = useCallback((task: Task) => {
        // This hook can be wired to open a central edit dialog if needed later
        setViewingTaskId(task.id);
    }, []);

    // Data update helpers using setAppData
    const setAppData = data.setAppData as (updater: (prev: AppData) => AppData) => void;

    const updateTask = data.updateTask as (updates: Partial<Task> & { id: string }) => void;

    const updateEvent = useCallback((updates: Partial<AppEvent> & { id: string }) => {
        if (!data.appData) return;
        setAppData(prev => ({ ...prev, events: (prev.events || []).map(ev => ev.id === updates.id ? { ...ev, ...updates } : ev) }));
    }, [data.appData, setAppData]);

    // Create new event (used by AddEventButton from header)
    const handleEventSubmit = useCallback((eventData: Partial<AppEvent>) => {
        const id = `event-${Date.now()}`;
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        const newEvent: AppEvent = {
            id,
            name: eventData.name || 'New Event',
            startTime: eventData.startTime || now.toISOString(),
            endTime: eventData.endTime || oneHourLater.toISOString(),
            taskIds: eventData.taskIds || [],
            links: eventData.links || [],
            notes: eventData.notes || '',
            color: eventData.color,
            icon: eventData.icon,
        } as AppEvent;
        setAppData(prev => ({ ...prev, events: [...(prev.events || []), newEvent] }));
    }, [setAppData]);

    const updateQuote = data.updateQuote as (quoteId: string, updates: Partial<Quote>) => void;

    const updateCollaboratorQuote = useCallback((quoteId: string, updates: Partial<CollaboratorQuote>) => {
        if (!data.appData) return;
        setAppData(prev => ({ ...prev, collaboratorQuotes: (prev.collaboratorQuotes || []).map(q => q.id === quoteId ? { ...q, ...updates } : q) }));
    }, [data.appData, setAppData]);

    const handleAddTask = useCallback((task: Omit<Task, 'id'>) => {
        const id = `task-${Date.now()}`;
        setAppData(prev => ({ ...prev, tasks: [...prev.tasks, { ...task, id }] }));
        return id;
    }, [setAppData]);

    const handleEditTask = useCallback((values: Partial<Task>, _quoteColumns?: any[], _collaboratorQuoteColumns?: any[], taskId?: string) => {
        if (taskId || values.id) {
            const id = taskId || (values.id as string);
            setAppData(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === id ? { ...t, ...values } : t) }));
        } else {
            const id = `task-${Date.now()}`;
            setAppData(prev => ({ ...prev, tasks: [...prev.tasks, { id, name: values.name || 'New Task', description: values.description || '', startDate: values.startDate || new Date(), deadline: values.deadline || new Date(), clientId: values.clientId || (prev.clients[0]?.id || ''), categoryId: values.categoryId || (prev.categories[0]?.id || ''), status: values.status || 'todo', quoteId: values.quoteId || (prev.quotes[0]?.id || ''), createdAt: new Date().toISOString() }] as Task[] }));
        }
    }, [setAppData]);

    const handleTaskStatusChange = useCallback((taskId: string, status: Task['status'], subStatusId?: string) => {
        setAppData(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status, subStatusId } : t) }));
    }, [setAppData]);

    const handleDeleteTask = data.handleDeleteTask as (taskId: string) => void;

    const handleRestoreTask = useCallback((taskId: string) => {
        setAppData(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === taskId ? ({ ...t, deletedAt: undefined }) : t) }));
    }, [setAppData]);

    const handlePermanentDeleteTask = useCallback((taskId: string) => {
        setAppData(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) }));
    }, [setAppData]);

    const handleEmptyTrash = useCallback(() => {
        setAppData(prev => ({ ...prev, tasks: prev.tasks.filter(t => !t.deletedAt) }));
    }, [setAppData]);

    const handleAddClientAndSelect = useCallback((dataToAdd: Omit<Client, 'id'>) => {
        const id = `client-${Date.now()}`;
        const client: Client = { id, ...dataToAdd };
        setAppData(prev => ({ ...prev, clients: [...prev.clients, client] }));
        return client;
    }, [setAppData]);
    const handleEditClient = useCallback((id: string, dataToUpdate: Omit<Client, 'id'>) => {
        setAppData(prev => ({ ...prev, clients: prev.clients.map(c => c.id === id ? { id, ...dataToUpdate } as Client : c) }));
    }, [setAppData]);
    const handleDeleteClient = useCallback((id: string) => {
        setAppData(prev => ({ ...prev, clients: prev.clients.filter(c => c.id !== id) }));
    }, [setAppData]);

    const handleAddCollaborator = useCallback((collab: Omit<Collaborator, 'id'>) => {
        const id = `collab-${Date.now()}`;
        setAppData(prev => ({ ...prev, collaborators: [...prev.collaborators, { id, ...collab }] }));
    }, [setAppData]);
    const handleEditCollaborator = useCallback((id: string, collab: Omit<Collaborator, 'id'>) => {
        setAppData(prev => ({ ...prev, collaborators: prev.collaborators.map(c => c.id === id ? { id, ...collab } : c) }));
    }, [setAppData]);
    const handleDeleteCollaborator = useCallback((id: string) => {
        setAppData(prev => ({ ...prev, collaborators: prev.collaborators.filter(c => c.id !== id) }));
    }, [setAppData]);

    const handleAddCategory = useCallback((cat: Omit<Category, 'id'>) => {
        const id = `category-${Date.now()}`;
        setAppData(prev => ({ ...prev, categories: [...prev.categories, { id, ...cat }] }));
    }, [setAppData]);
    const handleEditCategory = useCallback((id: string, cat: Omit<Category, 'id'>) => {
        setAppData(prev => ({ ...prev, categories: prev.categories.map(c => c.id === id ? { id, ...cat } : c) }));
    }, [setAppData]);
    const handleDeleteCategory = useCallback((id: string) => {
        setAppData(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== id) }));
    }, [setAppData]);

    const updateTaskEisenhowerQuadrant = useCallback((taskId: string, quadrant: Task['eisenhowerQuadrant']) => {
        setAppData(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === taskId ? { ...t, eisenhowerQuadrant: quadrant } : t) }));
    }, [setAppData]);
    const reorderTasksInQuadrant = useCallback((_quadrant: NonNullable<Task['eisenhowerQuadrant']>, _orderedTaskIds: string[]) => {
        // No persistent order field for Eisenhower; no-op placeholder
    }, []);
    const reorderTasksInStatus = useCallback((_status: Task['status'], _orderedTaskIds: string[]) => {
        // Optionally assign sequential kanbanOrder here if needed
    }, []);
    const updateKanbanSettings = useCallback((updates: Partial<Pick<AppSettings, 'kanbanColumnOrder' | 'kanbanColumnVisibility' | 'kanbanSubStatusMode'>>) => {
        setAppData(prev => ({ ...prev, appSettings: { ...prev.appSettings, ...updates } }));
    }, [setAppData]);

    // Clear only main data (keep backups)
    const handleClearOnlyData = useCallback(() => {
        setAppData(() => ({ ...initialAppData } as AppData));
    }, [setAppData]);

    // Clear main data and backups together
    const handleClearDataAndBackups = useCallback(() => {
        setAppData(() => ({ ...initialAppData } as AppData));
        try { BackupService.clearAllBackups?.(); } catch {}
    }, [setAppData]);

    // Backwards-compatible alias (previous behavior now clears both)
    const handleClearAllData = handleClearDataAndBackups;

    const handleFileUpload = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const json = JSON.parse(String(reader.result)) as Partial<AppData>;
                // Persist imported data via saveAppData when available
                if ((data as any).saveAppData) {
                    (data as any).saveAppData(json);
                } else {
                    setAppData(prev => ({ ...prev, ...json } as AppData));
                }
            } catch (e) {
                console.error('Failed to import data file', e);
            }
        };
        reader.readAsText(file);
    }, [setAppData]);

    // Backup export/status (used by header)
    const [backupStatusText, setBackupStatusText] = useState<string>(() => {
        if (typeof window === 'undefined') return 'Never';
        const ts = localStorage.getItem('freelance-flow-last-backup');
        return ts ? new Date(ts).toLocaleString() : 'Never';
    });
    
    // Default export format - can be changed by user preference
    const [defaultExportFormat, setDefaultExportFormat] = useState<'json' | 'excel'>(() => {
        if (typeof window === 'undefined') return 'excel';
        const saved = localStorage.getItem('freelance-flow-default-export-format');
        return (saved as 'json' | 'excel') || 'excel';
    });
    
    const handleExport = useCallback(async (format?: 'json' | 'excel') => {
        try {
            const exportFormat = format || defaultExportFormat;
            const appData: AppData = data.appData;

            // Enrich export with local-only AI and preset data (for full-fidelity backups)
            let aiPersistentData: any | undefined;
            let aiWritingPresets: any | undefined;
            let aiWritingHistory: any | undefined;
            let aiWritingVersions: any | undefined;
            let filterPresets: any | undefined;
            if (typeof window !== 'undefined') {
                try { aiPersistentData = JSON.parse(localStorage.getItem('freelance-flow-ai-persistent-data') || 'null') || undefined; } catch {}
                try { aiWritingPresets = JSON.parse(localStorage.getItem('ai-writing-presets') || 'null') || undefined; } catch {}
                try { aiWritingHistory = JSON.parse(localStorage.getItem('ai-writing-history') || 'null') || undefined; } catch {}
                try { aiWritingVersions = JSON.parse(localStorage.getItem('ai-writing-versions') || 'null') || undefined; } catch {}
                try { filterPresets = JSON.parse(localStorage.getItem('freelance-flow-filter-presets') || 'null') || undefined; } catch {}
            }

            const exportData: any = {
                ...appData,
                // Ensure new financial arrays exist
                expenses: (appData as any).expenses || [],
                fixedCosts: (appData as any).fixedCosts || [],
                // Attach AI/local-only data blocks so Excel export can include them
                ...(aiPersistentData ? { aiPersistentData } : {}),
                ...(aiWritingPresets ? { aiWritingPresets } : {}),
                ...(aiWritingHistory ? { aiWritingHistory } : {}),
                ...(aiWritingVersions ? { aiWritingVersions } : {}),
                ...(filterPresets ? { filterPresets } : {}),
            };

            const result = await BackupService.createManualBackup(exportData, exportFormat);
            
            if (result.blob) {
                // Excel format or blob result
                const url = URL.createObjectURL(result.blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = result.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else if (result.jsonString) {
                // JSON format (fallback)
                const blob = new Blob([result.jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = result.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
            
            const nowIso = new Date().toISOString();
            localStorage.setItem('freelance-flow-last-backup', nowIso);
            localStorage.setItem('freelance-flow-default-export-format', exportFormat);
            setBackupStatusText(new Date(nowIso).toLocaleString());
        } catch (e) {
            console.error('Export failed', e);
        }
    }, [data.appData, defaultExportFormat]);
    useEffect(() => {
        const ts = typeof window !== 'undefined' ? localStorage.getItem('freelance-flow-last-backup') : null;
        if (ts) setBackupStatusText(new Date(ts).toLocaleString());
    }, []);

    const contextValue: DashboardContextType = {
        ...data,
        workTime,
        // UI states
        isClientManagerOpen, setIsClientManagerOpen,
        isCollaboratorManagerOpen, setIsCollaboratorManagerOpen,
        isCategoryManagerOpen, setIsCategoryManagerOpen,
        isTemplateManagerOpen, setIsTemplateManagerOpen,
        // PWA install prompt
        showInstallPrompt, setShowInstallPrompt, installPromptEvent, handleInstallClick,
        // Action buffer
        actionBuffer,
        // Task viewing/edit helpers
        viewingTaskId, viewingTaskDetails, handleViewTask, handleCloseTaskDetails, handleEditTaskClick,
    // Task form dialog state
    isTaskFormOpen, setIsTaskFormOpen, taskFormSize, cycleTaskFormSize,
        // Data ops
        setAppData,
        updateTask,
        updateEvent,
    handleEventSubmit,
        updateQuote,
        updateCollaboratorQuote,
        handleAddTask,
        handleEditTask,
        handleTaskStatusChange,
        handleDeleteTask,
        handleRestoreTask,
        handlePermanentDeleteTask,
        handleEmptyTrash,
        handleAddClientAndSelect,
        handleEditClient,
        handleDeleteClient,
        handleAddCollaborator,
        handleEditCollaborator,
        handleDeleteCollaborator,
        handleAddCategory,
        handleEditCategory,
        handleDeleteCategory,
        updateTaskEisenhowerQuadrant,
        reorderTasksInQuadrant,
        reorderTasksInStatus,
        updateKanbanSettings,
    // Settings/Data mgmt
    handleClearAllData,
    handleClearOnlyData,
    handleClearDataAndBackups,
    deleteBackupByTimestamp: (ts: number) => { try { BackupService.deleteBackup?.(ts); } catch {} },
    handleFileUpload,
    saveAppData: (data as any).saveAppData,
    // Backup
    backupStatusText,
    handleExport,
    defaultExportFormat,
    setDefaultExportFormat,
        // Explicit setters for backup/restore flows
        setTasks: useCallback((tasks: Task[]) => {
            setAppData(prev => ({ ...prev, tasks }));
        }, [setAppData]),
        setQuotes: useCallback((quotes: Quote[]) => {
            setAppData(prev => ({ ...prev, quotes }));
        }, [setAppData]),
        setCollaboratorQuotes: useCallback((collaboratorQuotes: CollaboratorQuote[]) => {
            setAppData(prev => ({ ...prev, collaboratorQuotes }));
        }, [setAppData]),
        setClients: useCallback((clients: Client[]) => {
            setAppData(prev => ({ ...prev, clients }));
        }, [setAppData]),
        setCollaborators: useCallback((collaborators: Collaborator[]) => {
            setAppData(prev => ({ ...prev, collaborators }));
        }, [setAppData]),
        setQuoteTemplates: useCallback((quoteTemplates: QuoteTemplate[]) => {
            setAppData(prev => ({ ...prev, quoteTemplates }));
        }, [setAppData]),
        setCategories: useCallback((categories: Category[]) => {
            setAppData(prev => ({ ...prev, categories }));
        }, [setAppData]),
        setAppSettings: useCallback((appSettings: AppSettings) => {
            setAppData(prev => ({ ...prev, appSettings }));
        }, [setAppData]),
    };

    return (
        <DashboardContext.Provider value={contextValue}>
            {children}
        </DashboardContext.Provider>
    );
}

// The main exported provider now wraps QueryClientProvider
export function DashboardProvider({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <DashboardDataProvider>
                {children}
            </DashboardDataProvider>
        </QueryClientProvider>
    );
}


export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
};
