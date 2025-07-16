import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Task, AppSettings } from '@/lib/types';
import { DateRange } from 'react-day-picker';

export type ViewMode = 'table' | 'calendar';

export function useFilterLogic(tasks: Task[], appSettings: AppSettings, view: 'active' | 'trash') {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Filter states
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
    return searchParams.get('statuses')?.split(',').filter(Boolean) || 
           appSettings.statusSettings?.map(s => s.id) || [];
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
    const current = new URLSearchParams();
    searchParams.forEach((v, k) => {
      if (!['statuses', 'category', 'client', 'startDate', 'endDate', 'sort'].includes(k)) {
        current.set(k, v);
      }
    });

    if (selectedStatuses.length > 0) {
      current.set('statuses', selectedStatuses.join(','));
    }
    if (categoryFilter) {
      current.set('category', categoryFilter);
    }
    if (clientFilter) {
      current.set('client', clientFilter);
    }
    if (date?.from) {
      current.set('startDate', date.from.toISOString().split('T')[0]);
    }
    if (date?.to) {
      current.set('endDate', date.to.toISOString().split('T')[0]);
    }
    if (sortFilter !== 'deadline-asc') {
      current.set('sort', sortFilter);
    }

    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.replace(`${pathname}${query}`, { scroll: false });
  }, [selectedStatuses, categoryFilter, clientFilter, date, sortFilter, pathname, router, searchParams]);

  // Filter handlers
  const handleStatusFilterChange = (statusId: string, isSelected: boolean) => {
    setSelectedStatuses(prev => 
      isSelected 
        ? [...prev, statusId]
        : prev.filter(id => id !== statusId)
    );
  };

  const handleStatusDoubleClick = (statusId: string) => {
    setSelectedStatuses([statusId]);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value === 'all' ? null : value);
  };

  const handleClientChange = (value: string) => {
    setClientFilter(value === 'all' ? null : value);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDate(range);
  };

  const handleSortChange = (value: string) => {
    setSortFilter(value);
  };

  const handleClearFilters = () => {
    setSelectedStatuses(appSettings.statusSettings?.map(s => s.id) || []);
    setCategoryFilter(null);
    setClientFilter(null);
    setDate(undefined);
    setSortFilter('deadline-asc');
  };

  // Apply filters
  const filteredTasks = useMemo(() => {
    let sourceTasks = view === 'active' 
      ? tasks.filter(task => !task.deletedAt)
      : tasks.filter(task => task.deletedAt);

    // Status filter
    const filtered = sourceTasks.filter((task: Task) => {
      const statusMatch = selectedStatuses.includes(task.status);
      if (!statusMatch) return false;

      // Category filter
      if (categoryFilter && task.categoryId !== categoryFilter) return false;

      // Client filter
      if (clientFilter && task.clientId !== clientFilter) return false;

      // Date range filter
      if (date?.from || date?.to) {
        const taskDate = new Date(task.deadline);
        if (date.from && taskDate < date.from) return false;
        if (date.to && taskDate > date.to) return false;
      }

      return true;
    });

    // Apply sorting
    return filtered.slice().sort((a, b) => {
      switch (sortFilter) {
        case 'deadline-asc':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'deadline-desc':
          return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
        case 'startDate-asc':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'startDate-desc':
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        default:
          return 0;
      }
    });
  }, [tasks, view, selectedStatuses, categoryFilter, clientFilter, date, sortFilter]);

  return {
    // Filter states
    selectedStatuses,
    categoryFilter,
    clientFilter,
    date,
    sortFilter,
    isDatePopoverOpen,
    setIsDatePopoverOpen,
    
    // Filter handlers
    handleStatusFilterChange,
    handleStatusDoubleClick,
    handleCategoryChange,
    handleClientChange,
    handleDateRangeChange,
    handleSortChange,
    handleClearFilters,
    
    // Filtered data
    filteredTasks,
  };
}
