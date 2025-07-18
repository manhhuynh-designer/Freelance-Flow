"use client";


import { useState, useMemo, useEffect, useCallback, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';

// Place helper at top-level, after all imports, before main component
function SidebarTrashMenuItem({ T }: { T: any }) {
  const { useSearchParams } = require('next/navigation');
  const searchParams = useSearchParams();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={searchParams.get('view') === 'trash'}>
        <Link href="/dashboard?view=trash"><Trash2 />{T.trash}</Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
import { useTheme } from 'next-themes';
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Expand, Shrink, PlusCircle, Users, FileText, Briefcase, Settings, Download, X, LayoutGrid, Cog, Puzzle, Trash2 } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarInset, SidebarSeparator, SidebarTrigger, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSkeleton } from "@/components/ui/sidebar";
import { initialAppData, categories as initialCategories, initialCollaborators, initialClients, STATUS_INFO } from '@/lib/data';
import type { Task, Quote, Client, QuoteColumn, QuoteTemplate, Collaborator, AppData, Category, DashboardColumn, AppSettings, QuoteSection, QuoteItem } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { ClientManager } from "@/components/client-manager";
import { CollaboratorManager } from "@/components/collaborator-manager";
import { QuoteTemplateManager } from "@/components/quote-template-manager";
import { CategoryManager } from "@/components/category-manager";
import { i18n } from "@/lib/i18n";
import { CreateTaskForm, type TaskFormValues } from "@/components/create-task-form";
import { cn } from "@/lib/utils";
import { QuickChat } from "@/components/quick-chat";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import Image from "next/image";
import { differenceInDays } from "date-fns";
import { DashboardContext } from '@/contexts/dashboard-context';
import { CollaboratorDataService } from '@/lib/collaborator-data-service';
import { PageTitle } from "@/components/page-title";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { DataRestoredNotification } from "@/components/data-restored-notification";
import { getSidebarBackgroundColorHsl, hexToRgb, rgbToHsl, getThemeBackgroundColorHsl, getContrastingForegroundHsl, getContrastingTextColor } from "@/lib/colors";
import { WIDGETS } from "@/lib/widgets";
import { BackupService } from "@/lib/backup-service";
import { LocalBackupService } from "@/lib/local-backup-service";
import { DataPersistenceService } from "@/lib/data-persistence";

const defaultSettings: AppSettings = {
    theme: {
        primary: "#2A5EE5", // Default theme primary
        accent: "#FFFFFF",  // Default theme accent
    },
    statusColors: {
        todo: '#a855f7',
        inprogress: '#eab308',
        done: '#22c55e',
        onhold: '#f97316',
        archived: '#64748b',
    },
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
        { 
            id: 'inprogress', 
            label: i18n.en.statuses.inprogress, 
            subStatuses: [
                { id: 'planning', label: 'Planning' },
                { id: 'development', label: 'Development' },
                { id: 'testing', label: 'Testing' }
            ]
        },
        { 
            id: 'done', 
            label: i18n.en.statuses.done, 
            subStatuses: [
                { id: 'completed', label: 'Completed' },
                { id: 'delivered', label: 'Delivered' }
            ]
        },
        { id: 'onhold', label: i18n.en.statuses.onhold, subStatuses: [] },
        { id: 'archived', label: i18n.en.statuses.archived, subStatuses: [] },
    ],
    widgets: [
        { id: 'calculator', enabled: true, showInSidebar: true, colSpan: 1, rowSpan: 1 },
        { id: 'sticky-notes', enabled: true, showInSidebar: true, colSpan: 2, rowSpan: 2 },
    ]
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isClientManagerOpen, setIsClientManagerOpen] = useState(false);
  const [isCollaboratorManagerOpen, setIsCollaboratorManagerOpen] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [taskFormSize, setTaskFormSize] = useState('default');
  
  const [appData, setAppData] = useState<AppData>(initialAppData);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<Date | null>(null);

  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);

  const { toast } = useToast();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  
  const T = appData.appSettings.language ? i18n[appData.appSettings.language] : i18n.en;
  
  const storageKey = 'freelance-flow-data';
  const lastBackupKey = 'freelance-flow-last-backup';

  useEffect(() => {
    const initializeData = async () => {
      const storedDataString = localStorage.getItem(storageKey);
      let loadedData: AppData | undefined;
      let isFirstTimeUse = false;

      // Kiểm tra và khôi phục dữ liệu nếu bị mất từ localStorage backup
      const restoredData = BackupService.checkAndRestore();
      if (restoredData) {
        console.log('Data restored from localStorage backup successfully');
        loadedData = restoredData;
        setAppData(loadedData);
        setIsDataLoaded(true);
        return;
      }

      // Nếu localStorage backup cũng không có, thử IndexedDB
      if (!storedDataString || storedDataString === '{}') {
        try {
          const indexedDBRestored = await DataPersistenceService.restoreFromIndexedDB();
          if (indexedDBRestored) {
            console.log('Data restored from IndexedDB successfully');
            // Reload để áp dụng dữ liệu từ IndexedDB
            setTimeout(() => window.location.reload(), 500);
            return;
          }
        } catch (error) {
          console.warn('IndexedDB restore failed:', error);
        }
        
        // If no stored data at all, this is first time use
        if (!storedDataString) {
          isFirstTimeUse = true;
          console.log('First time use detected, loading sample data');
          loadedData = initialAppData;
        } else {
          // storedDataString === '{}' means data was explicitly cleared
          console.log('Data was explicitly cleared, starting with empty state');
          loadedData = {
            tasks: [],
            quotes: [],
            collaboratorQuotes: [],
            clients: [],
            collaborators: [],
            quoteTemplates: [],
            categories: [],
            appSettings: defaultSettings,
          };
        }
      }

      if (storedDataString) {
          try {
              const data: any = JSON.parse(storedDataString);
              const trashAutoDeleteDays = data.appSettings?.trashAutoDeleteDays || 30;
              const trashExpiryDate = new Date(Date.now() - trashAutoDeleteDays * 86400000);

              const parsedTasks = (data.tasks || []).map((task: any) => ({
                  ...task,
                  startDate: new Date(task.startDate),
                  deadline: new Date(task.deadline),
                  deletedAt: task.deletedAt ? new Date(task.deletedAt).toISOString() : undefined,
              })).filter((task: Task) => !task.deletedAt || new Date(task.deletedAt!) > trashExpiryDate);

              const migrateQuote = (q: any) => {
                  if (q && q.items && !q.sections) {
                      return { ...q, sections: [{ id: `section-migrated-${q.id}`, name: T.untitledSection || 'Main Items', items: q.items }], items: undefined };
                  }
                  return q;
              };

              const migrateTemplate = (t: any) => {
                   if (t && t.items && !t.sections) {
                      return { ...t, sections: [{ id: `section-migrated-tpl-${t.id}`, name: T.untitledSection || 'Main Items', items: t.items }], items: undefined };
                  }
                  return t;
              }

              let loadedSettings = { ...defaultSettings, ...(data.appSettings || {}) };

              if (!loadedSettings.dashboardColumns || loadedSettings.dashboardColumns.length === 0) {
                  loadedSettings.dashboardColumns = defaultSettings.dashboardColumns;
              } else {
                  const defaultCols = defaultSettings.dashboardColumns || [];
                  const loadedCols = loadedSettings.dashboardColumns || [];
                  const defaultColMap = new Map(defaultCols.map(c => [c.id, c]));
                  
                  const newCols: DashboardColumn[] = [];
                  loadedCols.forEach((col: DashboardColumn) => {
                      if (defaultColMap.has(col.id)) {
                          newCols.push(col);
                      }
                  });
                  defaultCols.forEach(defaultCol => {
                      if (!newCols.find(c => c.id === defaultCol.id)) {
                          newCols.push(defaultCol);
                      }
                  });
                  loadedSettings.dashboardColumns = newCols;
              }
              if (!loadedSettings.statusSettings || loadedSettings.statusSettings.length !== STATUS_INFO.length) {
                  loadedSettings.statusSettings = defaultSettings.statusSettings;
              }
              const defaultWidgetMap = new Map((defaultSettings.widgets || []).map(w => [w.id, w]));
              const loadedWidgets = (loadedSettings.widgets || []).map((w: any) => {
                  const defaultWidget = defaultWidgetMap.get(w.id);
                  return { ...defaultWidget, ...w };
              });
              const loadedWidgetIds = new Set(loadedWidgets.map((w: any) => w.id));
              defaultSettings.widgets.forEach(defaultWidget => {
                  if (!loadedWidgetIds.has(defaultWidget.id)) {
                      loadedWidgets.push(defaultWidget);
                  }
              });
              loadedSettings.widgets = loadedWidgets;

              // Check if this is a fresh start (no data) vs explicit clear (empty arrays)
              const isFreshStart = !data.clients && !data.collaborators && !data.categories && !data.quoteTemplates;
              const wasExplicitlyCleared = (data.clients?.length === 0 && data.collaborators?.length === 0 && data.categories?.length === 0);

              loadedData = {
                tasks: parsedTasks,
                quotes: (data.quotes || []).map(migrateQuote),
                collaboratorQuotes: (data.collaboratorQuotes || []).map(migrateQuote),
                clients: (isFreshStart && !wasExplicitlyCleared) ? initialClients : (data.clients || []),
                collaborators: (isFreshStart && !wasExplicitlyCleared) ? initialCollaborators : (data.collaborators || []),
                quoteTemplates: (data.quoteTemplates || []).map(migrateTemplate),
                categories: (isFreshStart && !wasExplicitlyCleared) ? initialCategories : (data.categories || []),
                appSettings: loadedSettings,
              };

              // Ensure collaborator data integrity
              const wasDataCleared = wasExplicitlyCleared;
              loadedData = CollaboratorDataService.syncCollaboratorData(loadedData, wasDataCleared);
          } catch (e) {
              console.error("Failed to parse data from localStorage", e);
              // If parsing fails, treat as first time use if we haven't set loadedData yet
              if (!loadedData) {
                console.log('Data parsing failed, falling back to sample data');
                loadedData = initialAppData;
                isFirstTimeUse = true;
              }
          }
      }
      
      // If we still don't have loadedData (shouldn't happen), use empty state
      if (!loadedData) {
        console.warn('No data loaded, creating empty state');
        loadedData = {
          tasks: [],
          quotes: [],
          collaboratorQuotes: [],
          clients: [],
          collaborators: [],
          quoteTemplates: [],
          categories: [],
          appSettings: defaultSettings,
        };
      }
      
      // Always ensure collaborator data integrity, even for default data
      // Only restore initial data if this is truly a fresh start (not a cleared state)
      const hasAnyStoredData = !!storedDataString && storedDataString !== '{}';
      const shouldSkipInitialRestore = hasAnyStoredData && !isFirstTimeUse;
      const finalData = loadedData!; // We know loadedData is defined by this point
      const syncedData = CollaboratorDataService.syncCollaboratorData(finalData, shouldSkipInitialRestore);
      
      setAppData(syncedData);
      
      const storedBackupDate = localStorage.getItem(lastBackupKey);
      if (storedBackupDate) {
          setLastBackupDate(new Date(storedBackupDate));
      }
      
      // Initialize local folder backup service
      LocalBackupService.restoreSettings();
      
      setIsDataLoaded(true);
    };

    // Call the async initialization
    initializeData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isDataLoaded) {
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setInstallPromptEvent(e);
        if (localStorage.getItem('hidePwaInstallPrompt') !== 'true') {
            setShowInstallPrompt(true);
        }
      };
      
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      if (!isStandalone) {
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      }

      return () => {
        if (!isStandalone) {
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        }
      };
    }
  }, [isDataLoaded]);

  const debouncedAppData = useDebounce(appData, 1000);

  useEffect(() => {
    if (isDataLoaded) {
        localStorage.setItem(storageKey, JSON.stringify(debouncedAppData));
        
        // Include filter presets for backup services
        const filterPresets = JSON.parse(localStorage.getItem('freelance-flow-filter-presets') || '[]');
        const appDataWithPresets = {
          ...debouncedAppData,
          filterPresets
        };
        
        // Tự động backup dữ liệu để ngăn chặn mất dữ liệu
        BackupService.autoBackup(appDataWithPresets);
        // Sync với IndexedDB để có backup layer phụ
        DataPersistenceService.syncWithIndexedDB();
        // Trigger local folder auto-save if enabled
        LocalBackupService.autoSaveIfNeeded(appDataWithPresets);
    }
  }, [debouncedAppData, storageKey, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    
    const root = window.document.documentElement;

    // Convert HEX to HSL string for CSS variables and helper functions
    const primaryHex = appData.appSettings.theme.primary;
    const accentHex = appData.appSettings.theme.accent;

    let primaryHsl = '221 83% 53%'; // Default fallback
    let accentHsl = '221 83% 45%'; // Default fallback

    try {
      const [pr, pg, pb] = hexToRgb(primaryHex);
      const [ph, ps, pl] = rgbToHsl(pr, pg, pb);
      primaryHsl = `${ph} ${ps}% ${pl}%`;
    } catch (e) {
      console.error("Invalid primary theme color (reverting to default):", primaryHex, e);
    }

    try {
      const [ar, ag, ab] = hexToRgb(accentHex);
      const [ah, as, al] = rgbToHsl(ar, ag, ab);
      accentHsl = `${ah} ${as}% ${al}%`;
    } catch (e) {
      console.error("Invalid accent theme color (reverting to default):", accentHex, e);
    }
    
    root.style.setProperty('--primary', primaryHsl);
    root.style.setProperty('--accent', accentHsl);
    root.style.setProperty('--primary-foreground', getContrastingForegroundHsl(primaryHsl));
    root.style.setProperty('--accent-foreground', getContrastingForegroundHsl(accentHsl));
    
    const currentTheme = (resolvedTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
    const sidebarBg = getSidebarBackgroundColorHsl(primaryHsl, currentTheme);
    root.style.setProperty('--sidebar-background', sidebarBg);

    if (currentTheme === 'light') {
        // If accent is white, force a white background for a cleaner look.
        if (accentHex.toUpperCase() === '#FFFFFF') {
            root.style.setProperty('--background', '0 0% 100%');
        } else {
            root.style.setProperty('--background', getThemeBackgroundColorHsl(primaryHsl));
        }
    } else {
        root.style.removeProperty('--background');
    }

    Object.entries(appData.appSettings.statusColors).forEach(([key, value]) => {
      try {
        const [r, g, b] = hexToRgb(value);
        const [h, s, l] = rgbToHsl(r, g, b);
        const hslString = `${h} ${s}% ${l}%`;
        root.style.setProperty(`--status-${key}`, hslString);
        root.style.setProperty(`--status-${key}-foreground`, getContrastingTextColor(value));
      } catch (e) {
        console.error(`Invalid hex color for status ${key}: ${value}`, e);
      }
    });

    try {
        const stickyBgHex = appData.appSettings.stickyNoteColor.background;
        const [sr, sg, sb] = hexToRgb(stickyBgHex);
        const [sh, ss, sl] = rgbToHsl(sr, sg, sb);
        const stickyBgHsl = `${sh} ${ss}% ${sl}%`;
        root.style.setProperty('--sticky-note-bg', stickyBgHsl);
        root.style.setProperty('--sticky-note-fg', getContrastingTextColor(stickyBgHex));
    } catch (e) {
        console.error("Invalid hex color for sticky note background:", appData.appSettings.stickyNoteColor.background, e);
    }
  }, [appData.appSettings, isDataLoaded, resolvedTheme]);

  const sidebarWidgets = useMemo(() => {
    return (appData.appSettings.widgets || [])
      .filter(w => w.enabled && w.showInSidebar)
      .map(widgetConfig => {
        const widgetDef = WIDGETS.find(w => w.id === widgetConfig.id);
        if (!widgetDef) return null;
        const WidgetComponent = widgetDef.component;
        return <WidgetComponent key={widgetDef.id} settings={appData.appSettings} />;
      })
      .filter(Boolean);
  }, [appData.appSettings]);

  const setTasks = (updater: React.SetStateAction<Task[]>) => {
    setAppData(prev => ({ ...prev, tasks: typeof updater === 'function' ? updater(prev.tasks) : updater }));
  };
  const setQuotes = (updater: React.SetStateAction<Quote[]>) => {
    setAppData(prev => ({ ...prev, quotes: typeof updater === 'function' ? updater(prev.quotes) : updater }));
  };
  const setCollaboratorQuotes = (updater: React.SetStateAction<Quote[]>) => {
    setAppData(prev => ({ ...prev, collaboratorQuotes: typeof updater === 'function' ? updater(prev.collaboratorQuotes) : updater }));
  };
  const setClients = (updater: React.SetStateAction<Client[]>) => {
    setAppData(prev => ({ ...prev, clients: typeof updater === 'function' ? updater(prev.clients) : updater }));
  };
  const setCollaborators = (updater: React.SetStateAction<Collaborator[]>) => {
    setAppData(prev => ({ ...prev, collaborators: typeof updater === 'function' ? updater(prev.collaborators) : updater }));
  };
  const setQuoteTemplates = (updater: React.SetStateAction<QuoteTemplate[]>) => {
    setAppData(prev => ({ ...prev, quoteTemplates: typeof updater === 'function' ? updater(prev.quoteTemplates) : updater }));
  };
  const setCategories = (updater: React.SetStateAction<Category[]>) => {
    setAppData(prev => ({ ...prev, categories: typeof updater === 'function' ? updater(prev.categories) : updater }));
  };
  const setAppSettings = (updater: React.SetStateAction<AppSettings>) => {
    setAppData(prev => ({ ...prev, appSettings: typeof updater === 'function' ? updater(prev.appSettings) : updater }));
  };
  
  const handleAddTask = (
    values: TaskFormValues, 
    quoteColumns: QuoteColumn[],
    collaboratorQuoteColumns: QuoteColumn[],
  ) => {
    const { sections, collaboratorQuotes, dates, ...taskDetails } = values;

    const calculateTotal = (sections: QuoteSection[] = []) => sections.reduce((total, section) => 
        total + section.items.reduce((sectionTotal, item) => sectionTotal + ((item.quantity || 1) * (item.unitPrice || 0)), 0), 0);
    
    // Ensure all items have a string id
    const normalizedSections: QuoteSection[] = (sections || []).map(section => ({
      ...section,
      items: (section.items || []).map((item, idx) => ({
        ...item,
        id: item.id || `item-${Date.now()}-${idx}`, // Ensure id is always a string
      })) as QuoteItem[],
    }));

    const quoteTotal = calculateTotal(normalizedSections);
    const taskData = { ...taskDetails, startDate: dates.from, deadline: dates.to };

    const newQuoteId = `quote-${Date.now()}`;
    const newQuote: Quote = { id: newQuoteId, sections: normalizedSections, total: quoteTotal, columns: quoteColumns };
    
    // Handle multiple collaborator quotes
    const newCollaboratorQuotes: Quote[] = [];
    const collaboratorQuoteIds: string[] = [];
    
    if (collaboratorQuotes && collaboratorQuotes.length > 0) {
      collaboratorQuotes.forEach((collabQuote, index) => {
        if (collabQuote.sections && collabQuote.sections.length > 0) {
          const normalizedCollaboratorSections: QuoteSection[] = collabQuote.sections.map(section => ({
            ...section,
            items: (section.items || []).map((item, idx) => ({
              ...item,
              id: item.id || `collab-item-${Date.now()}-${index}-${idx}`, // Ensure id is always a string
            })) as QuoteItem[],
          }));
          
          const collaboratorQuoteTotal = calculateTotal(normalizedCollaboratorSections);
          const newCollabId = `collab-quote-${Date.now()}-${index}`;
          
          newCollaboratorQuotes.push({ 
            id: newCollabId, 
            sections: normalizedCollaboratorSections, 
            total: collaboratorQuoteTotal, 
            columns: collaboratorQuoteColumns 
          });
          
          collaboratorQuoteIds.push(newCollabId);
        }
      });
    }
    
    const newTask: Task = { 
      id: `task-${Date.now()}`, 
      ...taskData, 
      quoteId: newQuoteId, 
      collaboratorQuoteIds: collaboratorQuoteIds, // Array of collaborator quote IDs
      collaboratorQuoteId: undefined // Keep for backward compatibility
    } as Task;
    
    setAppData(prev => ({
        ...prev,
        tasks: [newTask, ...prev.tasks],
        quotes: [...prev.quotes, newQuote],
        collaboratorQuotes: [...prev.collaboratorQuotes, ...newCollaboratorQuotes],
    }));

    toast({ title: T.taskCreated, description: T.taskCreatedDesc });
    setIsTaskFormOpen(false);
  }

  const handleEditTask = (
    values: TaskFormValues, 
    quoteColumns: QuoteColumn[],
    collaboratorQuoteColumns: QuoteColumn[],
    taskId: string
  ) => {
    const { sections, collaboratorQuotes, dates, ...taskDetails } = values;

    const calculateTotal = (sections: QuoteSection[] = []) => sections.reduce((total, section) => 
        total + section.items.reduce((sectionTotal, item) => sectionTotal + ((item.quantity || 1) * (item.unitPrice || 0)), 0), 0);
    
    const normalizedSections: QuoteSection[] = (sections || []).map(section => ({
      ...section,
      items: (section.items || []).map((item, idx) => ({
        ...item,
        id: item.id || `item-${Date.now()}-${idx}`, // Ensure id is always a string
      })) as QuoteItem[],
    }));

    const quoteTotal = calculateTotal(normalizedSections);
    const taskData = { ...taskDetails, startDate: dates.from, deadline: dates.to };
    
    setAppData(prev => {
        const taskToUpdate = prev.tasks.find(t => t.id === taskId);
        if (!taskToUpdate) return prev;
        
        const updatedTask = { ...taskToUpdate, ...taskData };
        
        const newQuotes = prev.quotes.map(q => 
            q.id === taskToUpdate!.quoteId 
                ? { ...q, sections: normalizedSections, total: quoteTotal, columns: quoteColumns } 
                : q
        );
        
        let newCollaboratorQuotes = [...prev.collaboratorQuotes];
        
        // Remove old collaborator quotes
        if ((taskToUpdate as any).collaboratorQuoteIds && (taskToUpdate as any).collaboratorQuoteIds.length > 0) {
            newCollaboratorQuotes = newCollaboratorQuotes.filter(q => 
                !(taskToUpdate as any).collaboratorQuoteIds!.includes(q.id)
            );
        }
        // Keep backward compatibility
        if ((taskToUpdate as any).collaboratorQuoteId) {
            newCollaboratorQuotes = newCollaboratorQuotes.filter(q => q.id !== (taskToUpdate as any).collaboratorQuoteId);
        }
        
        // Add new collaborator quotes
        const newCollaboratorQuoteIds: string[] = [];
        console.log('Processing collaborator quotes:', collaboratorQuotes);
        
        if (collaboratorQuotes && collaboratorQuotes.length > 0) {
            collaboratorQuotes.forEach((collabQuote, index) => {
                console.log(`Processing collaborator quote ${index}:`, collabQuote);
                
                // Check if collaborator is selected and has sections (even if empty)
                if (collabQuote.collaboratorId && collabQuote.collaboratorId.trim() !== '') {
                    const normalizedCollaboratorSections: QuoteSection[] = (collabQuote.sections || []).map(section => ({
                        ...section,
                        items: (section.items || []).map((item, idx) => ({
                            ...item,
                            id: item.id || `collab-item-${Date.now()}-${index}-${idx}`,
                        })) as QuoteItem[],
                    }));
                    
                    const collaboratorQuoteTotal = calculateTotal(normalizedCollaboratorSections);
                    const newCollabId = `collab-quote-${Date.now()}-${index}`;
                    
                    console.log(`Creating collaborator quote ${newCollabId} for collaborator ${collabQuote.collaboratorId}`);
                    
                    newCollaboratorQuotes.push({ 
                        id: newCollabId, 
                        sections: normalizedCollaboratorSections, 
                        total: collaboratorQuoteTotal, 
                        columns: collaboratorQuoteColumns 
                    });
                    
                    newCollaboratorQuoteIds.push(newCollabId);
                }
            });
        }
        
        console.log('Final collaborator quote IDs:', newCollaboratorQuoteIds);
        
        // Update task with new collaborator quote IDs and collaborator IDs
        const collaboratorIds = collaboratorQuotes 
            ? collaboratorQuotes.map(cq => cq.collaboratorId).filter(id => id && id.trim() !== '')
            : [];
        
        const taskCollaboratorQuotes = newCollaboratorQuoteIds.map((quoteId, index) => ({
            collaboratorId: collaboratorIds[index] || '',
            quoteId: quoteId
        }));
        
        updatedTask.collaboratorIds = collaboratorIds;
        updatedTask.collaboratorQuotes = taskCollaboratorQuotes;
        (updatedTask as any).collaboratorQuoteIds = newCollaboratorQuoteIds;
        (updatedTask as any).collaboratorQuoteId = undefined; // Keep for backward compatibility

        console.log('Updated task:', updatedTask);

        return {
            ...prev,
            tasks: prev.tasks.map(t => (t.id === taskId ? updatedTask : t)),
            quotes: newQuotes,
            collaboratorQuotes: newCollaboratorQuotes,
        };
    });
    
    toast({ title: T.taskUpdated, description: T.taskUpdatedDesc });
  }
  
  const handleTaskStatusChange = (taskId: string, status: Task['status'], subStatusId?: string) => {
    setAppData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t =>
        t.id === taskId
          ? { ...t, status, subStatusId: subStatusId ?? undefined }
          : t
      ),
    }));
    toast({ title: T.taskStatusUpdated, description: T.taskStatusUpdatedDesc });
  };

  const handleAiCreateTask = (newTaskData: any) => {
      setAppData(prev => {
        let newClients = [...prev.clients];
        let clientId: string;
        const clientName = newTaskData.clientName;
        const existingClient = newClients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
        
        if (existingClient) {
            clientId = existingClient.id;
        } else {
            const newClient: Client = { id: `client-${Date.now()}`, name: clientName };
            newClients.push(newClient);
            clientId = newClient.id;
            toast({ title: T.clientAdded, description: `${T.client} "${clientName}" ${T.clientAddedDesc}` });
        }
        
        const newQuoteId = `quote-${Date.now()}`;
        let newQuotes = [...prev.quotes];
        if (newTaskData.quoteItems && newTaskData.quoteItems.length > 0) {
          const defaultQuoteColumns: QuoteColumn[] = [
              { id: 'description', name: T.description, type: 'text' },
              { id: 'quantity', name: T.quantity, type: 'number' },
              { id: 'unitPrice', name: `${T.currency} (${appData.appSettings.currency})`, type: 'number' },
          ];
          const newQuoteItems: QuoteItem[] = newTaskData.quoteItems.map((item: any, index: number) => ({ ...item, id: `item-ai-${Date.now()}-${index}`, customFields: {} }));
          const total = newQuoteItems.reduce((sum, item) => sum + ((item.quantity ?? 1) * (item.unitPrice ?? 0)), 0);
          newQuotes.push({ id: newQuoteId, sections: [{id: 'section-ai-1', name: T.untitledSection, items: newQuoteItems}], total, columns: defaultQuoteColumns });
        } else {
          newQuotes.push({ id: newQuoteId, sections: [{id: 'section-ai-1', name: T.untitledSection, items: []}], total: 0, columns: [] });
        }

        const newTask: Task = {
          id: `task-${Date.now()}`,
          name: newTaskData.name,
          description: newTaskData.description || '',
          startDate: new Date(newTaskData.startDate),
          deadline: new Date(newTaskData.deadline),
          clientId: clientId,
          categoryId: newTaskData.categoryId,
          status: 'todo',
          quoteId: newQuoteId,
        };

        if(isNaN((newTask.startDate as Date).getTime()) || isNaN((newTask.deadline as Date).getTime())) {
          toast({variant: 'destructive', title: "AI Action Failed", description: "The AI returned an invalid date, so the task could not be created."})
          return prev;
        }
        
        toast({ title: T.taskCreated, description: `'${newTask.name}' ${T.taskCreatedDesc}` });
        
        return {
            ...prev,
            tasks: [newTask, ...prev.tasks],
            clients: newClients,
            quotes: newQuotes,
        }
      });
  }

  const handleAiEditTask = (editData: {taskId: string, updates: Partial<Task & {clientName: string}>}) => {
      setAppData(prev => {
        let newClients = [...prev.clients];
        let clientAdded = false;

        const newTasks = prev.tasks.map(task => {
          if (task.id === editData.taskId) {
              const updates: Partial<Task> = {...editData.updates};
              if ('clientName' in updates) {
                  const clientName = (updates as any).clientName;
                  delete (updates as any).clientName;
                  let existingClient = newClients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
                  if (!existingClient) {
                      const newClient: Client = { id: `client-${Date.now()}`, name: clientName };
                      newClients.push(newClient);
                      clientAdded = true;
                      existingClient = newClient;
                  }
                  updates.clientId = existingClient.id;
              }

              if (updates.startDate) {
                const newDate = new Date(updates.startDate);
                if (isNaN(newDate.getTime())) {
                  delete updates.startDate;
                  console.error("AI returned invalid start date, update skipped for this field.");
                } else {
                  updates.startDate = newDate;
                }
              }
              if (updates.deadline) {
                const newDate = new Date(updates.deadline);
                 if (isNaN(newDate.getTime())) {
                  delete updates.deadline;
                  console.error("AI returned invalid deadline, update skipped for this field.");
                } else {
                  updates.deadline = newDate;
                }
              }
              const updatedTask = { ...task, ...updates };
              toast({title: T.taskUpdated, description: `'${updatedTask.name}' ${T.taskUpdatedDesc}`});
              if(clientAdded){
                toast({ title: T.clientAdded, description: `${T.client} "${(updates as any).clientName}" ${T.clientAddedDesc}` });
              }
              return updatedTask;
          }
          return task;
        });

        return {
            ...prev,
            tasks: newTasks,
            clients: newClients,
        }
      });
  }
const handleEditClient = (clientId: string, updates: Partial<Omit<Client, 'id'>>) => {
    setAppData(prev => ({
      ...prev,
      clients: prev.clients.map(c => c.id === clientId ? { ...c, ...updates } : c)
    }));
    toast({ title: T.clientUpdated, description: T.clientUpdatedDesc });
  };

  const handleDeleteClient = (clientId: string) => {
    setAppData(prev => ({
      ...prev,
      clients: prev.clients.filter(c => c.id !== clientId)
    }));
    toast({ title: T.clientDeleted, description: T.clientDeletedDesc });
  };

  const handleAddCollaborator = (data: Omit<Collaborator, 'id'>) => {
    const newCollaborator: Collaborator = { id: `collab-${Date.now()}`, ...data };
    setAppData(prev => ({
      ...prev,
      collaborators: [...prev.collaborators, newCollaborator]
    }));
    toast({ title: T.collaboratorAdded, description: T.collaboratorAddedDesc });
  };

  const handleEditCollaborator = (collaboratorId: string, updates: Partial<Omit<Collaborator, 'id'>>) => {
    setAppData(prev => ({
      ...prev,
      collaborators: prev.collaborators.map(c => c.id === collaboratorId ? { ...c, ...updates } : c)
    }));
    toast({ title: T.collaboratorUpdated, description: T.collaboratorUpdatedDesc });
  };

  const handleDeleteCollaborator = (collaboratorId: string) => {
    setAppData(prev => ({
      ...prev,
      collaborators: prev.collaborators.filter(c => c.id !== collaboratorId)
    }));
    toast({ title: T.collaboratorDeleted, description: T.collaboratorDeletedDesc });
  };

  const handleAddCategory = (data: Omit<Category, 'id'>) => {
    const newCategory: Category = { id: `cat-${Date.now()}`, ...data };
    setAppData(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory]
    }));
    toast({ title: T.categoryAdded, description: T.categoryAddedDesc });
  };

  const handleEditCategory = (categoryId: string, updates: Partial<Omit<Category, 'id'>>) => {
    setAppData(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === categoryId ? { ...c, ...updates } : c)
    }));
    toast({ title: T.categoryUpdated, description: T.categoryUpdatedDesc });
  };

  const handleDeleteCategory = (categoryId: string) => {
    setAppData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== categoryId)
    }));
    toast({ title: T.categoryDeleted, description: T.categoryDeletedDesc });
  };

  const handleDeleteTask = (taskId: string) => { 
    const task = appData.tasks.find(t => t.id === taskId); 
    if (!task) return; 
    setAppData(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, deletedAt: new Date().toISOString() } : t)
    })); 
    toast({ title: T.taskMovedToTrash, description: `${T.task} "${task.name}" ${T.taskMovedToTrashDesc}` }); 
  };
  const handleRestoreTask = (taskId: string) => { 
    const task = appData.tasks.find(t => t.id === taskId); 
    if (!task) return; 
    setAppData(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => { 
            if (t.id === taskId) { 
                const { deletedAt, ...rest } = t; 
                return rest; 
            } 
            return t; 
        })
    })); 
    toast({ title: T.taskRestored, description: `${T.task} "${task.name}" ${T.taskRestoredDesc}` }); 
  };
  const handlePermanentDeleteTask = (taskId: string) => { 
    const task = appData.tasks.find(t => t.id === taskId); 
    if (!task) return; 
    setAppData(prev => ({
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId),
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
        return {
            ...prev,
            tasks: prev.tasks.filter(t => !t.deletedAt),
            quotes: prev.quotes.filter(q => !quoteIdsToDelete.has(q.id)),
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

  const cycleTaskFormSize = useCallback(() => setTaskFormSize(c => c === 'default' ? 'large' : c === 'large' ? 'fullscreen' : 'default'), []);
  
  const handleClearAllData = () => {
    const emptyData: AppData = {
      tasks: [],
      quotes: [],
      collaboratorQuotes: [],
      clients: [],
      collaborators: [],
      quoteTemplates: [],
      categories: [],
      appSettings: defaultSettings,
    };
    setAppData(emptyData);
    localStorage.setItem(storageKey, JSON.stringify(emptyData));
    // Also clear other potential keys
    localStorage.removeItem('freelance-flow-filters');
    localStorage.removeItem('freelance-flow-last-backup');
    localStorage.removeItem('freelance-flow-notes');
    localStorage.removeItem('freelance-flow-filter-presets'); // Clear filter presets too
    toast({ title: T.clearAllData, description: T.clearAllDataDesc });
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleExport = () => {
    // Include filter presets in export
    const filterPresets = localStorage.getItem('freelance-flow-filter-presets');
    const appDataWithPresets = {
      ...appData,
      filterPresets: filterPresets ? JSON.parse(filterPresets) : []
    };
    
    // Sử dụng BackupService mới để tạo backup tích hợp
    const { jsonString, filename } = BackupService.createManualBackup(appDataWithPresets);
    
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.setAttribute('aria-label', 'Download backup JSON');
    link.setAttribute('title', 'Download backup JSON');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Cập nhật last backup date cho UI
    const now = new Date();
    setLastBackupDate(now);
    toast({ title: T.backupSuccessful, description: T.backupSuccessfulDesc });
  };
  
  const handleInstallClick = async () => {
    if (!installPromptEvent) return;
    await installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setInstallPromptEvent(null);
    setShowInstallPrompt(false);
  };

  const backupStatusText = useMemo(() => {
    if (!lastBackupDate) {
        return T.notBackedUp;
    }
    const days = differenceInDays(new Date(), lastBackupDate);
    if (days === 0) return "Today";
    if (days === 1) return T.yesterday;
    return `${days} ${T.daysAgo}`;
  }, [lastBackupDate, T]);

  const dashboardContextValue = {
    // Always reference latest appData for reactivity
    tasks: appData.tasks,
    clients: appData.clients,
    collaborators: appData.collaborators,
    quotes: appData.quotes,
    quoteTemplates: appData.quoteTemplates,
    categories: appData.categories,
    appSettings: appData.appSettings,
    collaboratorQuotes: appData.collaboratorQuotes,
    // Other context values
    setTasks,
    setQuotes,
    setCollaboratorQuotes,
    setClients,
    setCollaborators,
    setQuoteTemplates,
    setCategories,
    setAppSettings,
    handleAddTask,
    handleEditTask,
    handleTaskStatusChange,
    handleDeleteTask,
    handleRestoreTask,
    handlePermanentDeleteTask,
    handleEmptyTrash,
    handleAddClientAndSelect,
    handleAiCreateTask,
    handleAiEditTask,
    handleClearAllData,
    handleEditClient,
    handleDeleteClient,
    handleAddCollaborator,
    handleEditCollaborator,
    handleDeleteCollaborator,
    handleAddCategory,
    handleEditCategory,
    handleDeleteCategory,
  };

  return (
        <DashboardContext.Provider value={dashboardContextValue}>
            <SidebarProvider>
                <Sidebar collapsible="offcanvas">
                  <SidebarHeader>
                    <div className="flex items-center justify-between">
                      <Link href="/dashboard" className="flex items-center gap-2">
                        <Image src="/icons/logo.png" alt="Freelance Flow Logo" width={24} height={24} className="h-6 w-6" />
                        <h1 className="text-xl font-semibold font-headline group-data-[state=collapsed]:hidden">Freelance Flow</h1>
                      </Link>
                    </div>
                  </SidebarHeader>
                  <SidebarContent>
                      <div className="flex h-full flex-col">
                        <div className="flex-1">
                          <SidebarGroup>
                               <SidebarGroupLabel>{T.views}</SidebarGroupLabel>
                               <SidebarGroupContent>
                                   <Suspense fallback={<SidebarMenu><SidebarMenuSkeleton showIcon /><SidebarMenuSkeleton showIcon /><SidebarMenuSkeleton showIcon /></SidebarMenu>}>
                                       <SidebarNavigation />
                                   </Suspense>
                               </SidebarGroupContent>
                           </SidebarGroup>
                           <SidebarSeparator />
                           <SidebarGroup>
                               <SidebarGroupLabel>{T.manage}</SidebarGroupLabel>
                               <SidebarGroupContent>
                               <SidebarMenu>
                                   <SidebarMenuItem><Dialog open={isClientManagerOpen} onOpenChange={setIsClientManagerOpen}><DialogTrigger asChild><SidebarMenuButton><Users />{T.manageClients}</SidebarMenuButton></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{T.clientManagement}</DialogTitle></DialogHeader><ClientManager clients={appData.clients} tasks={appData.tasks} onAddClient={e => handleAddClientAndSelect(e)} onEditClient={(id, data) => setAppData(prev => ({...prev, clients: prev.clients.map(c => c.id === id ? {id, ...data} : c)}))} onDeleteClient={(id) => setAppData(prev => ({...prev, clients: prev.clients.filter(c => c.id !== id)}))} language={appData.appSettings.language} /></DialogContent></Dialog></SidebarMenuItem>
                                   <SidebarMenuItem><Dialog open={isCollaboratorManagerOpen} onOpenChange={setIsCollaboratorManagerOpen}><DialogTrigger asChild><SidebarMenuButton><Briefcase />{T.manageCollaborators}</SidebarMenuButton></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{T.collaboratorManagement}</DialogTitle></DialogHeader><CollaboratorManager collaborators={appData.collaborators} tasks={appData.tasks} onAddCollaborator={(data) => setAppData(prev => ({...prev, collaborators: [...prev.collaborators, {id: `collab-${Date.now()}`, ...data}]}))} onEditCollaborator={(id, data) => setAppData(prev => ({...prev, collaborators: prev.collaborators.map(c => c.id === id ? {...c, ...data} : c)}))} onDeleteCollaborator={(id) => setAppData(prev => ({...prev, collaborators: prev.collaborators.filter(c => c.id !== id)}))} language={appData.appSettings.language} /></DialogContent></Dialog></SidebarMenuItem>
                                   <SidebarMenuItem><Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}><DialogTrigger asChild><SidebarMenuButton><LayoutGrid />{T.manageCategories}</SidebarMenuButton></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{T.categoryManagement}</DialogTitle></DialogHeader><CategoryManager categories={appData.categories} tasks={appData.tasks} onAddCategory={(data) => setAppData(prev => ({...prev, categories: [...prev.categories, {id: `cat-${Date.now()}`, ...data}]}))} onEditCategory={(id, data) => setAppData(prev => ({...prev, categories: prev.categories.map(c => c.id === id ? {id, ...data} : c)}))} onDeleteCategory={(id) => setAppData(prev => ({...prev, categories: prev.categories.filter(c => c.id !== id)}))} language={appData.appSettings.language} /></DialogContent></Dialog></SidebarMenuItem>
                                   <SidebarMenuItem>
                                     <Dialog open={isTemplateManagerOpen} onOpenChange={setIsTemplateManagerOpen}>
                                       <DialogTrigger asChild><SidebarMenuButton><FileText />{T.manageTemplates}</SidebarMenuButton></DialogTrigger>
                                       <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{T.quoteTemplateManagement}</DialogTitle></DialogHeader><QuoteTemplateManager templates={appData.quoteTemplates} onAddTemplate={(values, columns) => setAppData(prev => ({...prev, quoteTemplates: [...prev.quoteTemplates, {id: `template-${Date.now()}`, name: values.name, sections: values.sections, columns}]}))} onEditTemplate={(template) => setAppData(prev => ({...prev, quoteTemplates: prev.quoteTemplates.map(t => t.id === template.id ? template : t)}))} onDeleteTemplate={(id) => setAppData(prev => ({...prev, quoteTemplates: prev.quoteTemplates.filter(t => t.id !== id)}))} language={appData.appSettings.language} settings={appData.appSettings} /></DialogContent>
                                     </Dialog>
                                   </SidebarMenuItem>
                               </SidebarMenu>
                               </SidebarGroupContent>
                           </SidebarGroup>
                           <SidebarSeparator />
                           {sidebarWidgets}
                         </div>
                         <div className="mt-auto">
                           <SidebarSeparator />
                            <SidebarGroup>
                               <SidebarGroupContent>
                                 <SidebarMenu>
                                   <SidebarMenuItem>
                                     <SidebarMenuButton asChild isActive={pathname === '/dashboard/settings'}>
                                       <Link href="/dashboard/settings"><Cog />{T.settings}</Link>
                                     </SidebarMenuButton>
                                   </SidebarMenuItem>
                                   <Suspense fallback={<SidebarMenuItem><SidebarMenuButton asChild isActive={false}><Link href="/dashboard?view=trash"><Trash2 />{T.trash}</Link></SidebarMenuButton></SidebarMenuItem>}>
                                     <SidebarTrashMenuItem T={T} />
                                   </Suspense>
                                 </SidebarMenu>
                               </SidebarGroupContent>
                             </SidebarGroup>
                         </div>
                       </div>
                   </SidebarContent>
                 </Sidebar>
                 <SidebarInset className="flex flex-col h-svh">
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

                         <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
                             <DialogTrigger asChild><Button size="icon" className="sm:hidden"><PlusCircle className="h-4 w-4" /><span className="sr-only">{T.addTask}</span></Button></DialogTrigger>
                             <DialogTrigger asChild><Button className="hidden sm:inline-flex"><PlusCircle className="mr-2 h-4 w-4" />{T.addTask}</Button></DialogTrigger>
                             <DialogContent className={cn("max-h-[90vh] overflow-y-auto", {"sm:max-w-2xl md:max-w-5xl":"default"===taskFormSize,"sm:max-w-4xl md:max-w-7xl":"large"===taskFormSize,"w-screen h-screen max-w-none max-h-none rounded-none border-0":"fullscreen"===taskFormSize})}>
                                 <Button variant="ghost" size="icon" className="absolute left-4 top-4 h-6 w-6" onClick={cycleTaskFormSize}>
                                     {"fullscreen"===taskFormSize?<Shrink className="h-4 w-4" />:<Expand className="h-4 w-4" />}
                                     <span className="sr-only">Toggle dialog size</span>
                                 </Button>
                                 <DialogHeader className="text-center pt-6 sm:px-10"><DialogTitle>{T.createTask}</DialogTitle><DialogDescription>{T.createTaskDesc}</DialogDescription></DialogHeader>
                                 <div className="p-1"><CreateTaskForm setOpen={setIsTaskFormOpen} onSubmit={handleAddTask} clients={appData.clients} onAddClient={handleAddClientAndSelect} quoteTemplates={appData.quoteTemplates} collaborators={appData.collaborators} settings={appData.appSettings} categories={appData.categories} /></div>
                             </DialogContent>
                         </Dialog>
                     </div>
                   </header>
                   <main className={cn("flex-1 min-h-0", pathname === '/dashboard/chat' || pathname === '/dashboard/settings' || pathname === '/dashboard/widgets' ? 'flex flex-col p-0' : 'flex flex-col p-4')}>
                     {showInstallPrompt && (
                         <Alert className="mb-4 relative">
                             <Download className="h-4 w-4" />
                             <AlertTitle>{T.installPWA}</AlertTitle>
                             <AlertDescription>{T.installPWADesc}</AlertDescription>
                             <div className="mt-2 flex gap-2">
                                 {installPromptEvent && (
                                     <Button onClick={handleInstallClick} size="sm">{T.installPWAButton}</Button>
                                 )}
                                 <Button variant="outline" size="sm" onClick={() => { localStorage.setItem('hidePwaInstallPrompt', 'true'); setShowInstallPrompt(false); }}>
                                     {T.dismiss}
                                 </Button>
                             </div>
                         </Alert>
                     )}
                     
                     {/* Data Restored Notification */}
                     <DataRestoredNotification />
                     
                     {isDataLoaded ? children : <div className="h-full w-full flex items-center justify-center"><Skeleton className="h-full w-full" /></div>}
                   </main>
                 </SidebarInset>
                 {pathname !== '/dashboard/chat' && <QuickChat />}
               </SidebarProvider>
         </DashboardContext.Provider>
  );
}
