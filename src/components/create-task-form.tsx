"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useForm, useFieldArray, useWatch, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { 
  CalendarIcon, PlusCircle, Trash2, MoreVertical, Pencil, ClipboardPaste, Copy, 
  ChevronsUpDown, ChevronUp, ChevronDown, ArrowLeft, ArrowRight, Link as LinkIcon, 
  Briefcase, FolderPlus, SplitSquareVertical, Plus, Minus, Grip, Clock, DollarSign, 
  Settings, MoreHorizontal, Edit2, X 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { useToast } from "@/hooks/use-toast";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Task, Client, Collaborator, Category, Quote, QuoteSection, QuoteColumn, QuoteTemplate, AppSettings } from "@/lib/types";
import type { SuggestQuoteOutput } from "@/lib/ai-types";
import { QuoteManager } from "./quote-manager";

const formSchema = z.object({
  name: z.string().min(2, "Task name must be at least 2 characters."),
  description: z.string().optional(),
  briefLink: z.array(z.string().url({ message: "Please enter a valid URL." }).or(z.literal(""))).optional().default([]),
  driveLink: z.array(z.string().refine(
    (val) => {
      if (val.trim() === "") return true; // Allow empty string
      // Accept http(s) and file:// links
      try {
        const url = new URL(val);
        return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'file:';
      } catch {
        return false;
      }
    },
    { message: "Please enter a valid URL or local file link (file://)." }
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
            description: z.string().optional().default(""), // Adjusted validation for item description
            unitPrice: z.coerce.number().min(0, "Price cannot be negative.").default(0),
            customFields: z.record(z.any()).optional(),
        })
    ).min(1, "A section must have at least one item."),
  })).min(1, "A quote must have at least one section."),
  collaboratorQuotes: z.array(
    z.object({
      collaboratorId: z.string(),
      sections: z.array(
        z.object({
          id: z.string(),
          name: z.string().min(1, "Section name cannot be empty."),
          items: z.array(
            z.object({
              id: z.string().optional(),
              description: z.string().optional().default(""), // Adjusted validation for item description
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

type CreateTaskFormProps = {
  setOpen: (open: boolean) => void;
  onSubmit: (values: TaskFormValues, quoteColumns: QuoteColumn[], collaboratorQuoteColumns: QuoteColumn[]) => void;
  clients: Client[];
  collaborators: Collaborator[];
  categories: Category[];
  onAddClient: (data: Omit<Client, 'id'>) => Client;
  quoteTemplates: QuoteTemplate[];
  settings: AppSettings;
  defaultDate?: { from: Date; to: Date };
  task?: Task;
  isOpen: boolean; // Add isOpen prop to CreateTaskFormProps
};

export function CreateTaskForm({ 
  setOpen, 
  onSubmit: onFormSubmit, 
  clients, 
  collaborators, 
  categories, 
  onAddClient, 
  quoteTemplates, 
  settings, 
  defaultDate, 
  task,
  isOpen, // Destructure isOpen
}: CreateTaskFormProps) {
  const { toast } = useToast();
  const T = {
    ...i18n[settings.language],
    addLink: ((i18n[settings.language] as any)?.addLink || "Thêm link"),
    addCollaborator: ((i18n[settings.language] as any)?.addCollaborator || "Thêm Collaborator"),
    addFirstCollaborator: ((i18n[settings.language] as any)?.addFirstCollaborator || "Thêm Collaborator đầu tiên"),
    noCollaborators: ((i18n[settings.language] as any)?.noCollaborators || "Chưa có collaborator nào"),
    collaborators: ((i18n[settings.language] as any)?.collaborators || "Collaborators"),
    createTaskDialogTitle: ((i18n[settings.language] as any)?.createTaskDialogTitle || "Tạo task mới"),
    copiedFromQuote: ((i18n[settings.language] as any)?.copiedFromQuote || "Đã sao chép báo giá"),
    copiedFromQuoteDesc: ((i18n[settings.language] as any)?.copiedFromQuoteDesc || "Đã sao chép dữ liệu từ báo giá chính sang báo giá của collaborator."),
    suggestionApplied: ((i18n[settings.language] as any)?.suggestionApplied || "Đề xuất đã được áp dụng"),
    suggestionAppliedDesc: ((i18n[settings.language] as any)?.suggestionAppliedDesc || "Đã áp dụng {count} mục vào báo giá."),
    cancel: ((i18n[settings.language] as any)?.cancel || "Hủy"),
    add: ((i18n[settings.language] as any)?.add || "Thêm"),
    clientNameRequired: ((i18n[settings.language] as any)?.clientNameRequired || "Tên client là bắt buộc"),
    unitPrice: ((i18n[settings.language] as any)?.unitPrice || "Đơn giá"),
    untitledSection: ((i18n[settings.language] as any)?.untitledSection || "Phần không có tiêu đề"),
    createTask: ((i18n[settings.language] as any)?.createTask || "Tạo task"),
  };
  
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [isCollaboratorSectionOpen, setIsCollaboratorSectionOpen] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  const [isFormSuccessfullySubmitted, setIsFormSuccessfullySubmitted] = useState(false); // New state

  const defaultColumns: QuoteColumn[] = React.useMemo(() => [
    { id: 'description', name: T.description, type: 'text' },
    { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number', calculation: { type: 'sum' } },
  ], [T, settings.currency]);

  const [columns, setColumns] = useState<QuoteColumn[]>(defaultColumns);
  const [collaboratorColumns, setCollaboratorColumns] = useState<QuoteColumn[]>(defaultColumns);
  
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

  // Tìm quote tương ứng với task.quoteId nếu có
  // Đảm bảo sections từ quote đều có id cho từng item
  let quoteSections: QuoteSection[] | undefined = undefined;
  if (task && task.quoteId && Array.isArray(quoteTemplates)) {
    const quote = quoteTemplates.find(q => q.id === task.quoteId);
    if (quote && Array.isArray(quote.sections) && quote.sections.length > 0) {
      quoteSections = quote.sections.map(section => ({
        ...section,
        id: `section-${Date.now()}-${Math.random()}`,
        items: (Array.isArray(section.items) ? section.items : []).map(item => ({
          ...item,
          id: `item-${Date.now()}-${Math.random()}`,
          customFields: item.customFields || {}
        }))
      }));
    }
  }

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: task ? {
      name: task.name || "",
      description: task.description || "",
      briefLink: Array.isArray(task.briefLink) && task.briefLink.length > 0 ? task.briefLink : [""],
      driveLink: Array.isArray(task.driveLink) && task.driveLink.length > 0 ? task.driveLink : [""],
      clientId: task.clientId || "",
      collaboratorIds: Array.isArray(task.collaboratorIds) ? task.collaboratorIds : [],
      categoryId: task.categoryId || "",
      status: task.status || "todo",
      subStatusId: task.subStatusId || "",
      dates: {
        from: task.startDate ? new Date(task.startDate) : undefined,
        to: task.deadline ? new Date(task.deadline) : undefined,
      },
      sections: quoteSections && quoteSections.length > 0
        ? quoteSections.map(s => ({
            ...s,
            id: `section-${Date.now()}-${Math.random()}`,
            items: (Array.isArray(s.items) ? s.items : []).map(item => ({
              ...item,
              id: `item-${Date.now()}-${Math.random()}`,
              customFields: item.customFields || {}
            }))
          }))
        : [{ id: `section-${Date.now()}`, name: T.untitledSection, items: [{ description: "", unitPrice: 0, customFields: {} }] }],
      collaboratorQuotes: Array.isArray(task.collaboratorQuotes) ? task.collaboratorQuotes : [],
    } : {
      name: "",
      description: "",
      briefLink: [""],
      driveLink: [""],
      clientId: "",
      collaboratorIds: [],
      categoryId: "",
      status: "todo",
      subStatusId: "",
      dates: {
        from: defaultDate?.from ?? undefined,
        to: defaultDate?.to ?? undefined,
      },
      sections: [{ 
        id: `section-${Date.now()}`, 
        name: T.untitledSection, 
        items: [{ description: "", unitPrice: 0, customFields: {} }] 
      }],
      collaboratorQuotes: [],
    }
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection, move } = useFieldArray({ 
    control: form.control, 
    name: "sections" 
  });
  const { fields: collabQuoteFields, append: collabAppendQuote, remove: collabRemoveQuote, move: moveCollabQuote } = useFieldArray({ 
    control: form.control, 
    name: "collaboratorQuotes" 
  });

  const onError = useCallback((errors: FieldErrors<TaskFormValues>) => { 
    console.error('Form validation errors:', errors);
    
    const errorMessages: string[] = [];
    const flattenErrors = (obj: FieldErrors | any, path = '') => { 
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const currentPath = path ? `${path}.${key}` : key;
          if (obj[key] && typeof obj[key].message === 'string') {
              errorMessages.push(`${currentPath}: ${obj[key].message}`);
          } else if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) { 
              flattenErrors(obj[key], currentPath);
          } else if (Array.isArray(obj[key])) { 
            obj[key].forEach((item: any, index: number) => {
              if (item && typeof item.message === 'string') {
                errorMessages.push(`${currentPath}[${index}]: ${item.message}`);
              } else if (typeof item === 'object' && item !== null) {
                flattenErrors(item, `${currentPath}[${index}]`);
              } else {
                errorMessages.push(`${currentPath}[${index}]: ${String(item)}`);
              }
            });
          }
        }
      }
    };
    
    flattenErrors(errors);
    
    const errorDescription = errorMessages.length > 0 
      ? errorMessages.join('; ') 
      : (Object.keys(errors).length > 0 
          ? "Có lỗi xảy ra khi xác thực form. Một số trường có thể không hợp lệ. Vui lòng kiểm tra lại."
          : "Có lỗi xảy ra khi xác thực form. Không có mô tả chi tiết." 
        );
    
    toast({
      title: "Lỗi xác thực",
      description: errorDescription,
      variant: "destructive",
    });
  }, [toast]);

  const handleFormSubmit = (data: TaskFormValues) => {
    // Extract collaborator IDs from collaboratorQuotes
    const collaboratorIds = data.collaboratorQuotes
      ?.filter(quote => quote.collaboratorId)
      .map(quote => quote.collaboratorId) || [];
    
    // Update the data with extracted collaborator IDs
    const formDataWithCollaborators = {
      ...data,
      collaboratorIds
    };
    
    setIsFormSuccessfullySubmitted(true); // Set the flag to true on successful submission
    onFormSubmit(formDataWithCollaborators, columns, collaboratorColumns);
    setOpen(false); // Close the dialog immediately after successful submission
  };
  
  const handleAddNewClient = () => {
    if (newClientName.trim() === "") {
      toast({
        title: T.addClient, // Use translated title
        description: T.clientNameRequired, // Use translated description
        variant: "destructive",
      });
      return;
    }

    const newClient = onAddClient({ name: newClientName.trim() });
    form.setValue("clientId", newClient.id, { shouldValidate: true });
    setNewClientName("");
    setIsAddClientOpen(false);
    
    toast({
      title: T.add, // Use translated title
      description: `${T.addClient} ${newClient.name} thành công.`, // Adjusted description for better context
    });
  };
  
  const handleApplyTemplate = () => {
    if (!templateToApply) return;
    const sectionsWithIds = templateToApply.sections.map(s => ({ 
      ...s, 
      id: `section-tpl-${Date.now()}-${Math.random()}`, 
      items: s.items.map(item => ({ 
        ...item, 
        id: `item-tpl-${Date.now()}-${Math.random()}`, 
        customFields: item.customFields || {} 
      })) 
    }));
    form.setValue('sections', sectionsWithIds);
    setColumns(templateToApply.columns || defaultColumns);
    setTemplateToApply(null);
  };
  
  const categoryId = form.watch('categoryId');
  const categoryName = useMemo(() => 
    (categories || []).find(c => c.id === categoryId)?.name || '', 
    [categories, categoryId]
  );

  const watchedSections = useWatch({ control: form.control, name: 'sections' });
  const watchedCollabQuotes = useWatch({ control: form.control, name: 'collaboratorQuotes' });

  const handleApplySuggestion = (items: SuggestQuoteOutput['suggestedItems']) => {
    const newItems = items.map((item: { description: string; unitPrice: number }) => ({
      description: item.description,
      unitPrice: item.unitPrice,
      id: `item-sugg-${Date.now()}-${Math.random()}`,
      customFields: {},
    }));
    form.setValue('sections', [{ id: 'section-ai-1', name: T.untitledSection, items: newItems }]);
    setColumns(defaultColumns);
    toast({ 
      title: T.suggestionApplied, 
      description: T.suggestionAppliedDesc?.replace('{count}', String(items.length)) 
    });
  };
  
  const handleCopyFromQuote = (targetCollaboratorIndex: number) => {
    const currentSections = form.getValues('sections');
    // When copying from quote, create a new collaborator quote entry
    const newCollaboratorQuote = {
      collaboratorId: '', // Will be set when collaborator is selected
      sections: currentSections
    };
    
    const currentQuotes = form.getValues('collaboratorQuotes') || [];
    form.setValue('collaboratorQuotes', [...currentQuotes, newCollaboratorQuote]);
    setCollaboratorColumns([...columns]);
    toast({ 
      title: T.copiedFromQuote, 
      description: T.copiedFromQuoteDesc 
    });
  };

  const watchedStatus = form.watch("status");
  const availableSubStatuses = useMemo(() => {
    const mainStatusConfig = (settings.statusSettings || []).find(s => s.id === watchedStatus);
    return mainStatusConfig?.subStatuses || [];
  }, [watchedStatus, settings.statusSettings]);
  
  // Custom close handler for dialog
  const handleDialogCloseAttempt = (openState: boolean) => {
    if (openState === false) { // Attempting to close the dialog
        if (!isFormSuccessfullySubmitted) {
            setShowExitWarning(true); // Show warning if not submitted
        } else {
            setOpen(false); // Directly close if successfully submitted
        }
    } else { // Dialog is opening
        setShowExitWarning(false); // Reset warning
    }
  };

  // Save draft logic
  const handleSaveDraft = () => {
    const draftData = form.getValues();
    // Set status to 'archived' for draft, ensure correct type
    const draftTask = { ...draftData, status: 'archived' as TaskFormValues['status'] };
    setIsFormSuccessfullySubmitted(true); // Treat draft save as a successful "submission" to avoid warning
    onFormSubmit(draftTask, columns, collaboratorColumns);
    setShowExitWarning(false);
    setOpen(false);
  };

  // Confirm close (from AlertDialog)
  const handleConfirmClose = () => {
    setShowExitWarning(false);
    setOpen(false); // Close parent dialog
  };

  // Cancel close (from AlertDialog)
  const handleCancelClose = () => {
    setShowExitWarning(false);
    // Do not call setOpen(true) here; let the parent dialog state remain open.
    // The AlertDialog's open state will become false automatically via onOpenChange when setShowExitWarning is false.
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogCloseAttempt}>
      <DialogContent className="w-[80vw] max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{task ? T.editTask : T.createTask}</DialogTitle>
          <DialogDescription>
            {task ? "Edit the task details." : "Fill in the details for your new task."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit, onError)} className="space-y-8 flex-1 overflow-y-auto">
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
                      <Textarea placeholder="Provide a brief description of the task." {...field} />
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
                  render={({ field }) => {
                    const links = field.value || [""]; // Ensure it's always at least [""]
                    return (
                      <FormItem>
                        <FormLabel>{T.briefLink}</FormLabel>
                        <div className="space-y-2">
                          {links.map((link: string, idx: number) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <Input
                                value={link}
                                placeholder="e.g., https://docs.google.com/document/..."
                                onChange={e => {
                                  const newLinks = [...links];
                                  newLinks[idx] = e.target.value;
                                  field.onChange(newLinks);
                                }}
                              />
                              {links.length > 1 && ( // Show trash button only if more than 1 link
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const updated = [...links];
                                    updated.splice(idx, 1);
                                    field.onChange(updated.length === 0 ? [""] : updated); // Ensure at least [""]
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                              {idx === links.length - 1 && links.length < 5 && ( // Always show + if last field is not empty and count < 5
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => field.onChange([...links, ""])}
                                  title={T.addLink || "Thêm link"}
                                >
                                  <PlusCircle className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="driveLink"
                  render={({ field }) => {
                    const links = field.value || [""]; // Ensure it's always at least [""]
                    return (
                      <FormItem>
                        <FormLabel>Storage Links</FormLabel>
                        <div className="space-y-2">
                          {links.map((link: string, idx: number) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <Input
                                value={link}
                                placeholder="e.g., https://drive.google.com/drive/... or file:///C:/Users/yourfile.pdf"
                                onChange={e => {
                                  const newLinks = [...links];
                                  newLinks[idx] = e.target.value;
                                  field.onChange(newLinks);
                                }}
                              />
                              {links.length > 1 && ( // Show trash button only if more than 1 link
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const updated = [...links];
                                    updated.splice(idx, 1);
                                    field.onChange(updated.length === 0 ? [""] : updated); // Ensure at least [""]
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                              {idx === links.length - 1 && links.length < 5 && ( // Always show + if last field is not empty and count < 5
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => field.onChange([...links, ""])}
                                  title={T.addLink || "Thêm link"}
                                >
                                  <PlusCircle className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <div className="flex gap-2">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                              <Button type="button" onClick={handleAddNewClient}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  control={form.control} 
                  name="dates" 
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{T.dates}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value?.from && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value?.from ? (
                                field.value.to ? (
                                  <>
                                    {format(field.value.from, "LLL dd, y")} -{" "}
                                    {format(field.value.to, "LLL dd, y")}
                                  </>
                                ) : (
                                  format(field.value.from, "LLL dd, y")
                                )
                              ) : (
                                <span>{T.pickDateRange}</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="range"
                            selected={{ from: field.value?.from, to: field.value?.to }}
                            onSelect={(range) => field.onChange({ from: range?.from, to: range?.to })}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
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
                            onValueChange={(value) => { field.onChange(value as string); form.setValue('subStatusId', ''); }} 
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
                            onValueChange={(value) => field.onChange(value === '__none__' ? '' : value as string)} 
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

            {/* Price Quote Section */}
            <Separator />
            <QuoteManager
              control={form.control}
              form={form}
              fieldArrayName="sections"
              columns={columns}
              setColumns={setColumns}
              title={T.priceQuote}
              quoteTemplates={quoteTemplates}
              settings={settings}
              taskDescription={form.getValues('description') || ''}
              taskCategory={categoryName}
              onApplySuggestion={handleApplySuggestion}
            />

            <Separator />
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
                      <h4 className="text-sm font-medium">{T.collaborators}</h4>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const newQuote = {
                            collaboratorId: '',
                            sections: [{
                              id: `section-${Date.now()}-${Math.random()}`,
                              name: T.untitledSection,
                              items: [{ description: "", unitPrice: 0, customFields: {} }]
                            }]
                          };
                          collabAppendQuote(newQuote);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {T.addCollaborator}
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
                                    onValueChange={(value) => field.onChange(value === '__none__' ? '' : value as string)} 
                                    value={field.value || '__none__'}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={T.selectCollaborator} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
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
                        <p>{T.noCollaborators}</p>
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
                          {T.addFirstCollaborator}
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {T.cancel}
              </Button>
              <Button type="submit">{task ? T.editTask : T.createTask}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Add Client Dialog */}
      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{T.addClient}</DialogTitle>
            <DialogDescription>
              Enter the name of the new client.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="new-client-name">{T.clientNameRequired}</Label>
              <Input
                id="new-client-name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="e.g., Acme Corporation"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNewClient();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => {
                setIsAddClientOpen(false);
                setNewClientName("");
              }}
            >
              {T.cancel}
            </Button>
            <Button 
              type="button" 
              onClick={handleAddNewClient}
              disabled={!newClientName.trim()}
            >
              {T.addClient}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Exit Warning Dialog */}
      <AlertDialog open={showExitWarning && !isFormSuccessfullySubmitted} onOpenChange={setShowExitWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to exit?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            You have unsaved changes. What would you like to do?
          </AlertDialogDescription>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={handleConfirmClose}>OK</Button>
            <Button variant="outline" onClick={handleSaveDraft}>Save Draft</Button>
            <Button onClick={handleCancelClose}>Cancel</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
