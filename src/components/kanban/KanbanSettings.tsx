"use client";

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Cog } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { i18n } from '@/lib/i18n';
import type { AppSettings } from '@/lib/types';

interface KanbanSettingsProps {
    appSettings: AppSettings;
    updateKanbanSettings: (settings: Partial<AppSettings>) => void;
}

export function KanbanSettings({ appSettings, updateKanbanSettings }: KanbanSettingsProps) {
  const { statusSettings, kanbanColumnVisibility = {}, kanbanSubStatusMode = 'grouped' } = appSettings;
  const T = i18n[appSettings.language];

  const handleVisibilityChange = (statusId: string, checked: boolean) => {
    const newVisibility = { ...kanbanColumnVisibility, [statusId]: checked };
    updateKanbanSettings({ kanbanColumnVisibility: newVisibility });
  };

  const handleSubStatusModeChange = (value: string) => {
    updateKanbanSettings({ kanbanSubStatusMode: value as 'grouped' | 'separate' });
  };

  const allPossibleColumns = React.useMemo(() => {
    const columns: { id: string; label: string; isSubStatus?: boolean }[] = [];
    statusSettings.forEach(status => {
      if (kanbanSubStatusMode === 'separate' && status.subStatuses && status.subStatuses.length > 0) {
        status.subStatuses.forEach(sub => {
          columns.push({ id: `${status.id}_${sub.id}`, label: `${status.label} - ${sub.label}`, isSubStatus: true });
        });
      }
    });
    return columns;
  }, [statusSettings, kanbanSubStatusMode]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <Cog className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">{T.kanbanSettings.title}</h4>
            <p className="text-sm text-muted-foreground">
              {T.kanbanSettings.description}
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h5 className="text-sm font-medium">{T.kanbanSettings.subStatusMode}</h5>
            <RadioGroup onValueChange={handleSubStatusModeChange} value={kanbanSubStatusMode}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="grouped" id="sub-status-grouped" />
                <Label htmlFor="sub-status-grouped">{T.kanbanSettings.grouped}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="separate" id="sub-status-separate" />
                <Label htmlFor="sub-status-separate">{T.kanbanSettings.separate}</Label>
              </div>
            </RadioGroup>
          </div>
          <Separator />
          {kanbanSubStatusMode === 'separate' && allPossibleColumns.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">{T.kanbanSettings.columnVisibility}</h5>
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {allPossibleColumns.map(col => (
                  <div key={col.id} className="flex items-center justify-between">
                    <Label htmlFor={`visibility-${col.id}`}>{col.label}</Label>
                    <Switch
                      id={`visibility-${col.id}`}
                      checked={kanbanColumnVisibility[col.id] !== false}
                      onCheckedChange={(checked) => handleVisibilityChange(col.id, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}