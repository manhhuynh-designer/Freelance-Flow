"use client";

import React, { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TaskDateRangePicker from "./TaskDateRangePicker";
import { useToast } from "@/hooks/use-toast";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Task, Client, Collaborator, Category, Quote, QuoteColumn, QuoteTemplate, AppSettings } from "@/lib/types";
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
  collaboratorIds: z.array(z.string()).optional().default([]),
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
            // Make description optional to avoid forcing values in quote table
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

export interface CreateTaskFormRef {
  handleSaveDraft: () => void;
}

type CreateTaskFormProps = {
  setOpen: (open: boolean) => void;
  onSubmit: (values: TaskFormValues, quoteColumns: QuoteColumn[], collaboratorQuoteColumns: QuoteColumn[]) => void;
  clients: Client[];
  collaborators: Collaborator[];
  categories: Category[];
  onAddClient: (data: Omit<Client, 'id'>) => Client;
  quoteTemplates: QuoteTemplate[];
  settings: AppSettings;
  defaultDate?: Date;
  onDirtyChange?: (isDirty: boolean) => void;
  onSubmitSuccess?: () => void;
};

export const CreateTaskForm = forwardRef<CreateTaskFormRef, CreateTaskFormProps>(({ 
  setOpen, 
  onSubmit: onFormSubmit, 
  clients, 
  collaborators, 
  categories, 
  onAddClient, 
  quoteTemplates, 
  settings, 
  defaultDate,
  onDirtyChange,
  onSubmitSuccess
}, ref) => {
  const { toast } = useToast();
  const T = useMemo(() => ({
    ...i18n[settings.language],
    addLink: ((i18n[settings.language] as any)?.addLink || "Thêm link"),
    untitledTask: ((i18n[settings.language] as any)?.untitledTask || "Untitled Task"),
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
      dates: {
        from: defaultDate ?? undefined,
        to: defaultDate ?? undefined,
      },
      sections: [{ 
        id: `section-${Date.now()}`, 
        name: T.untitledSection, 
        items: [{ description: "", unitPrice: 0, customFields: {} }] 
      }],
      collaboratorQuotes: [],
    }
  });

  const { formState: { isDirty }, getValues, setValue, control, register } = form;
  const briefLinks = useWatch({ control, name: "briefLink" });
  const driveLinks = useWatch({ control, name: "driveLink" });

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const { fields: collabQuoteFields, append: collabAppendQuote, remove: collabRemoveQuote } = useFieldArray({ 
    control, 
    name: "collaboratorQuotes" 
  });
  
  const handleFormSubmit = (data: TaskFormValues) => {
    const cleanedData: TaskFormValues = {
      ...data,
      briefLink: (data.briefLink || []).filter(link => link && link.trim() !== ''),
      driveLink: (data.driveLink || []).filter(link => link && link.trim() !== ''),
      collaboratorIds: data.collaboratorQuotes?.map(q => q.collaboratorId || "").filter(id => id) || []
    };
    
    onFormSubmit(cleanedData, columns, collaboratorColumns);
    
    // Reset form and dirty state
    form.reset();
    onDirtyChange?.(false);
    
    // Notify success - parent will handle closing
    onSubmitSuccess?.();
  };

  useImperativeHandle(ref, () => ({
    handleSaveDraft() {
      const values = getValues();
      const draftData = {
        ...values,
        name: `[Draft] ${values.name || T.untitledTask}`,
        status: 'archived' as const,
      };
      
      // Call the main submit handler which will handle reset and close
      const cleanedData: TaskFormValues = {
        ...draftData,
        briefLink: (draftData.briefLink || []).filter(link => link && link.trim() !== ''),
        driveLink: (draftData.driveLink || []).filter(link => link && link.trim() !== ''),
        collaboratorIds: draftData.collaboratorQuotes?.map(q => q.collaboratorId || "").filter(id => id) || []
      };
      
      onFormSubmit(cleanedData, columns, collaboratorColumns);
      
      // Reset form and dirty state
      form.reset();
      onDirtyChange?.(false);
      
      // Notify success - parent will handle closing
      onSubmitSuccess?.();
    }
  }));
  
  const categoryId = useWatch({ control, name: 'categoryId' });
  const categoryName = useMemo(() => 
    (categories || []).find(c => c.id === categoryId)?.name || '', 
    [categories, categoryId]
  );

  const handleApplySuggestion = (items: SuggestQuoteOutput['suggestedItems']) => {
    const newItems = items.map((item: SuggestQuoteOutput['suggestedItems'][number]) => ({
      description: item.description,
      unitPrice: item.unitPrice,
      id: `item-sugg-${Date.now()}-${Math.random()}`,
      customFields: {},
    }));
    setValue('sections', [{ id: 'section-ai-1', name: T.untitledSection, items: newItems }]);
    setColumns(defaultColumns);
    toast({ 
      title: T.suggestionApplied, 
      description: T.suggestionAppliedDesc?.replace('{count}', String(items.length)) 
    });
  };
  
  const handleCopyFromQuote = (targetCollaboratorIndex: number) => {
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
  };

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
          />

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
              
              <CollapsibleContent className="space-y-4 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
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
                            id: `section-collab-${Date.now()}`,
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
