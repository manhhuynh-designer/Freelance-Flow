"use client";

import { useState, useMemo, useEffect, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CalendarIcon, XCircle, Trash2, Filter, Table, CalendarDays, ChevronDown, ChevronUp } from "lucide-react"; // Thêm CalendarDays và Table icon
import { TaskList } from '@/components/task-list'; // Sẽ được thay thế bằng TableView
import { STATUS_INFO } from '@/lib/data';
import type { Task } from "@/lib/types";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter
} from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { i18n } from "@/lib/i18n";
import { useDashboard } from '@/contexts/dashboard-context';
import { Skeleton } from "./ui/skeleton";
import { FilterChipBar } from '@/components/filter-chip-bar-new';
import { ViewModeToggle } from '@/components/view-mode-toggle';
import { PaginationControls } from "./pagination-controls";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

import styles from "./DashboardContentColors.module.css";
import { TableView } from './table-view'; // Import TableView mới
import { CalendarView, type CalendarViewMode } from './calendar-view';

export default function DashboardContent() {
    return (
        <Suspense fallback={<div className="space-y-4"><Skeleton className="h-[250px] w-full" /><Skeleton className="h-[400px] w-full" /></div>}>
            <DashboardContentSearchParamsWrapper />
        </Suspense>
    );
}


// This wrapper ensures useSearchParams is only used inside a Suspense boundary
function DashboardContentSearchParamsWrapper() {
  // Only import useSearchParams here, inside Suspense
  const { useSearchParams } = require('next/navigation');
  const searchParams = useSearchParams();
  return <DashboardContentInner searchParams={searchParams} />;
}

import type { ReadonlyURLSearchParams } from 'next/navigation';

type ViewMode = 'table' | 'calendar'; // Định nghĩa các chế độ xem

function DashboardContentInner({ searchParams }: { searchParams: ReadonlyURLSearchParams }) {
  const context = useDashboard();
  const tasks = context?.tasks ?? [];
  const quotes = context?.quotes ?? [];
  const collaboratorQuotes = context?.collaboratorQuotes ?? [];
  const clients = context?.clients ?? [];
  const collaborators = context?.collaborators ?? [];
  const appSettings = context?.appSettings;
  const handleEditTask = context?.handleEditTask ?? (() => {});
  const handleTaskStatusChange = context?.handleTaskStatusChange ?? (() => {});
  const handleDeleteTask = context?.handleDeleteTask ?? (() => {});
  const handleRestoreTask = context?.handleRestoreTask ?? (() => {});
  const handlePermanentDeleteTask = context?.handlePermanentDeleteTask ?? (() => {});
  const handleAddClientAndSelect = context?.handleAddClientAndSelect ?? (() => { return { id: '', name: '' }; });
  const quoteTemplates = context?.quoteTemplates ?? [];
  const categories = context?.categories ?? [];
  const handleEmptyTrash = context?.handleEmptyTrash ?? (() => {});
  
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const FILTERS_STORAGE_KEY = 'freelance-flow-filters';
  const VIEW_MODE_STORAGE_KEY = 'dashboardViewMode'; // Key để lưu chế độ xem

  // Fallback for when context is not yet available
  if (!appSettings || !tasks || !quotes || !clients || !collaborators || !quoteTemplates || !handlePermanentDeleteTask || !categories || !handleTaskStatusChange || !handleEmptyTrash || !handleEditTask) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-[250px] w-full" />
            <Skeleton className="h-[400px] w-full" />
        </div>
    );
  }

  const T = i18n[appSettings.language];
  const view = searchParams.get('view') === 'trash' ? 'trash' : 'active';
  
  const statusFilter = searchParams.get('status');
  const categoryFilter = searchParams.get('category');
  const clientFilter = searchParams.get('client');
  const startDateFilter = searchParams.get('startDate');
  const endDateFilter = searchParams.get('endDate');
  const sortFilter = searchParams.get('sortBy');
  const page = Number(searchParams.get('page') || '1');
  const limit = Number(searchParams.get('limit') || '10');
  
  // Calendar-specific parameters
  const calendarDateParam = searchParams.get('calendarDate');
  const calendarViewMode = searchParams.get('calendarMode') as 'week' | 'month' | null;

  // Default statuses: all except archived
  const defaultStatuses = useMemo(() => 
    STATUS_INFO.filter(s => s.id !== 'archived').map(s => s.id), 
  []);

  const selectedStatuses: string[] = useMemo(() => {
    if (statusFilter === null) return defaultStatuses;
    if (statusFilter === 'none') return [];
    return statusFilter.split(',');
  }, [statusFilter, defaultStatuses]);
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: startDateFilter ? new Date(startDateFilter) : undefined,
    to: endDateFilter ? new Date(endDateFilter) : undefined,
  });

  // State để quản lý thu gọn/mở rộng filter card
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);

  // State để quản lý chế độ xem hiện tại
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode) || 'table';
    }
    return 'table';
  });

  // Additional state for FilterChipBar compatibility
  const selectedCategory = categoryFilter || 'all';
  const selectedCollaborator = searchParams.get('collaborator') || 'all';
  const selectedClient = clientFilter || 'all';
  const dateRange = date;
  
  // Functions for FilterChipBar
  const setSelectedCategory = (category: string) => {
    console.log('setSelectedCategory called with:', category);
    console.log('setSelectedCategory - about to call updateSearchParam');
    updateSearchParam('category', (category === 'all' || !category) ? null : category);
    console.log('setSelectedCategory - updateSearchParam called');
  };
  
  const setSelectedCollaborator = (collaborator: string) => {
    console.log('setSelectedCollaborator called with:', collaborator);
    console.log('setSelectedCollaborator - about to call updateSearchParam');
    updateSearchParam('collaborator', (collaborator === 'all' || !collaborator) ? null : collaborator);
    console.log('setSelectedCollaborator - updateSearchParam called');
  };
  
  const setSelectedClient = (client: string) => {
    console.log('setSelectedClient called with:', client);
    console.log('setSelectedClient - about to call updateSearchParam');
    updateSearchParam('client', (client === 'all' || !client) ? null : client);
    console.log('setSelectedClient - updateSearchParam called');
  };
  
  const setDateRange = (range: DateRange | undefined) => {
    handleDateRangeChange(range);
  };
  
  const clearAllFilters = () => {
    handleClearFilters();
  };
  
  // Preset save logic removed
  
  // Additional data for FilterChipBar
  const allCategories = categories;
  const statuses = STATUS_INFO;

  // Lưu chế độ xem vào localStorage mỗi khi nó thay đổi
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, currentViewMode);
    }
  }, [currentViewMode]);

  // On mount or navigation, restore filters from localStorage if the URL has no filters.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (pathname === '/dashboard' && params.toString() === '') {
      const storedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (storedFilters) {
        router.replace(`${pathname}?${storedFilters}`);
      }
    }
  }, [pathname, router]);
  
  // Syncs URL search params to localStorage whenever they change.
  useEffect(() => {
    if (view === 'trash') return;
    const currentParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== 'page') currentParams.set(key, value);
    });
    const paramsString = currentParams.toString();

    if (paramsString) {
      localStorage.setItem(FILTERS_STORAGE_KEY, paramsString);
    } else {
      localStorage.removeItem(FILTERS_STORAGE_KEY);
    }
  }, [searchParams, view]);
    
  const filteredTasks = useMemo(() => {
    let sourceTasks = view === 'active' 
        ? tasks.filter((task: Task) => !task.deletedAt)
        : tasks.filter((task: Task) => !!task.deletedAt).sort((a: Task,b: Task) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());

    if (view === 'trash') {
        return sourceTasks;
    }

    const filterStartDate = startDateFilter ? new Date(startDateFilter) : null;
    const filterEndDate = endDateFilter ? new Date(endDateFilter) : null;

    if (filterStartDate) filterStartDate.setHours(0, 0, 0, 0);
    if (filterEndDate) filterEndDate.setHours(23, 59, 59, 999);
    
    const filtered = sourceTasks.filter((task: Task) => {
        const statusMatch = selectedStatuses.includes(task.status);
        const categoryMatch = !categoryFilter || task.categoryId === categoryFilter;
        const clientMatch = !clientFilter || task.clientId === clientFilter;
        
        const taskStartDate = new Date(task.startDate);
        const taskEndDate = new Date(task.deadline);
        
        const dateMatch = (!filterStartDate || taskEndDate >= filterStartDate) && (!filterEndDate || taskStartDate <= filterEndDate);

        return statusMatch && categoryMatch && clientMatch && dateMatch;
    });

    const sortBy = searchParams.get('sortBy') || 'deadline-asc';
    
    return filtered.slice().sort((a, b) => {
        const getDate = (date: Date | string) => {
            const d = new Date(date);
            return isNaN(d.getTime()) ? 0 : d.getTime();
        };

        switch (sortBy) {
            case 'startDate-asc':
                return getDate(a.startDate) - getDate(b.startDate);
            case 'startDate-desc':
                return getDate(b.startDate) - getDate(a.startDate);
            case 'deadline-desc':
                return getDate(b.deadline) - getDate(a.deadline);
            case 'deadline-asc':
            default:
                return getDate(a.deadline) - getDate(b.deadline);
        }
    });
  }, [tasks, selectedStatuses, categoryFilter, clientFilter, startDateFilter, endDateFilter, view, searchParams]);

  const totalPages = Math.ceil(filteredTasks.length / limit);
  const paginatedTasks = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredTasks.slice(startIndex, startIndex + limit);
  }, [filteredTasks, page, limit]);

  const updateSearchParam = (name: string, value: string | null) => {
    console.log(`updateSearchParam called: ${name} = ${value}`);
    const current = new URLSearchParams();
    searchParams.forEach((v, k) => {
      current.set(k, v);
    });
    if (value === null) {
      current.delete(name);
    } else {
      current.set(name, value);
    }
    current.delete('page');
    const search = current.toString();
    const query = search ? `?${search}` : "";
    console.log(`Updating URL to: ${pathname}${query}`);
    router.push(`${pathname}${query}`);
  }

  const handleStatusFilterChange = (statusId: string, checked: boolean) => {
      let newActiveStatuses: string[];
      if (checked) {
          newActiveStatuses = [...new Set([...selectedStatuses, statusId])];
      } else {
          newActiveStatuses = selectedStatuses.filter((id: string) => id !== statusId);
      }
      const sortedNew = [...newActiveStatuses].sort();
      const sortedDefault = [...defaultStatuses].sort();
      const isDefault = sortedNew.length === sortedDefault.length && sortedNew.every((val, index) => val === sortedDefault[index]);
      
      if (isDefault) updateSearchParam('status', null);
      else if (newActiveStatuses.length > 0) updateSearchParam('status', newActiveStatuses.join(','));
      else updateSearchParam('status', 'none');
  }

  // Function to set all status filters at once (for presets)
  const handleStatusBatchChange = (statusesToEnable: string[]) => {
    const sortedNew = [...statusesToEnable].sort();
    const sortedDefault = [...defaultStatuses].sort();
    const isDefault = sortedNew.length === sortedDefault.length && sortedNew.every((val, index) => val === sortedDefault[index]);
    
    if (isDefault) updateSearchParam('status', null);
    else if (statusesToEnable.length > 0) updateSearchParam('status', statusesToEnable.join(','));
    else updateSearchParam('status', 'none');
  };

  const handleStatusDoubleClick = (statusId: string) => updateSearchParam('status', statusId);
  const handleCategoryChange = (value: string) => updateSearchParam('category', value === 'all' ? null : value);
  const handleClientChange = (value: string) => updateSearchParam('client', value === 'all' ? null : value);
  const handleSortChange = (value: string) => updateSearchParam('sortBy', value);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDate(range);
    const current = new URLSearchParams();
    searchParams.forEach((v, k) => {
      current.set(k, v);
    });
    if (range?.from) current.set('startDate', format(range.from, 'yyyy-MM-dd')); else current.delete('startDate');
    if (range?.to) current.set('endDate', format(range.to, 'yyyy-MM-dd')); else current.delete('endDate');
    current.delete('page');
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  }

  const handleClearFilters = () => {
    router.push(pathname);
    setDate(undefined);
  };
  
  const handlePageChange = (newPage: number) => {
    const current = new URLSearchParams();
    searchParams.forEach((v, k) => {
      current.set(k, v);
    });
    current.set('page', String(newPage));
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  const handleLimitChange = (newLimit: number) => {
    const current = new URLSearchParams();
    searchParams.forEach((v, k) => {
      current.set(k, v);
    });
    current.set('limit', String(newLimit));
    current.delete('page');
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  // Calendar state management
  const [calendarDate, setCalendarDate] = useState<Date>(() => {
    return calendarDateParam ? new Date(calendarDateParam) : new Date();
  });
  
  const [calendarMode, setCalendarMode] = useState<CalendarViewMode>(() => {
    return calendarViewMode || 'month';
  });

  // Calendar navigation handlers
  const handleCalendarDateChange = (newDate: Date) => {
    setCalendarDate(newDate);
    
    // Update URL parameters
    const current = new URLSearchParams();
    
    // Preserve existing filters
    if (statusFilter) current.set('status', statusFilter);
    if (categoryFilter) current.set('category', categoryFilter);
    if (clientFilter) current.set('client', clientFilter);
    if (startDateFilter) current.set('startDate', startDateFilter);
    if (endDateFilter) current.set('endDate', endDateFilter);
    if (sortFilter) current.set('sortBy', sortFilter);
    if (page > 1) current.set('page', page.toString());
    if (limit !== 10) current.set('limit', limit.toString());
    
    // Add calendar parameters
    current.set('calendarDate', newDate.toISOString().split('T')[0]);
    if (calendarMode !== 'month') current.set('calendarMode', calendarMode);
    
    const query = current.toString() ? `?${current.toString()}` : '';
    router.push(`${pathname}${query}`);
  };

  const handleCalendarModeChange = (newMode: CalendarViewMode) => {
    setCalendarMode(newMode);
    
    // Update URL parameters
    const current = new URLSearchParams();
    
    // Preserve existing filters
    if (statusFilter) current.set('status', statusFilter);
    if (categoryFilter) current.set('category', categoryFilter);
    if (clientFilter) current.set('client', clientFilter);
    if (startDateFilter) current.set('startDate', startDateFilter);
    if (endDateFilter) current.set('endDate', endDateFilter);
    if (sortFilter) current.set('sortBy', sortFilter);
    if (page > 1) current.set('page', page.toString());
    if (limit !== 10) current.set('limit', limit.toString());
    
    // Add calendar parameters
    if (calendarDateParam) current.set('calendarDate', calendarDateParam);
    if (newMode !== 'month') current.set('calendarMode', newMode);
    
    const query = current.toString() ? `?${current.toString()}` : '';
    router.push(`${pathname}${query}`);
  };
  const FiltersComponent = ({ inSheet = false }: { inSheet?: boolean }) => (
    <div className={cn("space-y-3", inSheet && "space-y-4")}>
      {/* Nút collapse/expand - không có text */}
      {!inSheet && (
        <div className="flex justify-end mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
            className="h-5 w-5 p-0"
          >
            {isFiltersCollapsed ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </Button>
        </div>
      )}

      {/* Filter content - collapsed/expanded */}
      {(!isFiltersCollapsed || inSheet) && (
        <div className={cn("space-y-3", inSheet && "space-y-4")}>
          {/* Layout chính với filters bên trái và view buttons bên phải */}
          <div className={cn(
            "flex gap-3",
            inSheet ? "flex-col space-y-4" : "flex-row items-start"
          )}>
            {/* Left side: All filters và Clear button - tối đa 50% */}
            <div className={cn(
              "space-y-3",
              inSheet ? "w-full" : "w-1/2"
            )}>
      {/* Status Filter - nằm trong cột filter */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">{T.status}</label>
        <TooltipProvider>
          <div className="grid grid-cols-5 gap-1">
            {STATUS_INFO.map(status => {
              const isSelected = selectedStatuses.includes(status.id);
              const color = appSettings.statusColors?.[status.id] || '#ccc';
              return (
                <Tooltip key={status.id} delayDuration={100}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleStatusFilterChange(status.id, !isSelected)}
                      onDoubleClick={() => handleStatusDoubleClick(status.id)}
                      className={cn(
                        styles.statusSwatch,
                        isSelected ? styles.selected : styles.unselected,
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "h-6 w-6"
                      )}
                      style={{ backgroundColor: color, borderColor: color }}
                      aria-label={T.statuses[status.id]}
                    >
                      <span
                        className="block w-full h-full rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{T.statuses[status.id]}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

              {/* Other filters grid */}
              <div className={cn(
                "grid gap-2", 
                inSheet 
                  ? "grid-cols-1 space-y-3" 
                  : "grid-cols-1 md:grid-cols-2 gap-3"
              )}>
                {/* Category Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{T.category}</label>
                  <Select onValueChange={handleCategoryChange} value={categoryFilter || 'all'}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={T.selectCategory} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{T.allCategories}</SelectItem>
                      {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{i18n[appSettings.language].categories[cat.id as keyof typeof i18n.en.categories] || cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Client Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{T.client}</label>
                  <Select onValueChange={handleClientChange} value={clientFilter || 'all'}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={T.selectClient} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{T.allClients}</SelectItem>
                      {clients.map((client: any) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Hide Date Range and Sort By filters in calendar view */}
                {currentViewMode !== 'calendar' && (
                  <>
                    {/* Date Range Filter */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">{T.dateRange}</label>
                      <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal h-7 text-xs", !date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {date?.from ? (
                              date.to ? (
                                <>
                                  {format(date.from, "MMM dd")} - {format(date.to, "MMM dd")}
                                </>
                              ) : (
                                format(date.from, "MMM dd, y")
                              )
                            ) : (
                              <span>{T.pickDate}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={(range) => { handleDateRangeChange(range); if (range?.from && range?.to) setIsDatePopoverOpen(false); }} numberOfMonths={2} />
                          <div className="p-2 border-t flex justify-end"><Button variant="ghost" size="sm" onClick={() => { handleDateRangeChange(undefined); setIsDatePopoverOpen(false); }}>{T.cancel}</Button></div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Sort By Filter */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">{T.sortBy}</label>
                      <Select onValueChange={handleSortChange} value={sortFilter || 'deadline-asc'}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder={T.selectSort} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deadline-asc">{T.sortDeadlineSoonest}</SelectItem>
                          <SelectItem value="deadline-desc">{T.sortDeadlineFarthest}</SelectItem>
                          <SelectItem value="startDate-desc">{T.sortNewest}</SelectItem>
                          <SelectItem value="startDate-asc">{T.sortOldest}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              {/* Clear filters button */}
              <div className="flex justify-start">
                <Button onClick={handleClearFilters} size="sm" variant="outline" className="h-7 text-xs">
                  <XCircle className="mr-1 h-3 w-3" />
                  {T.clearFilters}
                </Button>
              </div>
            </div>

            {/* Right side: View mode buttons - 50% còn lại */}
            {!inSheet && (
              <div className="w-1/2 flex justify-end items-start">
                <div className="flex flex-col space-y-1">
                  <Button
                    onClick={() => setCurrentViewMode('table')}
                    variant={currentViewMode === 'table' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 min-w-[100px] text-xs"
                  >
                    <Table className="mr-1 h-3 w-3" />
                    {T.tableView}
                  </Button>
                  <Button
                    onClick={() => setCurrentViewMode('calendar')}
                    variant={currentViewMode === 'calendar' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 min-w-[100px] text-xs"
                  >
                    <CalendarDays className="mr-1 h-3 w-3" />
                    {T.calendarView}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapsed state - chỉ hiển thị view buttons với layout 50/50 */}
      {isFiltersCollapsed && !inSheet && (
        <div className="flex">
          {/* Left side - trống để giữ tỷ lệ 50/50 */}
          <div className="w-1/2"></div>
          {/* Right side - view buttons */}
          <div className="w-1/2 flex justify-end">
            <div className="flex flex-col space-y-1">
              <Button
                onClick={() => setCurrentViewMode('table')}
                variant={currentViewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                className="h-7 min-w-[100px] text-xs"
              >
                <Table className="mr-1 h-3 w-3" />
                {T.tableView}
              </Button>
              <Button
                onClick={() => setCurrentViewMode('calendar')}
                variant={currentViewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                className="h-7 min-w-[100px] text-xs"
              >
                <CalendarDays className="mr-1 h-3 w-3" />
                {T.calendarView}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (view === 'trash') {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="flex-shrink-0">
          {filteredTasks.length > 0 && (
            <div className="flex justify-end">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            {T.emptyTrash}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{T.areYouSure}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {T.deletePermanently} {filteredTasks.length} {T.task}(s).
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{T.cancel}</AlertDialogCancel>
                            <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={handleEmptyTrash}>{T.delete}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          )}
        </div>
        <Card className="flex-1 flex flex-col min-h-0">
            <CardContent className="p-0 flex-1 overflow-y-auto">
                <TaskList 
                  tasks={paginatedTasks} 
                  quotes={quotes}
                  collaboratorQuotes={collaboratorQuotes}
                  clients={clients}
                  collaborators={collaborators}
                  categories={categories}
                  onEditTask={handleEditTask}
                  onTaskStatusChange={handleTaskStatusChange}
                  onDeleteTask={handleDeleteTask}
                  onAddClient={handleAddClientAndSelect}
                  quoteTemplates={quoteTemplates}
                  view={view}
                  onRestoreTask={handleRestoreTask}
                  onPermanentDeleteTask={handlePermanentDeleteTask}
                  settings={appSettings}
                />
            </CardContent>
        </Card>
        <div className="flex-shrink-0 border-t pt-4">
            <PaginationControls
              page={page}
              totalPages={totalPages}
              limit={limit}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              T={T}
            />
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentViewMode) {
      case 'table':
        return (
          <TableView
            tasks={paginatedTasks}
            quotes={quotes}
            collaboratorQuotes={collaboratorQuotes}
            clients={clients}
            collaborators={collaborators}
            categories={categories}
            onEditTask={handleEditTask}
            onTaskStatusChange={handleTaskStatusChange}
            onDeleteTask={handleDeleteTask}
            onAddClient={handleAddClientAndSelect}
            quoteTemplates={quoteTemplates}
            view={view}
            onRestoreTask={handleRestoreTask}
            onPermanentDeleteTask={handlePermanentDeleteTask}
            settings={appSettings}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            tasks={filteredTasks}
            quotes={quotes}
            collaboratorQuotes={collaboratorQuotes}
            clients={clients}
            collaborators={collaborators}
            categories={categories}
            onEditTask={handleEditTask}
            onTaskStatusChange={handleTaskStatusChange}
            onDeleteTask={handleDeleteTask}
            onAddClient={handleAddClientAndSelect}
            quoteTemplates={quoteTemplates}
            settings={appSettings}
            currentDate={calendarDate}
            viewMode={calendarMode}
            onDateChange={handleCalendarDateChange}
            onViewModeChange={handleCalendarModeChange}
          />
        );
      default:
        return (
          <TableView
            tasks={paginatedTasks}
            quotes={quotes}
            collaboratorQuotes={collaboratorQuotes}
            clients={clients}
            collaborators={collaborators}
            categories={categories}
            onEditTask={handleEditTask}
            onTaskStatusChange={handleTaskStatusChange}
            onDeleteTask={handleDeleteTask}
            onAddClient={handleAddClientAndSelect}
            quoteTemplates={quoteTemplates}
            view={view}
            onRestoreTask={handleRestoreTask}
            onPermanentDeleteTask={handlePermanentDeleteTask}
            settings={appSettings}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-shrink-0">
        {/* Desktop - New Filter & View Layout */}
        <div className="hidden md:block">
          <div className="flex items-start justify-between gap-4 mb-4">
            {/* Left: Filter Chip Bar */}
            <div className="flex-1 min-w-0">
            <FilterChipBar
              selectedStatuses={selectedStatuses}
              selectedCategory={selectedCategory}
              selectedCollaborator={selectedCollaborator}
              selectedClient={selectedClient}
              dateRange={dateRange}
              onStatusFilterChange={handleStatusFilterChange}
              onStatusDoubleClick={handleStatusDoubleClick}
              onStatusBatchChange={handleStatusBatchChange}
              onCategoryChange={setSelectedCategory}
              onCollaboratorChange={setSelectedCollaborator}
              onClientChange={setSelectedClient}
              onDateRangeChange={setDateRange}
              onClearFilters={clearAllFilters}
              sortFilter={sortFilter || 'deadline-asc'}
              handleSortChange={handleSortChange}
              viewMode={currentViewMode}
              T={T}
              allCategories={allCategories}
              collaborators={collaborators}
              clients={clients}
              statuses={statuses}
              statusColors={appSettings.statusColors}
            />
            </div>
            
            {/* Right: View Mode Toggle - Fixed Position */}
            <div className="flex-shrink-0 self-start sticky top-0 z-10">
              <ViewModeToggle
                currentMode={currentViewMode}
                onModeChange={setCurrentViewMode}
              />
            </div>
          </div>
        </div>
        
        {/* Mobile Filters */}
        <div className="block md:hidden">
             <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" className="w-full">
                        <Filter className="mr-2 h-4 w-4" />
                        Filters
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-lg">
                    <SheetHeader>
                        <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="py-4">
                        <FiltersComponent inSheet={true} />
                        {/* View mode buttons for mobile - 2 hàng */}
                        <div className="flex flex-col space-y-2 mt-4">
                          <Button
                            onClick={() => setCurrentViewMode('table')}
                            variant={currentViewMode === 'table' ? 'default' : 'outline'}
                            size="sm"
                            className="w-full"
                          >
                            <Table className="mr-2 h-4 w-4" />
                            {T.tableView}
                          </Button>
                          <Button
                            onClick={() => setCurrentViewMode('calendar')}
                            variant={currentViewMode === 'calendar' ? 'default' : 'outline'}
                            size="sm"
                            className="w-full"
                          >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {T.calendarView}
                          </Button>
                        </div>
                    </div>
                    <SheetFooter>
                        <SheetClose asChild>
                            <Button>Done</Button>
                        </SheetClose>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
      </div>
      
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardContent className={cn("flex-1 min-h-0 flex flex-col", currentViewMode === 'calendar' ? "p-0" : "p-0 overflow-y-auto")}>
            {renderView()}
        </CardContent>
      </Card>
      
      {/* Hide pagination in calendar view */}
      {currentViewMode !== 'calendar' && (
        <div className="flex-shrink-0 border-t pt-4">
          <PaginationControls
              page={page}
              totalPages={totalPages}
              limit={limit}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              T={T}
          />
        </div>
      )}
    </div>
  );
}
