import React, { useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_INFO } from '@/lib/data';
import { i18n } from '@/lib/i18n';
import type { Category, Client, AppSettings } from '@/lib/types';
import styles from './dashboard-content.module.css';

export interface CalendarFiltersProps {
  inSheet?: boolean;
  // Filter states
  selectedStatuses: string[];
  categoryFilter: string | null;
  clientFilter: string | null;
  // Calendar-specific states
  currentDate: Date;
  viewMode: 'week' | 'month';
  // Filter handlers
  onStatusChange: (statusId: string, isSelected: boolean) => void;
  onStatusDoubleClick: (statusId: string) => void;
  onCategoryChange: (value: string) => void;
  onClientChange: (value: string) => void;
  onClearFilters: () => void;
  // Calendar handlers
  onDateNavigation: (direction: 'prev' | 'next' | 'today') => void;
  onViewModeChange: (mode: 'week' | 'month') => void;
  // Data
  categories: Category[];
  clients: Client[];
  appSettings: AppSettings;
}

export function CalendarFilters({
  inSheet = false,
  selectedStatuses,
  categoryFilter,
  clientFilter,
  currentDate,
  viewMode,
  onStatusChange,
  onStatusDoubleClick,
  onCategoryChange,
  onClientChange,
  onClearFilters,
  onDateNavigation,
  onViewModeChange,
  categories,
  clients,
  appSettings,
}: CalendarFiltersProps) {
  const T = i18n[appSettings.language];

  return (
    <div className={cn("grid gap-4", inSheet ? "grid-cols-2" : "md:grid-cols-4")}>
      
      {/* Status Filter - Same as table view */}
      <div className={cn("flex flex-col justify-between", inSheet ? "col-span-1" : "md:col-span-1")}>
        <label className="text-sm font-medium text-muted-foreground block mb-2">{T.status}</label>
        <TooltipProvider>
          <div className="grid grid-cols-5 gap-1">
            {STATUS_INFO.map(status => {
              const isSelected = selectedStatuses.includes(status.id);
              const buttonRef = useRef<HTMLButtonElement>(null);
              
              useEffect(() => {
                if (buttonRef.current) {
                  buttonRef.current.style.setProperty('--status-color', appSettings.statusColors[status.id]);
                }
              }, [status.id, appSettings.statusColors]);
              
              return (
                <Tooltip key={status.id} delayDuration={100}>
                  <TooltipTrigger asChild>
                    <button
                      ref={buttonRef}
                      onClick={() => onStatusChange(status.id, !isSelected)}
                      onDoubleClick={() => onStatusDoubleClick(status.id)}
                      className={cn(
                        styles.statusSwatch,
                        isSelected ? styles.selected : styles.unselected,
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      )}
                      aria-label={T.statuses[status.id]}
                    >
                      <span className="block w-full h-full rounded-full" />
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

      {/* Category Filter - Same as table view */}
      <div className="flex flex-col justify-between">
        <label className="text-sm font-medium text-muted-foreground block mb-2">{T.category}</label>
        <Select onValueChange={onCategoryChange} value={categoryFilter || 'all'}>
          <SelectTrigger>
            <SelectValue placeholder={T.selectCategory} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{T.allCategories}</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {T.categories[cat.id as keyof typeof T.categories] || cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Client Filter - Same as table view */}
      <div className="flex flex-col justify-between">
        <label className="text-sm font-medium text-muted-foreground block mb-2">{T.client}</label>
        <Select onValueChange={onClientChange} value={clientFilter || 'all'}>
          <SelectTrigger>
            <SelectValue placeholder={T.selectClient} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{T.allClients}</SelectItem>
            {clients.map((client: Client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calendar Navigation + View Mode Toggle - NEW for calendar */}
      <div className="flex flex-col justify-between">
        <label className="text-sm font-medium text-muted-foreground block mb-2">{T.calendarNavigation || 'Navigation'}</label>
        <div className="space-y-2">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateNavigation('prev')}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateNavigation('today')}
              className="h-8 px-2 text-xs flex-1"
            >
              {T.todayButton || 'Today'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateNavigation('next')}
              className="h-8 px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 rounded-md border p-1">
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('week')}
              className="h-6 text-xs flex-1"
            >
              {T.weekView || 'Week'}
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('month')}
              className="h-6 text-xs flex-1"
            >
              {T.monthView || 'Month'}
            </Button>
          </div>
        </div>
      </div>

      {/* Clear Filters - Same as table view */}
      <div className={cn("flex items-end", inSheet ? "col-span-2" : "self-end")}>
        <Button onClick={onClearFilters} variant="outline" size="sm" className="w-full">
          <XCircle className="mr-2 h-4 w-4" />
          {T.clearFilters}
        </Button>
      </div>
    </div>
  );
}
