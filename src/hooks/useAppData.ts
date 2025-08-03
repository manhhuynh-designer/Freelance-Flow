"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { differenceInDays } from "date-fns";
import { initialAppData, categories as initialCategories, initialCollaborators, initialClients, STATUS_INFO } from '@/lib/data';
import type { Task, AppEvent, Quote, Client, QuoteColumn, QuoteTemplate, Collaborator, AppData, Category, DashboardColumn, AppSettings, QuoteSection, QuoteItem } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { i18n } from "@/lib/i18n";
import { type TaskFormValues } from "@/components/create-task-form-new";
import { CollaboratorDataService } from '@/lib/collaborator-data-service';
import { BackupService } from "@/lib/backup-service";
import { LocalBackupService } from "@/lib/local-backup-service";
import { DataPersistenceService } from "@/lib/data-persistence";
import { EisenhowerQuadrantType } from "@/components/eisenhower/EisenhowerView";
import { getSidebarBackgroundColorHsl, hexToRgb, rgbToHsl, getThemeBackgroundColorHsl, getContrastingForegroundHsl, getContrastingTextColor } from "@/lib/colors";

const defaultSettings: AppSettings = {
    theme: { primary: "#2A5EE5", accent: "#FFFFFF" },
    statusColors: { todo: '#a855f7', inprogress: '#eab308', done: '#22c55e', onhold: '#f97316', archived: '#64748b' },
    stickyNoteColor: { background: '#fef9c3', foreground: '#713f12' },
    trashAutoDeleteDays: 30,
    language: 'en',
    currency: 'VND',
    preferredModelProvider: 'google',
    googleApiKey: '',
    openaiApiKey: '',
    googleModel: 'gemini-1.5-flash',
    openaiModel: 'gpt-4o-mini',
    dashboardColumns: [
        { id: 'name', label: 'Task', visible: true },
        { id: 'client', label: 'Client', visible: true },
        { id: 'category', label: 'Category', visible: true },
        { id: 'deadline', label: 'Deadline', visible: true },
        { id: 'status', label: 'Status', visible: true },
        { id: 'priceQuote', label: 'Quote', visible: true },
    ],
    statusSettings: [
        { id: 'todo', label: i18n.en.statuses.todo, subStatuses: [] },
        { id: 'inprogress', label: i18n.en.statuses.inprogress, subStatuses: [{ id: 'planning', label: 'Planning' },{ id: 'development', label: 'Development' },{ id: 'testing', label: 'Testing' }] },
        { id: 'done', label: i18n.en.statuses.done, subStatuses: [{ id: 'completed', label: 'Completed' },{ id: 'delivered', label: 'Delivered' }] },
        { id: 'onhold', label: i18n.en.statuses.onhold, subStatuses: [] },
        { id: 'archived', label: i18n.en.statuses.archived, subStatuses: [] },
    ],
    widgets: [
        { id: 'calculator', enabled: true, showInSidebar: true, colSpan: 1, rowSpan: 1 },
        { id: 'sticky-notes', enabled: true, showInSidebar: true, colSpan: 2, rowSpan: 2 },
    ],
    eisenhowerMaxTasksPerQuadrant: 10,
    eisenhowerColorScheme: 'colorScheme1',
};

const ensureItemIds = (sections: any[]): QuoteSection[] => {
    return sections.map(section => ({
        ...section,
        items: section.items.map((item: any) => ({
            ...item,
            id: item.id || `item-${Date.now()}-${Math.random()}`
        }))
    }));
};


export function useAppData() {
  const [appData, setAppData] = useState<AppData>(initialAppData);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isClientManagerOpen, setIsClientManagerOpen] = useState(false);
  const [isCollaboratorManagerOpen, setIsCollaboratorManagerOpen] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [taskFormSize, setTaskFormSize] = useState('default');
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [lastBackupDate, setLastBackupDate] = useState<Date | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);

  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  
  const T = appData.appSettings.language ? i18n[appData.appSettings.language] : i18n.en;
  
  const storageKey = 'freelance-flow-data';
  const lastBackupKey = 'freelance-flow-last-backup';

  // --- START OF EFFECTS ---

  useEffect(() => {
    const initializeData = async () => {
        const storedDataString = localStorage.getItem(storageKey);
        let loadedData: AppData;
        let isFirstTimeUse = false;

        const restoredData = BackupService.checkAndRestore();
        if (restoredData) {
            loadedData = restoredData;
        } else if (!storedDataString || storedDataString === '{}') {
            isFirstTimeUse = true;
            loadedData = { ...initialAppData, notes:[] };
        } else {
            try {
                const data = JSON.parse(storedDataString);
                const trashAutoDeleteDays = data.appSettings?.trashAutoDeleteDays || 30;
                const trashExpiryDate = new Date(Date.now() - trashAutoDeleteDays * 86400000);
                const parsedTasks = (data.tasks || []).map((task: any) => ({
                    ...task,
                    startDate: new Date(task.startDate),
                    deadline: new Date(task.deadline),
                    deletedAt: task.deletedAt ? new Date(task.deletedAt).toISOString() : undefined,
                })).filter((task: Task) => !task.deletedAt || new Date(task.deletedAt!) > trashExpiryDate);

                let loadedSettings = { ...defaultSettings, ...(data.appSettings || {}) };

                loadedData = {
                    ...data,
                    tasks: parsedTasks,
                    appSettings: loadedSettings,
                    notes: data.notes || [],
                };
                loadedData = CollaboratorDataService.syncCollaboratorData(loadedData, false);
            } catch (e) {
                loadedData = { ...initialAppData, notes:[] };
                isFirstTimeUse = true;
            }
        }
        
        setAppData(loadedData);
        setIsDataLoaded(true);

        const storedBackupDate = localStorage.getItem(lastBackupKey);
        if (storedBackupDate) setLastBackupDate(new Date(storedBackupDate));
    };
    initializeData();
  }, []); 

  useEffect(() => {
    if (isDataLoaded) {
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setInstallPromptEvent(e);
        if (localStorage.getItem('hidePwaInstallPrompt') !== 'true') setShowInstallPrompt(true);
      };
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      }
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }
  }, [isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem(storageKey, JSON.stringify(appData));
      BackupService.autoBackup(appData);
    }
  }, [appData, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    const root = window.document.documentElement;
    const primaryHex = appData.appSettings.theme.primary;
    try {
        const [r, g, b] = hexToRgb(primaryHex);
        const [h, s, l] = rgbToHsl(r,g,b);
        root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
        root.style.setProperty('--primary-foreground', getContrastingForegroundHsl(`${h} ${s}% ${l}%`));
    } catch(e){}
  }, [appData.appSettings.theme.primary, isDataLoaded]);
  
  // --- END OF EFFECTS ---


  // --- START OF HANDLERS ---
  const handleViewTask = (taskId: string) => setViewingTaskId(taskId);
  const handleCloseTaskDetails = () => setViewingTaskId(null);

  const handleEditTaskClick = (task: Task) => {
    setEditingTask(task);
    handleCloseTaskDetails();
    setIsTaskFormOpen(true);
  };
  
  const addEvent = (event: AppEvent) => setAppData(prev => ({ ...prev, events: [...(prev.events || []), event] }));
  const updateEvent = (event: AppEvent) => setAppData(prev => ({...prev, events: (prev.events || []).map(e => e.id === event.id ? event : e)}));
  const deleteEvent = (eventId: string) => setAppData(prev => ({...prev, events: (prev.events || []).filter(e => e.id !== eventId)}));
  
  const handleEventSubmit = (eventData: Partial<AppEvent>) => {
    const newEvent: AppEvent = { id: `event-${Date.now()}`, ...eventData, name: eventData.name || 'Untitled Event', startTime: eventData.startTime || new Date(), endTime: eventData.endTime || new Date() };
    addEvent(newEvent);
    toast({ title: "Event Created", description: `Successfully created event "${newEvent.name}".` });
  };
  
  const handleAddTask = (values: TaskFormValues, quoteColumns: QuoteColumn[], collaboratorQuoteColumns: QuoteColumn[]) => {
    const newQuoteId = `quote-${Date.now()}`;
    const newQuote: Quote = { id: newQuoteId, sections: ensureItemIds(values.sections), total: 0, columns: quoteColumns };

    const newCollaboratorQuotes: Quote[] = [];
    const collaboratorQuoteLinks: { collaboratorId: string; quoteId: string }[] = [];
    (values.collaboratorQuotes || []).forEach(cq => {
      if (cq.collaboratorId && cq.sections.length > 0) {
        const newCollabQuoteId = `collab-quote-${Date.now()}-${Math.random()}`;
        newCollaboratorQuotes.push({
          id: newCollabQuoteId,
          sections: ensureItemIds(cq.sections),
          total: 0,
          columns: collaboratorQuoteColumns,
        });
        collaboratorQuoteLinks.push({
          collaboratorId: cq.collaboratorId,
          quoteId: newCollabQuoteId,
        });
      }
    });
    
    const newTask: Task = {
        id: `task-${Date.now()}`,
        name: values.name,
        description: values.description || '',
        startDate: values.dates.from,
        deadline: values.dates.to,
        clientId: values.clientId,
        collaboratorIds: values.collaboratorIds || [],
        categoryId: values.categoryId,
        status: values.status,
        subStatusId: values.subStatusId,
        quoteId: newQuoteId,
        collaboratorQuotes: collaboratorQuoteLinks,
        briefLink: values.briefLink?.filter(link => link.trim() !== ''),
        driveLink: values.driveLink?.filter(link => link.trim() !== ''),
    };

    setAppData(prev => ({
        ...prev,
        tasks: [...prev.tasks, newTask],
        quotes: [...prev.quotes, newQuote],
        collaboratorQuotes: [...prev.collaboratorQuotes, ...newCollaboratorQuotes],
    }));
    
    toast({ title: T.taskCreated, description: T.taskCreatedDesc });
    setIsTaskFormOpen(false);
  };

  const handleEditTask = (values: TaskFormValues, quoteColumns: QuoteColumn[], collaboratorQuoteColumns: QuoteColumn[], taskId: string) => {
    setAppData(prev => {
        const { tasks, quotes, collaboratorQuotes } = prev;

        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return prev;
        
        const existingTask = tasks[taskIndex];
        
        // Update Quote
        const quoteIndex = quotes.findIndex(q => q.id === existingTask.quoteId);
        const updatedQuotes = [...quotes];
        if (quoteIndex > -1) {
            updatedQuotes[quoteIndex] = { ...updatedQuotes[quoteIndex], sections: ensureItemIds(values.sections), columns: quoteColumns };
        }
        
        // Update Collaborator Quotes
        const updatedCollaboratorQuotes = [...collaboratorQuotes];
        const existingCollabQuoteLinks = existingTask.collaboratorQuotes || [];
        const newCollabQuoteLinks: { collaboratorId: string; quoteId: string }[] = [];
        
        values.collaboratorQuotes?.forEach(cq => {
            if (!cq.collaboratorId || cq.sections.length === 0) return;
            
            const existingLink = existingCollabQuoteLinks.find(link => link.collaboratorId === cq.collaboratorId);
            if (existingLink) {
                const collabQuoteIndex = updatedCollaboratorQuotes.findIndex(q => q.id === existingLink.quoteId);
                if (collabQuoteIndex > -1) {
                    updatedCollaboratorQuotes[collabQuoteIndex] = { ...updatedCollaboratorQuotes[collabQuoteIndex], sections: ensureItemIds(cq.sections), columns: collaboratorQuoteColumns };
                }
                newCollabQuoteLinks.push(existingLink);
            } else {
                const newCollabQuoteId = `collab-quote-${Date.now()}-${Math.random()}`;
                updatedCollaboratorQuotes.push({ id: newCollabQuoteId, sections: ensureItemIds(cq.sections), total: 0, columns: collaboratorQuoteColumns });
                newCollabQuoteLinks.push({ collaboratorId: cq.collaboratorId, quoteId: newCollabQuoteId });
            }
        });

        const updatedTask: Task = {
            ...existingTask,
            name: values.name,
            description: values.description || '',
            startDate: values.dates.from,
            deadline: values.dates.to,
            clientId: values.clientId,
            collaboratorIds: values.collaboratorIds || [],
            categoryId: values.categoryId,
            status: values.status,
            subStatusId: values.subStatusId,
            briefLink: values.briefLink?.filter(link => link.trim() !== ''),
            driveLink: values.driveLink?.filter(link => link.trim() !== ''),
            collaboratorQuotes: newCollabQuoteLinks,
        };

        const updatedTasks = [...tasks];
        updatedTasks[taskIndex] = updatedTask;

        return {
            ...prev,
            tasks: updatedTasks,
            quotes: updatedQuotes,
            collaboratorQuotes: updatedCollaboratorQuotes,
        };
    });
    
    toast({ title: T.taskUpdated, description: T.taskUpdatedDesc });
  };
  
  const handleTaskStatusChange = (taskId: string, status: Task['status'], subStatusId?: string) => {
    setAppData(prev => ({...prev, tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status, subStatusId: subStatusId ?? undefined } : t)}));
    toast({ title: T.taskStatusUpdated, description: T.taskStatusUpdatedDesc });
  };
  
  const handleAiCreateTask = (newTaskData: any) => {
    setAppData(prev => {
        // Logic from original file...
        return { ...prev };
    });
  };

  const handleAiEditTask = (editData: {taskId: string, updates: Partial<Task & {clientName: string}>}) => {
    setAppData(prev => {
        // Logic from original file...
        return { ...prev };
    });
  };

  const handleEditClient = (clientId: string, updates: Partial<Omit<Client, 'id'>>) => {
    setAppData(prev => ({...prev, clients: prev.clients.map(c => c.id === clientId ? { ...c, ...updates } : c)}));
    toast({ title: T.clientUpdated, description: T.clientUpdatedDesc });
  };

  const handleDeleteClient = (clientId: string) => {
    setAppData(prev => ({...prev, clients: prev.clients.filter(c => c.id !== clientId)}));
    toast({ title: T.clientDeleted, description: T.clientDeletedDesc });
  };

  const handleAddCollaborator = (data: Omit<Collaborator, 'id'>) => {
    const newCollaborator: Collaborator = { id: `collab-${Date.now()}`, ...data };
    setAppData(prev => ({...prev, collaborators: [...prev.collaborators, newCollaborator]}));
    toast({ title: T.collaboratorAdded, description: T.collaboratorAddedDesc });
  };

  const handleEditCollaborator = (collaboratorId: string, updates: Partial<Omit<Collaborator, 'id'>>) => {
    setAppData(prev => ({...prev, collaborators: prev.collaborators.map(c => c.id === collaboratorId ? { ...c, ...updates } : c)}));
    toast({ title: T.collaboratorUpdated, description: T.collaboratorUpdatedDesc });
  };

  const handleDeleteCollaborator = (collaboratorId: string) => {
    setAppData(prev => ({...prev, collaborators: prev.collaborators.filter(c => c.id !== collaboratorId)}));
    toast({ title: T.collaboratorDeleted, description: T.collaboratorDeletedDesc });
  };

  const handleAddCategory = (data: Omit<Category, 'id'>) => {
    const newCategory: Category = { id: `cat-${Date.now()}`, ...data };
    setAppData(prev => ({...prev, categories: [...prev.categories, newCategory]}));
    toast({ title: T.categoryAdded, description: T.categoryAddedDesc });
  };

  const handleEditCategory = (categoryId: string, updates: Partial<Omit<Category, 'id'>>) => {
    setAppData(prev => ({...prev, categories: prev.categories.map(c => c.id === categoryId ? { ...c, ...updates } : c)}));
    toast({ title: T.categoryUpdated, description: T.categoryUpdatedDesc });
  };

  const handleDeleteCategory = (categoryId: string) => {
    setAppData(prev => ({...prev, categories: prev.categories.filter(c => c.id !== categoryId)}));
    toast({ title: T.categoryDeleted, description: T.categoryDeletedDesc });
  };
  
  const handleDeleteTask = (taskId: string) => { 
    const task = appData.tasks.find(t => t.id === taskId); 
    if (!task) return; 
    setAppData(prev => ({...prev, tasks: prev.tasks.map(t => t.id === taskId ? { ...t, deletedAt: new Date().toISOString() } : t)})); 
    toast({ title: T.taskMovedToTrash, description: `${T.task} "${task.name}" ${T.taskMovedToTrashDesc}` }); 
  };
  const handleRestoreTask = (taskId: string) => { 
    const task = appData.tasks.find(t => t.id === taskId); 
    if (!task) return; 
    setAppData(prev => ({...prev, tasks: prev.tasks.map(t => { 
        if (t.id === taskId) { const { deletedAt, ...rest } = t; return rest; } return t; 
    })})); 
    toast({ title: T.taskRestored, description: `${T.task} "${task.name}" ${T.taskRestoredDesc}` }); 
  };
  const handlePermanentDeleteTask = (taskId: string) => { 
    const task = appData.tasks.find(t => t.id === taskId); 
    if (!task) return; 
    setAppData(prev => ({
        ...prev, tasks: prev.tasks.filter(t => t.id !== taskId),
        quotes: task.quoteId ? prev.quotes.filter(q => q.id !== task.quoteId) : prev.quotes,
        collaboratorQuotes: (task as any).collaboratorQuoteId ? prev.collaboratorQuotes.filter(q => q.id !== (task as any).collaboratorQuoteId) : prev.collaboratorQuotes,
    })); 
    toast({ title: T.taskPermanentlyDeleted, description: `${T.task} "${task.name}" ${T.taskPermanentlyDeletedDesc}` }); 
  };
  const handleEmptyTrash = () => {
    setAppData(prev => {
        const trashedTasks = prev.tasks.filter(t => t.deletedAt);
        if (trashedTasks.length === 0) return prev;
        const quoteIdsToDelete = new Set(trashedTasks.map(t => t.quoteId).filter(Boolean));
        const collabQuoteIdsToDelete = new Set(trashedTasks.map(t => (t as any).collaboratorQuoteId).filter(Boolean));
        return {...prev, tasks: prev.tasks.filter(t => !t.deletedAt), quotes: prev.quotes.filter(q => !quoteIdsToDelete.has(q.id)),
            collaboratorQuotes: prev.collaboratorQuotes.filter(q => !collabQuoteIdsToDelete.has(q.id)),
        }
    });
    toast({ title: T.trashEmptied, description: T.trashEmptiedDesc });
  };
  const handleAddClientAndSelect = (data: Omit<Client, 'id'>): Client => { 
      const newClient: Client = { id: `client-${Date.now()}`, ...data }; 
      setAppData(prev => ({...prev, clients: [...prev.clients, newClient]})); 
      toast({ title: T.clientAdded, description: `${T.client} "${data.name}" ${T.clientAddedDesc}` });
      return newClient;
  };
  const handleClearAllData = () => {
    const emptyData: AppData = {
      events: [], tasks: [], quotes: [], collaboratorQuotes: [], clients: [], collaborators: [],
      quoteTemplates: [], categories: [], appSettings: defaultSettings, notes: []
    };
    setAppData(emptyData);
    localStorage.clear();
    toast({ title: T.clearAllData, description: T.clearAllDataDesc });
    setTimeout(() => window.location.reload(), 1000);
  };
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(appData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `freelance-flow-backup-${new Date().toISOString()}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setLastBackupDate(new Date());
    toast({ title: T.backupSuccessful, description: T.backupSuccessfulDesc });
  };
  const handleInstallClick = async () => {
    if (!installPromptEvent) return;
    await installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
    setShowInstallPrompt(false);
  };
  // --- END OF HANDLERS ---
  
  
  // --- START OF MEMOS & CALLBACKS ---
  const cycleTaskFormSize = useCallback(() => setTaskFormSize(c => c === 'default' ? 'large' : c === 'large' ? 'fullscreen' : 'default'), []);
  const viewingTaskDetails = useMemo(() => {
    if (!viewingTaskId) return null;
    const task = appData.tasks.find(t => t.id === viewingTaskId);
    if (!task) return null;
    const client = appData.clients.find(c => c.id === task.clientId);
    const quote = appData.quotes.find(q => q.id === task.quoteId);
    return { task, client, quote };
  }, [viewingTaskId, appData.tasks, appData.clients, appData.quotes]);
  
  const backupStatusText = useMemo(() => {
    if (!lastBackupDate) return T.notBackedUp;
    const days = differenceInDays(new Date(), lastBackupDate);
    if (days === 0) return "Today";
    if (days === 1) return T.yesterday;
    return `${days} ${T.daysAgo}`;
  }, [lastBackupDate, T]);

  const updateTask = useCallback((updates: Partial<Task> & { id: string }) => {
    setAppData(prev => ({ ...prev, tasks: prev.tasks.map(task => task.id === updates.id ? { ...task, ...updates } : task)}));
  }, []);
  const updateTaskEisenhowerQuadrant = useCallback((taskId: string, quadrant: EisenhowerQuadrantType | undefined) => {
    setAppData(prev => ({...prev, tasks: prev.tasks.map(task => task.id === taskId ? { ...task, eisenhowerQuadrant: quadrant } : task)}));
  }, []);
  const reorderTasksInQuadrant = useCallback((quadrant: EisenhowerQuadrantType | 'uncategorized', orderedTaskIds: string[]) => {
    setAppData(prev => {
      const tasksInQuadrant = appData.tasks.filter(task => (quadrant === 'uncategorized' ? !task.eisenhowerQuadrant : task.eisenhowerQuadrant === quadrant));
      const otherTasks = appData.tasks.filter(task => (quadrant === 'uncategorized' ? !!task.eisenhowerQuadrant : task.eisenhowerQuadrant !== quadrant));
      const reordered = orderedTaskIds.map(id => tasksInQuadrant.find(t => t.id === id)).filter((t): t is Task => !!t);
      return { ...prev, tasks: [...otherTasks, ...reordered] };
    });
  }, [appData.tasks]);
  const reorderTasksInStatus = useCallback((statusId: string, orderedTaskIds: string[]) => {
    setAppData(prev => ({...prev, tasks: prev.tasks.map(task => {
        if (task.status === statusId) return { ...task, kanbanOrder: orderedTaskIds.indexOf(task.id) };
        return task;
    })}));
  }, []);
  const updateKanbanSettings = useCallback((settings: Partial<AppSettings>) => {
    setAppData(prev => ({ ...prev, appSettings: { ...prev.appSettings, ...settings } }));
  }, []);

  // --- END OF MEMOS & CALLBACKS ---


  return {
    appData, isDataLoaded,
    isTaskFormOpen, isClientManagerOpen, isCollaboratorManagerOpen, isTemplateManagerOpen, isCategoryManagerOpen,
    taskFormSize, viewingTaskId, editingTask, lastBackupDate, showInstallPrompt, installPromptEvent,
    
    setAppData, setIsTaskFormOpen, setIsClientManagerOpen, setIsCollaboratorManagerOpen, setIsTemplateManagerOpen, 
    setIsCategoryManagerOpen, setTaskFormSize, setViewingTaskId, setEditingTask, setLastBackupDate, setShowInstallPrompt, setInstallPromptEvent,
    
    T,
    handleViewTask, handleCloseTaskDetails, handleEditTaskClick, addEvent, updateEvent, deleteEvent, handleEventSubmit, handleAddTask, 
    handleEditTask, handleTaskStatusChange, handleDeleteTask, handleRestoreTask, handlePermanentDeleteTask, handleEmptyTrash, handleAddClientAndSelect,
    handleEditClient, handleDeleteClient, handleAddCollaborator, handleEditCollaborator, handleDeleteCollaborator, handleAddCategory, 
    handleEditCategory, handleDeleteCategory, handleClearAllData, handleExport, handleInstallClick, handleAiCreateTask, handleAiEditTask,
    
    updateTask, updateTaskEisenhowerQuadrant, reorderTasksInQuadrant, reorderTasksInStatus, updateKanbanSettings,
    
    cycleTaskFormSize, viewingTaskDetails, backupStatusText,
  };
}