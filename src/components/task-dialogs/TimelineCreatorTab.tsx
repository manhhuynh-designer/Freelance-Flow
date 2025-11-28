import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Task, Quote, AppSettings, Milestone, QuoteSection, QuoteItem, Client, Category } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { i18n } from "@/lib/i18n";
import { DndContext, DragEndEvent, DragMoveEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { format, addDays, parseISO, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useDraggable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { FileText, AlertTriangle, Calendar, Maximize, Minimize, ChevronDown, ChevronRight, Edit3, Image } from 'lucide-react';
import stylesModule from './TimelineCreatorTab.module.css';
import TimelineEditDialog from './TimelineEditDialog';
import exportTimelineToClipboard from '@/lib/exports/exportTimelineToClipboard';

// Silence verbose console.log calls for this component while preserving console.warn/error
// (This avoids editing many scattered debug lines but keeps warnings/errors visible.)
if (typeof window !== 'undefined') {
  const _origConsoleLog = console.log.bind(console);
  console.log = (..._args: any[]) => { /* no-op */ };
}

// --- CORE DATE LOGIC REWRITE ---
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const getUtcTimestamp = (date: any): number => {
    if (!date) return NaN;
    
    // Handle Date objects
    if (date instanceof Date) {
        return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    }
    
    // Handle strings and numbers
    let dateInput = date;
    // If it looks like 'YYYY-MM-DD', treat it as UTC to avoid timezone bugs.
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        dateInput = `${date}T00:00:00.000Z`;
    }
    const d = new Date(dateInput);
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
    const date = new Date(dayNum * MS_PER_DAY);
    // Create a new Date object using the UTC components of the original date.
    // This effectively displays the UTC date correctly regardless of the user's local timezone.
    const displayDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return format(displayDate, "dd/MM");
};

// Inclusive duration between two day numbers (both ends included)
const inclusiveDuration = (start: number, end: number) => (end - start + 1);

// Milestone Date Editor Component - similar to TimelineEditor in quote-section-improved.tsx
const MilestoneDateEditor = ({ 
  milestone, 
  taskStartDate, 
  taskEndDate, 
  onUpdateMilestone,
  isUpdating: externalIsUpdating = false
}: {
  milestone: Milestone;
  taskStartDate?: Date;
  taskEndDate?: Date;
  onUpdateMilestone: (milestoneId: string, newStartDate: string, newEndDate: string) => void;
  isUpdating?: boolean;
}) => {
  const [isUpdating, setIsUpdating] = React.useState(false);
  const updateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Use external updating state if provided, otherwise use internal state
  const isCurrentlyUpdating = externalIsUpdating || isUpdating;
  
  const startDate = new Date(milestone.startDate);
  const endDate = new Date(milestone.endDate);

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  const updateDate = (isStart: boolean, newDate: Date) => {
    // Clamp within task range if provided
    if (taskStartDate && newDate < taskStartDate) newDate = taskStartDate;
    if (taskEndDate && newDate > taskEndDate) newDate = taskEndDate;
    
    const newStartDate = isStart ? newDate.toISOString().slice(0, 10) : (typeof milestone.startDate === 'string' ? milestone.startDate : milestone.startDate.toISOString().slice(0, 10));
    const newEndDate = isStart ? (typeof milestone.endDate === 'string' ? milestone.endDate : milestone.endDate.toISOString().slice(0, 10)) : newDate.toISOString().slice(0, 10);
    
    // Enhanced debounce with longer delay to prevent conflicts during rapid drag
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    setIsUpdating(true);
    updateTimeoutRef.current = setTimeout(() => {
      try {
        onUpdateMilestone(milestone.id, newStartDate, newEndDate);
      } catch (error) {
        console.error('Error updating milestone date:', error);
      } finally {
        setIsUpdating(false);
      }
    }, 300); // Increased to 300ms debounce for better stability
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const DraggableDate = ({ date, isStart }: { date: Date; isStart: boolean }) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const dragStartRef = React.useRef({ x: 0, initialDate: date.getTime() });
    const lastUpdateRef = React.useRef<number>(0);

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent DndContext from interfering
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, initialDate: date.getTime() };
      lastUpdateRef.current = Date.now();
      
      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent DndContext interference
        
        const now = Date.now();
        // Enhanced throttle to max 5 times per second to prevent conflicts and improve performance
        if (now - lastUpdateRef.current < 200) {
          return;
        }
        lastUpdateRef.current = now;
        
        const deltaX = e.clientX - dragStartRef.current.x;
        const daysDelta = Math.round(deltaX / 10); // 10px per day
        
        if (Math.abs(daysDelta) >= 1) {
          const newTime = dragStartRef.current.initialDate + (daysDelta * 24 * 60 * 60 * 1000);
          const newDate = new Date(newTime);
          
          updateDate(isStart, newDate);
          
          // Update reference point for smooth dragging
          dragStartRef.current.x = e.clientX;
          dragStartRef.current.initialDate = newTime;
        }
      };

      const handleMouseUp = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent DndContext interference
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    return (
      <span
        className={`text-xs cursor-ew-resize select-none px-1 py-0.5 rounded transition-colors ${
          isDragging ? 'bg-blue-100 cursor-grabbing' : 'hover:bg-gray-100'
        }`}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation(); // Prevent any unwanted clicks from propagating
        }}
        title={`Kéo trái/phải để thay đổi ${isStart ? 'ngày bắt đầu' : 'ngày kết thúc'}`}
      >
        {formatDate(date)}
      </span>
    );
  };

  return (
    <div 
      className={`flex gap-1 items-center text-xs milestone-date-editor ${isCurrentlyUpdating ? 'opacity-50' : ''}`}
      data-no-drag="true" // Mark this as non-draggable for DndContext
      onMouseDown={(e) => e.stopPropagation()} // Prevent DndContext from capturing
      onClick={(e) => e.stopPropagation()} // Prevent unwanted clicks
    >
      <DraggableDate date={startDate} isStart={true} />
      <span className="text-[10px] text-gray-400">→</span>
      <DraggableDate date={endDate} isStart={false} />
      {isCurrentlyUpdating && <span className="text-[8px] text-blue-500 ml-1">💾</span>}
    </div>
  );
};

interface TimelineCreatorTabProps {
  task: Task;
  quote?: Quote;
  quotes?: Quote[]; // All quotes for intelligence sync
  settings: AppSettings;
  clients?: Client[];
  categories?: Category[];
  onUpdateTask: (updatedTask: Partial<Task> & { id: string }) => void;
  onUpdateQuote?: (quoteId: string, updates: Partial<Quote>) => void;
}

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
// --- COMPONENT START ---
const rowHeight = 32;
const headerHeight = 48;

export const TimelineCreatorTab: React.FC<TimelineCreatorTabProps> = ({ 
  task, 
  quote, 
  quotes, 
  settings, 
  clients = [], 
  categories = [], 
  onUpdateTask, 
  onUpdateQuote 
}) => {
  const { toast } = useToast();
  const T = i18n[settings.language] || i18n.vi;
  
  // Configure DndKit sensors to track mouse beyond container bounds
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 0, // Start drag immediately
      },
    })
  );

  // Debug: reduce per-render logging of quote structure

  // Check if timeline column exists in quote
  const hasTimelineColumn = quote?.columns?.some(col => col.id === 'timeline') || false;
  const hasQuote = !!quote;

  // Auto-repair guard: if a quote ends up with ONLY the timeline column, re-add defaults once
  const repairGuardRef = useRef<{ [quoteId: string]: boolean }>({});
  useEffect(() => {
    if (!quote || !onUpdateQuote) return;
    const cols = Array.isArray(quote.columns) ? quote.columns : [];
    if (cols.length === 1 && cols[0]?.id === 'timeline' && !repairGuardRef.current[quote.id]) {
      console.warn('🛠 Auto-repair: only timeline column detected → restoring defaults');
      const repaired = [
        { id: 'description', name: T.description, type: 'text' as const },
        { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number' as const, calculation: { type: 'sum' as const } },
        ...cols
      ];
      const seen = new Set<string>();
      const deduped = repaired.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
      onUpdateQuote(quote.id, { columns: deduped });
      repairGuardRef.current[quote.id] = true;
      toast({ title: 'Columns Repaired', description: 'Restored default columns alongside Timeline.' });
    }
  }, [quote?.id, quote?.columns, onUpdateQuote, T.description, T.unitPrice, settings.currency, toast]);
  
  // Debug timeline column status
  // console.log('🔍 Timeline column check:', {
  //   hasQuote: !!quote,
  //   hasTimelineColumn,
  //   hasOnUpdateQuote: !!onUpdateQuote,
  //   columns: quote?.columns?.map(c => c.id) || [],
  //   shouldShowCreateBtn: !hasTimelineColumn && !!quote && !!onUpdateQuote
  // });
  
  // Get milestones from quote timeline column instead of task.milestones
  const getMilestonesFromQuote = useCallback((): Milestone[] => {
    // console.log('🔍 getMilestonesFromQuote called:', {
    //   hasQuote: !!quote,
    //   sectionsCount: quote?.sections?.length || 0,
    //   hasTimelineColumn,
    //   columnsCount: quote?.columns?.length || 0,
    //   timelineColumn: quote?.columns?.find(col => col.id === 'timeline')
    // });
    
    if (!quote?.sections || !hasTimelineColumn) {
      // console.log('❌ Early return from getMilestonesFromQuote:', {
      //   hasQuoteSections: !!quote?.sections,
      //   hasTimelineColumn
      // });
      return [];
    }
    
    const milestones: Milestone[] = [];
    
    quote.sections.forEach((section, sectionIndex) => {
      // Ensure section has items array
      const items = section.items || [];
      // console.log(`📋 Processing section ${sectionIndex}:`, {
      //   sectionName: section.name,
      //   itemsCount: items.length,
      //   sectionId: section.id
      // });
      
      items.forEach((item, itemIndex) => {
        let timelineValue = item.customFields?.timeline;
        // console.log(`📝 Processing item ${itemIndex} in section ${sectionIndex}:`, {
        //   itemDescription: item.description,
        //   hasCustomFields: !!item.customFields,
        //   timelineValue,
        //   timelineValueType: typeof timelineValue
        // });
        
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
            timelineValue !== null &&
            timelineValue.start && 
            timelineValue.end) {
          
          // console.log(`✅ Valid timeline data found for section ${sectionIndex}, item ${itemIndex}:`, timelineValue);
          
          // Generate consistent milestone ID using same logic as section grouping
          // Use section and item indices as fallback to ensure uniqueness
          const sectionIdForMilestone = section.id || `section-${sectionIndex}`;
          const itemIdForMilestone = item.id || `item-${itemIndex}`;
          const milestoneId = `${sectionIdForMilestone}-${itemIdForMilestone}`;
          
          // TypeScript knows timelineValue is not null here due to the checks above
          const timelineData = timelineValue as { start: string; end: string; color?: string };
          
          // Create milestone object
          const milestone: Milestone = {
            id: milestoneId,
            name: item.description || `${section.name || 'Section'} - Item ${itemIndex + 1}`,
            startDate: timelineData.start,
            endDate: timelineData.end,
            color: timelineData.color || `hsl(${(sectionIndex * 137.5 + itemIndex * 60) % 360}, 60%, 55%)`,
            content: `Section: ${section.name || 'Unnamed Section'}`
          };
          // debug removed
          milestones.push(milestone);
        } else {
          // console.log(`❌ Invalid timeline data for section ${sectionIndex}, item ${itemIndex}:`, {
          //   timelineValue,
          //   hasTimelineValue: !!timelineValue,
          //   isObject: typeof timelineValue === 'object',
          //   hasStart: timelineValue?.start,
          //   hasEnd: timelineValue?.end
          // });
        }
      });
    });
    
    // console.log(`🎯 getMilestonesFromQuote result: ${milestones.length} milestones found`, milestones);
    return milestones;
  }, [quote, hasTimelineColumn]);

  // Helper function to create valid timeline data for new items
  const createValidTimelineData = (sectionIndex: number, itemIndex: number, totalItemsInSection: number) => {
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.deadline);
    const totalDays = Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24));
    const itemDuration = Math.max(1, Math.floor(totalDays / totalItemsInSection));
    
    const startOffset = itemIndex * itemDuration;
    let endOffset = Math.min(startOffset + itemDuration, totalDays);
    
    // For the last item in section, extend to task deadline to ensure full coverage
    if (itemIndex === totalItemsInSection - 1) {
      endOffset = totalDays;
    }
    
    const defaultStart = addDays(taskStart, startOffset);
    const defaultEnd = addDays(taskStart, endOffset);
    
    // console.log('📅 Creating timeline data:', {
    //   sectionIndex,
    //   itemIndex,
    //   totalItemsInSection,
    //   totalDays,
    //   itemDuration,
    //   startOffset,
    //   endOffset,
    //   isLastItem: itemIndex === totalItemsInSection - 1,
    //   defaultStart: defaultStart.toISOString().slice(0, 10),
    //   defaultEnd: defaultEnd.toISOString().slice(0, 10)
    // });
    
    return {
      start: defaultStart.toISOString(),
      end: defaultEnd.toISOString(),
      color: `hsl(${(sectionIndex * 137.5 + itemIndex * 60) % 360}, 60%, 55%)`
    };
  };

  const [milestonesState, setMilestonesState] = useState<Milestone[]>([]);
  const [lastSaveTime, setLastSaveTime] = useState<number>(0); // Track when we last saved to prevent overwriting
  const [isUpdatingMilestone, setIsUpdatingMilestone] = useState<Set<string>>(new Set()); // Track which milestones are being updated
  const [dragTooltip, setDragTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });
  // Refs to throttle frequent tooltip updates during drag to avoid render churn
  const lastTooltipUpdateRef = useRef<number>(0);
  const lastTooltipContentRef = useRef<string>('');
  const dragAnimationFrameRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  // Single day-based view (removed week/month modes)
  // Fixed scale - 50px per day (matching timeline-viewer-new.tsx)
  const FIXED_DAY_WIDTH = 50;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timelineContainerWidth, setTimelineContainerWidth] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [visibilityState, setVisibilityState] = useState<SectionVisibilityState>({});

  // Group milestones by section with visibility filtering
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
    
    // console.log(`🔍 getSectionGroups processing ${quote.sections.length} sections with ${milestonesState.length} total milestones`);
    
    quote.sections.forEach((section, sectionIndex) => {
      // Check section visibility
      const sectionId = section.id || `section-${sectionIndex}`;
      const sectionVisible = visibilityState[sectionId]?.visible !== false;
      
      if (!sectionVisible) {
        // console.log(`🚫 Section ${sectionId} is hidden, skipping`);
        return; // Skip hidden sections
      }
      
      // First collect milestones for this section
      const sectionMilestonesRaw = milestonesState.filter(milestone => {
        // Check if milestone belongs to this section by checking if milestone ID starts with sectionId
        const matches = milestone.id.startsWith(`${sectionId}-`);
        return matches;
      });
      
      // Filter milestones by visibility
      const visibleMilestones = sectionMilestonesRaw.filter(milestone => {
        const milestoneVisible = visibilityState[sectionId]?.milestones?.[milestone.id] !== false;
        return milestoneVisible;
      });
      
      // Deduplicate by milestone.id to avoid duplicate keys/rendering
      const seenIds = new Set<string>();
      const sectionMilestones = visibleMilestones.filter(m => {
        if (seenIds.has(m.id)) {
          console.warn(`Duplicate milestone id detected in section ${sectionId}:`, m.id);
          return false;
        }
        seenIds.add(m.id);
        return true;
      });

      // console.log(`  📊 Section ${sectionId} (${section.name}) has ${sectionMilestones.length} visible milestones (${sectionMilestonesRaw.length} total)`);

      // Only add section if it has visible milestones or is not filtered
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

    // console.log(`🎯 getSectionGroups result: ${groups.length} visible groups`, 
    //   groups.map(g => ({ sectionId: g.sectionId, milestonesCount: g.milestones.length })));

    return groups;
  }, [quote, hasTimelineColumn, milestonesState, collapsedSections, visibilityState]);

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

  // Consolidated milestone sync effect - only update when quote structure actually changes
  // and not during active updates to prevent overwriting user changes
  const quoteSectionsRef = useRef<string>('');
  useEffect(() => {
    // Skip if we're in the middle of updating milestones to prevent overwriting
    if (isUpdatingMilestone.size > 0) {
      return; // skip while updating
    }

    // Skip sync for 2 seconds after save to prevent feedback loop
    const timeSinceLastSave = Date.now() - lastSaveTime;
    if (lastSaveTime > 0 && timeSinceLastSave < 2000) {
      return; // recently saved guard
    }

    // Only sync if timeline column exists
    if (!hasTimelineColumn) {
      setMilestonesState([]);
      return;
    }

    // Check if quote sections actually changed using deep comparison
    const currentSections = JSON.stringify(quote?.sections || []);
    if (quoteSectionsRef.current === currentSections) {
      return; // no structural change
    }
    quoteSectionsRef.current = currentSections;

    const syncedMilestones = getMilestonesFromQuote();
    setMilestonesState(syncedMilestones);
  }, [quote?.id, hasTimelineColumn, getMilestonesFromQuote, isUpdatingMilestone, lastSaveTime]);

  // Ref to track timeline container for auto-scaling
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const timelineScrollerRef = useRef<HTMLDivElement>(null);
  // Remove old auto-save logic since we now save directly to quote
  // Track mount to allow saving the first change (including initial quote sync)
  const mountedRef = useRef(false);
  useEffect(() => { mountedRef.current = true; }, []);
  
  // Remove old milestone tracking refs since we save directly to quote now

  // Create timeline column and initialize timeline data
  const handleCreateTimeline = () => {
    // console.log('🚀 handleCreateTimeline called', { 
    //   quote: !!quote, 
    //   onUpdateQuote: !!onUpdateQuote,
    //   quoteId: quote?.id,
    //   hasQuoteColumns: !!quote?.columns,
    //   hasTimelineColumn: quote?.columns?.some(col => col.id === 'timeline')
    // });
    
    if (!quote) {
      console.error('❌ Cannot create timeline: missing quote');
      toast({
        title: "Error",
        description: "Cannot create timeline: No quote data available. Please create or select a quote first.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if timeline column already exists
    if (quote.columns?.some(col => col.id === 'timeline')) {
      // Repair case: if only timeline exists (previous bug), seed defaults and keep timeline
      if ((quote.columns?.length || 0) === 1 && quote.columns?.[0]?.id === 'timeline') {
        console.warn('🛠 Repairing quote columns: only timeline present → seeding defaults');

        const repairedColumns = [
          { id: 'description', name: T.description, type: 'text' as const },
          { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number' as const, calculation: { type: 'sum' as const } },
          ...quote.columns
        ];

        onUpdateQuote?.(quote.id, { columns: repairedColumns });
        toast({ title: 'Columns Repaired', description: 'Restored default columns alongside Timeline.' });
      } else {
        console.warn('⚠️ Timeline column already exists, aborting create');
        toast({
          title: "Timeline Already Exists",
          description: "Timeline column already exists in this quote.",
          variant: "default"
        });
      }
      return;
    }
    
    if (!onUpdateQuote) {
      console.error('❌ Cannot create timeline: missing onUpdateQuote function');
      toast({
        title: "Error",
        description: "Cannot create timeline: Update function not available. This feature requires quote editing permissions.",
        variant: "destructive"
      });
      return;
    }
    
    // console.log('📊 Current quote structure:', {
    //   id: quote.id,
    //   columnsCount: quote.columns?.length || 0,
    //   sectionsCount: quote.sections?.length || 0,
    //   hasTimelineColumn: quote.columns?.some(col => col.id === 'timeline')
    // });
    
    // Add timeline column if not exists
    const timelineColumn = {
      id: 'timeline',
      name: 'Timeline',
      type: 'text' as const // Use 'text' type to store JSON string of date range
    };

    // Preserve columns; if none exist, seed with app defaults (description + unitPrice)
    const hasExistingColumns = Array.isArray(quote.columns) && (quote.columns?.length || 0) > 0;
    const seededColumns = hasExistingColumns
      ? [...(quote.columns as any[])]
      : [
          { id: 'description', name: T.description, type: 'text' as const },
          { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number' as const, calculation: { type: 'sum' as const } },
        ];

    // If current columns are only timeline, prepend defaults again (defensive)
    const nonTimelineCount = (seededColumns || []).filter(c => c.id !== 'timeline').length;
    let safeSeeded = seededColumns;
    if (nonTimelineCount === 0) {
      safeSeeded = [
        { id: 'description', name: T.description, type: 'text' as const },
        { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number' as const, calculation: { type: 'sum' as const } },
        ...seededColumns
      ];
    }

    // Avoid duplicates just in case
    const hasTimeline = safeSeeded.some(c => c.id === 'timeline');
    let updatedColumns = hasTimeline ? safeSeeded : [...safeSeeded, timelineColumn];
    // Ensure defaults and de-duplicate by id
    const withDefaults = [
      { id: 'description', name: T.description, type: 'text' as const },
      { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number' as const, calculation: { type: 'sum' as const } },
      ...updatedColumns
    ];
    const seen = new Set<string>();
    updatedColumns = withDefaults.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });

    // console.log('📊 Column update preparation:', {
    //   hadExistingColumns: hasExistingColumns,
    //   existingColumnsCount: quote.columns?.length || 0,
    //   seededColumnsCount: seededColumns.length,
    //   seededColumns: seededColumns.map(c => ({ id: c.id, name: c.name })),
    //   addingTimelineColumn: { id: timelineColumn.id, name: timelineColumn.name },
    //   updatedColumnsCount: updatedColumns.length,
    //   updatedColumns: updatedColumns.map(c => ({ id: c.id, name: c.name }))
    // });
    
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
    
    // console.log('💾 Calling onUpdateQuote with:', {
    //   quoteId: quote.id,
    //   originalColumnsCount: quote.columns?.length || 0,
    //   originalColumns: quote.columns?.map(c => ({ id: c.id, name: c.name })) || [],
    //   newColumnsCount: updatedColumns.length,
    //   newColumns: updatedColumns.map(c => ({ id: c.id, name: c.name })),
    //   newSectionsCount: updatedSections.length
    // });
    
    try {
      // Chỉ cập nhật columns và sections, giữ nguyên các thuộc tính khác của quote
      // onUpdateQuote sẽ merge partial update vào quote hiện tại
      onUpdateQuote(quote.id, {
        columns: updatedColumns,
        sections: updatedSections
      });
      
      // Calculate milestones from the updated quote immediately
      const newMilestones: Milestone[] = [];
      updatedSections.forEach((section, sectionIndex) => {
        const items = section.items || [];
        items.forEach((item, itemIndex) => {
          let timelineValue = item.customFields?.timeline;
          
          // Parse timeline data if it's a string
          if (typeof timelineValue === 'string' && timelineValue.trim() !== '') {
            try {
              timelineValue = JSON.parse(timelineValue);
            } catch (e) {
              console.warn(`Failed to parse timeline data:`, timelineValue);
              return;
            }
          }
          
          // Create milestone if valid timeline data
          if (timelineValue && 
              typeof timelineValue === 'object' && 
              timelineValue !== null) {
            
            const timelineData = timelineValue as any;
            if (timelineData.start && timelineData.end) {
            
            const sectionIdForMilestone = section.id || `section-${sectionIndex}`;
            const itemIdForMilestone = item.id || `item-${itemIndex}`;
            const milestoneId = `${sectionIdForMilestone}-${itemIdForMilestone}`;
            
            // TypeScript knows timelineValue is not null here due to the checks above
            const timelineData = timelineValue as { start: string; end: string; color?: string };
            
            const milestone: Milestone = {
              id: milestoneId,
              name: item.description || `${section.name || 'Section'} - Item ${itemIndex + 1}`,
              startDate: timelineData.start,
              endDate: timelineData.end,
              color: timelineData.color || `hsl(${(sectionIndex * 137.5 + itemIndex * 60) % 360}, 60%, 55%)`,
              content: `Section: ${section.name || 'Unnamed Section'}`
            };
            
            newMilestones.push(milestone);
            }
          }
        });
      });
      
      // console.log('🔄 Immediately setting new milestones after create:', newMilestones.length);
      setMilestonesState(newMilestones);
      
      toast({
        title: "Timeline Created",
        description: `Timeline created with ${newMilestones.length} milestones.`,
      });
    } catch (error) {
      console.error('❌ Error calling onUpdateQuote:', error);
      toast({
        title: "Error",
        description: "Failed to create timeline. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Save milestone changes to quote
  const saveMilestoneToQuote = useCallback((milestone: Milestone, newStartDate: string, newEndDate: string) => {
    if (!quote || !onUpdateQuote || !hasTimelineColumn) {
      console.warn('Cannot save milestone: missing dependencies', {
        hasQuote: !!quote,
        hasOnUpdateQuote: !!onUpdateQuote,
        hasTimelineColumn
      });
      return;
    }
    
    // Prevent concurrent updates of the same milestone
    if (isUpdatingMilestone.has(milestone.id)) {
      console.debug(`⏳ Milestone ${milestone.id} is already being updated, skipping`);
      return;
    }
    
    // Mark milestone as being updated
    setIsUpdatingMilestone(prev => new Set(prev).add(milestone.id));
    
    try {
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
        
        // Call the update function - chỉ cập nhật sections, giữ nguyên các thuộc tính khác
        // onUpdateQuote sẽ merge partial update vào quote hiện tại
        onUpdateQuote(quote.id, { sections: updatedQuote.sections });
        
        // Don't update local state here - let useEffect sync from quote after time guard
        // This prevents feedback loop: save → setState → re-render → effect → save again
        
  // debug removed
      } else {
        console.warn(`❌ Milestone ${milestone.id} not found in quote sections`);
      }
    } catch (error) {
      console.error('❌ Error saving milestone to quote:', error);
      // Show error toast but don't throw - let the UI continue working
      toast({
        title: "Save Error",
        description: `Failed to save ${milestone.name}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      // Remove milestone from updating set
      setIsUpdatingMilestone(prev => {
        const newSet = new Set(prev);
        newSet.delete(milestone.id);
        return newSet;
      });
    }
  }, [quote, onUpdateQuote, hasTimelineColumn, toast, isUpdatingMilestone]);

  // Handle milestone date updates from MilestoneDateEditor
  const handleUpdateMilestone = useCallback((milestoneId: string, newStartDate: string, newEndDate: string) => {
    try {
      const milestone = milestonesState.find(m => m.id === milestoneId);
      if (!milestone) {
        console.warn(`Milestone ${milestoneId} not found in state`);
        return;
      }
      
      // console.log(`🔄 Updating milestone ${milestoneId}:`, {
      //   oldStart: milestone.startDate,
      //   oldEnd: milestone.endDate,
      //   newStart: newStartDate,
      //   newEnd: newEndDate
      // });
      
      // Call the existing saveMilestoneToQuote function
      saveMilestoneToQuote(milestone, newStartDate, newEndDate);
    } catch (error) {
      console.error('❌ Error in handleUpdateMilestone:', error);
      toast({
        title: "Update Error",
        description: "Failed to update milestone. Please try again.",
        variant: "destructive"
      });
    }
  }, [milestonesState, saveMilestoneToQuote, toast]);

  const scrollToMilestone = useCallback((milestoneId: string) => {
    const scroller = timelineScrollerRef.current;
    if (!scroller) return;
    const bar = scroller.querySelector(`.milestone-bar[data-mid="${milestoneId}"]`) as HTMLElement | null;
    if (!bar) return;
    const barLeft = bar.offsetLeft;
    const barWidth = bar.offsetWidth;
    const target = barLeft - (scroller.clientWidth / 2) + (barWidth / 2);
    const clamped = Math.max(0, Math.min(target, scroller.scrollWidth - scroller.clientWidth));
    scroller.scrollTo({ left: clamped, behavior: 'smooth' });
  }, []);

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

  // Check sync status and quote availability (no separate flag needed)

  // Helper to produce CSS-safe class fragments from arbitrary IDs
  const cssSafe = useCallback((s: string) => String(s).replace(/[^a-zA-Z0-9_-]/g, '_'), []);
  
  // Update milestones when quote timeline data changes (intentionally handled by targeted effects above)

  // Debug useEffect to track milestone state changes (removed to avoid noise/infinite loops)

  const taskStartDay = useMemo(() => {
    const result = dateToDayNum(task.startDate);
    // console.log('📅 Task start calculation:', { 
    //   taskStartDate: task.startDate, 
    //   taskStartDay: result,
    //   formatted: result !== null ? dayNumToFormat(result) : 'Invalid'
    // });
    return result;
  }, [task.startDate]);
  const taskEndDay = useMemo(() => {
    const result = dateToDayNum(task.deadline);
    // console.log('📅 Task end calculation:', { 
    //   taskDeadline: task.deadline, 
    //   taskEndDay: result,
    //   formatted: result !== null ? dayNumToFormat(result) : 'Invalid'
    // });
    return result;
  }, [task.deadline]);
  
  const totalTaskDays = useMemo(() => {
    if (taskStartDay === null || taskEndDay === null) return 0;
    return taskEndDay - taskStartDay + 1;
  }, [taskStartDay, taskEndDay]);

  // Compute milestone date range (min start, max end)
  const milestoneRange = useMemo(() => {
    let minStart: number | null = null;
    let maxEnd: number | null = null;
    for (const ms of milestonesState) {
      const s = dateToDayNum(ms.startDate);
      const e = dateToDayNum(ms.endDate);
      if (s !== null) minStart = minStart === null ? s : Math.min(minStart, s);
      if (e !== null) maxEnd = maxEnd === null ? e : Math.max(maxEnd, e);
    }
    return { minStart, maxEnd };
  }, [milestonesState]);

  // Determine timeline range (single day-based view): start at taskStart (or earliest milestone if task missing),
  // end at the max of taskEnd and last milestone end
  const timelineStartDay = useMemo(() => {
    if (taskStartDay !== null) return taskStartDay;
    return milestoneRange.minStart;
  }, [taskStartDay, milestoneRange.minStart]);

  const timelineEndDay = useMemo(() => {
    const candidates: number[] = [];
    if (taskEndDay !== null) candidates.push(taskEndDay);
    if (milestoneRange.maxEnd !== null) candidates.push(milestoneRange.maxEnd);
    if (timelineStartDay !== null) candidates.push(timelineStartDay);
    if (candidates.length === 0) return null;
    const result = Math.max(...candidates);
    // Add 50-day buffer to allow milestone extension during drag without clipping
    const bufferedResult = result + 50;
    // console.log('📊 Timeline range calculation (single view):', {
    //   taskStartDay,
    //   taskEndDay,
    //   milestoneMinStart: milestoneRange.minStart,
    //   milestoneMaxEnd: milestoneRange.maxEnd,
    //   timelineStartDay,
    //   timelineEndDay: result,
    //   bufferedTimelineEndDay: bufferedResult,
    //   taskEndFormatted: taskEndDay !== null ? dayNumToFormat(taskEndDay) : 'null',
    //   timelineEndFormatted: dayNumToFormat(result)
    // });
    return bufferedResult;
  }, [taskEndDay, milestoneRange.maxEnd, timelineStartDay, taskStartDay]);

  const getTimelineWidth = useMemo(() => {
    // Calculate timeline width with buffer to allow milestone bars to extend during drag
    if (timelineStartDay === null || timelineEndDay === null) return Math.round(30 * FIXED_DAY_WIDTH); // Fallback
    const actualTimelineDays = timelineEndDay - timelineStartDay + 1;
    // console.log('🔧 getTimelineWidth calculation:', {
    //   timelineStartDay,
    //   timelineEndDay,
    //   actualTimelineDays,
    //   FIXED_DAY_WIDTH,
    //   'width': actualTimelineDays * FIXED_DAY_WIDTH,
    //   'note': 'timelineEndDay already includes 50-day buffer'
    // });
    return Math.round(actualTimelineDays * FIXED_DAY_WIDTH);
  }, [timelineStartDay, timelineEndDay]);

  // Today marker position
  const todayMarkerPosition = useMemo(() => {
    if (timelineStartDay === null) return -1;
    const today = new Date();
    const todayDayNum = dateToDayNum(today);
    if (todayDayNum === null) return -1;
    
    const offsetDays = todayDayNum - timelineStartDay;
    // Use fixed day width for today marker position
    return Math.round(offsetDays * FIXED_DAY_WIDTH);
  }, [timelineStartDay]);

  // Timeline controls handlers
  // View mode controls removed; single day-based view
  // Zoom controls removed; using fixed day width

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

  const handleOpenEditDialog = () => {
    setIsEditDialogOpen(true);
  };

  const handleExportTimeline = async () => {
    try {
      await exportTimelineToClipboard({
        task,
        quote,
        milestones: milestonesState,
        settings,
        clients: clients || [],
        categories: categories || [],
        viewMode: 'day',
        timelineScale: FIXED_DAY_WIDTH,
        displayDate: new Date(),
        fileName: `timeline-${task.name || task.id || 'export'}-${new Date().toISOString().slice(0, 10)}`
      });
      
      toast({
        title: T.success || "Success",
        description: "Timeline exported to clipboard successfully",
      });
    } catch (error) {
      console.error('Export timeline error:', error);
      toast({
        title: T.error || "Error",
        description: "Failed to export timeline. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleVisibilityChange = useCallback((newState: SectionVisibilityState) => {
    setVisibilityState(newState);
  }, []);

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
    // console.log('🎨 cycleColor called with ID:', msId);
    
    const milestone = milestonesState.find(m => m.id === msId);
    if (!milestone) {
      console.warn(`❌ Milestone not found for ID: ${msId}`);
      // console.log('Available milestones:', milestonesState.map(m => ({ id: m.id, name: m.name })));
      return;
    }
    
    // console.log('✅ Found milestone:', { id: milestone.id, name: milestone.name, currentColor: milestone.color });
    
    // Find current color index, or start at 0 if not found
    const currentIndex = MILESTONE_COLORS.indexOf(milestone.color || '');
    const nextIndex = (currentIndex + 1) % MILESTONE_COLORS.length;
    const nextColor = MILESTONE_COLORS[nextIndex];
    
    // console.log(`🔄 Cycling color for milestone ${msId}: ${milestone.color} -> ${nextColor} (index ${currentIndex} -> ${nextIndex})`);
    
    // Update milestone color in local state
    const updated = milestonesState.map(m => 
      m.id === msId ? { ...m, color: nextColor } : m
    );
    setMilestonesState(updated);
    // console.log('🎯 Updated milestones state with new color');
    
    // Save color change to quote if timeline column exists
    if (hasTimelineColumn && quote && onUpdateQuote) {
      // console.log(`💾 Updating quote with color ${nextColor} for milestone ${msId}`);
      
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
              // console.log(`🎯 Found matching item for milestone ${msId} at section ${sectionIndex}, item ${itemIndex}`);
              
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
              
              // console.log(`📝 Updated timeline data for ${msId}:`, updatedTimeline);
              
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
        // console.log('💾 Saving color change to quote...');
        // onUpdateQuote sẽ merge partial update vào quote hiện tại
        onUpdateQuote(quote.id, { sections: updatedSections });
        
        toast({
          title: "Color Updated",
          description: `${milestone.name} color changed to ${nextColor}`,
        });
        // console.log('✅ Color change saved successfully');
      } else {
        console.warn(`❌ Could not find matching section/item for milestone ${msId}`);
        // console.log('Quote sections:', quote.sections?.map((s, i) => ({ 
        //   sectionIndex: i, 
        //   sectionId: s.id, 
        //   items: s.items?.map((item, j) => ({ 
        //     itemIndex: j, 
        //     itemId: item.id, 
        //     generatedId: `${s.id || i}-${item.id || j}` 
        //   })) 
        // })));
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
    if (timelineStartDay === null) return '';
    const lines = [
      ` .${safeTaskClass} .${stylesModule.dateHeader}, .${safeTaskClass} .${stylesModule.milestoneBarsContainer} { min-width: ${getTimelineWidth}px; }`, 
  `.${safeTaskClass} .${stylesModule.dayCell} { width: ${FIXED_DAY_WIDTH}px; }`,
  // Synchronize grid background with dayCell width and total timeline width
  `.${safeTaskClass} .${stylesModule.timelineScroller}::before { --day-width: ${FIXED_DAY_WIDTH}px; --timeline-width: ${getTimelineWidth}px; }`
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

          // Use actual milestone dates without clamping for accurate UI representation
          const offsetDays = msStartDay - timelineStartDay;
          const durationDays = msEndDay - msStartDay + 1;
          // Use fixed day width approach - simple pixel positioning
          const left = Math.round(offsetDays * FIXED_DAY_WIDTH);
          const width = Math.round(durationDays * FIXED_DAY_WIDTH);
          
          // Special debug for milestones ending on deadline
          const endsOnDeadline = msEndDay === taskEndDay;
          const endsOnTimelineEnd = msEndDay === timelineEndDay;
          
          console.debug('🎨 CSS milestone render:', {
            milestoneName: ms.name,
            milestoneId: ms.id,
            'rawStartDate': ms.startDate,
            'rawEndDate': ms.endDate,
            msStartDay,
            msEndDay,
            timelineStartDay,
            offsetDays,
            durationDays,
            left,
            width,
            'startFormatted': dayNumToFormat(msStartDay),
            'endFormatted': dayNumToFormat(msEndDay)
          });
          
          // Only set horizontal position and width, let vertical position flow naturally
          lines.push(`.${safeTaskClass} .milestone-bar[data-mid="${ms.id}"] { --left: ${left}px; --width: ${width}px; --ms-bg: ${ms.color || primaryColor}; }`); // debug removed
          // Dynamic color for milestone color buttons in left column with higher specificity
          const milestoneColor = ms.color || primaryColor;
          const safeMsClass = `milestone-color-${cssSafe(ms.id)}`;
          lines.push(`.${safeTaskClass} .${safeMsClass} { background-color: ${milestoneColor} !important; }`);
          lines.push(`.${safeMsClass} { background-color: ${milestoneColor} !important; }`); // Fallback
        });
      }
    });

    return lines.join(' ');
  }, [milestonesState, timelineStartDay, taskEndDay, getTimelineWidth, safeTaskClass, primaryColor, getSectionGroups]);
  
  const renderDateHeaders = () => {
    // Render headers for the full visible timeline width so cells align with bars and grid
    if (timelineStartDay === null || timelineEndDay === null) return null;
    
    // Calculate actual days to render based on timeline range
    const actualTimelineDays = timelineEndDay - timelineStartDay + 1;
    const days = [] as React.ReactNode[];
    
    // console.log('📊 renderDateHeaders:', {
    //   timelineStartDay,
    //   taskEndDay,
    //   timelineEndDay,
    //   actualTimelineDays,
    //   'willRenderDays': actualTimelineDays
    // });
    
    for (let i = 0; i < actualTimelineDays; i++) {
      const dayNum = timelineStartDay + i;
      
      // Determine CSS classes based on day position relative to task range
      const classNames = [stylesModule.dayCell];
      
      if (taskEndDay !== null) {
        // All days from taskStartDay to taskEndDay (inclusive) should have the range styling
        if (dayNum >= taskStartDay && dayNum <= taskEndDay) {
          if (dayNum === taskStartDay) {
            classNames.push(stylesModule.taskStartDay);
          } else if (dayNum === taskEndDay) {
            classNames.push(stylesModule.taskEndDay);
          } else {
            classNames.push(stylesModule.withinTaskRange);
          }
        }
      }
      
      days.push(
        <div key={i} className={classNames.join(' ')}>
          {dayNumToFormat(dayNum)}
        </div>
      );
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
  if (!milestone || timelineStartDay === null) return;

    // Calculate new dates for tooltip based on drag delta
    const origStartDay = dateToDayNum(milestone.startDate)!;
    const origEndDay = dateToDayNum(milestone.endDate)!;
  const quantize = (px: number) => (px >= 0 ? Math.floor(px / FIXED_DAY_WIDTH) : Math.ceil(px / FIXED_DAY_WIDTH));
  const dayDelta = quantize(delta.x);

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
    
    // Apply timeline bounds constraints (use full timeline range, not just task window)
  if (timelineEndDay !== null) {
      // console.log('🎯 Drag move constraint check:', {
      //   type,
      //   originalStart: origStartDay,
      //   originalEnd: origEndDay,
      //   newStart: startDay,
      //   newEnd: endDay,
      //   dayDelta,
      //   timelineStartDay,
      //   taskEndDay,
      //   timelineEndDay,
      //   'taskDeadlineFormatted': dayNumToFormat(taskEndDay),
      //   'timelineEndFormatted': dayNumToFormat(timelineEndDay),
      //   'willConstrain': endDay > timelineEndDay,
      //   'distanceFromTaskDeadline': taskEndDay !== null ? endDay - taskEndDay : null,
      //   'distanceFromTimelineEnd': endDay - timelineEndDay
      // });
      
      // Allow extending beyond current timeline - timeline will auto-expand
      // Only prevent going before timeline start
      if (startDay < timelineStartDay) startDay = timelineStartDay;
      
      // DON'T clamp endDay to timelineEndDay - let milestone extend freely
      // Timeline will automatically expand as timelineEndDay depends on milestoneRange.maxEnd
      
      // Ensure valid date range (start must be before end)
      if (startDay >= endDay) {
        if (type === 'resize-start') startDay = endDay - 1;
        else endDay = startDay + 1;
      }
    }

    // Update tooltip with new date information
    const mouseEvent = event.activatorEvent as MouseEvent;
  const duration = inclusiveDuration(startDay, endDay);
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
  }, [timelineStartDay, timelineEndDay]);

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
  const quantize = (px: number) => (px >= 0 ? Math.floor(px / FIXED_DAY_WIDTH) : Math.ceil(px / FIXED_DAY_WIDTH));
  const dayDelta = quantize(delta.x);
    
    const milestone = active.data.current?.milestone as Milestone;
    const type = active.data.current?.type as string;

    if (milestone && timelineStartDay !== null && timelineEndDay !== null) {
      // Guard: Skip if this milestone is already being saved
      if (isUpdatingMilestone.has(milestone.id)) {
        console.warn(`⏭️ BLOCKED: Skipping drag end - milestone ${milestone.id} is already being saved`);
        return;
      }
      
      let startDay = dateToDayNum(milestone.startDate)!;
      let endDay = dateToDayNum(milestone.endDate)!;
      const originalDuration = inclusiveDuration(startDay, endDay); // Include both start and end day

      // Drag end - compute new start/end and apply constraints

      if (type === 'move') {
        startDay += dayDelta;
        endDay += dayDelta;
      } else if (type === 'resize-start') {
        startDay += dayDelta;
      } else if (type === 'resize-end') {
        endDay += dayDelta;
      }

      // Apply timeline bounds constraints
      // Allow extending beyond current timelineEndDay - timeline will auto-expand
      if (type === 'move') {
        // For move operations, preserve original duration and only constrain start
        // Timeline will expand if milestone moves beyond current end
        
        if (startDay < timelineStartDay) {
          const diff = timelineStartDay - startDay;
          startDay += diff;
          endDay += diff;
          // console.log('🔧 Move: adjusted for startDay constraint', { diff, newStart: startDay, newEnd: endDay });
        }
        // Don't clamp endDay - let it extend freely
        // Timeline will automatically expand
      } else {
        // For resize operations, only constrain startDay
        // Allow endDay to extend beyond current timeline
        // console.log('🔧 Resize constraint check:', {
        //   type,
        //   originalStartDay: dateToDayNum(milestone.startDate),
        //   originalEndDay: dateToDayNum(milestone.endDate),
        //   newStartDay: startDay,
        //   newEndDay: endDay,
        //   timelineStartDay,
        //   timelineEndDay,
        //   dayDelta
        // });
        if (startDay < timelineStartDay) startDay = timelineStartDay;
        // DON'T clamp endDay - allow extending beyond current timeline
      }

      // Ensure minimum duration and valid range
      if (type === 'move') {
        // For move operations, duration should already be preserved from constraint logic above
        const currentDuration = endDay - startDay;
        // console.log('🔧 Move duration check:', { 
        //   currentDuration, 
        //   originalDuration, 
        //   durationPreserved: currentDuration === originalDuration - 1 
        // });
        
        // Only fix if there's an actual invalid range (should not happen with proper move logic)
        if (startDay > endDay) {
          // console.log('⚠️ Move: Invalid range detected, fixing...', { startDay, endDay });
          endDay = startDay + (originalDuration - 1);
        }
      } else if (type.startsWith('resize')) {
        // For resize operations, ensure minimum 1 day duration
        if (startDay >= endDay) {
          // console.log('🔧 Resize: ensuring minimum duration');
          if (type === 'resize-start') {
            // Keep endDay, adjust startDay but allow extension beyond task bounds
            startDay = endDay - 1; // Minimum 1 day duration
          } else { // resize-end
            // Keep startDay, adjust endDay but allow extension beyond task bounds
            endDay = startDay + 1; // Minimum 1 day duration
          }
          // console.log('🔧 Resize: after minimum duration fix:', { startDay, endDay });
        }
      }

      // No clamping - allow milestones to extend beyond task boundaries
      // console.log('🔧 No clamping applied - milestone can extend beyond task boundaries:', {
      //   type,
      //   finalDates: { start: saveStartDay, end: saveEndDay },
      //   taskBoundaries: { start: timelineStartDay, end: taskEndDay },
      //   extending: saveEndDay > taskEndDay ? 'YES' : 'NO'
      // });
      
      // Ensure minimum 1 day duration without clamping to task boundaries
      if (startDay > endDay) {
        console.warn('⚠️ Invalid range detected (startDay > endDay)!', { 
          type, 
          startDay, 
          endDay, 
          originalDuration,
          message: 'This should NOT happen - investigate!'
        });
        if (type === 'move') {
          // For move, try to preserve duration without clamping
          const midPoint = Math.floor((startDay + endDay) / 2);
          const halfDuration = Math.floor((originalDuration - 1) / 2);
          startDay = midPoint - halfDuration;
          endDay = startDay + (originalDuration - 1);
          console.log('🔧 Move: preserved duration without clamping', { startDay, endDay, originalDuration });
        } else {
          // For resize, just ensure minimum 1 day
          endDay = startDay;
        }
      }

      // Allow milestones to extend beyond task boundaries - no clamping
      const saveStartDay = startDay;
      const saveEndDay = endDay;
      
      // console.log('💾 Save without clamping:', {
      //   type,
      //   saveDates: { start: saveStartDay, end: saveEndDay },
      //   taskBoundaries: { start: timelineStartDay, end: taskEndDay },
      //   extending: saveEndDay > taskEndDay ? 'YES' : 'NO'
      // });
      
      if (saveStartDay > saveEndDay) {
        // console.log('⚠️ Save boundaries would collapse milestone to single day');
        const saveEndDayFinal = saveStartDay; // Collapse to single day if needed
        var finalSaveStartDay = saveStartDay;
        var finalSaveEndDay = saveEndDayFinal;
      } else {
        var finalSaveStartDay = saveStartDay;
        var finalSaveEndDay = saveEndDay;
      }

      const newStartDate = new Date(finalSaveStartDay * MS_PER_DAY).toISOString().slice(0, 10);
      const newEndDate = new Date(finalSaveEndDay * MS_PER_DAY).toISOString().slice(0, 10);

      const originalStartDateStr = (typeof milestone.startDate === 'string' ? milestone.startDate : milestone.startDate.toISOString()).slice(0, 10);
      const originalEndDateStr = (typeof milestone.endDate === 'string' ? milestone.endDate : milestone.endDate.toISOString()).slice(0, 10);
      const hasChanged = newStartDate !== originalStartDateStr || newEndDate !== originalEndDateStr;

      // Calculate final duration to check for unwanted changes
      const finalDuration = finalSaveEndDay - finalSaveStartDay + 1;
      console.log('💾 Final save dates:', {
        milestone: milestone.name,
        originalDates: { start: originalStartDateStr, end: originalEndDateStr },
        newDates: { start: newStartDate, end: newEndDate },
        originalDuration,
        finalDuration,
        durationChanged: finalDuration !== originalDuration
      });
      const durationChanged = finalDuration !== originalDuration;

  // (debug) drag end result omitted to reduce console noise

      if (hasChanged) {
        // Warning for unwanted duration changes during move operations
        if (type === 'move' && durationChanged) {
          console.warn('⚠️ WARNING: Move operation changed milestone duration!', {
            milestone: milestone.name,
            originalDuration,
            finalDuration,
            durationLoss: originalDuration - finalDuration,
            'originalStart': originalStartDateStr,
            'originalEnd': originalEndDateStr,
            'finalStart': newStartDate,
            'finalEnd': newEndDate
          });
        }
        
        const updatedMilestones = milestonesState.map(m =>
          m.id === milestone.id ? { ...m, startDate: newStartDate, endDate: newEndDate } : m
        );
        setMilestonesState(updatedMilestones);
        
        // console.log('🚀 Calling saveMilestoneToQuote from drag handler');
        // Save immediately to quote
        saveMilestoneToQuote(milestone, newStartDate, newEndDate);
      } else {
  console.debug('❌ No changes detected, not saving');
      }

  // No manual drop animation here; CSS variables control final layout for exact grid alignment
    }
  }, [containerRef, timelineStartDay, timelineEndDay, milestonesState, isUpdatingMilestone, saveMilestoneToQuote]);

// MilestoneBar component definition - moved outside main component
interface MilestoneBarProps {
  milestone: Milestone;
  taskStartDay: number | null;
  taskEndDay: number | null;
  safeTaskClass: string;
}

const MilestoneBar: React.FC<MilestoneBarProps> = ({ milestone, taskStartDay, taskEndDay, safeTaskClass }) => {
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

  // Use a temporary CSS rule to preview the transform/width while dragging (no inline style prop)
  let transformX = 0;
  let dragWidth = '';
  if (isDragging) {
    const msStartDay = dateToDayNum(milestone.startDate);
    const msEndDay = dateToDayNum(milestone.endDate);
    if (msStartDay !== null && msEndDay !== null) {
      const durationDays = msEndDay - msStartDay + 1;
      let widthDays = durationDays;
      const quantize = (px: number) => (px >= 0 ? Math.floor(px / FIXED_DAY_WIDTH) : Math.ceil(px / FIXED_DAY_WIDTH));
      if (isMoveDragging && moveTransform) {
        const shiftDays = quantize(moveTransform.x);
        transformX = shiftDays * FIXED_DAY_WIDTH;
      } else if (isStartResizeDragging && startResizeTransform) {
        const dxDays = quantize(startResizeTransform.x);
        transformX = dxDays * FIXED_DAY_WIDTH;
        widthDays = Math.max(1, durationDays - dxDays);
      } else if (isEndResizeDragging && endResizeTransform) {
        const dxDays = quantize(endResizeTransform.x);
        widthDays = Math.max(1, durationDays + dxDays);
      }
      dragWidth = `${widthDays * FIXED_DAY_WIDTH}px`;
    }
  }

  const safeId = String(milestone.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const dragClass = isDragging ? `milestone-drag-${safeId}` : '';
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
            className={`${stylesModule.fullscreenBtn} ${stylesModule.controlBtn}`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          <button
            onClick={handleExportTimeline}
            className={`${stylesModule.fullscreenBtn} ${stylesModule.controlBtn}`}
            title="Export Timeline as Image"
          >
            <Image className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenEditDialog}
            className={`${stylesModule.fullscreenBtn} ${stylesModule.controlBtn}`}
            title="Edit Timeline"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
        
        {/* View mode and zoom controls removed; using fixed day-based view with 50px per day */}
        
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
            {!hasTimelineColumn && hasQuote && onUpdateQuote && (
              <div className={stylesModule.statusMessage}>
                <div className={stylesModule.createTimelineMessage}>
                  <Calendar className="w-4 h-4 inline mr-1" />
                  <span>No timeline data found</span>
                    <button
                    onClick={() => {
                      console.debug('🖱️ Create Timeline button clicked');
                      handleCreateTimeline();
                    }}
                    className={stylesModule.createTimelineBtn}
                    type="button"
                  >
                    Create Timeline
                  </button>
                </div>
              </div>
            )}
            
            {!hasTimelineColumn && hasQuote && !onUpdateQuote && (
              <div className={stylesModule.statusMessage}>
                <div className={stylesModule.noQuoteMessage}>
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Timeline feature requires quote editing permissions.
                </div>
              </div>
            )}
            
            {!hasQuote && (
              <div className={stylesModule.statusMessage}>
                <div className={stylesModule.noQuoteMessage}>
                  <FileText className="w-4 h-4 inline mr-1" />
                  No quote data available. Please create or select a quote first.
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
                          onMouseDown={(e) => {
                            // Only prevent propagation if the event target is within the milestone dates area
                            const target = e.target as HTMLElement;
                            if (target.closest('.milestone-date-editor')) {
                              e.stopPropagation();
                            }
                          }}
                        >
                            <div className={stylesModule.milestoneInfo}>
                            <div className={stylesModule.milestoneName} onClick={() => scrollToMilestone(ms.id)} title="Scroll to bar">{ms.name}</div>
                            <div className={stylesModule.milestoneDates}>
                              <MilestoneDateEditor
                                milestone={ms}
                                taskStartDate={new Date(task.startDate)}
                                taskEndDate={new Date(task.deadline)}
                                onUpdateMilestone={handleUpdateMilestone}
                                isUpdating={isUpdatingMilestone.has(ms.id)}
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              cycleColor(ms.id);
                            }}
                            onMouseDown={(e) => {
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
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
              <div id="printable-timeline-container" ref={containerRef} className={safeTaskClass}>
                <div className={stylesModule.milestoneContainer}>
                  <div className={stylesModule.timelineArea}>
                    <div ref={timelineScrollerRef} className={stylesModule.timelineScroller} onMouseEnter={() => isHoveringTimelineRef.current = true} onMouseLeave={() => isHoveringTimelineRef.current = false}>
                      {/* Today marker */}
                      {todayMarkerPosition >= 0 && todayMarkerPosition < getTimelineWidth && (
                        <div 
                          className={stylesModule.todayMarker}
                          title="Today"
                        />
                      )}
                      <div className={stylesModule.dateHeader}>{renderDateHeaders()}</div>
                      
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
                                  taskEndDay={taskEndDay}
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
            </DndContext>
          </div>
        </div>
      </div>
      
      {/* Timeline Edit Dialog */}
      <TimelineEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        task={task}
        quote={quote}
        onUpdateQuote={onUpdateQuote}
        settings={settings}
        visibilityState={visibilityState}
        onVisibilityChange={handleVisibilityChange}
      />
    </div>
  );
};

export default TimelineCreatorTab;