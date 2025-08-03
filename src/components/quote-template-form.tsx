"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PlusCircle, FolderPlus } from "lucide-react";
import React from "react";
import type { QuoteTemplate, QuoteColumn, AppSettings } from "@/lib/types";
import { i18n } from "@/lib/i18n";
import { QuoteSectionComponent } from "./quote-section-improved";
import { useToast } from "@/hooks/use-toast";

const templateFormSchema = z.object({
  name: z.string().min(2, "Template name must be at least 2 characters."),
  sections: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "Section name cannot be empty."),
    items: z.array(
        z.object({
            description: z.string().min(1, "Description cannot be empty."),
            unitPrice: z.coerce.number().min(0, "Price cannot be negative.").default(0),
            customFields: z.record(z.any()).optional(),
        })
    ).min(1, "A section must have at least one item."),
  })).min(1, "A quote must have at least one section.")
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;

type QuoteTemplateFormProps = {
  setOpen: (open: boolean) => void;
  onSubmit: (values: TemplateFormValues, columns: QuoteColumn[]) => void;
  templateToEdit?: QuoteTemplate;
  language: 'en' | 'vi';
  settings: AppSettings;
};

export function QuoteTemplateForm({ setOpen, onSubmit: onFormSubmit, templateToEdit, language, settings }: QuoteTemplateFormProps) {
  const isEditMode = !!templateToEdit;
  const T = i18n[language];
  const { toast } = useToast();

  const defaultColumns: QuoteColumn[] = [
    { id: 'description', name: T.description, type: 'text' },
    { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number', calculation: { type: 'sum' } },
  ];

  const [columns, setColumns] = React.useState<QuoteColumn[]>(
    isEditMode && templateToEdit?.columns ? templateToEdit.columns : defaultColumns
  );

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: isEditMode
      ? {
          name: templateToEdit.name,
          sections: templateToEdit.sections.map(section => ({ 
            id: section.id,
            name: section.name, 
            items: section.items.map(item => ({ ...item, id: `item-edit-${Date.now()}-${Math.random()}` })) 
          })),
        }
      : {
          name: "",
          sections: [{ id: `section-${Date.now()}`, name: T.untitledSection, items: [{ description: "", unitPrice: 0, customFields: {} }] }],
        },
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control: form.control,
    name: "sections",
  });

  const onSubmit = (data: TemplateFormValues) => {
    onFormSubmit(data, columns);
  };
  
  const handleEditColumn = (updatedColumn: QuoteColumn) => {
    setColumns(prev => prev.map(col => 
      col.id === updatedColumn.id ? updatedColumn : col
    ));
  };

  const handleAddColumn = (newColumn: Omit<QuoteColumn, 'id'>) => {
    const newId = `custom_${Date.now()}`;
    const columnWithId = { id: newId, ...newColumn };
    setColumns(prev => [...prev, columnWithId]);
    
    form.getValues("sections").forEach((section, sectionIndex) => {
      section.items.forEach((_: any, itemIndex: number) => {
        form.setValue(
          `sections.${sectionIndex}.items.${itemIndex}.customFields.${newId}`,
          newColumn.type === 'number' ? 0 : 
          newColumn.type === 'date' ? null : ''
        );
      });
    });
  };
  
  const handleDeleteColumn = (columnToDelete: QuoteColumn) => {
    setColumns(prev => prev.filter(col => col.id !== columnToDelete.id));
    
    const sections = form.getValues("sections");
    (sections || []).forEach((section: any, sectionIndex: number) => {
      section.items.forEach((_: any, itemIndex: number) => {
        if (section.items[itemIndex].customFields) {
          const newCustomFields = { ...section.items[itemIndex].customFields };
          delete newCustomFields[columnToDelete.id];
          form.setValue(
            `sections.${sectionIndex}.items.${itemIndex}.customFields`,
            newCustomFields
          );
        }
      });
    });
  };

  const handleMoveColumn = React.useCallback((index: number, direction: 'left' | 'right') => {
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;
    setColumns(currentColumns => {
        const newColumns = [...currentColumns];
        const temp = newColumns[index];
        newColumns[index] = newColumns[newIndex];
        newColumns[newIndex] = temp;
        return newColumns;
    });
  }, [columns.length]);
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{T.templateName}</FormLabel>
                <FormControl>
                  <Input placeholder={T.templateName} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
        />

        <div className="space-y-4">
            <h3 className="text-lg font-medium">{T.templateQuoteItems}</h3>
            <div className="space-y-4">
              {sectionFields.map((section, index) => (
                  <QuoteSectionComponent
                      key={section.id}
                      sectionIndex={index}
                      control={form.control}
                      columns={columns}
                      fieldArrayName="sections"
                      T={T}
                      onRemoveSection={() => removeSection(index)}
                      canDeleteSection={sectionFields.length > 1}
                      onMoveColumn={handleMoveColumn}
                      onEditColumn={handleEditColumn}
                      onDeleteColumn={handleDeleteColumn}
                      onItemChange={form.setValue}
                      onAddColumn={handleAddColumn}
                  />
              ))}
            </div>
            
            <div className="flex justify-center pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => appendSection({ id: `section-${Date.now()}`, name: T.untitledSection, items: [{ description: "", unitPrice: 0, customFields: {} }] })}>
                    <FolderPlus className="mr-2 h-4 w-4" />
                    {T.addSection}
                </Button>
            </div>
        </div>

        <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{T.cancel}</Button>
            <Button type="submit">{isEditMode ? T.saveChanges : T.createTemplate}</Button>
        </div>
      </form>
    </Form>
  );
}
