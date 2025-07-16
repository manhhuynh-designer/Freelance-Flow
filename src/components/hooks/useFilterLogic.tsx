import { useState, useMemo, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { STATUS_INFO } from '@/lib/data';
import type { Task } from '@/lib/types';
import { DateRange } from 'react-day-picker';

export function useFilterLogic(searchParams: any, tasks: Task[]) {
  const router = useRouter();
  const pathname = usePathname();
  
  const FILTERS_STORAGE_KEY = 'freelance-flow-filters';

  // Extract filter values from URL
  const statusFilter = searchParams.get('status');
  const categoryFilter = searchParams.get('category');
  const clientFilter = searchParams.get('client');
  const startDateFilter = searchParams.get('startDate');
  const endDateFilter = searchParams.get('endDate');
  const sortFilter = searchParams.get('sortBy');
  const view = searchParams.get('view') === 'trash' ? 'trash' : 'active';

  const defaultStatuses = useMemo(() => STATUS_INFO.map(s => s.id), []);

  const selectedStatuses: string[] = useMemo(() => {
    if (statusFilter === null) return defaultStatuses;
    if (statusFilter === 'none') return [];
    return statusFilter.split(',');
  }, [statusFilter, defaultStatuses]);

  const [date, setDate] = useState<DateRange | undefined>({
    from: startDateFilter ? new Date(startDateFilter) : undefined,
    to: endDateFilter ? new Date(endDateFilter) : undefined,
  });

  // Sync date state with URL params
  useEffect(() => {
    setDate({
      from: startDateFilter ? new Date(startDateFilter) : undefined,
      to: endDateFilter ? new Date(endDateFilter) : undefined,
    });
  }, [startDateFilter, endDateFilter]);

  // On mount or navigation, restore filters from localStorage if the URL has no filters.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (storedFilters && !statusFilter && !categoryFilter && !clientFilter && !startDateFilter && !endDateFilter && !sortFilter) {
        try {
          const parsed = JSON.parse(storedFilters);
          const params = new URLSearchParams();
          
          if (parsed.status) params.set('status', parsed.status);
          if (parsed.category) params.set('category', parsed.category);
          if (parsed.client) params.set('client', parsed.client);
          if (parsed.startDate) params.set('startDate', parsed.startDate);
          if (parsed.endDate) params.set('endDate', parsed.endDate);
          if (parsed.sortBy) params.set('sortBy', parsed.sortBy);
          
          if (params.toString()) {
            router.replace(`${pathname}?${params.toString()}`);
          }
        } catch (e) {
          console.error('Failed to parse stored filters:', e);
        }
      }
    }
  }, [pathname, router, statusFilter, categoryFilter, clientFilter, startDateFilter, endDateFilter, sortFilter]);

  const updateFilters = (newFilters: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    // Always reset to page 1 when filters change
    params.delete('page');
    
    router.push(`${pathname}?${params.toString()}`);
    
    // Save current filters to localStorage
    if (typeof window !== 'undefined') {
      const filtersToSave = {
        status: params.get('status'),
        category: params.get('category'),
        client: params.get('client'),
        startDate: params.get('startDate'),
        endDate: params.get('endDate'),
        sortBy: params.get('sortBy'),
      };
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filtersToSave));
    }
  };

  const handleStatusChange = (statusId: string) => {
    const newStatuses = selectedStatuses.includes(statusId)
      ? selectedStatuses.filter(s => s !== statusId)
      : [...selectedStatuses, statusId];
    
    updateFilters({ 
      status: newStatuses.length === 0 ? 'none' : newStatuses.join(',')
    });
  };

  const handleCategoryChange = (value: string) => {
    updateFilters({ category: value === 'all' ? null : value });
  };

  const handleClientChange = (value: string) => {
    updateFilters({ client: value === 'all' ? null : value });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDate(range);
    updateFilters({
      startDate: range?.from ? range.from.toISOString().split('T')[0] : null,
      endDate: range?.to ? range.to.toISOString().split('T')[0] : null,
    });
  };

  const handleSortChange = (value: string) => {
    updateFilters({ sortBy: value });
  };

  const handleClearFilters = () => {
    setDate(undefined);
    updateFilters({
      status: null,
      category: null,
      client: null,
      startDate: null,
      endDate: null,
      sortBy: null,
    });
  };

  // Filter tasks based on current filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task: Task) => {
      // Filter by view (active/trash)
      if (view === 'trash') {
        if (!task.deletedAt) return false;
      } else {
        if (task.deletedAt) return false;
      }

      // Filter by status
      if (selectedStatuses.length > 0 && view !== 'trash') {
        if (!selectedStatuses.includes(task.status)) return false;
      }

      // Filter by category
      if (categoryFilter && categoryFilter !== 'all') {
        if (task.categoryId !== categoryFilter) return false;
      }

      // Filter by client
      if (clientFilter && clientFilter !== 'all') {
        if (task.clientId !== clientFilter) return false;
      }

      // Filter by date range
      if (date?.from || date?.to) {
        const taskDeadline = new Date(task.deadline);
        if (date.from && taskDeadline < date.from) return false;
        if (date.to && taskDeadline > date.to) return false;
      }

      return true;
    });
  }, [tasks, view, selectedStatuses, categoryFilter, clientFilter, date]);

  // Sort filtered tasks
  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];
    const sort = sortFilter || 'deadline-asc';
    
    sorted.sort((a: Task, b: Task) => {
      switch (sort) {
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
    
    return sorted;
  }, [filteredTasks, sortFilter]);

  return {
    // Filter state
    selectedStatuses,
    categoryFilter,
    clientFilter,
    startDateFilter,
    endDateFilter,
    sortFilter,
    date,
    view,
    
    // Filtered data
    filteredTasks: sortedTasks,
    
    // Handlers
    handleStatusChange,
    handleCategoryChange,
    handleClientChange,
    handleDateRangeChange,
    handleSortChange,
    handleClearFilters,
    setDate,
  };
}
