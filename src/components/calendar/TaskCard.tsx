
import type { Task } from '@/lib/types';
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { getStatusColor } from '@/lib/colors';
import { Flag, FlagOff } from 'lucide-react';

import styles from './TaskCard.module.css';
import { useDashboard } from '@/contexts/dashboard-context';

export interface TaskCardProps {
  task: Task;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  isCompact?: boolean;
  showTime?: boolean;
  style?: React.CSSProperties;
  extraInfo?: string;
}

// Eisenhower flag color logic giống KanbanTaskCard
const eisenhowerTooltip: Record<string, string> = {
  do: 'Ưu tiên cao (Do)',
  decide: 'Quan trọng (Decide)',
  delegate: 'Ủy quyền (Delegate)',
  delete: 'Không quan trọng (Delete)',
  none: 'Không ưu tiên',
};

const eisenhowerSchemes = {
  colorScheme1: {
    do: '#ef4444',
    decide: '#3b82f6',
    delegate: '#f59e42',
    delete: '#6b7280',
  },
  colorScheme2: {
    do: '#d8b4fe',
    decide: '#bbf7d0',
    delegate: '#fed7aa',
    delete: '#bfdbfe',
  },
  colorScheme3: {
    do: '#99f6e4',
    decide: '#fbcfe8',
    delegate: '#fde68a',
    delete: '#c7d2fe',
  },
};

type EisenhowerQuadrant = 'do' | 'decide' | 'delegate' | 'delete';
type EisenhowerSchemeKey = keyof typeof eisenhowerSchemes;
function getFlagColor(
  quadrant?: EisenhowerQuadrant,
  scheme: EisenhowerSchemeKey = 'colorScheme1'
) {
  if (!quadrant) return '#e5e7eb';
  const flagColors = eisenhowerSchemes[scheme] || eisenhowerSchemes['colorScheme1'];
  return flagColors[quadrant] || '#e5e7eb';
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onClick,
  isCompact = false,
  showTime = false,
  style,
  extraInfo,
}) => {
  const statusColor = getStatusColor(task.status);
  // Eisenhower priority for border color
  const eisenhowerQuadrant = (task as any).eisenhowerQuadrant as EisenhowerQuadrant | undefined;
  const cardRef = React.useRef<HTMLDivElement>(null);
  // Draggable setup
  const draggableId = `task-${task.id}`;
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: draggableId });

  // Get appSettings from dashboard context (for eisenhowerColorScheme)
  const dashboardContext = useDashboard ? useDashboard() : undefined;
  const scheme = dashboardContext?.appSettings?.eisenhowerColorScheme || 'colorScheme1';

  React.useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.setProperty('--status-color', statusColor);
      cardRef.current.style.setProperty('--status-bg-color', `${statusColor}15`);
      // Apply any additional styles passed via props
      if (style) {
        Object.entries(style).forEach(([key, value]) => {
          if (cardRef.current) {
            (cardRef.current.style as any)[key] = value;
          }
        });
      }
    }
  }, [statusColor, style]);

  return (
    <div
      ref={node => {
        setNodeRef(node);
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className={[
        'task-card-mini rounded px-2 py-1 text-xs cursor-pointer relative',
        'border-l-2 hover:shadow-sm transition-all',
        styles.taskCard,
        isCompact ? 'truncate' : '',
        (task as any).priority === 'high' && 'ring-1 ring-red-200 bg-red-50/50',
        (task as any).priority === 'medium' && 'ring-1 ring-yellow-200 bg-yellow-50/50',
        isDragging && 'opacity-50',
      ].filter(Boolean).join(' ')}
      style={{
        ...style,
        // Use correct Eisenhower color scheme from appSettings
        borderRight: eisenhowerQuadrant ? `4px solid ${getFlagColor(eisenhowerQuadrant, scheme)}` : 'none',
      }}
      onClick={onClick}
      title={task.name}
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.(e as any);
        }
      }}
    >
      <div className="flex items-center gap-1 pl-0 justify-start">
        {/* Drag handle icon (left) - 3 chấm dọc */}
        <span
          {...attributes}
          {...listeners}
          className="flex items-center justify-start cursor-grab active:cursor-grabbing select-none"
          style={{ marginLeft: '-2px' }}
          tabIndex={-1}
          aria-label="Drag task"
          onClick={e => e.stopPropagation()}
        >
          <svg width="12" height="16" viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6" cy="3" r="1.5" fill="#888" />
            <circle cx="6" cy="8" r="1.5" fill="#888" />
            <circle cx="6" cy="13" r="1.5" fill="#888" />
          </svg>
        </span>
        <div className="font-medium truncate flex-1">{task.name}</div>
      </div>
      {showTime && task.deadline && (
        <div className="text-muted-foreground text-xs mt-0.5">
          {(() => {
            const deadline = typeof task.deadline === 'string' ? new Date(task.deadline) : task.deadline;
            return deadline instanceof Date && !isNaN(deadline.getTime())
              ? deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';
          })()}
        </div>
      )}
      {extraInfo && (
        <div className="text-muted-foreground text-xs truncate mt-0.5">{extraInfo}</div>
      )}
    </div>
  );
};
