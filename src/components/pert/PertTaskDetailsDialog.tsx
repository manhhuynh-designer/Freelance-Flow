"use client";

import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Task } from '@/lib/types';
// Checkbox removed: Dependencies feature removed from dialog
import { validatePertEstimates } from '@/lib/pert/calculator';
import { useDashboard } from '@/contexts/dashboard-context';
import { getTranslations } from '@/lib/i18n';


const schema = z.object({
  optimisticTime: z.coerce.number().min(0.0001, 'Must be > 0'),
  mostLikelyTime: z.coerce.number().min(0.0001, 'Must be > 0'),
  pessimisticTime: z.coerce.number().min(0.0001, 'Must be > 0'),
  dependencyType: z.union([z.literal('FS'), z.literal('SS'), z.literal('FF'), z.literal('SF')]).optional(),
});

export type PertTaskDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  allTasks?: Task[];
  editingEdge?: any;
  onSave: (partial: Pick<Task, 'id' | 'optimisticTime' | 'mostLikelyTime' | 'pessimisticTime'> & { edgeId?: string; dependencyType?: string }) => void;
};

export default function PertTaskDetailsDialog({ open, onOpenChange, task, onSave, allTasks = [], editingEdge }: PertTaskDetailsDialogProps) {
  const dashboard = useDashboard();
  const T = getTranslations(dashboard?.appData?.appSettings?.language || 'vi');
  
  // Early return if no task
  if (!task) {
    return null;
  }
  
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      optimisticTime: task.optimisticTime ?? undefined,
      mostLikelyTime: task.mostLikelyTime ?? undefined,
      pessimisticTime: task.pessimisticTime ?? undefined,
      dependencyType: (editingEdge && editingEdge.data && editingEdge.data.dependencyType) || 'FS',
    },
    values: {
      optimisticTime: task.optimisticTime ?? ('' as unknown as number),
      mostLikelyTime: task.mostLikelyTime ?? ('' as unknown as number),
      pessimisticTime: task.pessimisticTime ?? ('' as unknown as number),
      dependencyType: (editingEdge && editingEdge.data && editingEdge.data.dependencyType) || 'FS',
    }
  });


  const handleSubmit = (values: z.infer<typeof schema>) => {
    const { isValid, errors } = validatePertEstimates(values.optimisticTime, values.mostLikelyTime, values.pessimisticTime);
    if (!isValid) {
      errors.forEach(e => form.setError('optimisticTime', { message: e }));
      return;
    }
    console.log('✅ Validation passed, calling onSave with edgeId:', editingEdge?.id, 'dependencyType:', values.dependencyType);
    onSave({
      id: task.id,
      optimisticTime: values.optimisticTime,
      mostLikelyTime: values.mostLikelyTime,
      pessimisticTime: values.pessimisticTime,
      edgeId: editingEdge?.id,
      dependencyType: values.dependencyType,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{T.editTaskEstimates || 'Edit PERT estimate'}</DialogTitle>
          <DialogDescription>{T.enterPertTimesInDays || 'Enter optimistic, most likely, and pessimistic durations (days).'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField name="optimisticTime" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>{T.optimistic || 'Optimistic (O)'}</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={0.1} placeholder="2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="mostLikelyTime" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>{T.mostLikely || 'Most likely (M)'}</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={0.1} placeholder="3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="pessimisticTime" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>{T.pessimistic || 'Pessimistic (P)'}</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={0.1} placeholder="6" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2">
                <FormField name="dependencyType" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T.dependencyType || 'Dependency type'}</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full border rounded p-2 text-sm">
                        <option value="FS">{T.finishToStart || 'Finish-to-Start (FS)'}</option>
                        <option value="SS">{T.startToStart || 'Start-to-Start (SS)'}</option>
                        <option value="FF">{T.finishToFinish || 'Finish-to-Finish (FF)'}</option>
                        <option value="SF">{T.startToFinish || 'Start-to-Finish (SF)'}</option>
                      </select>
                    </FormControl>
                  </FormItem>
                )} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{T.cancel || 'Cancel'}</Button>
              <Button type="submit">{T.save || 'Save'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
