"use client";

import { createContext, ReactNode, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useAppData } from '@/hooks/useAppData';
import { useWorkTimeData } from '@/hooks/useWorkTimeData';
import { buildWorkTimeStats } from '@/lib/helpers/time-analyzer';
import { useActionBuffer } from '@/hooks/useActionBuffer';
import { initialAppData, emptyAppData } from '@/lib/data';
import { BackupService } from '@/lib/backup-service';
import { PouchDBService } from '@/lib/pouchdb-service';
import { browserLocal } from '@/lib/browser';
import type { AppData, AppEvent, AppSettings, Category, Client, Collaborator, Quote, CollaboratorQuote, Task, QuoteTemplate, QuoteColumn } from '@/lib/types';
import type { Project } from '@/lib/types';

// Create a client once
const queryClient = new QueryClient();

// Keep the type open to quickly restore functionality; refine later if needed
type DashboardContextType = any;

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// A new inner component that can safely call useAppData because its parent is QueryClientProvider
function DashboardDataProvider({ children }: { children: ReactNode }) {
        const data = useAppData();
        // Debug: log appData.workSessions so we can trace when app-provided sessions arrive
        try {
            // Use console.debug to avoid noisy production logs; this only runs client-side
            if (typeof window !== 'undefined') console.debug('[dashboard] appData.workSessions', data?.appData?.workSessions);
        } catch {}
        const workTime = useWorkTimeData(data.appData?.workSessions);

    // Derive lightweight aggregated stats for older UI that expects workTime.stats
    // and ensure sessions persist into the central appData so other consumers (backups, AI) can read them.
    const derivedWorkTime = (() => {
        try {
            const sessions = (workTime && workTime.sessions) || [];
            // Build a 7-day range ending today for legacy stats consumers
            const to = new Date();
            const from = new Date();
            from.setDate(to.getDate() - 6);
            const built = buildWorkTimeStats(Array.isArray(sessions) ? sessions : [], from, to) as any;
            const weeklyTotalHours = built?.totalWorkHours ?? 0;
            const dailyAverageHours = Number((weeklyTotalHours / 7).toFixed(2));
            return { ...workTime, stats: { weeklyTotalHours, dailyAverageHours, _raw: built } };
        } catch (e) {
            return workTime;
        }
    })();

    // NOTE: session persistence effect moved lower after setAppData is defined to avoid hoisting issues.

    // Local UI states for managers and dialogs
    const [isClientManagerOpen, setIsClientManagerOpen] = useState(false);
    const [isCollaboratorManagerOpen, setIsCollaboratorManagerOpen] = useState(false);
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
    // Project manager state
    const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
    // Fixed costs manager state
    const [isFixedCostManagerOpen, setIsFixedCostManagerOpen] = useState(false);

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
            if (typeof window !== 'undefined' && browserLocal.getItem('hidePwaInstallPrompt') !== 'true') {
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

    // --- PROJECT CRUD HELPERS ---
    // Add new project
    const addProject = useCallback((project: Omit<Project, 'id' | 'tasks'>) => {
        const id = `project-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        setAppData(prev => ({
            ...prev,
            projects: [
                ...(prev.projects || []),
                { ...project, id, tasks: [] }
            ]
        }));
        return id;
    }, [setAppData]);

    // Update project
    const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
        setAppData(prev => ({
            ...prev,
            projects: (prev.projects || []).map(p => p.id === projectId ? { ...p, ...updates } : p)
        }));
    }, [setAppData]);

    // Delete project (and update tasks to remove projectId)
    const deleteProject = useCallback((projectId: string) => {
        setAppData(prev => {
            // Remove project
            const newProjects = (prev.projects || []).filter(p => p.id !== projectId);
            // Remove projectId from tasks
            const newTasks = (prev.tasks || []).map(t =>
                (t as any).projectId === projectId ? { ...t, projectId: undefined } : t
            );
            return { ...prev, projects: newProjects, tasks: newTasks };
        });
    }, [setAppData]);

    // Wrappers for manager component signature
    const handleAddProject = useCallback((data: Omit<Project, 'id' | 'tasks'>) => { addProject(data); }, [addProject]);
    const handleEditProject = useCallback((id: string, updates: Partial<Project>) => { updateProject(id, updates); }, [updateProject]);
    const handleDeleteProject = useCallback((id: string) => { deleteProject(id); }, [deleteProject]);

    // NOTE: intentionally not auto-syncing sessions into appData to avoid feedback loops
    // between the local hook state and global appData. The hook persists to localStorage
    // and we expose derived stats here for UI consumers.

    const updateTask = data.updateTask as (updates: Partial<Task> & { id: string }) => void;
    
    // Debug wrapper for updateTask
    const wrappedUpdateTask = useCallback((updates: Partial<Task> & { id: string }) => {
        console.log('DashboardContext: updateTask called', {
            taskId: updates.id,
            updates: Object.keys(updates),
            milestonesCount: updates.milestones?.length,
            hasDataUpdateTask: !!data.updateTask
        });
        
        if (data.updateTask) {
            data.updateTask(updates);
        } else {
            console.error('DashboardContext: data.updateTask is not available');
        }
    }, [data.updateTask]);

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
            const newPrev = { ...prev } as AppData;

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
                projectId: task.projectId || undefined,
            } as Task;

            newPrev.tasks = [...(newPrev.tasks || []), newTask];
            // If task belongs to a project, append its id to that project's tasks list
            if (newTask.projectId) {
                newPrev.projects = (newPrev.projects || []).map((p: any) => p.id === newTask.projectId
                    ? { ...p, tasks: Array.from(new Set([...(p.tasks || []), newTask.id])) }
                    : p
                );
            }
            return newPrev;
        });

        return id;
    }, [setAppData]);

    const handleEditTask = useCallback((values: Partial<Task> & {id: string}, quoteColumns?: any[], collaboratorQuoteColumns?: any[], taskId?: string) => {
        const idToEdit = taskId || values.id;
        if (!idToEdit) return;
        
    // handleEditTask invoked
        
        setAppData(prev => {
            const newPrev = { ...prev } as AppData;
            const oldTask = (newPrev.tasks || []).find((t: Task) => t.id === idToEdit);
            const prevProjectId = (oldTask as any)?.projectId as string | undefined;

            // Update task
            newPrev.tasks = newPrev.tasks.map((t: Task) => {
                if (t.id !== idToEdit) return t;
                // Extract collaboratorIds and collaboratorQuotes from values to handle separately
                const { collaboratorQuotes: _, collaboratorIds, ...valuesWithoutCollabQuotes } = values as any;
                
                // Keep existing collaboratorQuotes mappings for now, will be updated below if needed
                // But update collaboratorIds if provided
                return { 
                    ...t, 
                    ...valuesWithoutCollabQuotes,
                    collaboratorIds: collaboratorIds || t.collaboratorIds || []
                };
            });

            // Project membership maintenance
            const updatedTask = (newPrev.tasks || []).find((t: Task) => t.id === idToEdit) as any;
            const newProjectId = (values as any).hasOwnProperty('projectId') ? (values as any).projectId : prevProjectId;
            if (prevProjectId && prevProjectId !== newProjectId) {
                // Remove from previous project
                newPrev.projects = (newPrev.projects || []).map((p: any) => p.id === prevProjectId
                    ? { ...p, tasks: (p.tasks || []).filter((tid: string) => tid !== idToEdit) }
                    : p
                );
            }
            if (newProjectId) {
                newPrev.projects = (newPrev.projects || []).map((p: any) => p.id === newProjectId
                    ? { ...p, tasks: Array.from(new Set([...(p.tasks || []), idToEdit])) }
                    : p
                );
            }

            // If we have an updated sections payload, update the linked quote's sections and total
            const targetTask = (newPrev.tasks || []).find((t: Task) => t.id === idToEdit);
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
                if (Array.isArray((values as any).collaboratorQuotes)) {
                    const collabArr = (values as any).collaboratorQuotes as any[];
                    // processing collaborator quotes update
                    
                    // Filter out empty entries (only check for valid sections/items)
                    const validCollabEntries = collabArr.filter(ci => 
                        Array.isArray(ci.sections) && 
                        ci.sections.length > 0 &&
                        ci.sections.some((s: any) => Array.isArray(s.items) && s.items.length > 0)
                    );
                    
                    // Split existing mappings into identified vs draft (empty collaboratorId)
                    const existingMappings = (targetTask.collaboratorQuotes || []) as Array<{ collaboratorId: string; quoteId: string }>;
                    const existingIdMappings = existingMappings.filter(m => !!m.collaboratorId && m.collaboratorId.trim() !== '');
                    const existingDraftMappings = existingMappings.filter(m => !m.collaboratorId || m.collaboratorId.trim() === '');

                    // Desired IDs from form
                    const desiredIdEntries = validCollabEntries.filter(ci => !!ci.collaboratorId && ci.collaboratorId.trim() !== '');
                    const desiredDraftEntries = validCollabEntries.filter(ci => !ci.collaboratorId || ci.collaboratorId.trim() === '');

                    // Determine removals for identified collaborators
                    const existingCollabIds = new Set<string>(existingIdMappings.map(m => m.collaboratorId));
                    const desiredCollabIds = new Set<string>(desiredIdEntries.map(ci => ci.collaboratorId as string));
                    const removedCollabIds = Array.from(existingCollabIds).filter(id => !desiredCollabIds.has(id));
                    
                    // Remove collaborator quotes for collaborators that are no longer present in the form
                    if (removedCollabIds.length > 0 && targetTask.collaboratorQuotes) {
                        const quotesToRemove = targetTask.collaboratorQuotes
                            .filter(mapping => removedCollabIds.includes(mapping.collaboratorId))
                            .map(mapping => mapping.quoteId);
                        
                        // Remove from collaboratorQuotes array
                        newPrev.collaboratorQuotes = (newPrev.collaboratorQuotes || []).filter(cq => 
                            !quotesToRemove.includes(cq.id)
                        );
                        
                        // Update task to remove mappings and collaboratorIds
                        newPrev.tasks = newPrev.tasks.map((t: Task) => {
                            if (t.id !== idToEdit) return t;
                            const updatedMappings = (t.collaboratorQuotes || []).filter(mapping => 
                                !removedCollabIds.includes(mapping.collaboratorId)
                            );
                            const updatedCollaboratorIds = (t.collaboratorIds || []).filter(id => 
                                !removedCollabIds.includes(id)
                            );
                            return { ...t, collaboratorQuotes: updatedMappings, collaboratorIds: updatedCollaboratorIds } as Task;
                        });
                    }

                    // Handle draft removals by count: if fewer draft entries in form than existing draft mappings, remove surplus
                    const draftDesiredCount = desiredDraftEntries.length;
                    const draftExistingCount = existingDraftMappings.length;
                    if (draftExistingCount > draftDesiredCount) {
                        const surplus = draftExistingCount - draftDesiredCount;
                        // Remove last N draft mappings and their quotes
                        const draftsToRemove = existingDraftMappings.slice(-surplus);
                        const quotesToRemove = draftsToRemove.map(m => m.quoteId);
                        newPrev.collaboratorQuotes = (newPrev.collaboratorQuotes || []).filter(cq => !quotesToRemove.includes(cq.id));
                        newPrev.tasks = newPrev.tasks.map((t: Task) => {
                            if (t.id !== idToEdit) return t;
                            const updatedMappings = (t.collaboratorQuotes || []).filter(m => !quotesToRemove.includes(m.quoteId));
                            return { ...t, collaboratorQuotes: updatedMappings } as Task;
                        });
                    }
                    
                    if (validCollabEntries.length > 0) {
                        // Always use the latest mappings from newPrev after potential removals above
                        const currentTask = (newPrev.tasks || []).find((t: Task) => t.id === idToEdit) as Task | undefined;
                        const currentMappings = (currentTask?.collaboratorQuotes || []) as Array<{ collaboratorId: string; quoteId: string }>;
                        const currentIdMappings = currentMappings.filter(m => !!m.collaboratorId && m.collaboratorId.trim() !== '');
                        const currentDraftMappings = currentMappings.filter(m => !m.collaboratorId || m.collaboratorId.trim() === '');

                        // First, update existing collaborator quotes by mapping
                        newPrev.collaboratorQuotes = (newPrev.collaboratorQuotes || []).map((cq: any) => {
                            // Find mapping entry in task to get collaboratorId associated with this collaborator quote id
                            const mapping = currentMappings.find((m: any) => m.quoteId === cq.id) || null;
                            // If mapping exists, try to find the incoming update by collaboratorId
                            if (mapping) {
                                let incoming = null as any;
                                if (mapping.collaboratorId && mapping.collaboratorId.trim() !== '') {
                                    // Identified collaborator: match by collaboratorId
                                    incoming = desiredIdEntries.find(ci => ci.collaboratorId === mapping.collaboratorId) || null;
                                } else {
                                    // Draft: pair by order with desired draft entries
                                    const draftIndex = currentDraftMappings.findIndex(m => m.quoteId === cq.id);
                                    if (draftIndex >= 0 && desiredDraftEntries[draftIndex]) incoming = desiredDraftEntries[draftIndex];
                                }
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
                                    // updated existing collaborator quote
                                    return { ...cq, sections: secs, total, columns: collaboratorQuoteColumns ?? cq.columns };
                                }
                            }
                            return cq;
                        });
                        
                        // Then, create collaborator quotes for any NEW collaborator entries not present in current mappings
                        const existingIdsSet = new Set<string>(currentIdMappings.map(m => m.collaboratorId));
                        const newIdEntries = desiredIdEntries.filter(ci => !!ci.collaboratorId && !existingIdsSet.has(ci.collaboratorId));
                        if (newIdEntries.length > 0) {
                            newIdEntries.forEach((entry: any) => {
                                const created = createCollaboratorQuoteFrom(entry, collaboratorQuoteColumns);
                                // Append new collaborator quote entity
                                newPrev.collaboratorQuotes = [
                                    ...(newPrev.collaboratorQuotes || []),
                                    created
                                ];
                                // Link the quote to the task and update collaboratorIds
                                newPrev.tasks = newPrev.tasks.map((t: Task) => {
                                    if (t.id !== idToEdit) return t;
                                    const updatedMappings = [...(t.collaboratorQuotes || []), { collaboratorId: entry.collaboratorId, quoteId: created.id }];
                                    const updatedCollaboratorIds = Array.from(new Set([...(t.collaboratorIds || []), entry.collaboratorId]));
                                    return { ...t, collaboratorQuotes: updatedMappings, collaboratorIds: updatedCollaboratorIds } as Task;
                                });
                            });
                        }

                        // Create draft quotes if there are more desired drafts than existing
                        const draftToCreate = Math.max(0, desiredDraftEntries.length - currentDraftMappings.length);
                        for (let i = 0; i < draftToCreate; i++) {
                            const entry = desiredDraftEntries[currentDraftMappings.length + i];
                            if (!entry) continue;
                            const created = createCollaboratorQuoteFrom({ ...entry, collaboratorId: '' }, collaboratorQuoteColumns);
                            newPrev.collaboratorQuotes = [
                                ...(newPrev.collaboratorQuotes || []),
                                created
                            ];
                            newPrev.tasks = newPrev.tasks.map((t: Task) => {
                                if (t.id !== idToEdit) return t;
                                const updatedMappings = [...(t.collaboratorQuotes || []), { collaboratorId: '', quoteId: created.id }];
                                return { ...t, collaboratorQuotes: updatedMappings } as Task;
                            });
                        }
                    }
                } else if (collaboratorQuoteColumns && targetTask.collaboratorQuotes) {
                    newPrev.collaboratorQuotes = (newPrev.collaboratorQuotes || []).map((cq: any) => {
                        const mapping = targetTask.collaboratorQuotes?.find((m: any) => m.quoteId === cq.id);
                        if (mapping) return { ...cq, columns: collaboratorQuoteColumns };
                        return cq;
                    });
                }
            }
            return newPrev;
        });
    }, [setAppData]);


    const handleTaskStatusChange = useCallback((taskId: string, status: Task['status'], subStatusId?: string) => {
        setAppData((prev: AppData) => ({ ...prev, tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status, subStatusId } : t) }));
    }, [setAppData]);

    const handleDeleteTask = data.handleDeleteTask as (taskId: string) => void;

    const handleRestoreTask = useCallback((taskId: string) => {
        setAppData((prev: AppData) => ({ ...prev, tasks: prev.tasks.map(t => t.id === taskId ? ({ ...t, deletedAt: undefined }) : t) }));
    }, [setAppData]);

    const handlePermanentDeleteTask = useCallback((taskId: string) => {
        setAppData((prev: AppData) => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) }));
    }, [setAppData]);

    const handleEmptyTrash = useCallback(() => {
        setAppData((prev: AppData) => ({ ...prev, tasks: prev.tasks.filter(t => !t.deletedAt) }));
    }, [setAppData]);

    const handleAddClientAndSelect = useCallback((dataToAdd: Omit<Client, 'id'>) => {
        const id = `client-${Date.now()}`;
        const client: Client = { id, ...dataToAdd };
        setAppData((prev: AppData) => ({ ...prev, clients: [...prev.clients, client] }));
        return client;
    }, [setAppData]);
    const handleEditClient = useCallback((id: string, dataToUpdate: Omit<Client, 'id'>) => {
        setAppData((prev: AppData) => ({ ...prev, clients: prev.clients.map(c => c.id === id ? { id, ...dataToUpdate } as Client : c) }));
    }, [setAppData]);
    const handleDeleteClient = useCallback((id: string) => {
        setAppData((prev: AppData) => ({ ...prev, clients: prev.clients.filter(c => c.id !== id) }));
    }, [setAppData]);

    const handleAddCollaborator = useCallback((collab: Omit<Collaborator, 'id'>) => {
        const id = `collab-${Date.now()}`;
        setAppData((prev: AppData) => ({ ...prev, collaborators: [...prev.collaborators, { id, ...collab }] }));
    }, [setAppData]);
    const handleEditCollaborator = useCallback((id: string, collab: Omit<Collaborator, 'id'>) => {
        setAppData((prev: AppData) => ({ ...prev, collaborators: prev.collaborators.map(c => c.id === id ? { id, ...collab } : c) }));
    }, [setAppData]);
    const handleDeleteCollaborator = useCallback((id: string) => {
        setAppData((prev: AppData) => ({ ...prev, collaborators: prev.collaborators.filter(c => c.id !== id) }));
    }, [setAppData]);

    const handleAddCategory = useCallback((cat: Omit<Category, 'id'>) => {
        const id = `category-${Date.now()}`;
        setAppData((prev: AppData) => ({ ...prev, categories: [...prev.categories, { id, ...cat }] }));
    }, [setAppData]);
    const handleEditCategory = useCallback((id: string, cat: Omit<Category, 'id'>) => {
        setAppData((prev: AppData) => ({ ...prev, categories: prev.categories.map(c => c.id === id ? { id, ...cat } : c) }));
    }, [setAppData]);
    const handleDeleteCategory = useCallback((id: string) => {
        setAppData((prev: AppData) => ({ ...prev, categories: prev.categories.filter(c => c.id !== id) }));
    }, [setAppData]);

    const updateTaskEisenhowerQuadrant = useCallback((taskId: string, quadrant: Task['eisenhowerQuadrant']) => {
        setAppData((prev: AppData) => ({ ...prev, tasks: prev.tasks.map(t => t.id === taskId ? { ...t, eisenhowerQuadrant: quadrant } : t) }));
    }, [setAppData]);
    const reorderTasksInQuadrant = useCallback((_quadrant: NonNullable<Task['eisenhowerQuadrant']>, _orderedTaskIds: string[]) => {
        // No persistent order field for Eisenhower; no-op placeholder
    }, []);
    const reorderTasksInStatus = useCallback((_status: Task['status'], _orderedTaskIds: string[]) => {
        // Optionally assign sequential kanbanOrder here if needed
    }, []);
    const updateKanbanSettings = useCallback((updates: Partial<Pick<AppSettings, 'kanbanColumnOrder' | 'kanbanColumnVisibility' | 'kanbanSubStatusMode'>>) => {
        setAppData((prev: AppData) => ({ ...prev, appSettings: { ...prev.appSettings, ...updates } }));
    }, [setAppData]);

    // Clear only main data (keep backups)
    const handleClearOnlyData = useCallback(() => {
        // Use truly empty data (no samples) so user starts clean
        setAppData(() => ({ ...emptyAppData } as AppData));
        // Also clear persisted docs and legacy localStorage AI blocks so cards show cleared state
        (async () => {
            try {
                await PouchDBService.removeDocument('aiAnalyses');
                await PouchDBService.removeDocument('aiProductivityAnalyses');
                await PouchDBService.removeDocument('fixedCosts');
                await PouchDBService.removeDocument('expenses');
            } catch (err) {
                console.warn('Failed to clear PouchDB docs during clear-only-data', err);
            }
            try {
                if (typeof window !== 'undefined') {
                    browserLocal.removeItem('freelance-flow-ai-persistent-data');
                    browserLocal.removeItem('ai-writing-presets');
                    browserLocal.removeItem('ai-writing-history');
                    browserLocal.removeItem('ai-writing-versions');
                    browserLocal.removeItem('freelance-flow-filter-presets');
                }
            } catch (err) { console.warn('Failed to clear localStorage AI keys', err); }
        })();
    }, [setAppData]);

    // Clear main data and backups together
    const handleClearDataAndBackups = useCallback(() => {
        setAppData(() => ({ ...emptyAppData } as AppData));
        try { BackupService.clearAllBackups?.(); } catch {}
        // Ensure persisted documents and legacy local keys are cleared as well
        (async () => {
            try {
                await PouchDBService.removeDocument('aiAnalyses');
                await PouchDBService.removeDocument('aiProductivityAnalyses');
                await PouchDBService.removeDocument('fixedCosts');
                await PouchDBService.removeDocument('expenses');
            } catch (err) {
                console.warn('Failed to clear PouchDB docs during clear-data-and-backups', err);
            }
            try {
                if (typeof window !== 'undefined') {
                    browserLocal.removeItem('freelance-flow-ai-persistent-data');
                    browserLocal.removeItem('ai-writing-presets');
                    browserLocal.removeItem('ai-writing-history');
                    browserLocal.removeItem('ai-writing-versions');
                    browserLocal.removeItem('freelance-flow-filter-presets');
                    browserLocal.removeItem('freelance-flow-last-backup');
                    browserLocal.removeItem('freelance-flow-default-export-format');
                }
            } catch (err) { console.warn('Failed to clear localStorage keys during clear-data-and-backups', err); }
        })();
    }, [setAppData]);

    // Backwards-compatible alias (previous behavior now clears both)
    const handleClearAllData = handleClearDataAndBackups;

    const handleFileUpload = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const json = JSON.parse(String(reader.result)) as Partial<AppData>;
                // Persist imported data via saveAppData when available
                if (data.saveAppData) {
                    data.saveAppData(json);
                } else {
                    setAppData(prev => ({ ...prev, ...json } as AppData));
                }
            } catch (e) {
                console.error('Failed to import data file', e);
            }
        };
        reader.readAsText(file);
    }, [setAppData, data.saveAppData]);

    // Backup export/status (used by header)
    const [backupStatusText, setBackupStatusText] = useState<string>(() => {
        if (typeof window === 'undefined') return 'Never';
        const ts = localStorage.getItem('freelance-flow-last-backup');
        return ts ? new Date(ts).toLocaleString() : 'Never';
    });
    
    // Default export format - can be changed by user preference
    const [defaultExportFormat, setDefaultExportFormat] = useState<'json' | 'excel'>(() => {
        // If running on server (no window), default to 'excel'. Only access localStorage in the browser.
        if (typeof window === 'undefined') return 'excel';
        try {
            const saved = localStorage.getItem('freelance-flow-default-export-format');
            return (saved as 'json' | 'excel') || 'excel';
        } catch (e) {
            return 'excel';
        }
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
                // Attach centralized AI analyses (preferred) so backups include persisted aiAnalyses
                ...(appData.aiAnalyses ? { aiAnalyses: appData.aiAnalyses } : {}),
                ...(appData.aiProductivityAnalyses ? { aiProductivityAnalyses: appData.aiProductivityAnalyses } : {}), // Include aiProductivityAnalyses in export
                // Keep legacy local-only AI/preset blocks for backward compatibility
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
    }, [data.appData, defaultExportFormat, data.saveAppData]);
    useEffect(() => {
        const ts = typeof window !== 'undefined' ? localStorage.getItem('freelance-flow-last-backup') : null;
        if (ts) setBackupStatusText(new Date(ts).toLocaleString());
    }, []);

    const contextValue: DashboardContextType = {
        ...data,
        workTime: derivedWorkTime,
    // UI states
    isClientManagerOpen, setIsClientManagerOpen,
    isCollaboratorManagerOpen, setIsCollaboratorManagerOpen,
    isCategoryManagerOpen, setIsCategoryManagerOpen,
    isTemplateManagerOpen, setIsTemplateManagerOpen,
    isProjectManagerOpen, setIsProjectManagerOpen,
    isFixedCostManagerOpen, setIsFixedCostManagerOpen,
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
        updateTask: wrappedUpdateTask,
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
    // Projects
    addProject,
    updateProject,
    deleteProject,
    handleAddProject,
    handleEditProject,
    handleDeleteProject,
    // Settings/Data mgmt
    handleClearAllData,
    handleClearOnlyData,
    handleClearDataAndBackups,
    deleteBackupByTimestamp: (ts: number) => { try { BackupService.deleteBackup?.(ts); } catch {} },
    handleFileUpload,
    saveAppData: data.saveAppData,
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
