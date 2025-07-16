// (Removed: filter preset system no longer used)
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Star, MoreHorizontal, Trash2, Edit2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { STATUS_INFO } from '@/lib/data';

interface FilterPreset {
  id: string;
  name: string;
  filters: {
    status?: string; // Keep for backward compatibility
    selectedStatuses?: string[]; // New field for multiple statuses
    category?: string;
    collaborator?: string;
    client?: string;
    dateRange?: DateRange;
  };
  isDefault?: boolean;
  createdAt: string;
}

interface FilterPresetsProps {
  currentFilters: {
    selectedStatuses: string[];
    selectedCategory: string;
    selectedCollaborator: string;
    selectedClient: string;
    dateRange?: DateRange;
  };
  onApplyPreset: (filters: FilterPreset['filters']) => void;
  onSavePreset?: (filters: FilterPresetsProps['currentFilters']) => void;
  triggerSave?: boolean;
  onSaveTriggered?: () => void;
  T: any;
}

const PRESETS_STORAGE_KEY = 'freelance-flow-filter-presets';

export function FilterPresets({ 
  currentFilters, 
  onApplyPreset, 
  onSavePreset,
  triggerSave,
  onSaveTriggered,
  T 
}: FilterPresetsProps) {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Debug log to check if onApplyPreset is available
  useEffect(() => {
    console.log('FilterPresets: onApplyPreset available:', typeof onApplyPreset === 'function');
  }, [onApplyPreset]);

  // Load presets from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPresets = localStorage.getItem(PRESETS_STORAGE_KEY);
      console.log('Loading presets from localStorage:', savedPresets);
      if (savedPresets) {
        try {
          const parsed = JSON.parse(savedPresets);
          console.log('Parsed presets:', parsed);
          setPresets(parsed);
        } catch (error) {
          console.error('Failed to parse saved presets:', error);
        }
      }
    }
  }, []);

  // Handle external save trigger
  useEffect(() => {
    if (triggerSave) {
      setIsDialogOpen(true);
      onSaveTriggered?.();
    }
  }, [triggerSave, onSaveTriggered]);

  // Save presets to localStorage
  const savePresets = (newPresets: FilterPreset[]) => {
    setPresets(newPresets);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newPresets));
    }
  };

  // Save current filters as preset
  const saveCurrentAsPreset = () => {
    if (!presetName.trim()) return;

    console.log('Saving preset with current filters:', currentFilters);
    console.log('  - selectedStatuses:', currentFilters.selectedStatuses);
    console.log('  - selectedCategory:', currentFilters.selectedCategory);
    console.log('  - selectedCollaborator:', currentFilters.selectedCollaborator);
    console.log('  - selectedClient:', currentFilters.selectedClient);
    console.log('  - dateRange:', currentFilters.dateRange);

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: {
        // Save status array if it's not all statuses selected
        selectedStatuses: currentFilters.selectedStatuses.length === STATUS_INFO.length ? undefined : currentFilters.selectedStatuses,
        // Save specific selections, including 'all' values
        category: currentFilters.selectedCategory,
        collaborator: currentFilters.selectedCollaborator,
        client: currentFilters.selectedClient,
        dateRange: currentFilters.dateRange,
      },
      createdAt: new Date().toISOString(),
    };

    console.log('New preset to save:');
    console.log('  - selectedStatuses:', newPreset.filters.selectedStatuses);
    console.log('  - category:', newPreset.filters.category);
    console.log('  - collaborator:', newPreset.filters.collaborator);
    console.log('  - client:', newPreset.filters.client);
    console.log('  - dateRange:', newPreset.filters.dateRange);

    const newPresets = [...presets, newPreset];
    savePresets(newPresets);
    setPresetName('');
    setIsDialogOpen(false);
  };

  // Delete preset
  const deletePreset = (presetId: string) => {
    const newPresets = presets.filter(p => p.id !== presetId);
    savePresets(newPresets);
  };

  // Toggle default preset
  const toggleDefault = (presetId: string) => {
    const newPresets = presets.map(p => ({
      ...p,
      isDefault: p.id === presetId ? !p.isDefault : false, // Only one can be default
    }));
    savePresets(newPresets);
  };

  // Quick preset suggestions
  const quickPresets = [
    {
      name: T.thisWeek || 'This Week',
      filters: {
        dateRange: {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          to: new Date(),
        },
      },
    },
    {
      name: T.inProgress || 'In Progress',
      filters: {
        status: 'inprogress',
      },
    },
    {
      name: T.overdueItems || 'Overdue',
      filters: {
        dateRange: {
          from: new Date(2020, 0, 1),
          to: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    },
  ];

  const hasActiveFilters = 
    currentFilters.selectedStatuses.length !== STATUS_INFO.length ||
    (currentFilters.selectedCategory && currentFilters.selectedCategory !== 'all') ||
    (currentFilters.selectedCollaborator && currentFilters.selectedCollaborator !== 'all') ||
    (currentFilters.selectedClient && currentFilters.selectedClient !== 'all') ||
    currentFilters.dateRange;

  return (
    <div className="flex items-center gap-2">
      {/* Debug: Show preset count */}
      {process.env.NODE_ENV === 'development' && presets.length > 0 && (
        <span className="text-xs text-muted-foreground">({presets.length} saved)</span>
      )}
      
      {/* Quick Presets */}
      {quickPresets.map((preset, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => {
            onApplyPreset(preset.filters);
          }}
          className="h-7 px-2 text-xs border-border/50 hover:border-border transition-colors"
        >
          {preset.name}
        </Button>
      ))}

      {/* Saved Presets Dropdown */}
      {presets.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs border-border/50 hover:border-border transition-colors"
            >
              <BookOpen className="h-3 w-3 mr-1" />
              {T.savedPresets || 'Saved'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {presets.map((preset) => (
              <DropdownMenuItem key={preset.id} asChild>
                <div className="flex items-center justify-between p-0 w-full">
                  <Button
                    variant="ghost"
                    className="flex-1 justify-start h-auto p-2 text-left"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Saved preset clicked:', preset.name);
                      console.log('Preset filters object:', preset.filters);
                      console.log('  - selectedStatuses:', preset.filters.selectedStatuses);
                      console.log('  - category:', preset.filters.category);
                      console.log('  - collaborator:', preset.filters.collaborator);
                      console.log('  - client:', preset.filters.client);
                      console.log('  - dateRange:', preset.filters.dateRange);
                      console.log('About to call onApplyPreset with:', preset.filters);
                      onApplyPreset(preset.filters);
                      console.log('onApplyPreset called successfully');
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {preset.isDefault && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                      <span className="text-sm">{preset.name}</span>
                    </div>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toggleDefault(preset.id)}>
                        <Star className="h-3 w-3 mr-2" />
                        {preset.isDefault ? T.removeDefault : T.setDefault}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => deletePreset(preset.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        {T.delete || 'Delete'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Save Current Filters */}
      {hasActiveFilters && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs border-border/50 hover:border-border transition-colors"
            >
              <Star className="h-3 w-3 mr-1" />
              {T.savePreset || 'Save'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{T.saveFilterPreset || 'Save Filter Preset'}</DialogTitle>
              <DialogDescription>
                {T.saveFilterPresetDesc || 'Give your current filter combination a name to save it for later use.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="preset-name" className="text-right">
                  {T.name || 'Name'}
                </Label>
                <Input
                  id="preset-name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="col-span-3"
                  placeholder={T.presetNamePlaceholder || 'My filter preset...'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveCurrentAsPreset();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={saveCurrentAsPreset}
                disabled={!presetName.trim()}
              >
                {T.save || 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
