"use client";

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  MoreHorizontal, 
  Calendar,
  Flag,
  AlertTriangle,
  CheckCircle 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PertNode } from '@/lib/types';
import { format, isValid } from 'date-fns';

interface PertEventNodeData {
  node: PertNode;
  isSelected?: boolean;
  isCritical?: boolean;
  isStart?: boolean;
  isEnd?: boolean;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onToggleMilestone?: (nodeId: string) => void;
}

export type PertEventNodeProps = NodeProps<PertEventNodeData>;

const PertEventNode = memo(({ data, selected }: PertEventNodeProps) => {
  const {
    node,
    isSelected = false,
    isCritical = false,
    isStart = false,
    isEnd = false,
    onEdit,
    onDelete,
    onToggleMilestone,
  } = data;

  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  // Determine node status based on type
  const getNodeStatus = () => {
    if (isStart) return 'start';
    if (isEnd) return 'end';
    if (node.isMilestone) return 'milestone';
    return 'event';
  };

  const getStatusColor = () => {
    const status = getNodeStatus();
    const colors = {
      start: 'bg-green-500 border-green-600',
      end: 'bg-red-500 border-red-600',
      milestone: 'bg-purple-500 border-purple-600',
      event: 'bg-blue-500 border-blue-600',
    };
    
    if (isCritical) {
      return `${colors[status]} ring-2 ring-red-300`;
    }
    
    return colors[status];
  };

  const getStatusIcon = () => {
    const status = getNodeStatus();
    switch (status) {
      case 'start':
        return <Flag className="w-4 h-4 text-white" />;
      case 'end':
        return <CheckCircle className="w-4 h-4 text-white" />;
      case 'milestone':
        return <Calendar className="w-4 h-4 text-white" />;
      default:
        return null;
    }
  };

  // Format times
  const formatTime = (time?: number) => {
    if (time === undefined || time === null) return '--';
    return time.toString();
  };

  // Format date if available
  const formatDate = () => {
    try {
      if (node.targetDate) {
        const date = new Date(node.targetDate);
        if (isValid(date)) {
          return format(date, 'MMM dd');
        }
      }
    } catch {
      // Ignore invalid dates
    }
    return null;
  };

  const handleEdit = () => {
    onEdit?.(node.id);
    setIsContextMenuOpen(false);
  };

  const handleDelete = () => {
    onDelete?.(node.id);
    setIsContextMenuOpen(false);
  };

  const handleToggleMilestone = () => {
    onToggleMilestone?.(node.id);
    setIsContextMenuOpen(false);
  };

  return (
    <div className="pert-event-node">
        {/* Input handles */}
        {!isStart && (
          <Handle
            type="target"
            position={Position.Left}
            className="bg-white border-2 border-gray-400 rounded-full shadow-sm"
            style={{ width: 12, height: 12, left: -13, top: '50%', transform: 'translateY(-50%)' }}
          />
        )}
        
        {/* Main circular node */}
        <div className="relative">
          <div 
            className={cn(
              "w-20 h-20 rounded-full flex flex-col items-center justify-center",
              "text-white font-semibold cursor-pointer transition-all duration-200",
              "hover:scale-105 border-2",
              getStatusColor(),
              selected && "ring-2 ring-blue-400 ring-offset-2",
              isSelected && "shadow-lg",
              isCritical && "shadow-red-200"
            )}
          >
            {/* Node number */}
            <div className="text-lg font-bold leading-none">
              {isStart ? 'Start' : isEnd ? 'End' : (node.eventNumber || node.id.slice(-2))}
            </div>
            
            {/* Status icon */}
            {getStatusIcon() && (
              <div className="mt-1">
                {getStatusIcon()}
              </div>
            )}
          </div>

          {/* Context menu button */}
          <div className="absolute -top-1 -right-1">
            <DropdownMenu open={isContextMenuOpen} onOpenChange={setIsContextMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 rounded-full shadow-sm"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleEdit}>
                  Edit Event
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleMilestone}>
                  {node.isMilestone ? 'Remove Milestone' : 'Mark Milestone'}
                </DropdownMenuItem>
                {!isStart && !isEnd && (
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-red-600"
                  >
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Critical path indicator */}
          {isCritical && (
            <div className="absolute -bottom-1 -right-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-2.5 h-2.5 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Critical Path</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Node label and details */}
        <div className="mt-2 text-center min-w-[160px] px-2">
          {/* Node name */}
          {node.name && (
            <div className="text-sm font-medium text-gray-900 mb-1">
              {node.name}
            </div>
          )}

          {/* Time information */}
          <div className="space-y-1">
            {/* Early/Late times */}
            {(node.earlyTime !== undefined || node.lateTime !== undefined) && (
              <div className="text-xs text-gray-600">
                <div className="flex justify-center gap-2">
                  <span>E: {formatTime(node.earlyTime)}</span>
                  <span>L: {formatTime(node.lateTime)}</span>
                </div>
              </div>
            )}

            {/* Slack time */}
            {node.slack !== undefined && (
              <div className="text-xs">
                <span className={cn(
                  "font-medium",
                  node.slack === 0 ? "text-red-600" : "text-gray-600"
                )}>
                  Slack: {node.slack}
                </span>
              </div>
            )}

            {/* Target date */}
            {formatDate() && (
              <div className="text-xs text-gray-500">
                {formatDate()}
              </div>
            )}
          </div>

          {/* Status badges */}
          <div className="flex justify-center gap-1 mt-1">
            {node.isMilestone && (
              <Badge variant="secondary" className="text-xs">
                Milestone
              </Badge>
            )}
            {isStart && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                Start
              </Badge>
            )}
            {isEnd && (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                End
              </Badge>
            )}
          </div>
        </div>

        {/* Output handles */}
        {!isEnd && (
          <Handle
            type="source"
            position={Position.Right}
            className="bg-white border-2 border-gray-400 rounded-full shadow-sm"
            style={{ width: 12, height: 12, right: -13, top: '20%', transform: 'translateY(-50%)' }}
          />
        )}
      </div>
  );
});

PertEventNode.displayName = 'PertEventNode';

export default PertEventNode;