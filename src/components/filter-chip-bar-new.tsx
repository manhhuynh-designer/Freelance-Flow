'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ChevronDown, ChevronUp, X, Calendar, Filter, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_INFO } from '@/lib/data';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';


interface FilterChipBarProps {
  // Filter states
  selectedStatuses: string[];
  selectedCategory: string;
  selectedCollaborator: string;
  selectedClient: string;
  dateRange: DateRange | undefined;

  // Handlers
  onStatusFilterChange: (statusId: string, checked: boolean) => void;
  onStatusDoubleClick: (statusId: string) => void;
  onStatusBatchChange?: (statusesToEnable: string[]) => void;
  onCategoryChange: (category: string) => void;
  onCollaboratorChange: (collaborator: string) => void;
  onClientChange: (client: string) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onClearFilters: () => void;

  // Sort
  sortFilter: string;
  handleSortChange: (value: string) => void;

  // View mode
  viewMode?: string;

  // Data
  T: any;
  allCategories: any[];
  collaborators: any[];
  clients: any[];
  statuses: any[];
  statusColors: Record<string, string>;
}

export function FilterChipBar({
  selectedStatuses,
  selectedCategory,
  selectedCollaborator,
  selectedClient,
  dateRange,
  onStatusFilterChange,
  onStatusDoubleClick,
  onStatusBatchChange,
  onCategoryChange,
  onCollaboratorChange,
  onClientChange,
  onDateRangeChange,
  onClearFilters,
  sortFilter,
  handleSortChange,
  viewMode,
  T,
  allCategories,
  collaborators,
  clients,
  statuses,
  statusColors
}: FilterChipBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // const [triggerSave, setTriggerSave] = useState(false);

  const hasActiveFilters = selectedStatuses.length < STATUS_INFO.length || selectedCategory !== 'all' || selectedCollaborator !== 'all' || selectedClient !== 'all' || dateRange;

  const getStatusInfo = (statusId: string) => {
    return STATUS_INFO.find(s => s.id === statusId);
  };

  const getCategoryName = (categoryId: string) => {
    return allCategories.find((c: any) => c.id === categoryId)?.name || categoryId;
  };

  const getCollaboratorName = (collaboratorId: string) => {
    return collaborators.find((c: any) => c.id === collaboratorId)?.name || collaboratorId;
  };

  const getClientName = (clientId: string) => {
    return clients.find((c: any) => c.id === clientId)?.name || clientId;
  };

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return '';
    if (!range.to) return format(range.from, 'MMM dd, yyyy');
    return `${format(range.from, 'MMM dd')} - ${format(range.to, 'MMM dd, yyyy')}`;
  };

  const getStatusButtonClasses = (statusId: string, isActive: boolean) => {
    const color = statusColors?.[statusId] || '#ccc';
    const baseClasses = "w-8 h-8 rounded-full transition-all duration-200 border-2 hover:scale-105";
    
    if (isActive) {
      return `${baseClasses} shadow-md border-white`;
    } else {
      return `${baseClasses} border-transparent opacity-50 hover:opacity-75`;
    }
  };



  return (
    <div className="space-y-4">
      {/* Bordered filter area */}
      <div className="border border-border rounded-lg p-2 bg-background">
        {/* Filter Presets removed */}

        {/* Filter Chips Row - Hide when expanded */}
        {!isExpanded && (
          <div className="flex items-center gap-3 flex-wrap min-h-[32px] mb-1 mt-2">
            {/* Status Filter Buttons - Color coded circles */}
            <div className="flex items-center gap-2">
              <TooltipProvider>
                {STATUS_INFO.map(status => {
                  const isActive = selectedStatuses.includes(status.id);
                  const color = statusColors?.[status.id] || '#ccc';
                  return (
                    <Tooltip key={status.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onStatusFilterChange(status.id, !isActive)}
                          onDoubleClick={() => onStatusDoubleClick(status.id)}
                          className={getStatusButtonClasses(status.id, isActive)}
                          style={{ backgroundColor: color }}
                          aria-label={`${status.name} ${isActive ? 'active' : 'inactive'}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {status.name} {isActive ? '(Active)' : '(Inactive)'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>

            {/* Other Filter Chips */}

          {/* Category Filter Chip */}
          {selectedCategory && (
            <Badge variant="secondary" className="gap-1">
              Category: {getCategoryName(selectedCategory)}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => onCategoryChange('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {/* Collaborator Filter Chip */}
          {selectedCollaborator && (
            <Badge variant="secondary" className="gap-1">
              Collaborator: {getCollaboratorName(selectedCollaborator)}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => onCollaboratorChange('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {/* Client Filter Chip */}
          {selectedClient && (
            <Badge variant="secondary" className="gap-1">
              Client: {getClientName(selectedClient)}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => onClientChange('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

            {/* Date Range Filter Chip */}
            {dateRange && (dateRange.from || dateRange.to) && (
              <Badge variant="secondary" className="gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateRange(dateRange)}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 hover:bg-transparent"
                  onClick={() => onDateRangeChange(undefined)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            {/* Expand/Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-auto flex-shrink-0"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="ml-1 h-4 w-4" />
                </>
              ) : (
                <>
                  <ChevronDown className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
    
   

      {/* Expanded Filters Panel - Separate from main row */}
      {isExpanded && (
        
       <div className="w-full p-4 dark:bg-muted/30 rounded-lg border-border/50 transition-all duration-200 animate-in slide-in-from-top-2">
        
         <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
           <Filter className="h-4 w-4" />
           {T.advancedFilters || 'Advanced Filters'}
         </div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 md:gap-y-0 md:gap-x-4 mx-auto">
           {/* 1. Status column */}
             <div className="space-y-2">
             <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
               {T.status || 'Status'}
             </label>
             <div className="flex flex-wrap gap-4">
               {STATUS_INFO.map(status => {
               const isActive = selectedStatuses.includes(status.id);
               const color = statusColors?.[status.id] || '#ccc';
               return (
                 <div key={status.id} className="flex flex-col items-center gap-4">
                 <button
                   onClick={() => onStatusFilterChange(status.id, !isActive)}
                   onDoubleClick={() => onStatusDoubleClick(status.id)}
                   className={getStatusButtonClasses(status.id, isActive)}
                   style={{ backgroundColor: color }}
                   aria-label={`${status.name} ${isActive ? 'active' : 'inactive'}`}
                 />
                 <span className="text-xs text-muted-foreground text-center leading-tight">
                   {status.name}
                 </span>
                 </div>
               );
               })}

               {viewMode !== 'calendar' && (
                 <div className="flex items-center gap-2 mt-2 w-full">
                   <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                     {T.sortBy || 'Sort By'}
                   </label>
                   <Select value={sortFilter || 'deadline-asc'} onValueChange={handleSortChange}>
                     <SelectTrigger className="h-8 flex items-center px-3 text-xs rounded-md border bg-background cursor-pointer min-w-0 shadow-none w-full">
                       <SelectValue placeholder={T.selectSort || 'Select sort'} />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="deadline-asc">{T.sortDeadlineSoonest || 'Deadline (Soonest)'}</SelectItem>
                       <SelectItem value="deadline-desc">{T.sortDeadlineFarthest || 'Deadline (Farthest)'}</SelectItem>
                       <SelectItem value="startDate-desc">{T.sortNewest || 'Start Date (Newest)'}</SelectItem>
                       <SelectItem value="startDate-asc">{T.sortOldest || 'Start Date (Oldest)'}</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               )}
             </div>
             </div>

           {/* 2. Client + Collaborator column */}
           <div className="space-y-4" style={{ marginTop: '0.45rem' }}>
             <div className="space-y-2">
               <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                 {T.client || 'Client'}
               </label>
               <Select value={selectedClient} onValueChange={onClientChange}>
                 <SelectTrigger className="h-8 flex items-center px-3 text-xs rounded-md border bg-background cursor-pointer w-full min-w-0 shadow-none">
                   <SelectValue placeholder={T.selectClient || 'Select client'} />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">
                     {T.allClients || 'All clients'}
                   </SelectItem>
                   {clients.map((client: any) => (
                     <SelectItem key={client.id} value={client.id}>
                       {client.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                 {T.collaborator || 'Collaborator'}
               </label>
               <Select value={selectedCollaborator} onValueChange={onCollaboratorChange}>
                 <SelectTrigger className="h-8 flex items-center px-3 text-xs rounded-md border bg-background cursor-pointer w-full min-w-0 shadow-none">
                   <SelectValue placeholder={T.selectCollaborator || 'Select collaborator'} />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">
                     {T.allCollaborators || 'All collaborators'}
                   </SelectItem>
                   {collaborators.map((collaborator: any) => (
                     <SelectItem key={collaborator.id} value={collaborator.id}>
                       {collaborator.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </div>

           {/* 3. Category + Date Range column */}
           <div className="space-y-4" style={{ marginTop: '0.45rem' }}>
             <div className="space-y-2">
               <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                 {T.category || 'Category'}
               </label>
               <Select value={selectedCategory} onValueChange={onCategoryChange}>
                 <SelectTrigger className="h-8 flex items-center px-3 text-xs rounded-md border bg-background cursor-pointer w-full min-w-0 shadow-none">
                   <SelectValue placeholder={T.selectCategory || 'Select category'} />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">
                     {T.allCategories || 'All categories'}
                   </SelectItem>
                   {allCategories.map((category: any) => (
                     <SelectItem key={category.id} value={category.id}>
                       {category.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           {viewMode !== 'calendar' && (
             <div className="space-y-2">
               <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                 {T.dateRange || 'Date Range'}
               </label>
               <Popover>
                 <PopoverTrigger asChild>
                   <div>
                     <div className="h-8 flex items-center px-3 text-xs rounded-md border bg-background cursor-pointer w-full min-w-0">
                       {/* shadow-none added to remove any box-shadow */}
                       <Calendar className="mr-2 h-3 w-3" />
                       {dateRange?.from ? (
                         dateRange.to ? (
                           <>
                             {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                           </>
                         ) : (
                           format(dateRange.from, "LLL dd, y")
                         )
                       ) : (
                         <span className="text-muted-foreground">{T.pickDateRange || 'Pick a date range'}</span>
                       )}
                     </div>
                   </div>
                 </PopoverTrigger>
                 <PopoverContent className="w-auto p-0" align="start">
                   <CalendarComponent
                     initialFocus
                     mode="range"
                     defaultMonth={dateRange?.from}
                     selected={dateRange}
                     onSelect={onDateRangeChange}
                     numberOfMonths={2}
                   />
                 </PopoverContent>
               </Popover>
             </div>
           )}
           </div>
         </div>

         {/* Action Buttons */}
         <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
           <Button
             variant="ghost"
             size="sm"
             onClick={onClearFilters}
             className="h-7 px-3 text-xs text-muted-foreground hover:text-destructive transition-colors"
           >
             <X className="mr-1 h-3 w-3" />
             {T.clearAll || 'Clear all'}
           </Button>
           <div className="flex gap-2">
             <Button
               variant="ghost"
               size="sm"
               onClick={() => setIsExpanded(false)}
               className="h-7 px-3 text-xs hover:bg-background transition-colors"
             >
               {T.done || 'Done'}
             </Button>
           </div>
         </div>
       </div>
      )}
      </div>
    </div>
  );
}
