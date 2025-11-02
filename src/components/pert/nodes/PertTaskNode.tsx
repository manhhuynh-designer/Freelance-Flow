"use client";

import React, { memo, useState, useCallback, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Settings, 
  Clock, 
  Flag, 
  FlagOff,
  AlertCircle,
  CheckCircle2,
  Minus,
  Edit3,
  Trash2,
  X,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Task, Client, Category, Collaborator, StatusInfo } from '@/lib/types';
import { format, isValid } from 'date-fns';
import { useDashboard } from '@/contexts/dashboard-context';
import { format as dfFormat } from 'date-fns';
import { getTranslations } from '@/lib/i18n';
import { STATUS_INFO } from '@/lib/data';
import { getContrastingTextColor } from "@/lib/colors";
import { useToast } from "@/hooks/use-toast";

interface PertTaskNodeData {
  task: Task;
  isSelected?: boolean;
  isCritical?: boolean;
  clients?: Client[];
  categories?: Category[];
  collaborators?: Collaborator[];
  dataSignature?: string;
  onDelete?: (taskId: string) => void;
  onToggleCritical?: (taskId: string) => void;
  onOpenPertDetails?: (taskId: string) => void;
  onRemoveFromProject?: (taskId: string) => void;
}

export type PertTaskNodeProps = NodeProps<PertTaskNodeData>;

const PertTaskNode = memo(({ data, selected }: PertTaskNodeProps) => {
  const {
    task,
    isSelected = false,
    isCritical = false,
    clients = [],
    categories = [],
    collaborators = [],
    onDelete,
    onToggleCritical,
  } = data;

  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [isPriorityPopoverOpen, setIsPriorityPopoverOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  
  // Local status for immediate UI feedback
  const [currentStatusId, setCurrentStatusId] = useState<string>(task.status);
  React.useEffect(() => {
    setCurrentStatusId(task.status);
  }, [task.status]);

  const client = clients.find(c => c.id === task.clientId);
  const category = categories.find(c => c.id === task.categoryId);
  const taskCollaborators = collaborators.filter(c => task.collaboratorIds?.includes(c.id));

  const dashboard = useDashboard();
  const appSettings = dashboard?.appData?.appSettings;
  const statusColorsMap = appSettings?.statusColors || {};
  const statusBorderColor = statusColorsMap?.[task.status] || undefined;
  const { toast } = useToast();
  
  // Get translations
  const T = getTranslations(appSettings?.language || 'vi');

  const getStatusColor = (status: Task['status']) => {
    const statusColors = {
      todo: 'bg-purple-100 text-purple-800 border-purple-200',
      inprogress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      done: 'bg-green-100 text-green-800 border-green-200',
      onhold: 'bg-orange-100 text-orange-800 border-orange-200',
      archived: 'bg-gray-100 text-gray-800 border-gray-200',
    } as Record<string, string>;
    return statusColors[status] || statusColors.todo;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'onhold':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  // Eisenhower color schemes (matching other views)
  const eisenhowerSchemes = {
    colorScheme1: { do: '#ef4444', decide: '#3b82f6', delegate: '#f59e0b', delete: '#6b7280' },
    colorScheme2: { do: '#d8b4fe', decide: '#bbf7d0', delegate: '#fed7aa', delete: '#bfdbfe' },
    colorScheme3: { do: '#99f6e4', decide: '#fbcfe8', delegate: '#fde68a', delete: '#c7d2fe' },
  } as const;

  const getFlagColor = (quadrant?: 'do' | 'decide' | 'delegate' | 'delete') => {
    if (!quadrant) return '#e5e7eb';
    const scheme = appSettings?.eisenhowerColorScheme || 'colorScheme1';
    const colorMap = eisenhowerSchemes[scheme as keyof typeof eisenhowerSchemes] || eisenhowerSchemes.colorScheme1;
    return colorMap[quadrant] || '#e5e7eb';
  };

  // Build full status list (user-defined first, fallback to defaults)
  const allStatuses: StatusInfo[] = useMemo(() => {
    return (appSettings?.statusSettings && appSettings.statusSettings.length > 0)
      ? appSettings.statusSettings as unknown as StatusInfo[]
      : (STATUS_INFO as StatusInfo[]);
  }, [appSettings?.statusSettings]);

  // Helper to get status color safely
  const getStatusColorValue = useCallback((id: string): string => {
    const map = appSettings?.statusColors as unknown as Record<string, string> | undefined;
    return map?.[id] || '#ccc';
  }, [appSettings?.statusColors]);

  // Handle status change
  const handleChangeStatus = useCallback((newStatusId: string) => {
    try {
      if (newStatusId === currentStatusId) return;
      const newStatus = allStatuses.find(s => s.id === newStatusId);
      // optimistic update
      setCurrentStatusId(newStatusId);
      
      // Use dashboard context to update task
      dashboard?.updateTask({ id: task.id, status: newStatusId });
      
      toast({
        title: T.taskUpdated || "Status updated",
        description: `${T.task || "Task"} → ${(newStatus as any)?.label || (T.statuses as any)?.[newStatusId] || newStatusId}`,
      });
      
      setIsStatusDropdownOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: T.error || "Error", description: "Failed to update status" });
    }
  }, [task.id, currentStatusId, allStatuses, dashboard, toast, T]);

  const formatTimeEstimate = () => {
    if (task.optimisticTime && task.mostLikelyTime && task.pessimisticTime) {
      return `O:${task.optimisticTime}d | M:${task.mostLikelyTime}d | P:${task.pessimisticTime}d`;
    }
    if (task.expectedTime) {
      return `Est: ${Number(task.expectedTime).toFixed(2)}d`;
    }
    if (task.duration) {
      return `Duration: ${task.duration}d`;
    }
    return null;
  };

  const formatDeadline = () => {
    try {
      const deadline = new Date(task.deadline as any);
      if (isValid(deadline)) {
        return dfFormat(deadline, 'dd/MM');
      }
    } catch {
      // ignore
    }
    return null;
  };

  const formatStartToDeadline = () => {
    try {
      const start = new Date(task.startDate as any);
      const deadline = new Date(task.deadline as any);
      const startStr = isValid(start) ? dfFormat(start, 'dd/MM') : '—';
      const endStr = isValid(deadline) ? dfFormat(deadline, 'dd/MM') : '—';
      return `${startStr} → ${endStr}`;
    } catch {
      return null;
    }
  };

  const handleDelete = () => { 
    data.onDelete?.(task.id); 
    setIsContextMenuOpen(false); 
  };
  
  const handleOpenPertDetails = () => {
    data.onOpenPertDetails?.(task.id);
    setIsContextMenuOpen(false);
  };

  // Double-click handler to open TaskDetailsDialog
  const handleDoubleClick = () => {
    if (dashboard?.handleViewTask) {
      dashboard.handleViewTask(task.id);
    }
  };

  return (
    <div className="pert-task-node">
      <Handle
        type="target"
        position={Position.Left}
        // increased size ~3x (was w-5/h-5 ~20px -> now ~60px)
        className="bg-blue-500 border-2 border-white rounded-full shadow-sm"
        style={{ width: 12, height: 12, left: -13, top: '50%', transform: 'translateY(-50%)' }}
      />

      <Card
            className={cn(
              "w-56 min-h-[140px] cursor-pointer transition-all duration-200",
              "hover:shadow-md border-2",
              selected && "ring-2 ring-blue-500",
              isCritical && "border-red-300 bg-red-50",
              isSelected && "shadow-lg",
              task.isCritical && "border-red-400 shadow-red-100"
            )}
            style={statusBorderColor ? { borderColor: statusBorderColor } : undefined}
            onDoubleClick={handleDoubleClick}
      >
        <CardContent className="p-4">
          {/* Header Row: Priority Flag + Title + Settings */}
          <div className="flex items-start gap-2 mb-3">
            {/* Priority Flag */}
            <Popover open={isPriorityPopoverOpen} onOpenChange={setIsPriorityPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted shrink-0 relative mt-0.5"
                  title={T.eisenhowerPriority || 'Priority'}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    e.preventDefault();
                    setIsPriorityPopoverOpen(!isPriorityPopoverOpen);
                  }}
                  onPointerDown={(e) => { 
                    e.stopPropagation(); 
                  }}
                >
                  {task.eisenhowerQuadrant ? (
                    <Flag 
                      className="w-4 h-4 drop-shadow" 
                      color={getFlagColor(task.eisenhowerQuadrant as any)} 
                      fill={getFlagColor(task.eisenhowerQuadrant as any)} 
                    />
                  ) : (
                    <FlagOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-56 p-2" 
                align="start" 
                onClick={(e) => e.stopPropagation()}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onPointerDown={(e) => { e.stopPropagation(); }}
              >
                <div className="grid grid-cols-2 gap-2">
                  {(['do', 'decide', 'delegate', 'delete'] as const).map((q) => (
                    <Button
                      key={q}
                      variant={task.eisenhowerQuadrant === q ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 px-2 flex items-center gap-1 justify-start"
                      onPointerDown={(e) => { e.stopPropagation(); }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        await dashboard.updateTask({ id: task.id, eisenhowerQuadrant: q });
                        setIsPriorityPopoverOpen(false);
                      }}
                    >
                      <Flag className="w-3 h-3" color={getFlagColor(q)} fill={getFlagColor(q)} />
                      <span className="text-[11px] capitalize">{T[`quadrant_${q}`] || q}</span>
                    </Button>
                  ))}
                  <Button
                    variant={!task.eisenhowerQuadrant ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 px-2 col-span-2"
                    onPointerDown={(e) => { e.stopPropagation(); }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      await dashboard.updateTask({ id: task.id, eisenhowerQuadrant: undefined });
                      setIsPriorityPopoverOpen(false);
                    }}
                  >
                    <FlagOff className="w-3 h-3" />
                    <span className="text-[11px]">{T.clearLabel || 'Clear'}</span>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Task Title - Full Width Display */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm leading-snug text-gray-900 break-words">{task.name}</h4>
            </div>

            {/* Settings Menu */}
            <DropdownMenu open={isContextMenuOpen} onOpenChange={setIsContextMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 rounded hover:bg-gray-100 transition-colors shrink-0"
                  title="Task options"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleOpenPertDetails}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  {T.editPert || 'Edit PERT'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e)=>{ 
                    e.stopPropagation(); 
                    data.onRemoveFromProject?.(task.id); 
                    setIsContextMenuOpen(false);
                  }}
                  className="text-red-600"
                >
                  <X className="w-4 h-4 mr-2" />
                  {T.removeFromProject || 'Remove from project'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Date Range and Time Row */}
          <div className="flex items-center gap-2 mb-3">
            {/* Start → Deadline */}
            {formatStartToDeadline() && (
              <span className="text-xs text-gray-500 font-medium flex-1">
                {formatStartToDeadline()}
              </span>
            )}
            
            {/* Separator */}
            {formatStartToDeadline() && task.expectedTime && (
              <span className="text-xs text-gray-400">|</span>
            )}
            
            {/* Expected Time with Tooltip */}
            {task.expectedTime && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-1 bg-gray-50 rounded px-2 py-1 cursor-help hover:bg-gray-100 transition-colors">
                    <Clock className="h-3 w-3 text-gray-500" />
                    <span className="text-xs font-medium text-blue-600">
                      {Number(task.expectedTime).toFixed(2)}d
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="text-xs space-y-1">
                    <div className="font-medium text-blue-600">
                      {T.expected || 'Expected'}: {Number(task.expectedTime).toFixed(2)}d
                    </div>
                    {formatTimeEstimate() && (
                      <div className="text-gray-700 pt-1 border-t border-gray-300">
                        {formatTimeEstimate()}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Category and Status Row */}
          <div className="flex items-center justify-between mb-2">
            {/* Category Badge */}
            <div className="flex-1">
              {category && (
                <Badge variant="secondary" className="text-xs px-2">
                  {category.name}
                </Badge>
              )}
            </div>
            
            {/* Status Dropdown */}
            <DropdownMenu open={isStatusDropdownOpen} onOpenChange={setIsStatusDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button 
                  type="button" 
                  className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Badge
                    style={{
                      backgroundColor: getStatusColorValue(currentStatusId),
                      color: getContrastingTextColor(getStatusColorValue(currentStatusId))
                    }}
                    className="flex items-center gap-1 cursor-pointer text-xs px-2 py-1"
                  >
                    {getStatusIcon(currentStatusId)}
                    <span className="ml-1 capitalize">{currentStatusId}</span>
                  </Badge>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="min-w-[12rem]"
                onClick={(e) => e.stopPropagation()} 
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {'Change status'}
                </div>
                {allStatuses.map((s) => {
                  const CIcon: any = (s as any).icon;
                  const bg = getStatusColorValue(s.id);
                  const label = (appSettings?.statusSettings || []).find(x => x.id === s.id)?.label
                    || (T.statuses as any)?.[s.id]
                    || s.id;
                  const isActive = currentStatusId === s.id;
                  return (
                    <DropdownMenuItem
                      key={s.id}
                      onClick={() => handleChangeStatus(s.id)}
                      className={cn('flex items-center gap-2', isActive && 'opacity-100')}
                    >
                      {/* colored dot via SVG fill to avoid inline styles */}
                      <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                        <circle cx="8" cy="8" r="6" fill={bg} />
                      </svg>
                      {CIcon ? <CIcon className="h-3 w-3 opacity-80" /> : null}
                      <span className="text-xs">{label}</span>
                      {isActive && (
                        <span className="ml-auto text-xs text-muted-foreground">{T.current || 'Current'}</span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* PERT Analysis (if exists) */}
          {(task.earlyStart !== undefined || task.slack !== undefined) && (
            <div className="bg-blue-50 rounded p-2">
              <div className="text-xs text-blue-600 font-medium mb-2">{T.pertAnalysis || 'PERT Analysis'}</div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {task.earlyStart !== undefined && (
                  <>
                    <div className="text-gray-600">ES: <span className="font-medium">{task.earlyStart}</span></div>
                    <div className="text-gray-600">EF: <span className="font-medium">{task.earlyFinish}</span></div>
                  </>
                )}
                {task.lateStart !== undefined && (
                  <>
                    <div className="text-gray-600">LS: <span className="font-medium">{task.lateStart}</span></div>
                    <div className="text-gray-600">LF: <span className="font-medium">{task.lateFinish}</span></div>
                  </>
                )}
              </div>
              {task.slack !== undefined && (
                <div className="text-center mt-2 pt-1 border-t border-blue-200">
                  <span className={cn("text-xs font-bold", task.slack === 0 ? "text-red-600" : "text-green-600")}>
                    Slack: {task.slack}d
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

  <Handle type="source" position={Position.Right} className="bg-blue-500 border-2 border-white rounded-full shadow-sm" style={{ width: 12, height: 12, right: -13, top: '50%', transform: 'translateY(-50%)' }} />
    </div>
  );
});

PertTaskNode.displayName = 'PertTaskNode';

export default PertTaskNode;