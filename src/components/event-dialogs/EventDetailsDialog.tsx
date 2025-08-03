import React from 'react';
import { AppEvent, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Link as LinkIcon, StickyNote, X, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { useDashboard } from '@/contexts/dashboard-context';
import { getTranslations } from '@/lib/i18n';
import LinkPreview from '../ui/LinkPreview';

interface EventDetailsDialogProps {
  event: AppEvent | null;
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (event: AppEvent) => void; 
}

export const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({ event, tasks, isOpen, onClose, onEdit }) => {
  const dashboard = useDashboard();
  if (!dashboard || !event) return null;

  const { T, handleViewTask } = dashboard;

  const relatedTasks = event.taskIds?.map(taskId => tasks.find(t => t.id === taskId)).filter(Boolean) as Task[] | undefined;
  
  const handleTaskClick = (task: Task) => {
    onClose(); 
    setTimeout(() => {
      handleViewTask(task.id);
    }, 150);
  };
  
  const handleEdit = () => {
    onEdit(event);
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: event.color || 'transparent' }}
            />
            {event.icon && <span className="text-2xl">{event.icon}</span>}
            <span className="flex-1">{event.name}</span>
          </DialogTitle>
          <DialogDescription>
            
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Time */}
          <div className="flex items-start space-x-4">
            <CalendarIcon className="h-5 w-5 mt-1 text-muted-foreground" />
            <div className="flex flex-col">
                <p className="font-semibold">{T.timeLabel}</p>
                <p className="text-sm text-muted-foreground">
                    {event.startTime ? format(new Date(event.startTime), 'EEE, MMM d, yyyy, h:mm a') : T.notSet}
                     - 
                    {event.endTime ? format(new Date(event.endTime), 'h:mm a') : T.notSet}
                </p>
            </div>
          </div>

          {/* Notes */}
          {event.notes && (
             <div className="flex items-start space-x-4">
               <StickyNote className="h-5 w-5 mt-1 text-muted-foreground" />
               <div className='flex flex-col'>
                 <p className="font-semibold">{T.notes}</p>
                 <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.notes}</p>
               </div>
             </div>
          )}

          {/* Related Tasks */}
          {relatedTasks && relatedTasks.length > 0 && (
             <div className="flex items-start space-x-4">
                <Tag className="h-5 w-5 mt-1 text-muted-foreground" />
                <div className="flex flex-col flex-1">
                     <p className="font-semibold">{T.relatedTasks}</p>
                     <div className="flex flex-wrap gap-2 pt-1">
                     {relatedTasks.map(task => (
                        <Badge 
                          key={task.id} 
                          variant="secondary"
                          onClick={() => handleTaskClick(task)}
                          className="cursor-pointer hover:bg-muted"
                        >
                          {task.name}
                        </Badge>
                     ))}
                     </div>
                </div>
             </div>
          )}

          {/* Links */}
          {event.links && event.links.length > 0 && (
            <div className="flex items-start space-x-4">
               <LinkIcon className="h-5 w-5 mt-1 text-muted-foreground" />
               <div className='flex flex-col flex-1'>
                 <p className="font-semibold">{T.links}</p>
                 <div className="space-y-2 pt-1">
                    {event.links.map((link, index) => (
                      <LinkPreview key={index} url={link} />
                    ))}
                 </div>
               </div>
             </div>
          )}

        </div>

        <DialogFooter className="border-t pt-4">
           <Button variant="outline" onClick={onClose}>
             {T.close}
          </Button>
          <Button onClick={handleEdit}>
            {T.edit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};