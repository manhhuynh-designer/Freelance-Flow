
"use client";

import * as React from "react";
import { useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2, MoreVertical, ArrowLeft, ArrowRight, Pencil, ClipboardPaste, ChevronUp, ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import type { QuoteColumn } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

type QuoteSectionComponentProps = {
  sectionIndex: number;
  control: any;
  columns: QuoteColumn[];
  fieldArrayName: string; // `sections` or `collaboratorSections`
  T: any;
  onRemoveSection: (index: number) => void;
  canDeleteSection: boolean;
  onMoveColumn: (index: number, direction: 'left' | 'right') => void;
  onEditColumn: (column: QuoteColumn) => void;
  onDeleteColumn: (column: QuoteColumn) => void;
  onPaste: (sectionIndex: number, text: string) => void;
};

export const QuoteSectionComponent = ({
  sectionIndex,
  control,
  columns,
  fieldArrayName,
  T,
  onRemoveSection,
  canDeleteSection,
  onMoveColumn,
  onEditColumn,
  onDeleteColumn,
  onPaste
}: QuoteSectionComponentProps) => {

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `${fieldArrayName}.${sectionIndex}.items`,
  });

  const { toast } = useToast();
  const [newItemDescription, setNewItemDescription] = React.useState('');

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onPaste(sectionIndex, text);
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
      toast({ variant: 'destructive', title: T.pasteFailed });
    }
  };

  const handleAddItem = () => {
    if (newItemDescription.trim()) {
      append({
        description: newItemDescription.trim(),
        quantity: 1,
        unitPrice: 0,
        customFields: {},
      });
      setNewItemDescription('');
    }
  };

  return (
    <div className="rounded-lg border-2 border-foreground bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <FormField
          control={control}
          name={`${fieldArrayName}.${sectionIndex}.name`}
          render={({ field }) => (
            <FormItem className="flex-grow">
              <FormControl>
                <Input placeholder={T.sectionName} {...field} className="text-base font-semibold border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring px-2" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {canDeleteSection && (
          <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onRemoveSection(sectionIndex)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{T.delete} Section</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, colIndex) => (
                <TableHead key={col.id} className={col.id === 'description' ? 'w-1/2' : undefined}>
                  <div className="flex items-center justify-between gap-2 min-w-[120px]">
                    <span>{col.name}</span>
                    {col.id !== 'description' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 data-[state=open]:bg-muted"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onMoveColumn(colIndex, 'left')} disabled={colIndex <= 1 && col.id !== 'unitPrice'}>
                            <ArrowLeft className="mr-2 h-4 w-4" /><span>{T.moveLeft}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onMoveColumn(colIndex, 'right')} disabled={colIndex >= columns.length - 1}>
                            <ArrowRight className="mr-2 h-4 w-4" /><span>{T.moveRight}</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onEditColumn(col)}><Pencil className="mr-2 h-4 w-4" /> {T.edit}</DropdownMenuItem>
                          {col.id !== 'unitPrice' && (
                            <DropdownMenuItem onClick={() => onDeleteColumn(col)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> {T.delete}</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((item, index) => (
              <TableRow key={item.id}>
                {columns.map(col => (
                  <TableCell key={col.id}>
                    <FormField
                      control={control}
                      name={`${fieldArrayName}.${sectionIndex}.items.${index}.${['description', 'quantity', 'unitPrice'].includes(col.id) ? col.id as 'description' | 'quantity' | 'unitPrice' : `customFields.${col.id}`}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type={col.type}
                              placeholder={col.type === 'number' ? '0' : '...'}
                              {...field}
                              onChange={e => field.onChange(col.type === 'number' ? (e.target.valueAsNumber || 0) : e.target.value)}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TableCell>
                ))}
                <TableCell className="w-[50px]">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => move(index, index - 1)} disabled={index === 0}><ChevronUp className="mr-2 h-4 w-4" /><span>{T.moveUp}</span></DropdownMenuItem>
                      <DropdownMenuItem onClick={() => move(index, index + 1)} disabled={index === fields.length - 1}><ChevronDown className="mr-2 h-4 w-4" /><span>{T.moveDown}</span></DropdownMenuItem>
                      <DropdownMenuItem onClick={() => remove(index)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>{T.delete}</span></DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center gap-2 mt-4 pt-4 border-t">
        <Input
            placeholder={T.newItemPlaceholder || "New item description..."}
            value={newItemDescription}
            onChange={(e) => setNewItemDescription(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddItem();
                }
            }}
            className="h-9 flex-grow"
        />
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={handleAddItem}
                        disabled={!newItemDescription.trim()}
                    >
                        <PlusCircle className="h-4 w-4" />
                        <span className="sr-only">{T.addItem}</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{T.addItem}</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={handlePaste}>
                        <ClipboardPaste className="h-4 w-4" />
                        <span className="sr-only">{T.pasteTable}</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{T.pasteTable}</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};
