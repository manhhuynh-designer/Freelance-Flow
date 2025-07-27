import React from 'react';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EventDialog from '../event-dialogs/EventDialog';
import { Task, AppEvent } from '../../lib/types';

interface AddEventButtonProps {
  tasks: Task[];
  onSubmit: (event: Partial<AppEvent>) => void;
}

export function AddEventButton({ tasks, onSubmit }: AddEventButtonProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (eventData: Partial<AppEvent>) => {
    // Call the onSubmit prop passed down from the parent (DashboardLayout)
    onSubmit(eventData);
    // No need to call setOpen(false) here, as EventDialog's internal
    // logic will call its onClose prop, which is set to setOpen(false).
  };

  return (
    <>
      <Button variant="outline" size="icon" onClick={() => setOpen(true)} title="New events">
        <CalendarPlus className="h-4 w-4" />
        <span className="sr-only">New events</span>
      </Button>
      {open && (
        <EventDialog
          open={open}
          onClose={() => setOpen(false)}
          // Pass the handleSubmit function to the EventDialog
          onSubmit={handleSubmit}
          tasks={tasks}
          eventToEdit={null} // This button is for adding, not editing
        />
      )}
    </>
  );
}
