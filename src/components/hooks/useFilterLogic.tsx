import { useState, useMemo, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { STATUS_INFO } from '@/lib/data';
import type { Task } from '@/lib/types';
import { DateRange } from 'react-day-picker';

export function useFilterLogic(tasks: Task[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Extract filter values from URL
  const statusFilter = searchParams.get('status');
  const categoryFilter = searchParams.get('category');
  const clientFilter = searchParams.get('client');
  const collaboratorFilter = searchParams.get('collaborator');
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
  
  const updateFilters = (newFilters: Record<string, string | null>) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleStatusFilterChange = (statusId: string, checked: boolean) => {
    const newStatuses = checked
      ? [...selectedStatuses, statusId]
      : selectedStatuses.filter((s) => s !== statusId);
    
    updateFilters({ status: newStatuses.length > 0 ? newStatuses.join(',') : 'none' });
  };
  
  const handleStatusDoubleClick = (statusId: string) => {
      updateFilters({ status: statusId });
  };
  
  const handleStatusBatchChange = (statusesToEnable: string[]) => {
      updateFilters({ status: statusesToEnable.join(',') });
  };
  
  const handleCategoryChange = (value: string) => {
    updateFilters({ category: value === 'all' ? null : value });
  };

  const handleClientChange = (value: string) => {
    updateFilters({ client: value === 'all' ? null : value });
  };
  
  const handleCollaboratorChange = (value: string) => {
    updateFilters({ collaborator: value === 'all' ? null : value });
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
    const params = new URLSearchParams();
    if (searchParams.get('view')) {
      params.set('view', searchParams.get('view')!);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // Filter tasks based on current filters
  const unsortedFilteredTasks = useMemo(() => {
    return tasks.filter((task: Task) => {
      if (view === 'trash') {
        if (!task.deletedAt) return false;
      } else {
        if (task.deletedAt) return false;
      }

      if (selectedStatuses.length > 0 && view !== 'trash') {
        if (!selectedStatuses.includes(task.status)) return false;
      }

      if (categoryFilter && categoryFilter !== 'all') {
        if (task.categoryId !== categoryFilter) return false;
      }

      if (clientFilter && clientFilter !== 'all') {
        if (task.clientId !== clientFilter) return false;
      }
      
      if (collaboratorFilter && collaboratorFilter !== 'all') {
          if (!task.collaboratorIds?.some((c: string) => c === collaboratorFilter)) return false;
      }

      if (date?.from || date?.to) {
        if (!task.deadline) return false;
        const taskDeadline = new Date(task.deadline);
        if (date.from && taskDeadline < date.from) return false;
        if (date.to) {
            const toDate = new Date(date.to);
            toDate.setHours(23, 59, 59, 999);
            if (taskDeadline > toDate) return false;
        }
      }

      return true;
    });
  }, [tasks, view, selectedStatuses, categoryFilter, clientFilter, collaboratorFilter, date]);

  const sortedTasks = useMemo(() => {
    const sorted = [...unsortedFilteredTasks];
    const sort = sortFilter || 'deadline-asc';
    
    sorted.sort((a: Task, b: Task) => {
      switch (sort) {
        case 'deadline-asc':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'deadline-desc':
          return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
        case 'startDate-desc':
            return new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime();
        case 'startDate-asc':
            return new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
        case 'createdAt-desc':
             return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'createdAt-asc':
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [unsortedFilteredTasks, sortFilter]);

  return {
    filteredTasks: sortedTasks,
    unsortedFilteredTasks,
    selectedStatuses,
    categoryFilter,
    clientFilter,
    collaboratorFilter,
    date,
    sortFilter,
    handleStatusFilterChange,
    handleStatusDoubleClick,
    handleStatusBatchChange,
    handleCategoryChange,
    handleClientChange,
    handleCollaboratorChange,
    handleDateRangeChange,
    handleSortChange,
    handleClearFilters,
  };
}
