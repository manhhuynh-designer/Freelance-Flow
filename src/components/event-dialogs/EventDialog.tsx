import React, { useState, useEffect, useMemo } from 'react';
import { AppEvent, Task } from '../../lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Smile, PlusCircle, Trash2, CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useDashboard } from '@/contexts/dashboard-context';

interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (event: Partial<AppEvent>) => void;
  tasks: Task[];
  eventToEdit?: AppEvent | null;
}

const PRESET_COLORS = [
  '#F5532F', '#FFB627', '#22C55E', '#3B82F6', '#6366F1', '#8B5CF6',
  '#EC4899', '#F43F5E', '#F97316', '#A855F7', '#14B8A6', '#0EA5E9'
];

const PRESET_EMOJIS = [
  '🗓️', '💼', '📝', '📞', '👥', '📹', '☕', '🚩', '✏️', '💬', '✅', '🚀'
];

const isValidDate = (d: any): d is Date => d instanceof Date && !isNaN(d.getTime());

const EventDialog: React.FC<EventDialogProps> = ({ open, onClose, onSubmit, tasks, eventToEdit }) => {
  const dashboard = useDashboard();

  if (!dashboard) {
    return null; 
  }

  const { T } = dashboard;

  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [links, setLinks] = useState<string[]>(['']);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [errors, setErrors] = useState<{ name?: string, time?: string }>({});
  const [showTaskSearch, setShowTaskSearch] = useState(false);
  const [taskSearchValue, setTaskSearchValue] = useState("");


  const isEditMode = Boolean(eventToEdit);

  useEffect(() => {
    if (open) {
      if (isEditMode && eventToEdit) {
        setName(eventToEdit.name);
        setIcon(eventToEdit.icon || null)
        setStartTime(eventToEdit.startTime ? new Date(eventToEdit.startTime) : undefined);
        setEndTime(eventToEdit.endTime ? new Date(eventToEdit.endTime) : undefined);
        setNotes(eventToEdit.notes || '');
        setSelectedTasks(eventToEdit.taskIds || []);
        setLinks(eventToEdit.links && eventToEdit.links.length > 0 ? eventToEdit.links : ['']);
        setColor(eventToEdit.color || PRESET_COLORS[0]);
      } else {
        // Reset for new event
        setName('');
        setIcon(null);
        setStartTime(undefined);
        setEndTime(undefined);
        setNotes('');
        setSelectedTasks([]);
        setLinks(['']);
        setColor(PRESET_COLORS[0]);
      }
      setErrors({});
      setTaskSearchValue("");
      setShowTaskSearch(false);
    }
  }, [open, eventToEdit, isEditMode]);
  
  const handleTimeChange = (date: Date | undefined, setter: (date: Date | undefined) => void, hour: number, minute: number) => {
    if(date){
        const newDate = new Date(date);
        newDate.setHours(hour);
        newDate.setMinutes(minute);
        setter(newDate);
    }
  }


  const handleTaskToggle = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  const addLinkInput = () => {
    setLinks([...links, '']);
  };

  const removeLinkInput = (index: number) => {
    if (links.length > 1) {
      const newLinks = links.filter((_, i) => i !== index);
      setLinks(newLinks);
    } else {
        setLinks(['']);
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentErrors: { name?: string, time?: string } = {};

    if (!name.trim()) {
      currentErrors.name = T.requiredField;
    }
    
    if (startTime && endTime && startTime >= endTime) {
        currentErrors.time = T.timeError;
    }

    setErrors(currentErrors);

    if (Object.keys(currentErrors).length > 0) {
        return;
    }

    const eventData: Partial<AppEvent> = {
      ...(isEditMode && { id: eventToEdit?.id }),
      name,
      icon: icon || undefined,
      startTime: startTime ? startTime.toISOString() : undefined,
      endTime: endTime ? endTime.toISOString() : undefined,
      notes,
      taskIds: selectedTasks,
      links: links.map(l => l.trim()).filter(link => link !== ''),
      color,
    };
    
    onSubmit(eventData);
    onClose();
  };

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };
  
    const relatedTasks = useMemo(() => {
        return selectedTasks.map(taskId => tasks.find(t => t.id === taskId)).filter((t): t is Task => !!t);
    }, [selectedTasks, tasks]);
    
    const unselectedTasks = useMemo(() => {
        return tasks.filter(task => !selectedTasks.includes(task.id));
    }, [tasks, selectedTasks]);


  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[525px] gap-0 p-0">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>{isEditMode ? T.editEventTitle : T.addEventTitle}</DialogTitle>
            <DialogDescription>
              {isEditMode ? T.editEventDesc : T.addEventDesc}
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-6 pb-6 space-y-4 max-h-[70vh] overflow-y-auto">
             <div className="space-y-2">
                <Label htmlFor="event-name">{T.eventName}</Label>
                 <div className="flex items-center gap-2 border-2 rounded-md px-2 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                   <Popover>
                      <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0 h-6 w-6 rounded-full" style={{ backgroundColor: color }} aria-label="Chọn màu" />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2">
                        <div className="grid grid-cols-6 gap-2">
                            {PRESET_COLORS.map(c => (
                                <button
                                    type="button"
                                    key={c}
                                    className={cn(
                                        "w-6 h-6 rounded-full border-2",
                                        color === c ? 'border-primary ring-2 ring-primary' : 'border-transparent'
                                    )}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setColor(c)}
                                    title={c}
                                />
                            ))}
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                         <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9">
                           {icon ? <span className="text-lg">{icon}</span> : <Smile className="h-5 w-5" />}
                         </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2">
                        <div className="grid grid-cols-4 gap-1">
                          {PRESET_EMOJIS.map(emoji => (
                              <Button
                                  key={emoji}
                                  variant={icon === emoji ? "secondary" : "ghost"}
                                  size="icon"
                                  className="text-lg"
                                  onClick={() => setIcon(emoji)}
                              >
                                  {emoji}
                              </Button>
                          ))}
                          </div>
                      </PopoverContent>
                   </Popover>

                   <Input
                      id="event-name"
                      placeholder={T.eventName}
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className={cn(errors.name ? "border-red-500" : "border-none", "shadow-none focus-visible:ring-0 !p-0 w-full bg-transparent")}
                   />
                </div>
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label>{T.startDate}</Label>
                   <Popover>
                      <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startTime && "text-muted-foreground")}>
                               <CalendarIcon className="mr-2 h-4 w-4" />
                              {isValidDate(startTime) ? format(startTime, 'PPP HH:mm') : <span>{T.pickDateTime}</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-2">
                          <Calendar mode="single" selected={startTime} onSelect={setStartTime} initialFocus />
                          <div className="p-2 border-t flex items-center gap-2">
                              <Label>{T.timeLabel}</Label>
                              <Input type="number" min={0} max={23} className="w-16" value={startTime?.getHours() || 0} onChange={e => handleTimeChange(startTime, setStartTime, parseInt(e.target.value), startTime?.getMinutes() || 0)}/>
                              <Input type="number" min={0} max={59} className="w-16" value={startTime?.getMinutes() || 0} onChange={e => handleTimeChange(startTime, setStartTime, startTime?.getHours() || 0, parseInt(e.target.value))}/>
                          </div>
                      </PopoverContent>
                   </Popover>
              </div>
               <div className="space-y-2">
                  <Label>{T.deadline}</Label>
                   <Popover>
                      <PopoverTrigger asChild>
                           <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endTime && "text-muted-foreground")}>
                               <CalendarIcon className="mr-2 h-4 w-4" />
                               {isValidDate(endTime) ? format(endTime, 'PPP HH:mm') : <span>{T.pickDateTime}</span>}
                           </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-2">
                          <Calendar mode="single" selected={endTime} onSelect={setEndTime} initialFocus />
                          <div className="p-2 border-t flex items-center gap-2">
                               <Label>{T.timeLabel}</Label>
                              <Input type="number" min={0} max={23} className="w-16" value={endTime?.getHours() || 0} onChange={e => handleTimeChange(endTime, setEndTime, parseInt(e.target.value), endTime?.getMinutes() || 0)}/>
                               <Input type="number" min={0} max={59} className="w-16" value={endTime?.getMinutes() || 0} onChange={e => handleTimeChange(endTime, setEndTime, endTime?.getHours() || 0, parseInt(e.target.value))}/>
                          </div>
                      </PopoverContent>
                   </Popover>
              </div>
            </div>
            {errors.time && <p className="text-red-500 text-xs text-center">{errors.time}</p>}

            <div>
                <Label htmlFor="notes">{T.notes}</Label>
                 <Input
                    id="notes"
                    placeholder={T.addNotesPlaceholder}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                />
            </div>
            
             <div className="space-y-2">
                <Label>{T.relatedTasks}</Label>
                <div className="space-y-2">
                    <div className="p-2 border rounded-md min-h-16 flex flex-wrap gap-2">
                        {relatedTasks.length > 0 ? relatedTasks.map(task => (
                            <Badge key={task.id} variant="secondary" className="flex items-center gap-1">
                                {task.name}
                                <button
                                    type="button"
                                    aria-label={`Remove ${task.name}`}
                                    className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                                    onClick={() => handleTaskToggle(task.id)}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )) : <span className="text-sm text-muted-foreground px-2">{T.noTasksSelected}</span>}
                    </div>

                    {!showTaskSearch ? (
                        <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setShowTaskSearch(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {T.addOrSearchTask}
                        </Button>
                    ) : (
                         <Command className="rounded-lg border shadow-md">
                                <CommandInput 
                                    placeholder={T.searchTaskPlaceholder}
                                    value={taskSearchValue}
                                    onValueChange={setTaskSearchValue}
                                />
                            <CommandList>
                                <CommandEmpty>
                                    {taskSearchValue ? T.noTasksFound : T.typeToSearchTask}
                                </CommandEmpty>
                                {taskSearchValue && (
                                    <CommandGroup>
                                        {unselectedTasks.map((task) => (
                                            <CommandItem
                                                key={task.id}
                                                value={task.name}
                                                onSelect={() => {
                                                    handleTaskToggle(task.id)
                                                    setTaskSearchValue("")
                                                }}
                                            >
                                                {task.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </Command>
                    )}
                </div>
            </div>
            
            <div className="space-y-2">
                 <Label>{T.links}</Label>
                 {links.map((link, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <Input 
                            placeholder={T.linkPlaceholder}
                            value={link} 
                            onChange={e => handleLinkChange(index, e.target.value)} 
                        />
                         <Button type="button" variant="ghost" size="icon" onClick={() => removeLinkInput(index)} className="shrink-0">
                            <Trash2 className="h-4 w-4" />
                         </Button>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addLinkInput}>
                    <PlusCircle className="h-4 w-4 mr-2" />{T.addLink}
                </Button>
            </div>
          </div>

          <DialogFooter className="p-6 pt-2 border-t">
            <Button variant="ghost" type="button" onClick={handleClose}>{T.cancel}</Button>
            <Button type="submit">{isEditMode ? T.saveChanges : T.createEvent}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventDialog;
