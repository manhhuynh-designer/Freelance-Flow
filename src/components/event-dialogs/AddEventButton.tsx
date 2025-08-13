import React from 'react';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EventDialog from '../event-dialogs/EventDialog';
import { Task, AppEvent } from '../../lib/types';
import { getTranslations } from '@/lib/i18n';
import { useDashboard } from '@/contexts/dashboard-context';

interface AddEventButtonProps {
  tasks: Task[];
  onSubmit: (event: Partial<AppEvent>) => void;
  variant?: 'icon' | 'segmented';
  className?: string; // allow external override
}

export function AddEventButton({ tasks, onSubmit, variant='icon', className }: AddEventButtonProps) {
  const [open, setOpen] = React.useState(false);
  const dashboard = useDashboard();
  // fallback to 'en' if dashboard or language is not available
  const language = (dashboard && 'language' in dashboard && (dashboard as any).language) ? (dashboard as any).language : 'en';
  const T = getTranslations(language);

  const handleSubmit = (eventData: Partial<AppEvent>) => {
    onSubmit(eventData);
  };

  const baseClasses = variant === 'segmented'
    ? 'h-10 w-12 rounded-none border-0 bg-transparent hover:bg-primary/90 text-primary-foreground'
    : 'h-9 w-9 p-0';
  return (
    <>
      <Button
        variant={variant === 'segmented' ? 'ghost' : 'ghost'}
        size="sm"
        className={`${baseClasses} ${className||''}`}
        onClick={() => setOpen(true)}
        title={(T as any).newEvent}
      >
        <CalendarPlus className="h-4 w-4" />
        <span className="sr-only">{(T as any).newEvent}</span>
      </Button>
      {open && (
        <EventDialog
          open={open}
          onClose={() => setOpen(false)}
          onSubmit={handleSubmit}
          tasks={tasks}
          eventToEdit={null}
        />
      )}
    </>
  );
}
