"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, addDays, startOfMonth } from "date-fns";
import { 
  CalendarIcon, PlusCircle, Trash2, MoreVertical, Pencil, ClipboardPaste, Copy, 
  ChevronsUpDown, ChevronUp, ChevronDown, ArrowLeft, ArrowRight, 
  SplitSquareVertical, Plus, Minus, Grip, Clock, DollarSign, 
  Settings, MoreHorizontal, Edit2, X 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TaskDateRangePicker from "./TaskDateRangePicker";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { useToast } from "@/hooks/use-toast";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Task, Client, Collaborator, Category, Quote, QuoteSection, QuoteColumn, QuoteTemplate, AppSettings } from "@/lib/types";
import type { SuggestQuoteOutput } from "@/lib/ai-types";
import { QuoteManager } from "./quote-manager";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

const formSchema = z.object({
  name: z.string().min(2, "Task name must be at least 2 characters."),
  description: z.string().optional(),
  briefLink: z.array(z.string().refine(
    (val) => val.trim() === "" || z.string().url().safeParse(val).success,
    { message: "Please enter a valid URL or leave empty." }
  )).optional().default([]),
  driveLink: z.array(z.string().refine(
    (val) => val.trim() === "" || z.string().url().safeParse(val).success,
    { message: "Please enter a valid URL or leave empty." }
  )).optional().default([]),
  clientId: z.string().min(1, "Please select a client."),
  collaboratorIds: z.array(z.string()).optional().default([]), // Changed to array
  categoryId: z.string().min(1, "Please select a category."),
  status: z.enum(["todo", "inprogress", "done", "onhold", "archived"]),
  subStatusId: z.string().optional(),
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
            description: z.string().optional().default(""),
            unitPrice: z.coerce.number().min(0, "Price cannot be negative.").default(0),
            customFields: z.record(z.any()).optional(),
        })
    ).min(1, "A section must have at least one item."),
  })).min(1, "A quote must have at least one section."),
  collaboratorQuotes: z.array(
    z.object({
      collaboratorId: z.string().optional().default(''),
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

type EditTaskFormProps = {
  setOpen: (open: boolean) => void;
  onSubmit: (values: TaskFormValues, quoteColumns: QuoteColumn[], collaboratorQuoteColumns: QuoteColumn[], taskId: string) => void;
  taskToEdit: Task | null;
  quote?: Quote;
  collaboratorQuotes?: Quote[];
  clients: Client[];
  collaborators: Collaborator[];
  categories: Category[];
  onAddClient: (data: Omit<Client, 'id'>) => Client;
  quoteTemplates: QuoteTemplate[];
  settings: AppSettings;
  defaultDate?: Date | null;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterExternalSubmit?: (fn: () => void) => void;
  onRegisterDirtyCheck?: (fn: () => boolean) => void;
};

import { Expand, Shrink } from "lucide-react";
export function EditTaskForm({
  setOpen,
  onSubmit: onFormSubmit,
  taskToEdit,
  quote,
  collaboratorQuotes,
  clients,
  collaborators,
  categories,
  onAddClient,
  quoteTemplates,
  settings,
  defaultDate,
  onDirtyChange,
  onRegisterExternalSubmit,
  onRegisterDirtyCheck,
}: EditTaskFormProps) {
  const T = {
    ...i18n[settings.language],
    addLink: ((i18n[settings.language] as any)?.addLink || "Thêm link"),
  };
  const { toast } = useToast();
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [isCollaboratorSectionOpen, setIsCollaboratorSectionOpen] = useState(!!collaboratorQuotes && collaboratorQuotes.length > 0);
  
  const defaultColumns: QuoteColumn[] = useMemo(() => [
    { id: 'description', name: T.description, type: 'text' },
    { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number', calculation: { type: 'sum' } },
  ], [T, settings.currency]);

  const [columns, setColumns] = useState<QuoteColumn[]>(quote?.columns || defaultColumns);
  const [collaboratorColumns, setCollaboratorColumns] = useState<QuoteColumn[]>(collaboratorQuotes?.[0]?.columns || defaultColumns);
  
  // Column Dialog states
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<QuoteColumn | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<QuoteColumn | null>(null);
  
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<QuoteColumn['type']>('text');
  const [newColumnSum, setNewColumnSum] = useState(false);
  
  // Collab Column Dialog states
  const [isCollabColumnDialogOpen, setIsCollabColumnDialogOpen] = useState(false);
  const [editingCollabColumn, setEditingCollabColumn] = useState<QuoteColumn | null>(null);
  const [deletingCollabColumn, setDeletingCollabColumn] = useState<QuoteColumn | null>(null);
  const [newCollabColumnName, setNewCollabColumnName] = useState("");
  const [newCollabColumnType, setNewCollabColumnType] = useState<QuoteColumn['type']>('text');
  const [newCollabColumnSum, setNewCollabColumnSum] = useState(false);
  
  const [templateToApply, setTemplateToApply] = useState<QuoteTemplate | null>(null);

  // Helper function to get initial sections
  const getInitialSections = (): QuoteSection[] => {
    if (quote?.sections && quote.sections.length > 0) {
      return quote.sections;
    }
    const fallbackId = taskToEdit?.id || `edit-${Date.now()}`;
    return [{
      id: `section-edit-${fallbackId}`,
      name: T.untitledSection,
      items: [{ id: `item-edit-${fallbackId}-0`, description: "", unitPrice: 0, customFields: {} }]
    }];
  };

  const getInitialCollaboratorQuotes = () => {
    if (collaboratorQuotes && collaboratorQuotes.length > 0 && taskToEdit?.collaboratorIds) {
      return collaboratorQuotes.map((quote, index) => ({
        collaboratorId: taskToEdit.collaboratorIds?.[index] || '',
        sections: quote.sections || []
      }));
    }
    return [];
  };

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: taskToEdit?.name || "",
      description: taskToEdit?.description || "",
      briefLink: Array.isArray(taskToEdit?.briefLink) 
        ? (taskToEdit.briefLink.length > 0 ? taskToEdit.briefLink : [""]) 
        : (taskToEdit?.briefLink ? [taskToEdit.briefLink] : [""]),
      driveLink: Array.isArray(taskToEdit?.driveLink) 
        ? (taskToEdit.driveLink.length > 0 ? taskToEdit.driveLink : [""]) 
        : (taskToEdit?.driveLink ? [taskToEdit.driveLink] : [""]),
      clientId: taskToEdit?.clientId || "",
      collaboratorIds: taskToEdit?.collaboratorIds || [],
      categoryId: taskToEdit?.categoryId || "",
      status: taskToEdit?.status || "todo",
      subStatusId: taskToEdit?.subStatusId || "",
      dates: { 
        from: taskToEdit ? new Date(taskToEdit.startDate) : (defaultDate || new Date()), 
        to: taskToEdit ? new Date(taskToEdit.deadline) : (defaultDate || new Date())
      },
      sections: getInitialSections(),
      collaboratorQuotes: getInitialCollaboratorQuotes(),
    }
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({ control: form.control, name: "sections" });
  const { fields: collabQuoteFields, append: collabAppendQuote, remove: collabRemoveQuote } = useFieldArray({ control: form.control, name: "collaboratorQuotes" });

  const watchedSections = useWatch({ control: form.control, name: "sections" });
  const watchedCollabQuotes = useWatch({ control: form.control, name: "collaboratorQuotes" });
  const watchedStatus = useWatch({ control: form.control, name: "status" });
  const watchedCategoryId = useWatch({ control: form.control, name: "categoryId" });
  const watchedDescription = useWatch({ control: form.control, name: "description" });

  const availableSubStatuses = useMemo(() => {
    const mainStatusConfig = (settings.statusSettings || []).find(s => s.id === watchedStatus);
    return mainStatusConfig?.subStatuses || [];
  }, [watchedStatus, settings.statusSettings]);

  // Report dirty state to parent (for unsaved-changes guard)
  React.useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  // Expose live dirty check to parent (dialog) to ensure guards run on latest state
  const dirtyRef = React.useRef(form.formState.isDirty);
  React.useEffect(() => { dirtyRef.current = form.formState.isDirty; }, [form.formState.isDirty]);
  React.useEffect(() => {
    if (onRegisterDirtyCheck) {
      onRegisterDirtyCheck(() => dirtyRef.current);
    }
  }, [onRegisterDirtyCheck]);

  // Note: external submit registration is set up after onSubmit/onError are defined below

  const handleCopyFromQuote = useCallback((targetCollaboratorIndex: number) => {
    if (!quote?.sections || quote.sections.length === 0) {
      toast({
        title: "Lỗi",
        description: "Không có dữ liệu báo giá để sao chép.",
        variant: "destructive",
      });
      return;
    }

    const currentSections = quote.sections;
    form.setValue(`collaboratorQuotes.${targetCollaboratorIndex}.sections`, currentSections);
    
    toast({
      title: "Thành công",
      description: T.copiedFromQuote || "Đã sao chép dữ liệu từ báo giá chính.",
    });
  }, [quote, form, toast, T]);

  const onSubmit = useCallback((values: TaskFormValues) => {
    console.log('Form submitted with values:', values);
    console.log('Collaborator quotes data:', {
      collaboratorQuotes: values.collaboratorQuotes,
      hasCollaboratorQuotes: values.collaboratorQuotes && values.collaboratorQuotes.length > 0,
      collaboratorIds: values.collaboratorIds
    });
    
    if (!taskToEdit) {
      toast({
        title: "Lỗi",
        description: "No task to edit",
        variant: "destructive",
      });
      return;
    }

    const filteredBriefLinks = values.briefLink?.filter(link => link.trim() !== "") || [];
    const filteredDriveLinks = values.driveLink?.filter(link => link.trim() !== "") || [];

    const filteredValues = {
      ...values,
      briefLink: filteredBriefLinks,
      driveLink: filteredDriveLinks,
    };

    console.log('Final filtered values being submitted:', filteredValues);
    onFormSubmit(filteredValues, columns, collaboratorColumns, taskToEdit.id);
    // Dispatch a global event to signal save (for opening details dialog at higher level)
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('task:saved', { detail: { taskId: taskToEdit.id } }));
      } catch {}
    }
  }, [onFormSubmit, columns, collaboratorColumns, taskToEdit, toast, T]);

  const onError = useCallback((errors: any) => {
    console.error('Form validation errors:', errors);
    
    // Extract error messages from the errors object
    const errorMessages: string[] = [];
    const flattenErrors = (obj: any, path = '') => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const currentPath = path ? `${path}.${key}` : key;
          if (obj[key]?.message) {
            errorMessages.push(`${currentPath}: ${obj[key].message}`);
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            flattenErrors(obj[key], currentPath);
          }
        }
      }
    };
    
    flattenErrors(errors);
    
    const errorDescription = errorMessages.length > 0 
      ? errorMessages.join('; ') 
      : "Có lỗi xảy ra khi xác thực form. Vui lòng kiểm tra lại.";
    
    toast({
      title: "Lỗi xác thực",
      description: errorDescription,
      variant: "destructive",
    });
  }, [toast]);

  // Allow parent to trigger submit programmatically (after handlers exist)
  React.useEffect(() => {
    if (!onRegisterExternalSubmit) return;
    const submit = () => form.handleSubmit(onSubmit, onError)();
    onRegisterExternalSubmit(submit);
  }, [onRegisterExternalSubmit, form, onSubmit, onError]);

  const handleAddClient = useCallback(() => {
    if (newClientName.trim() === "") {
      toast({
        title: "Lỗi",
        description: "Tên client không được để trống.",
        variant: "destructive",
      });
      return;
    }

    const newClient = onAddClient({ name: newClientName.trim() });
    form.setValue("clientId", newClient.id);
    setNewClientName("");
    setIsAddClientOpen(false);
    
    toast({
      title: "Thành công",
      description: "Đã thêm client mới thành công.",
    });
  }, [newClientName, onAddClient, form, toast, T]);

  if (!taskToEdit) {
    return null;
  }

  // Trả lại form thuần, không bọc dialog/toggle
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
          {/* Main task details */}
          <div className="space-y-4">
            <FormField
              control={form.control}
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
            <FormField
              control={form.control}
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
            
            {/* Brief Link dynamic fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="briefLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T.briefLink || "Brief Link"}</FormLabel>
                    <div className="space-y-2">
                      {field.value && field.value.length > 0 && field.value.map((link: string, idx: number) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <Input
                            value={link}
                            placeholder="https://..."
                            className="flex-1 min-w-[120px]"
                            onChange={e => {
                              const newLinks = [...field.value];
                              newLinks[idx] = e.target.value;
                              field.onChange(newLinks);
                            }}
                          />
                          {idx > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (field.value.length > 1) {
                                  const updated = [...field.value];
                                  updated.splice(idx, 1);
                                  field.onChange(updated);
                                } else {
                                  field.onChange([""]);
                                }
                              }}
                              disabled={field.value.length === 1 && !field.value[idx]}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          {idx === field.value.length - 1 && field.value.length < 5 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => field.onChange([...field.value, ""])}
                              title={T.addLink || "Thêm link"}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="driveLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T.driveLink || "Drive Link"}</FormLabel>
                    <div className="space-y-2">
                      {field.value && field.value.length > 0 && field.value.map((link: string, idx: number) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <Input
                            value={link}
                            placeholder="https://..."
                            className="flex-1 min-w-[120px]"
                            onChange={e => {
                              const newLinks = [...field.value];
                              newLinks[idx] = e.target.value;
                              field.onChange(newLinks);
                            }}
                          />
                          {idx > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (field.value.length > 1) {
                                  const updated = [...field.value];
                                  updated.splice(idx, 1);
                                  field.onChange(updated);
                                } else {
                                  field.onChange([""]);
                                }
                              }}
                              disabled={field.value.length === 1 && !field.value[idx]}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          {idx === field.value.length - 1 && field.value.length < 5 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => field.onChange([...field.value, ""])}
                              title={T.addLink || "Thêm link"}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T.client}</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={T.selectClient} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
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
                control={form.control}
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
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
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
                control={form.control} 
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
                    control={form.control} 
                    name="status" 
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>{T.status}</FormLabel>
                        <Select 
                          onValueChange={(value) => { field.onChange(value); form.setValue('subStatusId', ''); }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={T.selectStatus} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(settings.statusSettings || []).map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  {availableSubStatuses.length > 0 && (
                    <FormField 
                      control={form.control} 
                      name="subStatusId" 
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>{T.subStatuses}</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)} 
                            value={field.value || '__none__'}
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

          {/* Price Quote Section */}
          <Separator />

          {/* Quote Manager */}
          <QuoteManager
            control={form.control}
            form={form}
            fieldArrayName="sections"
            columns={columns}
            setColumns={setColumns}
            title={T.priceQuote}
            quoteTemplates={quoteTemplates}
            settings={settings}
            taskDescription={watchedDescription || ''}
            taskCategory={(categories || []).find(c => c.id === watchedCategoryId)?.name || ''}
            onApplySuggestion={(items) => {
              const newItems = items.map(item => ({
                description: item.description,
                unitPrice: item.unitPrice,
                id: `item-sugg-${Date.now()}-${Math.random()}`,
                customFields: {},
              }));
              form.setValue('sections', [{ id: 'section-ai-1', name: T.untitledSection, items: newItems }]);
              setColumns(defaultColumns);
              toast({ title: T.suggestionApplied, description: T.suggestionAppliedDesc?.replace('{count}', String(items.length)) });
            }}
            onCopyFromQuote={undefined}
            showCopyFromQuote={false}
          />

          {/* Collaborator Section */}
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
              
              <CollapsibleContent className="space-y-4 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                {/* Multiple Collaborators Manager */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">{T.collaborator || "Collaborators"}</h4>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const newQuote = {
                          collaboratorId: '',
                          sections: [{
                            id: `section-${Date.now()}`,
                            name: T.untitledSection,
                            items: [{ description: "", unitPrice: 0, customFields: {} }]
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
                            control={form.control} 
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
                        control={form.control}
                        form={form}
                        fieldArrayName={`collaboratorQuotes.${index}.sections`}
                        columns={collaboratorColumns}
                        setColumns={setCollaboratorColumns}
                        title={`${T.collaboratorCosts} #${index + 1}`}
                        settings={settings}
                        onCopyFromQuote={() => handleCopyFromQuote(index)}
                        showCopyFromQuote={true}
                      />
                    </div>
                  ))}
                  
                  {collabQuoteFields.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>{T.noCollaboratorsFound || "Chưa có collaborator nào"}</p>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const newQuote = {
                            collaboratorId: '',
                            sections: [{
                              id: `section-${Date.now()}`,
                              name: T.untitledSection,
                              items: [{ description: "", unitPrice: 0, customFields: {} }]
                            }]
                          };
                          collabAppendQuote(newQuote);
                        }}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {T.addCollaborator || "Thêm Collaborator đầu tiên"}
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" data-intent="close" onClick={() => setOpen(false)}>
              {T.cancel}
            </Button>
            <Button type="submit">{T.save}</Button>
          </div>
      </form>
    </Form>
  );
}
