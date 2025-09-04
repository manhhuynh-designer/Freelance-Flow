import React, { useState, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { i18n } from '@/lib/i18n';
import { Eye, EyeOff, Edit3, Settings, CheckSquare, Square, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { Quote, QuoteSection, AppSettings, Task, QuoteColumn, QuoteItem } from '@/lib/types';
import { QuoteManager } from '@/components/quote-manager';
import stylesModule from './TimelineEditDialog.module.css';

// Form schema for editing quote data
const timelineEditSchema = z.object({
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
});

type TimelineEditFormValues = z.infer<typeof timelineEditSchema>;

// Interface for visibility state management
interface SectionVisibilityState {
  [sectionId: string]: {
    visible: boolean;
    collapsed?: boolean;
    milestones: {
      [milestoneId: string]: boolean;
    };
  };
}

interface TimelineEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  quote?: Quote;
  onUpdateQuote?: (quoteId: string, updates: Partial<Quote>) => void;
  settings: AppSettings;
  // Visibility state management
  visibilityState: SectionVisibilityState;
  onVisibilityChange: (newState: SectionVisibilityState) => void;
  // Optional: limit UI to Edit Quote only (hide Visibility tab)
  mode?: 'full' | 'editOnly';
}

export const TimelineEditDialog: React.FC<TimelineEditDialogProps> = ({
  isOpen,
  onClose,
  task,
  quote,
  onUpdateQuote,
  settings,
  visibilityState,
  onVisibilityChange,
  mode = 'full'
}) => {
  const { toast } = useToast();
  const T = i18n[settings.language] || i18n.vi;
  
  // State management
  const [activeTab, setActiveTab] = useState<'visibility' | 'edit'>(mode === 'editOnly' ? 'edit' : 'visibility'); // Default based on mode
  const [localVisibilityState, setLocalVisibilityState] = useState<SectionVisibilityState>(visibilityState);

  // Default columns if none exist - ensure timeline column is always included
  const defaultColumns: QuoteColumn[] = useMemo(() => [
    { id: 'description', name: T.description || 'Description', type: 'text' },
    { id: 'unitPrice', name: `${T.unitPrice || 'Unit Price'} (${settings.currency})`, type: 'number', calculation: { type: 'sum' } },
    { id: 'timeline', name: 'Timeline', type: 'text' }
  ], [T, settings.currency]);

  // Initialize columns with proper timeline column preservation
  const [columns, setColumns] = useState<QuoteColumn[]>(() => {
    if (!quote?.columns || quote.columns.length === 0) {
      console.log('📋 TimelineEditDialog: No columns found, using defaults');
      return defaultColumns;
    }
    
    // Check if timeline column exists
    const hasTimelineColumn = quote.columns.some(col => col.id === 'timeline');
    
    if (!hasTimelineColumn) {
      console.log('📋 TimelineEditDialog: Adding missing timeline column');
      return [...quote.columns, { id: 'timeline', name: 'Timeline', type: 'text' }];
    }
    
    console.log('📋 TimelineEditDialog: Using existing columns with timeline');
    return quote.columns;
  });

  // Initialize form with quote data
  const form = useForm<TimelineEditFormValues>({
    resolver: zodResolver(timelineEditSchema),
    defaultValues: {
      sections: quote?.sections || []
    }
  });

  // Get sections with milestone counts for visibility controls
  const sectionsWithMilestones = useMemo(() => {
    if (!quote?.sections) return [];
    
    return quote.sections.map(section => {
      const milestones: Array<{ id: string; name: string; hasTimeline: boolean }> = [];
      
      section.items?.forEach((item, itemIndex) => {
        let timelineValue = item.customFields?.timeline;
        
        // Check if item has valid timeline data
        let hasValidTimeline = false;
        if (timelineValue) {
          try {
            if (typeof timelineValue === 'string') {
              timelineValue = JSON.parse(timelineValue);
            }
            hasValidTimeline = !!(timelineValue && 
              typeof timelineValue === 'object' && 
              timelineValue.start && 
              timelineValue.end);
          } catch (e) {
            hasValidTimeline = false;
          }
        }
        
        if (hasValidTimeline) {
          const milestoneId = `${section.id || `section-${quote.sections.indexOf(section)}`}-${item.id || `item-${itemIndex}`}`;
          milestones.push({
            id: milestoneId,
            name: item.description || `${section.name || 'Section'} - Item ${itemIndex + 1}`,
            hasTimeline: true
          });
        }
      });
      
      return {
        ...section,
        milestones
      };
    });
  }, [quote?.sections]);

  // Visibility control handlers
  const toggleSectionVisibility = useCallback((sectionId: string) => {
    setLocalVisibilityState(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        visible: !prev[sectionId]?.visible,
        milestones: prev[sectionId]?.milestones || {}
      }
    }));
  }, []);

  const toggleMilestoneVisibility = useCallback((sectionId: string, milestoneId: string) => {
    setLocalVisibilityState(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        visible: prev[sectionId]?.visible ?? true,
        milestones: {
          ...prev[sectionId]?.milestones,
          [milestoneId]: !prev[sectionId]?.milestones?.[milestoneId]
        }
      }
    }));
  }, []);

  const toggleSectionCollapse = useCallback((sectionId: string) => {
    setLocalVisibilityState(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        collapsed: !prev[sectionId]?.collapsed,
        visible: prev[sectionId]?.visible ?? true,
        milestones: prev[sectionId]?.milestones || {}
      }
    }));
  }, []);

  // Bulk actions
  const selectAllSections = useCallback(() => {
    const newState: SectionVisibilityState = {};
    sectionsWithMilestones.forEach(section => {
      const milestones: { [key: string]: boolean } = {};
      section.milestones.forEach(milestone => {
        milestones[milestone.id] = true;
      });
      
      newState[section.id] = {
        visible: true,
        milestones
      };
    });
    setLocalVisibilityState(newState);
  }, [sectionsWithMilestones]);

  const deselectAllSections = useCallback(() => {
    const newState: SectionVisibilityState = {};
    sectionsWithMilestones.forEach(section => {
      const milestones: { [key: string]: boolean } = {};
      section.milestones.forEach(milestone => {
        milestones[milestone.id] = false;
      });
      
      newState[section.id] = {
        visible: false,
        milestones
      };
    });
    setLocalVisibilityState(newState);
  }, [sectionsWithMilestones]);

  // Count visible items for preview
  const visibilityStats = useMemo(() => {
    let visibleSections = 0;
    let totalSections = sectionsWithMilestones.length;
    let visibleMilestones = 0;
    let totalMilestones = 0;

    sectionsWithMilestones.forEach(section => {
      if (localVisibilityState[section.id]?.visible !== false) {
        visibleSections++;
      }
      
      section.milestones.forEach(milestone => {
        totalMilestones++;
        if (localVisibilityState[section.id]?.milestones?.[milestone.id] !== false) {
          visibleMilestones++;
        }
      });
    });

    return {
      visibleSections,
      totalSections,
      visibleMilestones,
      totalMilestones
    };
  }, [sectionsWithMilestones, localVisibilityState]);

  // Form submission handlers
  const onSubmit = useCallback((values: TimelineEditFormValues) => {
    if (!quote || !onUpdateQuote) return;
    
    console.log('💾 TimelineEditDialog saving:', {
      sectionsCount: values.sections.length,
      columnsCount: columns.length,
      hasTimelineColumn: columns.some(col => col.id === 'timeline')
    });
    
    // Convert form values to proper QuoteSection format
    const updatedSections: QuoteSection[] = values.sections.map((section, sectionIndex) => {
      const originalSection = quote.sections?.[sectionIndex];
      
      return {
        id: section.id || `section-${Date.now()}-${Math.random()}`,
        name: section.name,
        items: section.items?.map((item, itemIndex) => {
          // Preserve original customFields including timeline data
          const originalItem = originalSection?.items?.[itemIndex];
          const preservedCustomFields = originalItem?.customFields || {};
          
          return {
            id: item.id || `item-${Date.now()}-${Math.random()}`,
            description: item.description || '',
            unitPrice: item.unitPrice || 0,
            customFields: {
              ...preservedCustomFields, // Preserve existing timeline data
              ...(item.customFields || {}) // Allow new customFields to override if needed
            }
          };
        }) || []
      };
    });
    
    const updatedQuote = {
      ...quote,
      sections: updatedSections,
      columns: columns
    };
    
    console.log('💾 TimelineEditDialog final update:', {
      quoteId: quote.id,
      sectionsCount: updatedSections.length,
      columnsCount: columns.length,
      hasTimelineColumn: columns.some(col => col.id === 'timeline'),
      sampleSection: updatedSections[0] ? {
        name: updatedSections[0].name,
        itemsWithTimeline: updatedSections[0].items?.filter(item => item.customFields?.timeline).length || 0
      } : null
    });

    onUpdateQuote(quote.id, updatedQuote);
    
    toast({
      title: "Timeline Updated",
      description: "Quote structure has been updated successfully.",
    });
  }, [quote, onUpdateQuote, columns, toast]);

  const handleSave = useCallback(() => {
    // Save both quote changes and visibility state
    form.handleSubmit(onSubmit)();
    onVisibilityChange(localVisibilityState);
    onClose();
  }, [form, onSubmit, localVisibilityState, onVisibilityChange, onClose]);

  const handleCancel = useCallback(() => {
    // Reset local visibility state to original
    setLocalVisibilityState(visibilityState);
    onClose();
  }, [visibilityState, onClose]);

  // Early return if no quote
  if (!quote) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Timeline</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No quote data found for this task.</p>
            <p>Please create a quote first to manage timeline structure.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-6xl max-h-[90vh] ${stylesModule.timelineEditDialog}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            {mode === 'editOnly' ? 'Edit Quote' : 'Edit Timeline Structure'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'visibility' | 'edit')}>
          {mode === 'full' ? (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="visibility" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Visibility Controls
              </TabsTrigger>
              <TabsTrigger value="edit" className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Edit Quote
              </TabsTrigger>
            </TabsList>
          ) : (
            // Hide tab navigation in edit-only mode - show content directly
            <div className="hidden"></div>
          )}

          {/* Visibility Controls Tab - Now First (hidden in editOnly mode) */}
          {mode === 'full' && (
          <TabsContent value="visibility" className={`${stylesModule.tabsContent} ${stylesModule.visibilityTabContent}`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between mt-4">
                <div>
                  <h3 className="text-lg font-semibold">Timeline Visibility</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose which sections and milestones to display in the timeline view.
                  </p>
                </div>
                <Badge variant="outline">
                  {visibilityStats.visibleMilestones} / {visibilityStats.totalMilestones} milestones visible
                </Badge>
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllSections}
                  className="flex items-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={deselectAllSections}
                  className="flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  Deselect All
                </Button>
              </div>

              <Separator />

              {/* Sections and Milestones List */}
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {sectionsWithMilestones.map((section) => {
                    const sectionVisible = localVisibilityState[section.id]?.visible !== false;
                    const sectionCollapsed = localVisibilityState[section.id]?.collapsed || false;
                    
                    return (
                      <Card key={section.id} className={stylesModule.sectionCard}>
                        <CardContent className="p-4">
                          {/* Section Header */}
                          <div className="flex items-center gap-3 mb-3">
                            <Checkbox
                              checked={sectionVisible}
                              onCheckedChange={() => toggleSectionVisibility(section.id)}
                              id={`section-${section.id}`}
                            />
                            <button
                              type="button"
                              onClick={() => toggleSectionCollapse(section.id)}
                              className="flex items-center gap-2 flex-1 text-left"
                            >
                              {sectionCollapsed ? (
                                <ChevronRight className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                              <label
                                htmlFor={`section-${section.id}`}
                                className="font-medium cursor-pointer flex-1"
                              >
                                {section.name || 'Unnamed Section'}
                              </label>
                            </button>
                            <Badge variant="secondary">
                              {section.milestones.length} milestones
                            </Badge>
                            {sectionVisible ? (
                              <Eye className="w-4 h-4 text-green-600" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            )}
                          </div>

                          {/* Milestones List */}
                          {!sectionCollapsed && section.milestones.length > 0 && (
                            <div className="ml-6 space-y-2 border-l-2 border-gray-200 pl-4">
                              {section.milestones.map((milestone) => {
                                const milestoneVisible = localVisibilityState[section.id]?.milestones?.[milestone.id] !== false;
                                
                                return (
                                  <div key={milestone.id} className="flex items-center gap-3">
                                    <Checkbox
                                      checked={milestoneVisible && sectionVisible}
                                      onCheckedChange={() => toggleMilestoneVisibility(section.id, milestone.id)}
                                      disabled={!sectionVisible}
                                      id={`milestone-${milestone.id}`}
                                    />
                                    <label
                                      htmlFor={`milestone-${milestone.id}`}
                                      className="flex-1 text-sm cursor-pointer"
                                    >
                                      {milestone.name}
                                    </label>
                                    {milestoneVisible && sectionVisible ? (
                                      <Eye className="w-3 h-3 text-green-600" />
                                    ) : (
                                      <EyeOff className="w-3 h-3 text-gray-400" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Empty state for section with no milestones */}
                          {!sectionCollapsed && section.milestones.length === 0 && (
                            <div className="ml-6 text-sm text-muted-foreground">
                              No timeline milestones found in this section
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {sectionsWithMilestones.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="mx-auto h-12 w-12 mb-3 opacity-50" />
                      <p>No sections with timeline data found</p>
                      <p className="text-sm">Create quotes with timeline data first</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
          )}

          {/* Edit Quote Tab - Now Second */}
          <TabsContent value="edit" className={`${stylesModule.tabsContent} ${stylesModule.editTabContent}`}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <QuoteManager
                  control={form.control}
                  form={form}
                  fieldArrayName="sections"
                  columns={columns}
                  setColumns={setColumns}
                  title="" // Hide title to avoid duplication
                  quoteTemplates={[]} // No templates needed for timeline editing
                  settings={settings}
                  taskDescription={task.description || ''}
                  taskCategory=""
                  onApplySuggestion={undefined} // No AI suggestions needed
                  taskStartDate={new Date(task.startDate)}
                  taskEndDate={new Date(task.deadline)}
                />
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TimelineEditDialog;
