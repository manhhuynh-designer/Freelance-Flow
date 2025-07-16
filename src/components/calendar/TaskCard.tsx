
import type { Task } from '@/lib/types';
import React from 'react';
import { getStatusColor } from '@/lib/colors';
import { Clock, AlertTriangle, Flag } from 'lucide-react';
import styles from './TaskCard.module.css';

export interface TaskCardProps {
  task: Task;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  isCompact?: boolean;
  showTime?: boolean;
  style?: React.CSSProperties;
  extraInfo?: string;
}

function getPriorityIcon(priority: string | undefined) {
  switch (priority) {
    case 'high':
      return <AlertTriangle className="w-3 h-3 text-red-500" />;
    case 'medium':
      return <Flag className="w-3 h-3 text-yellow-500" />;
    case 'low':
      return <Clock className="w-3 h-3 text-blue-500" />;
    default:
      return null;
  }
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
  const priorityIcon = getPriorityIcon((task as any).priority);
  const cardRef = React.useRef<HTMLDivElement>(null);

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
      ref={cardRef}
      className={[
        'task-card-mini rounded px-2 py-1 text-xs cursor-pointer relative',
        'border-l-2 hover:shadow-sm transition-all',
        styles.taskCard,
        isCompact ? 'truncate' : '',
        (task as any).priority === 'high' && 'ring-1 ring-red-200 bg-red-50/50',
        (task as any).priority === 'medium' && 'ring-1 ring-yellow-200 bg-yellow-50/50',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      title={task.name}
    >
      <div className="flex items-center gap-1">
        {/* Priority indicator */}
        {priorityIcon}
        <div className="font-medium truncate flex-1">{task.name}</div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${styles.statusIndicator}`} />
      </div>
      {showTime && task.deadline && (
        <div className="text-muted-foreground text-xs mt-0.5">
          {typeof task.deadline === 'string'
            ? new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : task.deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
      {extraInfo && (
        <div className="text-muted-foreground text-xs truncate mt-0.5">{extraInfo}</div>
      )}
    </div>
  );
};
