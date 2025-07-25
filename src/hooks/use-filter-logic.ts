import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Task, AppSettings } from '@/lib/types';
import { DateRange } from 'react-day-picker';

export type ViewMode = 'table' | 'calendar' | 'eisenhower' | 'kanban';

export function useFilterLogic(tasks: Task[], appSettings: AppSettings, view: 'active' | 'trash') {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Filter states
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
    const statuses = searchParams.get('statuses');
    if (statuses === null) {
      return appSettings.statusSettings?.map(s => s.id) || [];
    }
    if (statuses === 'none') return [];
    return statuses.split(',').filter(Boolean);
  });

  const [categoryFilter, setCategoryFilter] = useState<string | null>(() => {
    return searchParams.get('category') || null;
  });

  const [clientFilter, setClientFilter] = useState<string | null>(() => {
    return searchParams.get('client') || null;
  });

  const [date, setDate] = useState<DateRange | undefined>(() => {
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      return {
        from: startDate ? new Date(startDate) : undefined,
        to: endDate ? new Date(endDate) : undefined,
      };
    }
    return undefined;
  });

  const [sortFilter, setSortFilter] = useState<string>(() => {
    return searchParams.get('sort') || 'deadline-asc';
  });

  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

  // Sync URL with filter state
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
    
    // Only replace if the new path is different to avoid unnecessary re-renders
    // Using window.location.search might be problematic in SSR, but this hook seems client-side only.
    if (typeof window !== 'undefined' && newPath !== `${pathname}${window.location.search}`) {
        router.replace(newPath, { scroll: false });
    }
  }, [selectedStatuses, categoryFilter, clientFilter, date, sortFilter, pathname, router, searchParams, appSettings.statusSettings]);

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
    ['statuses', 'category', 'client', 'collaborator', 'startDate', 'endDate', 'sort'].forEach(key => current.delete(key));
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.replace(`${pathname}${query}`, { scroll: false });
    // also reset local states
    setSelectedStatuses(appSettings.statusSettings?.map(s => s.id) || []);
    setCategoryFilter(null);
    setClientFilter(null);
    setDate(undefined);
    setSortFilter('deadline-asc');
  };
  
  const unsortedFilteredTasks = useMemo(() => {
    if (view === 'trash') {
        return tasks.filter(task => task.deletedAt).sort((a,b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());
    }
    let sourceTasks = tasks.filter(task => !task.deletedAt);

    const collaboratorFilter = searchParams.get('collaborator');

    return sourceTasks.filter((task: Task) => {
      const statusMatch = selectedStatuses.includes(task.status);
      const categoryMatch = !categoryFilter || task.categoryId === categoryFilter;
      const clientMatch = !clientFilter || task.clientId === clientFilter;
      const collaboratorMatch = !collaboratorFilter || (task.collaboratorIds && task.collaboratorIds.includes(collaboratorFilter));
      
      const taskStartDate = new Date(task.startDate);
      const taskEndDate = new Date(task.deadline);
      const filterStartDate = date?.from ? new Date(date.from) : null;
      const filterEndDate = date?.to ? new Date(date.to) : null;
      if (filterStartDate) filterStartDate.setHours(0, 0, 0, 0);
      if (filterEndDate) filterEndDate.setHours(23, 59, 59, 999);
      
      const dateMatch = (!filterStartDate || taskEndDate >= filterStartDate) && (!filterEndDate || taskStartDate <= filterEndDate);

      return statusMatch && categoryMatch && clientMatch && collaboratorMatch && dateMatch;
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
    handleCollaboratorChange,
    handleDateRangeChange,
    handleSortChange,
    handleClearFilters,
    
    // Filtered data
    filteredTasks,
    unsortedFilteredTasks,
  };
}
