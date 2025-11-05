"use client";

import React, { useState, useMemo, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, addDays, startOfMonth } from "date-fns";
import { 
  CalendarIcon, PlusCircle, Trash2,
  ChevronDown, Plus, 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TaskDateRangePicker from "./TaskDateRangePicker";
import { useToast } from "@/hooks/use-toast";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Task, Client, Collaborator, Category, Quote, QuoteColumn, QuoteTemplate, AppSettings, Project } from "@/lib/types";
import type { SuggestQuoteOutput } from "@/lib/ai-types";
import { QuoteManager } from "./quote-manager";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { useDashboard } from "@/contexts/dashboard-context";

const formSchema = z.object({
  name: z.string().min(2, "Task name must be at least 2 characters."),
  description: z.string().optional(),
  briefLink: z.array(z.string().refine(
    (val) => {
      const v = (val ?? '').trim();
      if (v === '') return true; // allow empty
      try {
        const url = new URL(v);
        return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'file:';
      } catch {
        // Allow local file paths like C:\\..., \\server\\share, or Unix-style /path
        return /^([a-zA-Z]:\\|\\\\|\/)/.test(v);
      }
    },
    { message: "Please enter a valid URL or local file link (file://)." }
  )).optional().default([]),
  driveLink: z.array(z.string().refine(
    (val) => {
      const v = (val ?? '').trim();
      if (v === '') return true; // allow empty
      try {
        const url = new URL(v);
        return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'file:';
      } catch {
        // Allow local file paths like C:\\..., \\server\\share, or Unix-style /path
        return /^([a-zA-Z]:\\|\\\\|\/)/.test(v);
      }
    },
    { message: "Please enter a valid URL or local file link (file://)." }
  )).optional().default([]),
  clientId: z.string().min(1, "Please select a client."),
  collaboratorIds: z.array(z.string()).optional().default([]),
  categoryId: z.string().min(1, "Please select a category."),
  status: z.enum(["todo", "inprogress", "done", "onhold", "archived"]),
  subStatusId: z.string().optional(),
  projectId: z.string().optional(), // <--- Thêm trường projectId optional
  dates: z.object({
    from: z.date({ required_error: "Start date is required." }),
    to: z.date({ required_error: "Deadline is required." }),
  }),
  sections: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "Section name cannot be empty."),
    items: z.array(
        z.object({
            id: z.string().optional(),
            // Make description optional to avoid forcing values in quote table
            description: z.string().optional().default(""),
            unitPrice: z.coerce.number().min(0, "Price cannot be negative.").default(0),
            customFields: z.record(z.any()).optional(),
        })
    ).min(1, "A section must have at least one item."),
  })).min(1, "A quote must have at least one section."),
  // Persist Summary tab formula for main quote
  grandTotalFormula: z.string().optional().default(""),
  collaboratorQuotes: z.array(
    z.object({
      collaboratorId: z.string().optional().default(''),
      // Persist Summary tab formula per collaborator quote (optional)
      grandTotalFormula: z.string().optional().default(""),
      sections: z.array(
        z.object({
          id: z.string(),
          name: z.string().min(1, "Section name cannot be empty."),
          items: z.array(
            z.object({
              id: z.string().optional(),
              description: z.string().optional().default(""),
              unitPrice: z.coerce.number().min(0, "Price cannot be negative.").default(0),
              customFields: z.record(z.any()).optional(),
            })
          ).min(1, "A section must have at least one item."),
        })
      ).optional().default([]),
    })
  ).optional().default([]),
});

export type TaskFormValues = z.infer<typeof formSchema>;

export interface CreateTaskFormRef {
  handleSaveDraft: () => void;
  setInitialValues: (
    values: Partial<TaskFormValues>,
    options?: { columns?: QuoteColumn[]; collaboratorColumns?: QuoteColumn[] }
  ) => void;
}

type CreateTaskFormProps = {
  setOpen: (open: boolean) => void;
  onSubmit: (values: TaskFormValues, quoteColumns: QuoteColumn[], collaboratorQuoteColumns: QuoteColumn[]) => string | void;
  onStartSaving?: () => void;
  clients: Client[];
  collaborators: Collaborator[];
  categories: Category[];
  onAddClient: (data: Omit<Client, 'id'>) => Client;
  projects?: Project[];
  onAddProject?: (data: Omit<Project, 'id' | 'tasks'>) => string;
  quoteTemplates: QuoteTemplate[];
  settings: AppSettings;
  defaultDate?: Date;
  onDirtyChange?: (isDirty: boolean) => void;
  onSubmitSuccess?: (newTaskId?: string) => void;
  prefillValues?: Partial<TaskFormValues>;
  prefillColumns?: QuoteColumn[];
  prefillCollaboratorColumns?: QuoteColumn[];
};

// Helper function to create valid timeline data for new items
const createInitialTimelineData = (startDate?: Date, endDate?: Date, itemIndex = 0, totalItems = 1) => {
  const defaultStart = startDate || new Date();
  const defaultEnd = endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  
  const totalDays = Math.ceil((defaultEnd.getTime() - defaultStart.getTime()) / (1000 * 60 * 60 * 24));
  const itemDuration = Math.max(1, Math.floor(totalDays / totalItems));
  
  const startOffset = itemIndex * itemDuration;
  const endOffset = Math.min(startOffset + itemDuration, totalDays);
  
  const itemStart = new Date(defaultStart.getTime() + startOffset * 24 * 60 * 60 * 1000);
  const itemEnd = new Date(defaultStart.getTime() + endOffset * 24 * 60 * 60 * 1000);
  
  return JSON.stringify({
    start: itemStart.toISOString(),
    end: itemEnd.toISOString(),
    color: `hsl(${(itemIndex * 60) % 360}, 60%, 55%)`
  });
};

export const CreateTaskForm = forwardRef<CreateTaskFormRef, CreateTaskFormProps>((props, ref) => {
  const { 
    setOpen, 
    onSubmit: onFormSubmit, 
    onStartSaving,
    clients, 
    collaborators, 
    categories, 
    onAddClient, 
    projects = [],
    onAddProject,
    quoteTemplates, 
    settings, 
    defaultDate,
    onDirtyChange,
    onSubmitSuccess,
    prefillValues,
    prefillColumns,
    prefillCollaboratorColumns
  } = props;
  const dashboard = useDashboard();
  const projectsList = useMemo(() => (projects && projects.length > 0 ? projects : (dashboard?.appData?.projects || [])), [projects, dashboard?.appData?.projects]);
  // Prefill logic for duplicate task
  useEffect(() => {
    if (prefillColumns && prefillColumns.length > 0) {
      setColumns(prefillColumns);
    }
    if (prefillCollaboratorColumns && prefillCollaboratorColumns.length > 0) {
      setCollaboratorColumns(prefillCollaboratorColumns);
    }
    if (prefillValues) {
      // Set form values and mark dirty so submit is enabled
      form.reset({
        ...form.getValues(),
        ...prefillValues,
      });
      onDirtyChange?.(true);
    }
  }, [prefillValues, prefillColumns, prefillCollaboratorColumns]);
  const { toast } = useToast();
  const T = useMemo(() => ({
    ...i18n[settings.language],
    addLink: ((i18n[settings.language] as any)?.addLink || "Thêm link"),
    untitledTask: ((i18n[settings.language] as any)?.untitledTask || "Untitled Task"),
    // Client creation keys
    addClient: ((i18n[settings.language] as any)?.addClient || "Thêm client"),
    clientNameRequired: ((i18n[settings.language] as any)?.clientNameRequired || "Tên client là bắt buộc"),
    cancel: ((i18n[settings.language] as any)?.cancel || "Hủy"),
    add: ((i18n[settings.language] as any)?.add || "Thêm"),
  // Unsaved changes dialog keys (shared with TaskEditDialog)
  unsavedConfirmTitle: ((i18n[settings.language] as any)?.unsavedConfirmTitle || "Unsaved changes"),
  unsavedConfirmDescription: ((i18n[settings.language] as any)?.unsavedConfirmDescription || "You have unsaved changes. What would you like to do?"),
  unsavedCloseWithoutSaving: ((i18n[settings.language] as any)?.unsavedCloseWithoutSaving || "Close Without Saving"),
  unsavedSave: ((i18n[settings.language] as any)?.unsavedSave || "Save"),
  unsavedCancel: ((i18n[settings.language] as any)?.unsavedCancel || "Cancel"),
  // Save Draft dialog keys
  saveDraft: ((i18n[settings.language] as any)?.saveDraft || "Save Draft"),
  saveDraftConfirmTitle: ((i18n[settings.language] as any)?.saveDraftConfirmTitle || "Save as draft?"),
  saveDraftConfirmDescription: ((i18n[settings.language] as any)?.saveDraftConfirmDescription || "This will save the task as a draft (Archived). You can continue editing later."),
  continueEditing: ((i18n[settings.language] as any)?.continueEditing || "Continue editing"),
  draftSaved: ((i18n[settings.language] as any)?.draftSaved || "Draft Saved"),
  draftSavedDesc: ((i18n[settings.language] as any)?.draftSavedDesc || "Your task has been saved as a draft."),
  }), [settings.language]);
  
  const [isCollaboratorSectionOpen, setIsCollaboratorSectionOpen] = useState(false);
  const [isPriceSectionOpen, setIsPriceSectionOpen] = useState(false);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectLinks, setNewProjectLinks] = useState<string[]>([""]);
  
  const defaultColumns: QuoteColumn[] = React.useMemo(() => [
    { id: 'description', name: T.description, type: 'text' },
    { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number', calculation: { type: 'sum' } },
  ], [T, settings.currency]);

  const [columns, setColumns] = useState<QuoteColumn[]>(defaultColumns);
  const [collaboratorColumns, setCollaboratorColumns] = useState<QuoteColumn[]>(defaultColumns);
  
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      briefLink: [""],
      driveLink: [""],
      clientId: "",
      collaboratorIds: [],
      categoryId: "",
      status: "todo",
      subStatusId: "",
      projectId: undefined, // <--- Thêm default cho projectId
      dates: {
        from: defaultDate ?? undefined,
        to: defaultDate ?? undefined,
      },
      sections: [{ 
        id: `section-${Date.now()}`, 
        name: T.untitledSection, 
        items: [{ 
          description: "", 
          unitPrice: 0, 
          customFields: { 
            timeline: createInitialTimelineData(defaultDate, defaultDate ? new Date(defaultDate.getTime() + 7 * 24 * 60 * 60 * 1000) : undefined, 0, 1)
          } 
        }] 
      }],
      grandTotalFormula: "",
      collaboratorQuotes: [],
    }
  });

  const { formState: { isDirty }, getValues, setValue, control, register } = form;
  const briefLinks = useWatch({ control, name: "briefLink" });
  const driveLinks = useWatch({ control, name: "driveLink" });
  const watchedDates = useWatch({ control, name: "dates" }) || { from: undefined, to: undefined };
  const currentStartDate = watchedDates?.from instanceof Date ? watchedDates.from : undefined;
  const currentEndDate = watchedDates?.to instanceof Date ? watchedDates.to : undefined;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const { fields: collabQuoteFields, append: collabAppendQuote, remove: collabRemoveQuote } = useFieldArray({ 
    control, 
    name: "collaboratorQuotes" 
  });
  
  const handleFormSubmit = useCallback((data: TaskFormValues) => {
    onStartSaving?.();
    // debug trace - POST to server so we can observe ordering in node logs
    try { void fetch('/api/_trace-saving', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source: 'CreateTaskForm', event: 'onStartSaving', ts: Date.now() }) }); } catch (e) {}
    // Convert dates from form format to task format
    const safeDates = data?.dates || { from: undefined, to: undefined };
    const cleanedData: any = {
      ...data,
      briefLink: (data.briefLink || []).filter((link: string) => link && link.trim() !== ''),
      driveLink: (data.driveLink || []).filter((link: string) => link && link.trim() !== ''),
      collaboratorIds: data.collaboratorQuotes?.map((q: any) => q.collaboratorId || "").filter((id: string) => id) || [],
      startDate: safeDates.from,
      deadline: safeDates.to,
    };
    
    // Remove the dates object since backend expects individual fields
    delete cleanedData.dates;
    
    const newId = onFormSubmit(cleanedData, columns, collaboratorColumns);
    
    // Reset form and dirty state
    form.reset();
    onDirtyChange?.(false);
    
    // Notify success - parent will handle closing
    onSubmitSuccess?.(typeof newId === 'string' ? newId : undefined);
  }, [onStartSaving, onFormSubmit, columns, collaboratorColumns, form, onDirtyChange, onSubmitSuccess]);

  useImperativeHandle(ref, () => ({
    handleSaveDraft() {
      const values = getValues();
  onStartSaving?.();
  try { void fetch('/api/_trace-saving', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source: 'CreateTaskForm', event: 'onStartSaving-draft', ts: Date.now() }) }); } catch (e) {}
      const safeDates = values?.dates || { from: undefined, to: undefined };
      const draftData: any = {
        ...values,
        name: `[Draft] ${values.name || T.untitledTask}`,
        status: 'archived' as const,
        startDate: safeDates.from,
        deadline: safeDates.to,
      };
      
      // Remove the dates object since backend expects individual fields
      delete draftData.dates;
      
      // Call the main submit handler which will handle reset and close
      const cleanedData: any = {
        ...draftData,
        briefLink: (draftData.briefLink || []).filter((link: string) => link && link.trim() !== ''),
        driveLink: (draftData.driveLink || []).filter((link: string) => link && link.trim() !== ''),
        collaboratorIds: draftData.collaboratorQuotes?.map((q: any) => q.collaboratorId || "").filter((id: string) => id) || []
      };
      
      onFormSubmit(cleanedData, columns, collaboratorColumns);
      
      // Reset form and dirty state
      form.reset();
      onDirtyChange?.(false);
      
      // Notify success - parent will handle closing
      onSubmitSuccess?.();
    },
    setInitialValues(values: Partial<TaskFormValues>, options?: { columns?: QuoteColumn[]; collaboratorColumns?: QuoteColumn[] }) {
      try {
        if (options?.columns && Array.isArray(options.columns)) {
          setColumns(options.columns);
        }
        if (options?.collaboratorColumns && Array.isArray(options.collaboratorColumns)) {
          setCollaboratorColumns(options.collaboratorColumns);
        }
        const current = getValues();
        form.reset({
          ...current,
          ...values,
        });
        onDirtyChange?.(true);
      } catch (e) {
        console.error('Failed to set initial values:', e);
      }
    }
  }), [getValues, onStartSaving, T, onFormSubmit, columns, collaboratorColumns, form, onDirtyChange, onSubmitSuccess, setColumns, setCollaboratorColumns]);
  
  const categoryId = useWatch({ control, name: 'categoryId' });
  const categoryName = useMemo(() => 
    (categories || []).find(c => c.id === categoryId)?.name || '', 
    [categories, categoryId]
  );

  const handleApplySuggestion = useCallback((items: SuggestQuoteOutput['suggestedItems']) => {
    const currentDates = getValues('dates');
    const rangeStart = currentDates?.from instanceof Date ? currentDates.from : currentStartDate;
    const rangeEnd = currentDates?.to instanceof Date ? currentDates.to : currentEndDate;
    const newItems = items.map((item: SuggestQuoteOutput['suggestedItems'][number], index) => ({
      description: item.description,
      unitPrice: item.unitPrice,
      id: `item-sugg-${Date.now()}-${Math.random()}`,
      customFields: {
        timeline: createInitialTimelineData(rangeStart, rangeEnd, index, items.length)
      },
    }));
    setValue('sections', [{ id: 'section-ai-1', name: T.untitledSection, items: newItems }]);
    setColumns(defaultColumns);
    toast({ 
      title: T.suggestionApplied, 
      description: T.suggestionAppliedDesc?.replace('{count}', String(items.length)) 
    });
  }, [getValues, setValue, setColumns, defaultColumns, T, toast, currentStartDate, currentEndDate]);
  
  const handleCopyFromQuote = useCallback((targetCollaboratorIndex: number) => {
    const currentSections = getValues('sections');
    const currentQuotes = getValues('collaboratorQuotes') || [];
    
    if (targetCollaboratorIndex >= 0 && targetCollaboratorIndex < currentQuotes.length) {
      const updatedQuotes = [...currentQuotes];
      updatedQuotes[targetCollaboratorIndex] = {
        ...updatedQuotes[targetCollaboratorIndex],
        sections: currentSections
      };
      setValue('collaboratorQuotes', updatedQuotes);
      setCollaboratorColumns([...columns]);
      toast({ 
        title: T.copiedFromQuote, 
        description: T.copiedFromQuoteDesc 
      });
    } else {
      toast({ 
        title: "Lỗi", 
        description: "Vui lòng chọn collaborator trước khi sao chép", 
        variant: "destructive"
      });
    }
  }, [getValues, setValue, setCollaboratorColumns, columns, T, toast]);

  const handleAddClient = useCallback(() => {
    if (newClientName.trim() === "") {
      toast({
        title: T.addClient, 
        description: T.clientNameRequired, 
        variant: "destructive",
      });
      return;
    }

    const newClient = onAddClient({ name: newClientName.trim() });
    setValue("clientId", newClient.id);
    setNewClientName("");
    setIsAddClientOpen(false);
    
    toast({
      title: T.add, 
      description: `${T.addClient} ${newClient.name} thành công`, 
    });
  }, [newClientName, onAddClient, setValue, toast, T]);

  // Inline add project flow
  const handleAddProject = useCallback(() => {
    if (!onAddProject) return;
    const name = newProjectName.trim();
    const links = (newProjectLinks || []).map(l => l.trim()).filter(l => l !== "");
    if (!name) {
      toast({ title: 'Add Project', description: 'Project name is required', variant: 'destructive' });
      return;
    }
    // Basic URL validation similar to task links
    const invalid = links.find(l => {
      try { new URL(l); return false; } catch { return true; }
    });
    if (invalid) {
      toast({ title: 'Invalid link', description: `Please enter a valid URL: ${invalid}`, variant: 'destructive' });
      return;
    }
    const newId = onAddProject({ 
      name, 
      description: '', 
      status: 'active', 
      links, 
      clientId: form.getValues('clientId') || undefined, 
      startDate: form.getValues('dates')?.from, 
      endDate: form.getValues('dates')?.to 
    } as any);
    if (newId) {
      form.setValue('projectId', newId);
      setIsAddProjectOpen(false);
      setNewProjectName('');
      setNewProjectLinks(['']);
      toast({ title: 'Project added', description: 'Project created and selected.' });
    }
  }, [onAddProject, newProjectName, newProjectLinks, form, toast]);

  const updateProjectLink = (index: number, value: string) => {
    setNewProjectLinks(prev => prev.map((l, i) => i === index ? value : l));
  };
  const addProjectLinkField = () => setNewProjectLinks(prev => [...prev, ""]);
  const removeProjectLinkField = (index: number) => setNewProjectLinks(prev => prev.filter((_, i) => i !== index));

  const watchedStatus = useWatch({ control, name: "status"});
  const availableSubStatuses = useMemo(() => {
    const mainStatusConfig = (settings.statusSettings || []).find(s => s.id === watchedStatus);
    return mainStatusConfig?.subStatuses || [];
  }, [watchedStatus, settings.statusSettings]);
  
  return (
    <div className="p-4 md:p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 md:space-y-6">
          <div className="space-y-3 md:space-y-4">
            <FormField 
              control={control} 
              name="name" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{T.taskName}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Animate new logo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />
            {/* Project selection moved under task name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField 
                control={control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <div className="flex gap-2">
                      <Select 
                        onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
                        value={field.value || '__none__'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">{T.none}</SelectItem>
                          {(projectsList || []).map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {onAddProject && (
                        <Dialog open={isAddProjectOpen} onOpenChange={setIsAddProjectOpen}>
                          <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="sm">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Project</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="newProjectName">Project name</Label>
                                <Input 
                                  id="newProjectName"
                                  value={newProjectName}
                                  onChange={(e) => setNewProjectName(e.target.value)}
                                  placeholder="Enter project name"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Links (optional)</Label>
                                <div className="space-y-2">
                                  {newProjectLinks.map((link, i) => (
                                    <div className="flex items-center gap-2" key={`proj-link-${i}`}>
                                      <Input value={link} onChange={(e) => updateProjectLink(i, e.target.value)} placeholder="https://..." />
                                      <Button type="button" variant="ghost" size="icon" onClick={() => removeProjectLinkField(i)}>
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={addProjectLinkField}>
                                    <Plus className="mr-2 h-4 w-4" /> Add link
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button type="button" variant="ghost" onClick={() => setIsAddProjectOpen(false)}>
                                {T.cancel}
                              </Button>
                              <Button type="button" onClick={handleAddProject}>
                                {T.add}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{T.description}</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      content={field.value || ""}
                      onChange={field.onChange}
                      T={T}
                      placeholder="Provide a brief description of the task."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>{T.briefLink}</FormLabel>
                <div className="space-y-2">
                    {(briefLinks || []).map((_, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <FormControl>
                                <Input {...register(`briefLink.${index}`)} placeholder="https://..." />
                            </FormControl>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    const newLinks = [...(briefLinks || [])];
                                    newLinks.splice(index, 1);
                                    setValue("briefLink", newLinks);
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setValue("briefLink", [...(briefLinks || []), ""])}
                        disabled={(briefLinks || []).length >= 5}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" /> {T.addLink}
                    </Button>
                </div>
                <FormMessage>{form.formState.errors.briefLink?.message}</FormMessage>
            </FormItem>
             <FormItem>
                <FormLabel>{T.driveLink}</FormLabel>
                <div className="space-y-2">
                    {(driveLinks || []).map((_, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <FormControl>
                                <Input {...register(`driveLink.${index}`)} placeholder="https://..." />
                            </FormControl>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    const newLinks = [...(driveLinks || [])];
                                    newLinks.splice(index, 1);
                                    setValue("driveLink", newLinks);
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setValue("driveLink", [...(driveLinks || []), ""])}
                        disabled={(driveLinks || []).length >= 5}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" /> {T.addLink}
                    </Button>
                </div>
                <FormMessage>{form.formState.errors.driveLink?.message}</FormMessage>
            </FormItem>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(clients || []).map((client) => (
                            <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" size="sm">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{T.addClient}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="newClientName">{T.clientNameRequired || "Tên client"}</Label>
                              <Input
                                id="newClientName"
                                value={newClientName}
                                onChange={(e) => setNewClientName(e.target.value)}
                                placeholder="Nhập tên client"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsAddClientOpen(false)}>
                              {T.cancel}
                            </Button>
                            <Button type="button" onClick={handleAddClient}>
                              {T.add}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T.category}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={T.selectCategory} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(categories || []).map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {T.categories?.[category.id as keyof typeof T.categories] || category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField 
                control={control} 
                name="dates" 
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{T.dates}</FormLabel>
                    <FormControl>
                      <TaskDateRangePicker
                        value={field.value as any}
                        onChange={(range) => field.onChange(range as any)}
                        T={T as any}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <div className="space-y-4">
                <div className="flex gap-4">
                  <FormField 
                    control={control} 
                    name="status" 
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>{T.status}</FormLabel>
                        <Select 
                          onValueChange={(value) => { 
                            field.onChange(value); 
                            setValue('subStatusId', ''); 
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={T.selectStatus} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(settings.statusSettings || []).map((status) => (
                              <SelectItem key={status.id} value={status.id}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  {availableSubStatuses.length > 0 && (
                    <FormField 
                      control={control} 
                      name="subStatusId" 
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>{T.subStatuses}</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)} 
                            defaultValue={field.value || '__none__'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={T.selectSubStatus} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">{T.none}</SelectItem>
                              {availableSubStatuses.map((sub) => (
                                <SelectItem key={sub.id} value={sub.id}>
                                  {sub.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />
          <Collapsible open={isPriceSectionOpen} onOpenChange={setIsPriceSectionOpen}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex items-center w-full group">
                    <h3 className="text-lg font-medium">{T.priceQuote}</h3>
                    <ChevronDown className="h-4 w-4 ml-2 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="space-y-4 overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <QuoteManager
                  control={control}
                  form={form}
                  fieldArrayName="sections"
                  columns={columns}
                  setColumns={setColumns}
                  title={T.priceQuote}
                  quoteTemplates={quoteTemplates}
                  settings={settings}
                  taskDescription={getValues('description') || ''}
                  taskCategory={categoryName}
                  onApplySuggestion={handleApplySuggestion}
                  taskStartDate={currentStartDate}
                  taskEndDate={currentEndDate}
                  grandTotalFormula={form.watch('grandTotalFormula') as any}
                  onGrandTotalFormulaChange={(v) => form.setValue('grandTotalFormula', v, { shouldDirty: true })}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>

          <Separator />
          <Collapsible open={isCollaboratorSectionOpen} onOpenChange={setIsCollaboratorSectionOpen}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex items-center w-full group">
                    <h3 className="text-lg font-medium">{T.collaboratorCosts}</h3>
                    <ChevronDown className="h-4 w-4 ml-2 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                </CollapsibleTrigger>
              </div>
              
              <CollapsibleContent className="space-y-4 overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">{T.collaborator || "Collaborators"}</h4>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const currentDates = getValues('dates');
                        const rangeStart = currentDates?.from instanceof Date ? currentDates.from : currentStartDate;
                        const rangeEnd = currentDates?.to instanceof Date ? currentDates.to : currentEndDate;
                        const newQuote = {
                          collaboratorId: '',
                          grandTotalFormula: "",
                          sections: [{
                            id: `section-collab-${Date.now()}`,
                            name: T.untitledSection,
                            items: [{ 
                              description: "", 
                              unitPrice: 0, 
                              customFields: { 
                                timeline: createInitialTimelineData(rangeStart, rangeEnd, 0, 1)
                              } 
                            }]
                          }]
                        };
                        collabAppendQuote(newQuote);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {T.addCollaborator || "Thêm Collaborator"}
                    </Button>
                  </div>
                  
                  {collabQuoteFields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 mr-4">
                          <FormField 
                            control={control} 
                            name={`collaboratorQuotes.${index}.collaboratorId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{T.collaborator}</FormLabel>
                                <Select 
                                  onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)} 
                                  value={field.value || '__none__'}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={T.selectCollaborator} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="__none__">{T.none}</SelectItem>
                                    {(collaborators || []).map((collaborator) => (
                                      <SelectItem key={collaborator.id} value={collaborator.id}>
                                        {collaborator.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} 
                          />
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => collabRemoveQuote(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <QuoteManager
                        control={control}
                        form={form}
                        fieldArrayName={`collaboratorQuotes.${index}.sections`}
                        columns={collaboratorColumns}
                        setColumns={setCollaboratorColumns}
                        title={`${T.collaboratorCosts} #${index + 1}`}
                        settings={settings}
                        onCopyFromQuote={() => handleCopyFromQuote(index)}
                        showCopyFromQuote={true}
                        taskStartDate={currentStartDate}
                        taskEndDate={currentEndDate}
                        grandTotalFormula={form.watch(`collaboratorQuotes.${index}.grandTotalFormula`) as any}
                        onGrandTotalFormulaChange={(v) => form.setValue(`collaboratorQuotes.${index}.grandTotalFormula`, v, { shouldDirty: true })}
                      />
                    </div>
                  ))}
                  
                  {collabQuoteFields.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>{T.noCollaboratorsFound || "Chưa có collaborator nào"}</p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {T.cancel}
            </Button>
            <Button type="submit">{T.createTask}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
});

CreateTaskForm.displayName = "CreateTaskForm";
