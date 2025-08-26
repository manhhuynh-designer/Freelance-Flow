"use client";

import { createContext, ReactNode, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useAppData } from '@/hooks/useAppData';
import { useWorkTimeData } from '@/hooks/useWorkTimeData';
import { useActionBuffer } from '@/hooks/useActionBuffer';
import { initialAppData } from '@/lib/data';
import { BackupService } from '@/lib/backup-service';
import type { AppData, AppEvent, AppSettings, Category, Client, Collaborator, Quote, CollaboratorQuote, Task, QuoteTemplate, QuoteColumn } from '@/lib/types';

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

    // Helper: create a Quote object from sections + columns
    const createQuoteFromSections = (sections: any[] | undefined, columns?: any[]) => {
        const qid = `quote-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        const secs = Array.isArray(sections) ? sections : [];
        const total = secs.reduce((acc: number, s: any) => {
            const sumItems = (s.items || []).reduce((ai: number, it: any) => {
                const qty = (it.quantity || 1);
                const price = Number(it.unitPrice || 0);
                return ai + (price * qty);
            }, 0);
            return acc + sumItems;
        }, 0);
        return {
            id: qid,
            sections: secs,
            total,
            columns: Array.isArray(columns) ? columns : undefined,
            status: 'draft',
        } as Quote;
    };

    const createCollaboratorQuoteFrom = (collabEntry: any, columns?: any[]) => {
        const id = `collab-quote-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        const secs = Array.isArray(collabEntry?.sections) ? collabEntry.sections : [];
        const total = secs.reduce((acc: number, s: any) => {
            const sumItems = (s.items || []).reduce((ai: number, it: any) => {
                const qty = (it.quantity || 1);
                const price = Number(it.unitPrice || 0);
                return ai + (price * qty);
            }, 0);
            return acc + sumItems;
        }, 0);
        return {
            id,
            collaboratorId: collabEntry?.collaboratorId || '',
            sections: secs,
            total,
            columns: Array.isArray(columns) ? columns : undefined,
            paymentStatus: 'pending',
        } as CollaboratorQuote;
    };

    // Now handle creating a task while also creating/persisting its quote(s)
    const handleAddTask = useCallback((task: any, quoteColumns?: QuoteColumn[], collaboratorQuoteColumns?: QuoteColumn[]) => {
        const id = `task-${Date.now()}`;

        setAppData(prev => {
            const newPrev = { ...prev } as any;

            // Create main quote if sections provided
            let quoteId: string | undefined = undefined;
            if (task?.sections && Array.isArray(task.sections) && task.sections.length > 0) {
                const newQuote = createQuoteFromSections(task.sections, quoteColumns);
                quoteId = newQuote.id;
                newPrev.quotes = [...(newPrev.quotes || []), newQuote];
            }

            // Create collaborator quotes
            const collabMappings: { collaboratorId: string; quoteId: string }[] = [];
            if (task?.collaboratorQuotes && Array.isArray(task.collaboratorQuotes) && task.collaboratorQuotes.length > 0) {
                const newCollabQuotes = (task.collaboratorQuotes || []).map((cq: any) => {
                    const created = createCollaboratorQuoteFrom(cq, collaboratorQuoteColumns);
                    collabMappings.push({ collaboratorId: cq.collaboratorId || '', quoteId: created.id });
                    return created;
                });
                newPrev.collaboratorQuotes = [...(newPrev.collaboratorQuotes || []), ...newCollabQuotes];
            }

            // Build the new task entry
            const newTask: Task = {
                id,
                name: task.name || 'New Task',
                description: task.description || '',
                startDate: task.startDate || task.dates?.from || new Date(),
                deadline: task.deadline || task.dates?.to || new Date(),
                clientId: task.clientId || (newPrev.clients?.[0]?.id || ''),
                collaboratorIds: task.collaboratorIds || [],
                categoryId: task.categoryId || (newPrev.categories?.[0]?.id || ''),
                status: task.status || 'todo',
                subStatusId: task.subStatusId || '',
                quoteId: quoteId || (task.quoteId || ''),
                collaboratorQuotes: collabMappings,
                briefLink: task.briefLink || [],
                driveLink: task.driveLink || [],
                createdAt: new Date().toISOString(),
            } as Task;

            newPrev.tasks = [...(newPrev.tasks || []), newTask];
            return newPrev as AppData;
        });

        return id;
    }, [setAppData]);

    const handleEditTask = useCallback((values: Partial<Task>, quoteColumns?: any[], collaboratorQuoteColumns?: any[], taskId?: string) => {
        if (taskId || values.id) {
            const id = taskId || (values.id as string);
            setAppData(prev => {
                const newPrev = { ...prev } as any;

                // Update task
                newPrev.tasks = newPrev.tasks.map((t: Task) => t.id === id ? { ...t, ...values } : t);

                // If we have an updated sections payload, update the linked quote's sections and total
                const targetTask = (newPrev.tasks || []).find((t: Task) => t.id === id);
                if (targetTask) {
                    // Update main quote sections and columns when provided
                    if ((values as any).sections && targetTask.quoteId) {
                        newPrev.quotes = (newPrev.quotes || []).map((q: Quote) => {
                            if (q.id !== targetTask.quoteId) return q;
                            const secs = Array.isArray((values as any).sections) ? (values as any).sections : q.sections || [];
                            const total = secs.reduce((acc: number, s: any) => {
                                const sumItems = (s.items || []).reduce((ai: number, it: any) => {
                                    const qty = (it.quantity || 1);
                                    const price = Number(it.unitPrice || 0);
                                    return ai + (price * qty);
                                }, 0);
                                return acc + sumItems;
                            }, 0);
                            return { ...q, sections: secs, total, columns: quoteColumns ?? q.columns };
                        });
                    } else if (quoteColumns && targetTask.quoteId) {
                        newPrev.quotes = (newPrev.quotes || []).map((q: Quote) => q.id === targetTask.quoteId ? { ...q, columns: quoteColumns } : q);
                    }

                    // Update collaborator quotes: values.collaboratorQuotes is array of { collaboratorId, sections }
                    if (Array.isArray((values as any).collaboratorQuotes) && (values as any).collaboratorQuotes.length > 0) {
                        const collabArr = (values as any).collaboratorQuotes as any[];
                        newPrev.collaboratorQuotes = (newPrev.collaboratorQuotes || []).map((cq: any) => {
                            // Find mapping entry in task to get collaboratorId associated with this collaborator quote id
                            const mapping = targetTask.collaboratorQuotes?.find((m: any) => m.quoteId === cq.id) || null;
                            // If mapping exists, try to find the incoming update by collaboratorId
                            if (mapping) {
                                const incoming = collabArr.find(ci => ci.collaboratorId === mapping.collaboratorId);
                                if (incoming) {
                                    const secs = Array.isArray(incoming.sections) ? incoming.sections : cq.sections || [];
                                    const total = secs.reduce((acc: number, s: any) => {
                                        const sumItems = (s.items || []).reduce((ai: number, it: any) => {
                                            const qty = (it.quantity || 1);
                                            const price = Number(it.unitPrice || 0);
                                            return ai + (price * qty);
                                        }, 0);
                                        return acc + sumItems;
                                    }, 0);
                                    return { ...cq, sections: secs, total, columns: collaboratorQuoteColumns ?? cq.columns };
                                }
                            }
                            return cq;
                        });
                    } else if (collaboratorQuoteColumns && targetTask.collaboratorQuotes) {
                        // If only columns provided, update columns for mapped collaborator quotes
                        newPrev.collaboratorQuotes = (newPrev.collaboratorQuotes || []).map((cq: any) => {
                            const mapping = targetTask.collaboratorQuotes?.find((m: any) => m.quoteId === cq.id);
                            if (mapping) return { ...cq, columns: collaboratorQuoteColumns };
                            return cq;
                        });
                    }
                }

                return newPrev as AppData;
            });
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
