import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Task, AppSettings, FilterSettings } from '@/lib/types';
import { DateRange } from 'react-day-picker';
import { FilterSettingsService } from '@/lib/filter-settings-service';

export type ViewMode = 'table' | 'calendar' | 'eisenhower' | 'kanban';

export function useFilterLogic(
  tasks: Task[], 
  appSettings: AppSettings, 
  view: 'active' | 'trash'
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [sortFilter, setSortFilter] = useState<string>('deadline-asc');
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const savedSettings = appSettings.filterSettings || FilterSettingsService.getFilterSettings();
    const defaultSettings = FilterSettingsService.createDefaultSettings(
      appSettings.statusSettings?.map(s => s.id) || []
    );
    const mergedSettings = FilterSettingsService.mergeWithDefaults(savedSettings, defaultSettings);

    const statuses = searchParams.get('statuses');
    setSelectedStatuses(
      statuses === null ? mergedSettings.selectedStatuses :
      statuses === 'none' ? [] :
      statuses.split(',').filter(Boolean)
    );
  setCategoryFilter(searchParams.get('category') || (mergedSettings.selectedCategory === 'all' ? null : mergedSettings.selectedCategory));
  setClientFilter(searchParams.get('client') || (mergedSettings.selectedClient === 'all' ? null : mergedSettings.selectedClient));
  setProjectFilter(searchParams.get('project') || (mergedSettings.selectedProject === 'all' ? null : mergedSettings.selectedProject));
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      setDate({ from: startDate ? new Date(startDate) : undefined, to: endDate ? new Date(endDate) : undefined });
    } else if (mergedSettings.dateRange?.from || mergedSettings.dateRange?.to) {
      setDate({ from: mergedSettings.dateRange.from ? new Date(mergedSettings.dateRange.from) : undefined, to: mergedSettings.dateRange.to ? new Date(mergedSettings.dateRange.to) : undefined });
    }
    setSortFilter(searchParams.get('sort') || mergedSettings.sortFilter);
  }, [appSettings.filterSettings, appSettings.statusSettings]);

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      const filterSettingsToSave: Partial<FilterSettings> = {
        selectedStatuses,
        selectedCategory: categoryFilter || 'all',
        selectedClient: clientFilter || 'all',
        selectedProject: projectFilter || 'all',
        sortFilter,
        dateRange: date ? {
          from: date.from?.toISOString(),
          to: date.to?.toISOString(),
        } : undefined,
      };
      
      FilterSettingsService.saveFilterSettings(filterSettingsToSave);
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [selectedStatuses, categoryFilter, clientFilter, projectFilter, sortFilter, date]);

  useEffect(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    const allStatusIds = appSettings.statusSettings?.map(s => s.id).sort() || [];
    const selectedSorted = [...selectedStatuses].sort();

    if (JSON.stringify(allStatusIds) === JSON.stringify(selectedSorted)) {
        current.delete('statuses');
    } else if (selectedStatuses.length === 0) {
        current.set('statuses', 'none');
    }
    else {
        current.set('statuses', selectedStatuses.join(','));
    }

    if (categoryFilter) {
      current.set('category', categoryFilter);
    } else {
      current.delete('category');
    }

    if (clientFilter) {
      current.set('client', clientFilter);
    } else {
      current.delete('client');
    }

    if (projectFilter) {
      current.set('project', projectFilter);
    } else {
      current.delete('project');
    }
    
    if (date?.from) {
      current.set('startDate', date.from.toISOString().split('T')[0]);
    } else {
        current.delete('startDate');
    }

    if (date?.to) {
      current.set('endDate', date.to.toISOString().split('T')[0]);
    } else {
        current.delete('endDate');
    }

    if (sortFilter && sortFilter !== 'deadline-asc') {
      current.set('sort', sortFilter);
    } else {
      current.delete('sort');
    }

    const search = current.toString();
    const query = search ? `?${search}` : '';
    const newPath = `${pathname}${query}`;
    
    if (typeof window !== 'undefined' && newPath !== `${pathname}${window.location.search}`) {
        router.replace(newPath, { scroll: false });
    }
  }, [selectedStatuses, categoryFilter, clientFilter, projectFilter, date, sortFilter, pathname, router, searchParams]);

  // Filter handlers
  const handleStatusFilterChange = (statusId: string, isSelected: boolean) => {
    setSelectedStatuses(prev => 
      isSelected 
        ? [...new Set([...prev, statusId])]
        : prev.filter(id => id !== statusId)
    );
  };

  const handleStatusDoubleClick = (statusId: string) => {
    setSelectedStatuses([statusId]);
  };
  
  const handleStatusBatchChange = (statusesToEnable: string[]) => {
    setSelectedStatuses(statusesToEnable);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value === 'all' ? null : value);
  };

  const handleClientChange = (value: string) => {
    setClientFilter(value === 'all' ? null : value);
  };
  
  const handleProjectChange = (value: string) => {
    setProjectFilter(value === 'all' ? null : value);
  };
    
  const handleCollaboratorChange = (value: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (value === 'all' || !value) {
        current.delete('collaborator');
    } else {
        current.set('collaborator', value);
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.replace(`${pathname}${query}`, { scroll: false });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDate(range);
    if(range?.from && range?.to) {
        setIsDatePopoverOpen(false); 
    }
  };

  const handleSortChange = (value: string) => {
    setSortFilter(value);
  };

  const handleClearFilters = () => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    ['statuses', 'category', 'client', 'project', 'collaborator', 'startDate', 'endDate', 'sort'].forEach(key => current.delete(key));
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.replace(`${pathname}${query}`, { scroll: false });
    // also reset local states
    setSelectedStatuses(appSettings.statusSettings?.map(s => s.id) || []);
    setCategoryFilter(null);
    setClientFilter(null);
    setProjectFilter(null);
    setDate(undefined);
    setSortFilter('deadline-asc');
  };
  
  const unsortedFilteredTasks = useMemo(() => {
    if (view === 'trash') {
        return tasks.filter(task => task.deletedAt).sort((a,b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());
    }
    let sourceTasks = tasks.filter(task => !task.deletedAt);

  const collaboratorFilter = searchParams.get('collaborator');
  const projectParam = searchParams.get('project');

    return sourceTasks.filter((task: Task) => {
      const statusMatch = selectedStatuses.includes(task.status);
      const categoryMatch = !categoryFilter || task.categoryId === categoryFilter;
      const clientMatch = !clientFilter || task.clientId === clientFilter;
  const collaboratorMatch = !collaboratorFilter || (task.collaboratorIds && task.collaboratorIds.includes(collaboratorFilter));
  const projectMatch = !projectParam || (task as any).projectId === projectParam || (projectParam === 'none' && !(task as any).projectId);
      
      const taskStartDate = new Date(task.startDate);
      const taskEndDate = new Date(task.deadline);
      const filterStartDate = date?.from ? new Date(date.from) : null;
      const filterEndDate = date?.to ? new Date(date.to) : null;
      if (filterStartDate) filterStartDate.setHours(0, 0, 0, 0);
      if (filterEndDate) filterEndDate.setHours(23, 59, 59, 999);
      
      const dateMatch = (!filterStartDate || taskEndDate >= filterStartDate) && (!filterEndDate || taskStartDate <= filterEndDate);

      return statusMatch && categoryMatch && clientMatch && collaboratorMatch && projectMatch && dateMatch;
    });
  }, [tasks, view, selectedStatuses, categoryFilter, clientFilter, date, searchParams]);

  const filteredTasks = useMemo(() => {
     if (view === 'trash') {
        return unsortedFilteredTasks;
    }
    return unsortedFilteredTasks.slice().sort((a, b) => {
       const getDate = (dateVal: Date | string | null | undefined): number => {
            if (!dateVal) return 0;
            const d = new Date(dateVal);
            return isNaN(d.getTime()) ? 0 : d.getTime();
        };

      switch (sortFilter) {
        case 'deadline-asc':
          return getDate(a.deadline) - getDate(b.deadline);
        case 'deadline-desc':
          return getDate(b.deadline) - getDate(a.deadline);
        case 'startDate-asc':
          return getDate(a.startDate) - getDate(b.startDate);
        case 'startDate-desc':
          return getDate(b.startDate) - getDate(a.startDate);
        case 'createdAt-desc': {
          const aDate = a.createdAt ? new Date(a.createdAt) : new Date(a.startDate);
          const bDate = b.createdAt ? new Date(b.createdAt) : new Date(b.startDate);
          return bDate.getTime() - aDate.getTime();
        }
        case 'createdAt-asc': {
          const aDate = a.createdAt ? new Date(a.createdAt) : new Date(a.startDate);
          const bDate = b.createdAt ? new Date(b.createdAt) : new Date(b.startDate);
          return aDate.getTime() - bDate.getTime();
        }
        default:
          return getDate(a.deadline) - getDate(b.deadline);
      }
    });
  }, [unsortedFilteredTasks, sortFilter, view]);

  return {
    // Filter states
    selectedStatuses,
    categoryFilter,
    clientFilter,
    projectFilter: projectFilter || 'all',
    collaboratorFilter: searchParams.get('collaborator') || 'all',
    date,
    sortFilter,
    isDatePopoverOpen,
    setIsDatePopoverOpen,
    
    // Filter handlers
    handleStatusFilterChange,
    handleStatusDoubleClick,
    handleStatusBatchChange,
    handleCategoryChange,
    handleClientChange,
    handleProjectChange,
    handleCollaboratorChange,
    handleDateRangeChange,
    handleSortChange,
    handleClearFilters,
    
    // Filtered data
    filteredTasks,
    unsortedFilteredTasks,
  };
}
