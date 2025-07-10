
"use client";

import { useState, useMemo, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import { CalendarIcon, XCircle, Trash2, Filter } from "lucide-react";
import { TaskList } from '@/components/task-list';
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
import { PaginationControls } from "./pagination-controls";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export default function DashboardContent() {
  const { 
    tasks, quotes, collaboratorQuotes, clients, collaborators, appSettings,
    handleEditTask,
    handleTaskStatusChange, handleDeleteTask, handleRestoreTask, 
    handlePermanentDeleteTask, handleAddClientAndSelect, quoteTemplates, categories,
    handleEmptyTrash,
  } = useDashboard() || {};
  
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const FILTERS_STORAGE_KEY = 'freelance-flow-filters';

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

  const defaultStatuses = useMemo(() => STATUS_INFO.map(s => s.id), []);

  const selectedStatuses = useMemo(() => {
    if (statusFilter === null) return defaultStatuses;
    if (statusFilter === 'none') return [];
    return statusFilter.split(',');
  }, [statusFilter, defaultStatuses]);
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: startDateFilter ? new Date(startDateFilter) : undefined,
    to: endDateFilter ? new Date(endDateFilter) : undefined,
  });

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
    const currentParams = new URLSearchParams(Array.from(searchParams.entries()));
    currentParams.delete('page');
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
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (value === null) {
      current.delete(name);
    } else {
      current.set(name, value);
    }
    current.delete('page');
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  }

  const handleStatusFilterChange = (statusId: string, checked: boolean) => {
      let newActiveStatuses;
      if (checked) {
          newActiveStatuses = [...new Set([...selectedStatuses, statusId])];
      } else {
          newActiveStatuses = selectedStatuses.filter(id => id !== statusId);
      }
      const sortedNew = [...newActiveStatuses].sort();
      const sortedDefault = [...defaultStatuses].sort();
      const isDefault = sortedNew.length === sortedDefault.length && sortedNew.every((val, index) => val === sortedDefault[index]);
      
      if (isDefault) updateSearchParam('status', null);
      else if (newActiveStatuses.length > 0) updateSearchParam('status', newActiveStatuses.join(','));
      else updateSearchParam('status', 'none');
  }

  const handleStatusDoubleClick = (statusId: string) => updateSearchParam('status', statusId);
  const handleCategoryChange = (value: string) => updateSearchParam('category', value === 'all' ? null : value);
  const handleClientChange = (value: string) => updateSearchParam('client', value === 'all' ? null : value);
  const handleSortChange = (value: string) => updateSearchParam('sortBy', value);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDate(range);
    const current = new URLSearchParams(Array.from(searchParams.entries()));
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
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set('page', String(newPage));
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  const handleLimitChange = (newLimit: number) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set('limit', String(newLimit));
    current.delete('page');
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  const FiltersComponent = ({ inSheet = false }: { inSheet?: boolean }) => (
    <div className={cn("grid gap-4", inSheet ? "grid-cols-2" : "md:grid-cols-3 lg:grid-cols-5")}>
        <div className={cn("flex flex-col justify-between", inSheet ? "col-span-1" : "md:col-span-1 lg:col-span-1")}>
            <label className="text-sm font-medium text-muted-foreground block mb-2">{T.status}</label>
            <TooltipProvider>
              <div className="grid grid-cols-5 gap-1">
                {STATUS_INFO.map(status => {
                  const isSelected = selectedStatuses.includes(status.id);
                  return (
                    <Tooltip key={status.id} delayDuration={100}>
                      <TooltipTrigger asChild>
                          <button
                              onClick={() => handleStatusFilterChange(status.id, !isSelected)}
                              onDoubleClick={() => handleStatusDoubleClick(status.id)}
                              style={{ backgroundColor: isSelected ? appSettings.statusColors[status.id] : undefined }}
                              className={cn(
                                  "w-full aspect-square rounded-full transition-opacity duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                  !isSelected && "opacity-30 hover:opacity-75"
                              )}
                              aria-label={T.statuses[status.id]}
                          >
                            <span style={{ backgroundColor: !isSelected ? appSettings.statusColors[status.id] : undefined }} className="block w-full h-full rounded-full"/>
                          </button>
                      </TooltipTrigger>
                      <TooltipContent>
                          <p>{T.statuses[status.id]}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </TooltipProvider>
        </div>
          <div className="flex flex-col justify-between">
            <label className="text-sm font-medium text-muted-foreground block mb-2">{T.category}</label>
            <Select onValueChange={handleCategoryChange} value={categoryFilter || 'all'}>
                <SelectTrigger><SelectValue placeholder={T.selectCategory} /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{T.allCategories}</SelectItem>
                    {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{i18n[appSettings.language].categories[cat.id as keyof typeof i18n.en.categories] || cat.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
          <div className="flex flex-col justify-between">
            <label className="text-sm font-medium text-muted-foreground block mb-2">{T.client}</label>
            <Select onValueChange={handleClientChange} value={clientFilter || 'all'}>
                <SelectTrigger><SelectValue placeholder={T.selectClient} /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{T.allClients}</SelectItem>
                    {clients.map((client: any) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
        <div className="flex flex-col justify-between">
            <label className="text-sm font-medium text-muted-foreground block mb-2">{T.dateRange}</label>
            <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                          date.to ? (
                            <>
                              {format(date.from, "LLL dd, y")} -{" "}
                              {format(date.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(date.from, "LLL dd, y")
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
         <div className="flex flex-col justify-between">
            <label className="text-sm font-medium text-muted-foreground block mb-2">{T.sortBy}</label>
            <Select onValueChange={handleSortChange} value={sortFilter || 'deadline-asc'}>
                <SelectTrigger>
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
        <div className={cn("flex items-end", inSheet ? "col-span-2" : "self-end")}>
            <Button onClick={handleClearFilters} className="w-full">
                <XCircle className="mr-2 h-4 w-4" />
                {T.clearFilters}
            </Button>
        </div>
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

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-shrink-0">
        {/* Desktop Filters */}
        <div className="hidden md:block">
            <Card>
                <CardContent className="p-4">
                    <FiltersComponent />
                </CardContent>
            </Card>
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
