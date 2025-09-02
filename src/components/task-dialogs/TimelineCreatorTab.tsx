import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Task, Quote, AppSettings, Milestone, QuoteSection, QuoteItem } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { i18n } from "@/lib/i18n";
import { DndContext, DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core';
import { format, addDays, parseISO, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useDraggable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { AlertCircle, FileText, AlertTriangle, Calendar, CalendarDays, CalendarRange, ZoomOut, ZoomIn, Maximize, Minimize, ChevronDown, ChevronRight } from 'lucide-react';
import stylesModule from './TimelineCreatorTab.module.css';

// --- CORE DATE LOGIC REWRITE ---
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const getUtcTimestamp = (date: any): number => {
    if (!date) return NaN;
    
    // Handle Date objects
    if (date instanceof Date) {
        return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    }
    
    // Handle strings and numbers
    const d = new Date(date);
    if (isNaN(d.getTime())) return NaN;
    
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

const getDayNumber = (timestamp: number): number => {
    return Math.floor(timestamp / MS_PER_DAY);
};

const dateToDayNum = (date: any): number | null => {
    if (!date) return null;
    const timestamp = getUtcTimestamp(date);
    if (isNaN(timestamp)) return null;
    return getDayNumber(timestamp);
};

const dayNumToFormat = (dayNum: number | null): string => {
    if (dayNum === null) return 'Invalid Date';
    const date = new Date((dayNum * MS_PER_DAY) + (new Date().getTimezoneOffset() * 60 * 1000));
    return format(date, "dd/MM");
};
interface TimelineCreatorTabProps {
  task: Task;
  quote?: Quote;
  quotes?: Quote[]; // All quotes for intelligence sync
  settings: AppSettings;
  onUpdateTask: (updatedTask: Partial<Task> & { id: string }) => void;
  onUpdateQuote?: (quoteId: string, updates: Partial<Quote>) => void;
}
// --- COMPONENT START ---
const rowHeight = 32;
const headerHeight = 48;

export const TimelineCreatorTab: React.FC<TimelineCreatorTabProps> = ({ task, quote, quotes, settings, onUpdateTask, onUpdateQuote }) => {
  const { toast } = useToast();
  const T = i18n[settings.language] || i18n.vi;

  // Debug: Log quote structure on every render
  console.log('TimelineCreatorTab render with quote:', {
    hasQuote: !!quote,
    quoteId: quote?.id,
    sectionsCount: quote?.sections?.length || 0,
    columnsCount: quote?.columns?.length || 0,
    columns: quote?.columns?.map(c => ({ id: c.id, name: c.name })) || [],
    sampleSection: quote?.sections?.[0] ? {
      id: quote.sections[0].id,
      name: quote.sections[0].name,
      itemsCount: quote.sections[0].items?.length || 0,
      sampleItem: quote.sections[0].items?.[0]
    } : 'No sections'
  });

  // Check if timeline column exists in quote
  const hasTimelineColumn = quote?.columns?.some(col => col.id === 'timeline') || false;
  
  // Get milestones from quote timeline column instead of task.milestones
  const getMilestonesFromQuote = useCallback((): Milestone[] => {
    if (!quote?.sections || !hasTimelineColumn) {
      return [];
    }
    
    const milestones: Milestone[] = [];
    
    quote.sections.forEach((section, sectionIndex) => {
      // Ensure section has items array
      const items = section.items || [];
      
      items.forEach((item, itemIndex) => {
        let timelineValue = item.customFields?.timeline;
        
        // Handle both object and JSON string formats
        if (typeof timelineValue === 'string' && timelineValue.trim() !== '') {
          try {
            timelineValue = JSON.parse(timelineValue);
          } catch (e) {
            console.warn(`Failed to parse timeline data for section ${sectionIndex}, item ${itemIndex}:`, timelineValue);
            return;
          }
        }
        
        // Check if timeline data has required start and end dates
        if (timelineValue && 
            typeof timelineValue === 'object' && 
            timelineValue.start && 
            timelineValue.end) {
          
          // Generate consistent milestone ID using same logic as section grouping
          // Use section and item indices as fallback to ensure uniqueness
          const sectionIdForMilestone = section.id || `section-${sectionIndex}`;
          const itemIdForMilestone = item.id || `item-${itemIndex}`;
          const milestoneId = `${sectionIdForMilestone}-${itemIdForMilestone}`;
          
          // Create milestone object
          const milestone: Milestone = {
            id: milestoneId,
            name: item.description || `${section.name || 'Section'} - Item ${itemIndex + 1}`,
            startDate: timelineValue.start,
            endDate: timelineValue.end,
            color: timelineValue.color || `hsl(${(sectionIndex * 137.5 + itemIndex * 60) % 360}, 60%, 55%)`,
            content: `Section: ${section.name || 'Unnamed Section'}`
          };
          
          milestones.push(milestone);
        }
      });
    });
    
    return milestones;
  }, [quote, hasTimelineColumn]);

  // Helper function to create valid timeline data for new items
  const createValidTimelineData = (sectionIndex: number, itemIndex: number, totalItemsInSection: number) => {
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.deadline);
    const totalDays = Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24));
    const itemDuration = Math.max(1, Math.floor(totalDays / totalItemsInSection));
    
    const startOffset = itemIndex * itemDuration;
    const endOffset = Math.min(startOffset + itemDuration, totalDays);
    
    const defaultStart = addDays(taskStart, startOffset);
    const defaultEnd = addDays(taskStart, endOffset);
    
    return {
      start: defaultStart.toISOString(),
      end: defaultEnd.toISOString(),
      color: `hsl(${(sectionIndex * 137.5 + itemIndex * 60) % 360}, 60%, 55%)`
    };
  };

  const [milestonesState, setMilestonesState] = useState<Milestone[]>([]);
  const [lastSaveTime, setLastSaveTime] = useState<number>(0); // Track when we last saved to prevent overwriting
  const [dragTooltip, setDragTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });
  // Refs to throttle frequent tooltip updates during drag to avoid render churn
  const lastTooltipUpdateRef = useRef<number>(0);
  const lastTooltipContentRef = useRef<string>('');
  const dragAnimationFrameRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [timelineScale, setTimelineScale] = useState(64);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timelineContainerWidth, setTimelineContainerWidth] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Group milestones by section
  const getSectionGroups = useCallback(() => {
    if (!quote?.sections || !hasTimelineColumn) {
      return [];
    }

    const groups: Array<{
      sectionId: string;
      sectionName: string;
      sectionIndex: number;
      milestones: Milestone[];
      isCollapsed: boolean;
    }> = [];
    
    console.log(`🔍 getSectionGroups processing ${quote.sections.length} sections with ${milestonesState.length} total milestones`);
    
    quote.sections.forEach((section, sectionIndex) => {
      // Use same ID generation logic as in getMilestonesFromQuote
      const sectionId = section.id || `section-${sectionIndex}`;
      // First collect milestones for this section
      const sectionMilestonesRaw = milestonesState.filter(milestone => {
        // Check if milestone belongs to this section by checking if milestone ID starts with sectionId
        const matches = milestone.id.startsWith(`${sectionId}-`);
        return matches;
      });
      // Deduplicate by milestone.id to avoid duplicate keys/rendering
      const seenIds = new Set<string>();
      const sectionMilestones = sectionMilestonesRaw.filter(m => {
        if (seenIds.has(m.id)) {
          console.warn(`Duplicate milestone id detected in section ${sectionId}:`, m.id);
          return false;
        }
        seenIds.add(m.id);
        return true;
      });

      console.log(`  📊 Section ${sectionId} (${section.name}) has ${sectionMilestones.length} milestones`);

      if (sectionMilestones.length > 0) {
        groups.push({
          sectionId,
          sectionName: section.name || `Section ${sectionIndex + 1}`,
          sectionIndex,
          milestones: sectionMilestones,
          isCollapsed: collapsedSections.has(sectionId)
        });
      }
    });

    console.log(`🎯 getSectionGroups result: ${groups.length} groups`, 
      groups.map(g => ({ sectionId: g.sectionId, milestonesCount: g.milestones.length })));

    return groups;
  }, [quote, hasTimelineColumn, milestonesState, collapsedSections]);

  // Calculate milestone position within section groups for alignment
  const getMilestonePosition = useCallback((milestoneId: string): number => {
    let currentRowIndex = 0;
    const sectionGroups = getSectionGroups();
    
    for (const sectionGroup of sectionGroups) {
      if (!sectionGroup.isCollapsed) {
        const milestoneIndex = sectionGroup.milestones.findIndex(ms => ms.id === milestoneId);
        if (milestoneIndex !== -1) {
          return currentRowIndex + milestoneIndex;
        }
        currentRowIndex += sectionGroup.milestones.length;
      }
    }
    return 0;
  }, [getSectionGroups]);

  // Toggle section collapse
  const toggleSectionCollapse = useCallback((sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  // Initialize milestones state on first render
  useEffect(() => {
    const initialMilestones = getMilestonesFromQuote();
    setMilestonesState(initialMilestones);
  }, [quote, hasTimelineColumn]); // Use direct dependencies instead of callback

  // Ref to track timeline container for auto-scaling
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  // Remove old auto-save logic since we now save directly to quote
  // Track mount to allow saving the first change (including initial quote sync)
  const mountedRef = useRef(false);
  useEffect(() => { mountedRef.current = true; }, []);
  
  // Remove old milestone tracking refs since we save directly to quote now

  // Create timeline column and initialize timeline data
  const handleCreateTimeline = () => {
    if (!quote || !onUpdateQuote) return;
    
    // Add timeline column if not exists
    const timelineColumn = {
      id: 'timeline',
      name: 'Timeline',
      type: 'text' as const // Use 'text' type to store JSON string of date range
    };
    
    const updatedColumns = quote.columns ? [...quote.columns, timelineColumn] : [timelineColumn];
    
    // Initialize timeline data for all items
    const updatedSections = quote.sections?.map(section => ({
      ...section,
      items: section.items?.map((item, itemIndex) => {
        const taskStart = new Date(task.startDate);
        const taskEnd = new Date(task.deadline);
        const totalDays = Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24));
        const itemDuration = Math.max(1, Math.floor(totalDays / (section.items?.length || 1)));
        
        const startOffset = itemIndex * itemDuration;
        const endOffset = Math.min(startOffset + itemDuration, totalDays);
        
        const defaultStart = addDays(taskStart, startOffset);
        const defaultEnd = addDays(taskStart, endOffset);
        
        return {
          ...item,
          customFields: {
            ...item.customFields,
            timeline: JSON.stringify({ // Store as JSON string for form compatibility
              start: defaultStart.toISOString(),
              end: defaultEnd.toISOString()
            })
          }
        };
      }) || []
    })) || [];
    
    const updatedQuote = {
      ...quote,
      columns: updatedColumns,
      sections: updatedSections
    };
    
    onUpdateQuote(quote.id, updatedQuote);
    
    // Update local state
    setMilestonesState(getMilestonesFromQuote());
    
    toast({
      title: "Timeline Created",
      description: "Timeline column and data have been initialized.",
    });
  };

  // Save milestone changes to quote
  const saveMilestoneToQuote = (milestone: Milestone, newStartDate: string, newEndDate: string) => {
    if (!quote || !onUpdateQuote || !hasTimelineColumn) {
      return;
    }
    
    // Create updated quote
    const updatedQuote = JSON.parse(JSON.stringify(quote));
    let found = false;
    
    // Use the SAME logic as getMilestonesFromQuote for consistency
    updatedQuote.sections?.forEach((section: any, sectionIndex: number) => {
      section.items?.forEach((item: any, itemIndex: number) => {
        // SAME ID generation logic as getMilestonesFromQuote
        const sectionIdForMilestone = section.id || `section-${sectionIndex}`;
        const itemIdForMilestone = item.id || `item-${itemIndex}`;
        const milestoneKey = `${sectionIdForMilestone}-${itemIdForMilestone}`;
        
        if (milestoneKey === milestone.id) {
          found = true;
          
          // Initialize customFields if needed
          if (!item.customFields) {
            item.customFields = {};
          }
          
          // Store timeline data as JSON string
          const timelineData = {
            start: newStartDate,
            end: newEndDate
          };
          
          item.customFields.timeline = JSON.stringify(timelineData);
        }
      });
    });
    
    if (found) {
      // Set save timestamp to prevent useEffect from overwriting
      setLastSaveTime(Date.now());
      
      // Call the update function
      onUpdateQuote(quote.id, updatedQuote);
      
      // Update local milestone state immediately for better UX
      setMilestonesState(prevMilestones => 
        prevMilestones.map(m => 
          m.id === milestone.id 
            ? { ...m, startDate: newStartDate, endDate: newEndDate }
            : m
        )
      );
      
      toast({
        title: "Timeline Saved",
        description: `${milestone.name} timeline updated successfully.`,
      });
    }
  };

  // Define predefined colors for consistency
  const MILESTONE_COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Green  
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#64748b', // Slate
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#14b8a6', // Teal
  ];

  const getMilestoneColor = (index: number): string => {
    return MILESTONE_COLORS[index % MILESTONE_COLORS.length];
  };

  // Check sync status and quote availability
  const hasQuote = Boolean(quote);

  // Helper to produce CSS-safe class fragments from arbitrary IDs
  const cssSafe = useCallback((s: string) => String(s).replace(/[^a-zA-Z0-9_-]/g, '_'), []);
  
  // Update milestones when quote timeline data changes, but avoid overwriting user edits
  // TEMPORARILY DISABLED TO DEBUG
  /*
  useEffect(() => {
    console.log('🔄 useEffect sync called');
    if (hasTimelineColumn && quote) {
      const timeSinceLastSave = Date.now() - lastSaveTime;
      
      // Don't overwrite if we just saved within last 1 second
      if (timeSinceLastSave < 1000) {
        console.log('⏰ Skipping sync - recent save');
        return;
      }
      
      const quoteMilestones = getMilestonesFromQuote();
      console.log('🔄 useEffect sync check:', {
        quoteMilestones: quoteMilestones.length,
        currentMilestones: milestonesState.length,
        hasTimelineColumn,
        timeSinceLastSave
      });
      
      // Always update if counts are different, or if we have new data to show
      if (quoteMilestones.length !== milestonesState.length) {
        console.log('🔄 Syncing milestones from quote (count changed):', quoteMilestones);
        setMilestonesState(quoteMilestones);
      } else if (quoteMilestones.length > 0) {
        // If counts are same but > 0, check if content is actually different
        const isDifferent = quoteMilestones.some((qm, index) => {
          const current = milestonesState[index];
          return !current || 
                 qm.id !== current.id || 
                 qm.name !== current.name || 
                 qm.startDate !== current.startDate ||
                 qm.endDate !== current.endDate ||
                 qm.color !== current.color;
        });
        
        if (isDifferent) {
          console.log('🔄 Syncing milestones from quote (content changed):', quoteMilestones);
          setMilestonesState(quoteMilestones);
        } else {
          console.log('✅ Milestones are same, no sync needed');
        }
      }
    } else {
      console.log('❌ No sync - missing timeline column or quote');
    }
  }, [hasTimelineColumn, lastSaveTime, quote]); // Removed getMilestonesFromQuote to avoid infinite loop
  */

  // Debug useEffect to track milestone state changes
  // DISABLED to prevent potential infinite loops
  /*
  useEffect(() => {
    console.log('Milestones state changed:', {
      count: milestonesState.length,
      milestones: milestonesState.map(m => ({ id: m.id, name: m.name, color: m.color }))
    });
  }, [milestonesState]);
  */

  const taskStartDay = useMemo(() => dateToDayNum(task.startDate), [task.startDate]);
  const taskEndDay = useMemo(() => dateToDayNum(task.deadline), [task.deadline]);
  
  const totalTaskDays = useMemo(() => {
    if (taskStartDay === null || taskEndDay === null) return 0;
    return taskEndDay - taskStartDay + 1;
  }, [taskStartDay, taskEndDay]);

  // Timeline view mode calculations
  const getTimelineDays = useMemo(() => {
    if (taskStartDay === null || taskEndDay === null) return 30;
    
    switch (viewMode) {
      case 'day':
        return totalTaskDays;
      case 'week':
        return Math.ceil(totalTaskDays / 7) * 7; // Round up to full weeks
      case 'month':
        return Math.ceil(totalTaskDays / 30) * 30; // Round up to full months
      default:
        return totalTaskDays;
    }
  }, [totalTaskDays, viewMode, taskStartDay, taskEndDay]);

  // Auto-scale calculation with intelligent detection
  const scale = useMemo(() => {
    // Calculate auto-scale when timeline has few days
    if (timelineContainerWidth > 0 && getTimelineDays > 0) {
      // Reserve space for scrollbar and padding (about 50px)
      const availableWidth = timelineContainerWidth - 50;
      const autoScale = Math.floor(availableWidth / getTimelineDays);
      
      // Auto-scale only when:
      // 1. We have few days (less than 15 days typically benefit from auto-scale)
      // 2. Current timeline would be narrower than container
      // 3. Auto-scale provides significantly more space per day
      const shouldAutoScale = (
        getTimelineDays <= 15 && // Few days
        getTimelineDays * timelineScale < availableWidth * 0.8 && // Current timeline is narrow
        autoScale > timelineScale * 1.2 // Auto-scale provides 20% more space
      );
      
      if (shouldAutoScale) {
        // Clamp auto-scale to reasonable bounds (min 64px, max 300px per day)
        return Math.min(Math.max(autoScale, 64), 300);
      }
    }
    
    return timelineScale;
  }, [timelineScale, timelineContainerWidth, getTimelineDays]);

  const getTimelineWidth = useMemo(() => (getTimelineDays > 0 ? getTimelineDays : 30) * scale, [getTimelineDays, scale]);

  // Today marker position
  const todayMarkerPosition = useMemo(() => {
    if (taskStartDay === null) return -1;
    const today = new Date();
    const todayDayNum = dateToDayNum(today);
    if (todayDayNum === null) return -1;
    
    const offsetDays = todayDayNum - taskStartDay;
    return offsetDays * scale;
  }, [taskStartDay, scale]);

  // Timeline controls handlers
  const handleViewModeChange = (mode: 'day' | 'week' | 'month') => {
    setViewMode(mode);
    // Adjust scale based on view mode
    switch (mode) {
      case 'day':
        setTimelineScale(64);
        break;
      case 'week':
        setTimelineScale(48);
        break;
      case 'month':
        setTimelineScale(32);
        break;
    }
  };

  const handleZoomIn = () => {
    setTimelineScale(prev => Math.min(prev + 16, 128));
  };

  const handleZoomOut = () => {
    setTimelineScale(prev => Math.max(prev - 16, 16));
  };

  const handleAddMilestone = () => {
    const newMilestone: Milestone = {
      id: `ms-${Date.now()}`,
      name: T['newMilestone'] || 'New Milestone',
      content: '',
      startDate: task.startDate || new Date().toISOString(),
      endDate: task.deadline || new Date(Date.now() + MS_PER_DAY).toISOString(),
      color: primaryColor,
    };
    
    const updatedMilestones = [...milestonesState, newMilestone];
    setMilestonesState(updatedMilestones);
  };

  // Track timeline container width for auto-scaling
  useEffect(() => {
    const updateContainerWidth = () => {
      if (timelineContainerRef.current) {
        const width = timelineContainerRef.current.clientWidth;
        setTimelineContainerWidth(width);
      }
    };

    // Initial measurement
    updateContainerWidth();

    // Use ResizeObserver for accurate tracking
    const resizeObserver = new ResizeObserver(updateContainerWidth);
    if (timelineContainerRef.current) {
      resizeObserver.observe(timelineContainerRef.current);
    }

    // Fallback with window resize
    window.addEventListener('resize', updateContainerWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateContainerWidth);
      // Clean up any pending animation frame
      if (dragAnimationFrameRef.current) {
        cancelAnimationFrame(dragAnimationFrameRef.current);
      }
    };
  }, []);

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle Escape key for fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent body scroll
    } else {
      document.body.style.overflow = 'unset'; // Restore body scroll
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset'; // Cleanup
    };
  }, [isFullscreen]);

  // Remove old auto-save logic since we now save directly to quote
  // No need for debounced auto-save or unmount flush anymore

  const safeTaskClass = `timeline-dynamic-${String(task.id).replace(/[^a-z0-9_-]/gi, '_')}`;
  const primaryColor = settings.theme?.primary || '#2563eb';
  const containerRef = useRef<HTMLDivElement>(null);
  const isHoveringTimelineRef = useRef<boolean>(false);
  
  const cycleColor = useCallback((msId: string) => {
    console.log('🎨 cycleColor called with ID:', msId);
    
    const milestone = milestonesState.find(m => m.id === msId);
    if (!milestone) {
      console.warn(`❌ Milestone not found for ID: ${msId}`);
      console.log('Available milestones:', milestonesState.map(m => ({ id: m.id, name: m.name })));
      return;
    }
    
    console.log('✅ Found milestone:', { id: milestone.id, name: milestone.name, currentColor: milestone.color });
    
    // Find current color index, or start at 0 if not found
    const currentIndex = MILESTONE_COLORS.indexOf(milestone.color || '');
    const nextIndex = (currentIndex + 1) % MILESTONE_COLORS.length;
    const nextColor = MILESTONE_COLORS[nextIndex];
    
    console.log(`🔄 Cycling color for milestone ${msId}: ${milestone.color} -> ${nextColor} (index ${currentIndex} -> ${nextIndex})`);
    
    // Update milestone color in local state
    const updated = milestonesState.map(m => 
      m.id === msId ? { ...m, color: nextColor } : m
    );
    setMilestonesState(updated);
    console.log('🎯 Updated milestones state with new color');
    
    // Save color change to quote if timeline column exists
    if (hasTimelineColumn && quote && onUpdateQuote) {
      console.log(`💾 Updating quote with color ${nextColor} for milestone ${msId}`);
      
      // Find milestone in quote sections using the SAME logic as getMilestonesFromQuote
      let foundSection = false;
      const updatedSections = quote.sections?.map((section, sectionIndex) => {
        return {
          ...section,
          items: section.items?.map((item, itemIndex) => {
            // Use SAME ID generation logic as getMilestonesFromQuote
            const sectionIdForMilestone = section.id || `section-${sectionIndex}`;
            const itemIdForMilestone = item.id || `item-${itemIndex}`;
            const currentMilestoneId = `${sectionIdForMilestone}-${itemIdForMilestone}`;
            
            if (currentMilestoneId === msId) {
              foundSection = true;
              console.log(`🎯 Found matching item for milestone ${msId} at section ${sectionIndex}, item ${itemIndex}`);
              
              // Parse existing timeline data, update color, and stringify back
              let existingTimeline = {};
              if (item.customFields?.timeline) {
                try {
                  existingTimeline = typeof item.customFields.timeline === 'string' 
                    ? JSON.parse(item.customFields.timeline)
                    : item.customFields.timeline;
                } catch (e) {
                  console.warn('Failed to parse timeline data for color update');
                }
              }
              
              const updatedTimeline = {
                ...existingTimeline,
                color: nextColor
              };
              
              console.log(`📝 Updated timeline data for ${msId}:`, updatedTimeline);
              
              return {
                ...item,
                customFields: {
                  ...item.customFields,
                  timeline: JSON.stringify(updatedTimeline)
                }
              };
            }
            return item;
          }) || []
        };
      }) || [];
      
      if (foundSection) {
        console.log('💾 Saving color change to quote...');
        onUpdateQuote(quote.id, { ...quote, sections: updatedSections });
        
        toast({
          title: "Color Updated",
          description: `${milestone.name} color changed to ${nextColor}`,
        });
        console.log('✅ Color change saved successfully');
      } else {
        console.warn(`❌ Could not find matching section/item for milestone ${msId}`);
        console.log('Quote sections:', quote.sections?.map((s, i) => ({ 
          sectionIndex: i, 
          sectionId: s.id, 
          items: s.items?.map((item, j) => ({ 
            itemIndex: j, 
            itemId: item.id, 
            generatedId: `${s.id || i}-${item.id || j}` 
          })) 
        })));
        toast({
          title: "Error",
          description: `Could not save color change for ${milestone.name}`,
          variant: "destructive"
        });
      }
    } else {
      console.warn(`❌ Cannot save color: hasTimelineColumn=${hasTimelineColumn}, hasQuote=${!!quote}, hasUpdateFn=${!!onUpdateQuote}`);
    }
  }, [milestonesState, hasTimelineColumn, quote, onUpdateQuote, toast]);

  
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollEl = el.querySelector(`.${stylesModule.timelineScroller}`) as HTMLElement | null;
    const activeEl = scrollEl || el;
    const onWheel = (e: WheelEvent) => {
      if (!isHoveringTimelineRef.current) return;
      if (activeEl.scrollWidth > activeEl.clientWidth) {
        if (e.shiftKey) return;
        e.preventDefault();
        activeEl.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef]);

  const dynamicCss = useMemo(() => {
    if (taskStartDay === null) return '';
    const lines = [
      ` .${safeTaskClass} .${stylesModule.dateHeader} { min-width: ${getTimelineWidth}px; }`, 
  `.${safeTaskClass} .${stylesModule.dayCell} { width: ${scale}px; }`,
  // Synchronize grid background with dayCell width and total timeline width
  `.${safeTaskClass} .${stylesModule.timelineScroller}::before { --day-width: ${scale}px; --timeline-width: ${getTimelineWidth}px; }`
    ];
  // Tooltip positioning is applied directly to the tooltip element via inline styles
  // to avoid causing dynamicCss to depend on rapidly-changing drag state.
    
    // Add today marker position
    if (todayMarkerPosition >= 0 && todayMarkerPosition < getTimelineWidth) {
      lines.push(`.${safeTaskClass} .${stylesModule.todayMarker} { --today-position: ${todayMarkerPosition}px; }`);
    }

    // Generate CSS for milestone bars using horizontal positioning only
    // Vertical positioning handled by natural document flow to match left column
    getSectionGroups().forEach((sectionGroup) => {
      if (!sectionGroup.isCollapsed) {
        sectionGroup.milestones.forEach((ms) => {
          const msStartDay = dateToDayNum(ms.startDate);
          const msEndDay = dateToDayNum(ms.endDate);
          if (msStartDay === null || msEndDay === null) return;

          const offsetDays = msStartDay - taskStartDay;
          const durationDays = msEndDay - msStartDay + 1;
          const left = offsetDays * scale;
          const width = durationDays * scale;
          
          // Only set horizontal position and width, let vertical position flow naturally
          lines.push(`.${safeTaskClass} .milestone-bar[data-mid="${ms.id}"] { --left: ${left}px; --width: ${width}px; --ms-bg: ${ms.color || primaryColor}; }`);
          // Dynamic color for milestone color buttons in left column with higher specificity
          const milestoneColor = ms.color || primaryColor;
          const safeMsClass = `milestone-color-${cssSafe(ms.id)}`;
          lines.push(`.${safeTaskClass} .${safeMsClass} { background-color: ${milestoneColor} !important; }`);
          lines.push(`.${safeMsClass} { background-color: ${milestoneColor} !important; }`); // Fallback
        });
      }
    });

    return lines.join(' ');
  }, [milestonesState, taskStartDay, scale, getTimelineWidth, safeTaskClass, primaryColor, getSectionGroups]);
  
  const renderDateHeaders = () => {
    if (taskStartDay === null || totalTaskDays <= 0) return null;
    const days = [];
    for (let i = 0; i < totalTaskDays; i++) {
        const dayNum = taskStartDay + i;
        days.push(<div key={i} className={stylesModule.dayCell}>{dayNumToFormat(dayNum)}</div>);
    }
    return days;
  };

  const handleDragStart = useCallback(() => {
    // Show tooltip (state only toggled at start/end to avoid churn)
    setDragTooltip(p => ({ ...p, visible: true }));
    // Add visual feedback class to container
    if (containerRef.current) {
      containerRef.current.classList.add(stylesModule.dragging);
    }
  }, [containerRef]);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { active, delta } = event;
    const milestone = active.data.current?.milestone as Milestone;
    const type = active.data.current?.type as string;
    if (!milestone || taskStartDay === null) return;

    // Calculate new dates for tooltip based on drag delta
    const origStartDay = dateToDayNum(milestone.startDate)!;
    const origEndDay = dateToDayNum(milestone.endDate)!;
    const dayDelta = Math.round(delta.x / scale);

    let startDay = origStartDay;
    let endDay = origEndDay;
    
    if (type === 'move') {
      startDay += dayDelta;
      endDay += dayDelta;
    } else if (type === 'resize-start') {
      startDay += dayDelta;
    } else if (type === 'resize-end') {
      endDay += dayDelta;
    }
    
    // Apply task bounds constraints
    if (taskEndDay !== null) {
      if (startDay < taskStartDay) startDay = taskStartDay;
      if (endDay > taskEndDay) endDay = taskEndDay;
      
      // Ensure valid date range
      if (startDay >= endDay) {
        if (type === 'resize-start') startDay = endDay - 1;
        else endDay = startDay + 1;
      }
      
      // Final bounds check
      if (startDay < taskStartDay) startDay = taskStartDay;
      if (endDay > taskEndDay) endDay = taskEndDay;
    }

    // Update tooltip with new date information
    const mouseEvent = event.activatorEvent as MouseEvent;
    const duration = endDay - startDay + 1;
    const tooltipContent = `${dayNumToFormat(startDay)} → ${dayNumToFormat(endDay)} (${duration}d)`;

    // Throttle DOM updates to ~25fps and avoid React state during drag
    const now = Date.now();
    const MIN_TOOLTIP_UPDATE_MS = 40;
    if (tooltipContent === lastTooltipContentRef.current && now - lastTooltipUpdateRef.current <= MIN_TOOLTIP_UPDATE_MS) {
      return;
    }
    lastTooltipUpdateRef.current = now;
    lastTooltipContentRef.current = tooltipContent;

    const doUpdate = () => {
      // Update content without triggering React renders
      if (tooltipRef.current) {
        tooltipRef.current.textContent = tooltipContent;
      }
      // Update CSS variables on the timeline container for tooltip position
      if (timelineContainerRef.current) {
        timelineContainerRef.current.style.setProperty('--timeline-tooltip-left', `${mouseEvent.clientX + 15}px`);
        timelineContainerRef.current.style.setProperty('--timeline-tooltip-top', `${mouseEvent.clientY - 35}px`);
      }
    };
    // Use rAF to batch DOM writes smoothly
    if (dragAnimationFrameRef.current) cancelAnimationFrame(dragAnimationFrameRef.current);
    dragAnimationFrameRef.current = requestAnimationFrame(doUpdate);
  }, [taskStartDay, taskEndDay, scale]);
  
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDragTooltip({ visible: false, content: '', x: 0, y: 0 });
    
    // Clean up any pending animation frame
    if (dragAnimationFrameRef.current) {
      cancelAnimationFrame(dragAnimationFrameRef.current);
      dragAnimationFrameRef.current = null;
    }
    
    // Remove dragging class from container
    if (containerRef.current) {
      containerRef.current.classList.remove(stylesModule.dragging);
    }
    
    const { active, delta } = event;
    const dayDelta = Math.round(delta.x / scale);
    
    const milestone = active.data.current?.milestone as Milestone;
    const type = active.data.current?.type as string;

    if (milestone && taskStartDay !== null && taskEndDay !== null) {
      let startDay = dateToDayNum(milestone.startDate)!;
      let endDay = dateToDayNum(milestone.endDate)!;

      if (type === 'move') {
        startDay += dayDelta;
        endDay += dayDelta;
      } else if (type === 'resize-start') {
        startDay += dayDelta;
      } else if (type === 'resize-end') {
        endDay += dayDelta;
      }

      // Apply strict task bounds constraints
      if (type === 'move') {
        // For move operations, constrain entire milestone within task bounds
        if (startDay < taskStartDay) {
          const diff = taskStartDay - startDay;
          startDay += diff;
          endDay += diff;
        }
        if (endDay > taskEndDay) {
          const diff = endDay - taskEndDay;
          startDay -= diff;
          endDay -= diff;
        }
        // Final check after adjustment
        if (startDay < taskStartDay) {
          startDay = taskStartDay;
          endDay = Math.min(taskEndDay, startDay + (dateToDayNum(milestone.endDate)! - dateToDayNum(milestone.startDate)!));
        }
      } else {
        // For resize operations, constrain individual boundaries
        if (startDay < taskStartDay) startDay = taskStartDay;
        if (endDay > taskEndDay) endDay = taskEndDay;
      }

      // Ensure minimum duration of 1 day and valid range
      if (startDay >= endDay) {
        if (type === 'resize-start') {
          startDay = Math.max(taskStartDay, endDay - 1);
        } else {
          endDay = Math.min(taskEndDay, startDay + 1);
        }
      }

      const newStartDate = new Date(startDay * MS_PER_DAY).toISOString();
      const newEndDate = new Date(endDay * MS_PER_DAY).toISOString();

      const hasChanged = newStartDate !== milestone.startDate || newEndDate !== milestone.endDate;

      console.log('🎯 Drag end result:', {
        milestoneId: milestone.id,
        milestoneName: milestone.name,
        originalStart: milestone.startDate,
        originalEnd: milestone.endDate,
        newStartDate,
        newEndDate,
        hasChanged
      });

      if (hasChanged) {
        const updatedMilestones = milestonesState.map(m =>
          m.id === milestone.id ? { ...m, startDate: newStartDate, endDate: newEndDate } : m
        );
        setMilestonesState(updatedMilestones);
        
        console.log('🚀 Calling saveMilestoneToQuote from drag handler');
        // Save immediately to quote
        saveMilestoneToQuote(milestone, newStartDate, newEndDate);
      } else {
        console.log('❌ No changes detected, not saving');
      }

      // Enhanced drop animation
      const el = containerRef.current?.querySelector(`.milestone-bar[data-mid="${milestone.id}"]`) as HTMLElement | null;
      if (el) {
        const finalLeft = (startDay - taskStartDay) * scale;
        const finalWidth = (endDay - startDay + 1) * scale;
        const idx = Array.from(containerRef.current!.querySelectorAll('.milestone-bar')).findIndex(n => n === el);
        const finalTop = headerHeight + idx * (rowHeight + 8);

        // Enhanced drop animation
        el.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        el.style.transform = `translateX(${finalLeft}px) translateY(0px)`;
        el.style.width = `${finalWidth}px`;
        el.style.top = `${finalTop}px`;
        el.style.zIndex = '';
        el.style.boxShadow = '';
        
        // Remove drag preview class
        el.classList.remove(stylesModule.dragPreview);

        // Clean up styles after animation
        setTimeout(() => {
          if (el) {
            el.style.removeProperty('transition');
            el.style.removeProperty('transform');
            el.style.removeProperty('width');
            el.style.removeProperty('top');
            el.style.removeProperty('left');
            el.style.removeProperty('position');
            el.style.removeProperty('z-index');
            el.style.removeProperty('box-shadow');
          }
        }, 300);
      }
    }
  }, [containerRef, scale, taskStartDay, taskEndDay, milestonesState]);

// MilestoneBar component definition - moved outside main component
interface MilestoneBarProps {
  milestone: Milestone;
  taskStartDay: number | null;
  scale: number;
  safeTaskClass: string;
}

const MilestoneBar: React.FC<MilestoneBarProps> = ({ milestone, taskStartDay, scale, safeTaskClass }) => {
  const { attributes, listeners, setNodeRef, transform: moveTransform, isDragging: isMoveDragging } = useDraggable({ 
    id: `move-${milestone.id}`, 
    data: { milestone, type: 'move' } 
  });
  const { attributes: startResizeAttrs, listeners: startResizeListeners, setNodeRef: startResizeRef, transform: startResizeTransform, isDragging: isStartResizeDragging } = useDraggable({ 
    id: `resize-start-${milestone.id}`, 
    data: { milestone, type: 'resize-start' } 
  });
  const { attributes: endResizeAttrs, listeners: endResizeListeners, setNodeRef: endResizeRef, transform: endResizeTransform, isDragging: isEndResizeDragging } = useDraggable({ 
    id: `resize-end-${milestone.id}`, 
    data: { milestone, type: 'resize-end' } 
  });
  const isDragging = isMoveDragging || isStartResizeDragging || isEndResizeDragging;

  // Only apply transforms during drag - let CSS handle normal positioning
  let transformX = 0;
  let dragWidth = '';
  
  if (isDragging) {
    // Calculate base position for drag transforms
    const msStartDay = dateToDayNum(milestone.startDate);
    const msEndDay = dateToDayNum(milestone.endDate);
    
    if (taskStartDay !== null && msStartDay !== null && msEndDay !== null) {
      const offsetDays = msStartDay - taskStartDay;
      const durationDays = msEndDay - msStartDay + 1;
      let baseWidth = durationDays * scale;

      // Apply drag transforms
      if (isMoveDragging && moveTransform) {
        transformX = moveTransform.x;
      }
      if (isStartResizeDragging && startResizeTransform) {
        transformX = startResizeTransform.x;
        baseWidth = Math.max(scale * 0.5, baseWidth - startResizeTransform.x);
      }
      if (isEndResizeDragging && endResizeTransform) {
        baseWidth = Math.max(scale * 0.5, baseWidth + endResizeTransform.x);
      }

      dragWidth = `${baseWidth}px`;
    }
  }

  // Generate unique, CSS-safe class name for this milestone during drag
  const safeId = String(milestone.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const dragClass = isDragging ? `milestone-drag-${safeId}` : '';

  // Generate dynamic CSS for drag state
  const dragCss = isDragging ? `
    .${safeTaskClass} .milestone-drag-${safeId} {
      transform: translateX(${transformX}px) !important;
      width: ${dragWidth} !important;
      opacity: 0.7 !important;
      z-index: 100 !important;
      transition: none !important;
    }
  ` : '';

  return (
    <div className={stylesModule.milestoneRow}>
      {isDragging && <style>{dragCss}</style>}
      <div 
        ref={setNodeRef} 
  className={`milestone-bar ${stylesModule.milestoneBar} ${dragClass} ${isDragging ? 'isDragging' : ''}`} 
        data-mid={milestone.id} 
        {...attributes} 
        {...listeners}
      >
        <div className={stylesModule.milestoneName}>{milestone.name}</div>
        <button 
          ref={startResizeRef} 
          {...startResizeAttrs} 
          {...startResizeListeners} 
          className={`${stylesModule['resize-handle-left']} ${stylesModule.resizeHandle}`} 
          onMouseDown={e => e.stopPropagation()} 
          title="Resize start" 
        />
        <button 
          ref={endResizeRef} 
          {...endResizeAttrs} 
          {...endResizeListeners} 
          className={`${stylesModule['resize-handle-right']} ${stylesModule.resizeHandle}`} 
          onMouseDown={e => e.stopPropagation()} 
          title="Resize end" 
        />
      </div>
    </div>
  );
};

// Return JSX for the main component
  return (
    <div className={`${stylesModule.timelineContainer} ${isFullscreen ? stylesModule.fullscreen : ''}`}>
      
      {/* Timeline Controls - Fixed at top */}
      <div className={stylesModule.timelineHeader}>
        <div className={stylesModule.simpleHeader}>
          <button
            onClick={handleToggleFullscreen}
            className={stylesModule.fullscreenBtn}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
        
        <div className={stylesModule.viewModeGroup}>
          <button
            onClick={() => handleViewModeChange('day')}
            className={`${stylesModule.toolbarBtn} ${viewMode === 'day' ? stylesModule.active : ''}`}
            title="Day View"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleViewModeChange('week')}
            className={`${stylesModule.toolbarBtn} ${viewMode === 'week' ? stylesModule.active : ''}`}
            title="Week View"
          >
            <CalendarDays className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleViewModeChange('month')}
            className={`${stylesModule.toolbarBtn} ${viewMode === 'month' ? stylesModule.active : ''}`}
            title="Month View"
          >
            <CalendarRange className="w-4 h-4" />
          </button>
        </div>
        
        <div className={stylesModule.zoomControls}>
          <button
            onClick={handleZoomOut}
            className={stylesModule.toolbarBtn}
            disabled={timelineScale <= 16}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomIn}
            className={stylesModule.toolbarBtn}
            disabled={timelineScale >= 128}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Shared scroll container for both columns */}
      <div ref={timelineContainerRef} className={stylesModule.timelineContent}>
        <style>{dynamicCss}</style>
        <div
          id="timeline-tooltip"
          className={`${stylesModule.tooltip} ${dragTooltip.visible ? stylesModule.tooltipVisible : stylesModule.tooltipHidden}`}
          ref={tooltipRef}
        >
          {dragTooltip.content}
        </div>
        
        <div className={stylesModule.twoColumnLayout}>
          {/* Column 1: Milestone List */}
          <div className={stylesModule.leftColumn}>
            {/* Status Messages */}
            {!hasTimelineColumn && hasQuote && (
              <div className={stylesModule.statusMessage}>
                <div className={stylesModule.createTimelineMessage}>
                  <Calendar className="w-4 h-4 inline mr-1" />
                  <span>No timeline data found</span>
                  <button
                    onClick={handleCreateTimeline}
                    className={stylesModule.createTimelineBtn}
                  >
                    Create Timeline
                  </button>
                </div>
              </div>
            )}
            
            {hasQuote && !quote && (
              <div className={stylesModule.statusMessage}>
                <div className={stylesModule.noQuoteMessage}>
                  <FileText className="w-4 h-4 inline mr-1" />
                  Quote data loading...
                </div>
              </div>
            )}
            
            <div className={stylesModule.milestoneList}>
              {getSectionGroups().map((sectionGroup) => (
                <div key={`section-${sectionGroup.sectionId}`} className={stylesModule.sectionGroup}>
                  {/* Section Header */}
                  <div 
                    className={stylesModule.sectionHeader}
                    onClick={() => toggleSectionCollapse(sectionGroup.sectionId)}
                  >
                    <button className={stylesModule.expandBtn}>
                      {sectionGroup.isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <span className={stylesModule.sectionName}>{sectionGroup.sectionName}</span>
                    <span className={stylesModule.milestoneCount}>({sectionGroup.milestones.length})</span>
                  </div>
                  
                  {/* Section Milestones - Only show if not collapsed */}
                  {!sectionGroup.isCollapsed && (
                    <div className={stylesModule.sectionMilestones}>
                      {sectionGroup.milestones.map((ms, index) => (
                        <div 
                          key={`milestone-${ms.id}-${index}`} 
                          className={`${stylesModule.milestoneItem} milestone-item-${ms.id}`}
                        >
                          <div className={stylesModule.milestoneInfo}>
                            <div className={stylesModule.milestoneName}>{ms.name}</div>
                            <div className={stylesModule.milestoneDates}>
                              {dayNumToFormat(dateToDayNum(ms.startDate))} → {dayNumToFormat(dateToDayNum(ms.endDate))}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              console.log('🖱️ Color button clicked for milestone:', ms.id);
                              cycleColor(ms.id);
                            }}
                            onMouseDown={(e) => {
                              console.log('🖱️ Color button mouse down for milestone:', ms.id);
                              e.stopPropagation();
                            }}
                            className={`${stylesModule.colorBtn} milestone-color-${cssSafe(ms.id)}`}
                            title="Click to change color"
                          >
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Timeline Area */}
          <div className={stylesModule.rightColumn}>
            <DndContext onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
              <div id="printable-timeline-container" ref={containerRef} className={safeTaskClass}>
                <div className={stylesModule.milestoneContainer}>
                  <div className={stylesModule.timelineArea}>
                    <div className={stylesModule.timelineScroller} onMouseEnter={() => isHoveringTimelineRef.current = true} onMouseLeave={() => isHoveringTimelineRef.current = false}>
                      {/* Today marker */}
                      {todayMarkerPosition >= 0 && todayMarkerPosition < getTimelineWidth && (
                        <div 
                          className={stylesModule.todayMarker}
                          title="Today"
                        />
                      )}
                      <div className={stylesModule.dateHeader}>{renderDateHeaders()}</div>
                      <div>
                        {/* Check if we have any section groups */}
                        {getSectionGroups().length === 0 && hasTimelineColumn && (
                          <div className={stylesModule.noMilestonesMessage}>
                            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No timeline milestones found</p>
                            <p>Add timeline data to your quote items to see them here</p>
                          </div>
                        )}
                        
                        {/* Milestone bars with section alignment */}
                        <div className={stylesModule.milestoneBarsContainer}>
                          {getSectionGroups().map((sectionGroup) => (
                            <div key={`timeline-section-${sectionGroup.sectionId}`}>
                              {/* Section header spacer to align with left column */}
                              <div className={stylesModule.timelineSectionSpacer}></div>
                              
                              {/* Milestone bars for this section */}
                              {!sectionGroup.isCollapsed && sectionGroup.milestones.map((milestone) => (
                                <MilestoneBar 
                                  key={`milestone-bar-${milestone.id}`} 
                                  milestone={milestone} 
                                  taskStartDay={taskStartDay}
                                  scale={scale}
                                  safeTaskClass={safeTaskClass}
                                />
                              ))}
                              {/* Section bottom gap to match left column's sectionGroup margin */}
                              <div className={stylesModule.timelineSectionBottomSpacer} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineCreatorTab;