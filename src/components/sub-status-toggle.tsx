"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';
import { i18n } from '@/lib/i18n';
import type { AppSettings } from '@/lib/types';

interface SubStatusToggleProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function SubStatusToggle({ settings, onSettingsChange }: SubStatusToggleProps) {
  const T = i18n[settings.language];
  const isGrouped = settings.kanbanSubStatusMode === 'grouped';

  const handleToggle = () => {
    const newMode = isGrouped ? 'separate' : 'grouped';
    onSettingsChange({
      ...settings,
      kanbanSubStatusMode: newMode
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Sub-status Layout:</span>
      <Button
        variant={isGrouped ? "default" : "outline"}
        size="sm"
        onClick={handleToggle}
        className="flex items-center gap-2"
      >
        <List className="h-4 w-4" />
        Grouped
      </Button>
      <Button
        variant={!isGrouped ? "default" : "outline"}
        size="sm"
        onClick={handleToggle}
        className="flex items-center gap-2"
      >
        <LayoutGrid className="h-4 w-4" />
        Separate
      </Button>
    </div>
  );
}
