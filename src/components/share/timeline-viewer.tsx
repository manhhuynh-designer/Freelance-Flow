"use client";

/* eslint-disable */
import React from 'react';
import { AppSettings, Category, Client, Milestone, Quote, Task } from '@/lib/types';
import { format, differenceInDays, addDays } from 'date-fns';

type Props = {
  task: Task;
  quote?: Quote;
  milestones?: Milestone[];
  settings: AppSettings;
  clients: Client[];
  categories: Category[];
  showHeader?: boolean;
  embedded?: boolean;
  showBriefLinks?: boolean;
  showDriveLinks?: boolean;
};

export default function TimelineViewer({ task, quote, milestones = [], settings, clients, categories, showHeader = true, embedded = false, showBriefLinks = true, showDriveLinks = true }: Props) {
  // Scroll container ref for custom wheel handling
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const timelineAreaRef = React.useRef<HTMLDivElement | null>(null);
  
  // Dynamic column widths based on screen size
  const [milestoneColWidth, setMilestoneColWidth] = React.useState(320); // default 320px (w-80)
  const [dayWidth, setDayWidth] = React.useState(50); // default 50px per day
  
  // Update column widths based on screen size
  React.useEffect(() => {
    const updateWidths = () => {
      const width = window.innerWidth;
      if (width < 640) { // mobile
        setMilestoneColWidth(128); // w-32
        setDayWidth(40);
      } else if (width < 768) { // tablet
        setMilestoneColWidth(192); // w-48
        setDayWidth(45);
      } else { // desktop
        setMilestoneColWidth(320); // w-80
        setDayWidth(50);
      }
    };
    
    updateWidths();
    window.addEventListener('resize', updateWidths);
    return () => window.removeEventListener('resize', updateWidths);
  }, []);

  // Native non-passive wheel listener to block page scroll and map to horizontal scroll
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Always intercept wheel while hovering the timeline container
      e.preventDefault();
      e.stopPropagation();

      const deltaX = e.deltaX;
      const deltaY = e.deltaY;
      const canScrollHoriz = el.scrollWidth > el.clientWidth;

      if (!canScrollHoriz) return; // nothing to do, but still block page scroll

      // If horizontal intent use deltaX; otherwise convert vertical to horizontal
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        el.scrollLeft += deltaX;
      } else {
        el.scrollLeft += deltaY * 0.7; // smoother conversion
      }
    };

    // Important: passive: false so preventDefault works
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel as EventListener);
    };
  }, []);

  // Helper function to extract milestones from quote timeline column (same logic as TaskDetailsDialog)
  const getMilestonesFromQuote = (quoteData?: Quote): Milestone[] => {
    if (!quoteData?.sections || !quoteData.columns?.some(col => col.id === 'timeline')) {
      return [];
    }
    
    const milestonesFromQuote: Milestone[] = [];
    
    quoteData.sections.forEach((section, sectionIndex) => {
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
            timelineValue !== null &&
            timelineValue.start && 
            timelineValue.end) {
          
          // Generate consistent milestone ID
          const sectionIdForMilestone = section.id || `section-${sectionIndex}`;
          const itemIdForMilestone = item.id || `item-${itemIndex}`;
          const milestoneId = `${sectionIdForMilestone}-${itemIdForMilestone}`;
          
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
          
          milestonesFromQuote.push(milestone);
        }
      });
    });
    
    return milestonesFromQuote;
  };

  // Extract milestones: first try from quote timeline column, then fallback to props, then task.milestones
  const extractedMilestones = getMilestonesFromQuote(quote);
  const actualMilestones = extractedMilestones.length > 0 
    ? extractedMilestones 
    : (milestones.length > 0 ? milestones : (task.milestones || []));

  // Build grouped milestones by sections when quote is present
  const sectionGroups = React.useMemo(() => {
    if (!quote?.sections) return null;
    const groups = quote.sections.map((section, sIdx) => {
      const sid = section.id || `section-${sIdx}`;
      const name = section.name || `Section ${sIdx + 1}`;
      const items = actualMilestones.filter((m) => {
        const mid = m.id || '';
        // Prefer id prefix match '<sectionId>-'
        if (mid.startsWith(`${sid}-`)) return true;
        // Fallback: if content holds section name hint
        if (typeof m.content === 'string' && m.content.includes(name)) return true;
        return false;
      });
      return { id: sid, name, items };
    });
    // Collect unmatched milestones into 'Other'
    const matchedSet = new Set(groups.flatMap(g => g.items.map(m => m.id)));
    const others = actualMilestones.filter(m => !matchedSet.has(m.id));
    if (others.length) groups.push({ id: 'other', name: 'Other', items: others });
    return groups;
  }, [quote, actualMilestones]);

  // Debug logging
  console.log('🔍 TimelineViewer debug:', {
    hasQuote: !!quote,
    hasTimelineColumn: quote?.columns?.some(col => col.id === 'timeline'),
    quoteSections: quote?.sections?.length || 0,
    extractedMilestonesCount: extractedMilestones.length,
    propMilestonesCount: milestones.length,
    taskMilestonesCount: task.milestones?.length || 0,
    actualMilestonesCount: actualMilestones.length,
    actualMilestones: actualMilestones.map(m => ({ id: m.id, name: m.name, color: m.color }))
  });

  // Get client and category info
  const currentClient = clients.find(c => c.id === task.clientId);
  const currentCategory = categories.find(cat => cat.id === task.categoryId);
  const primaryColor = settings.theme?.primary || '#2563eb';

  // Timeline calculations - simplified from PrintableTimeline
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const getUtcTimestamp = (date: any): number => {
    if (!date) return NaN;
    if (date instanceof Date) {
        return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    }
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

  // Calculate timeline range
  const getTimelineRange = () => {
    const taskStartDay = dateToDayNum(task.startDate);
    const taskEndDay = dateToDayNum(task.deadline);
    
    if (taskStartDay === null || taskEndDay === null) {
      const today = new Date();
      return {
        startDay: dateToDayNum(today)!,
        endDay: dateToDayNum(addDays(today, 30))!
      };
    }

    return { startDay: taskStartDay, endDay: taskEndDay };
  };

  const { startDay, endDay } = getTimelineRange();
  const totalDays = Math.max(1, endDay - startDay + 1);
  
  // Calculate dynamic canvas width
  const timelineAreaWidth = totalDays * dayWidth;
  const canvasMinWidth = Math.max(600, milestoneColWidth + timelineAreaWidth);

  // Calculate milestone position
  const getMilestonePosition = (milestone: Milestone) => {
    const milestoneStartDay = dateToDayNum(milestone.startDate);
    const milestoneEndDay = dateToDayNum(milestone.endDate) || milestoneStartDay;
    
    if (milestoneStartDay === null) return { left: 0, width: 0 };
    
    const relativeStart = milestoneStartDay - startDay;
    const duration = Math.max(1, milestoneEndDay ? milestoneEndDay - milestoneStartDay + 1 : 1);
    
    return {
      left: (relativeStart / totalDays) * 100,
      width: (duration / totalDays) * 100
    };
  };

  // Calculate progress
  const calculateProgress = (startDate: string | Date | null, endDate: string | Date | null) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    const total = end.getTime() - start.getTime();
    const elapsed = today.getTime() - start.getTime();
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  };

  const getStatusText = (startDate: string | Date | null, endDate: string | Date | null) => {
    if (!startDate || !endDate) return 'Not scheduled';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    
    if (today < start) return 'Upcoming';
    if (today > end) return 'Completed';
    return 'In Progress';
  };

  // Generate date headers with pixel-based positioning
  const dateHeaders = React.useMemo(() => {
    if (totalDays <= 0) return [];
    const headers = [];
    
    for (let i = 0; i < totalDays; i++) {
      const dayNum = startDay + i;
      headers.push({
        index: i,
        leftPx: i * dayWidth,
        widthPx: dayWidth,
        label: dayNumToFormat(dayNum)
      });
    }
    
    return headers;
  }, [totalDays, startDay, dayWidth]);

  // Add mouse wheel horizontal scroll handler with complete conflict resolution
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (!container) return;

    // Always prevent page scrolling when mouse is over the timeline
    e.preventDefault();
    e.stopPropagation();

    // Check if we're trying to scroll horizontally vs vertically
    const isHorizontalIntent = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const isVerticalIntent = Math.abs(e.deltaY) > Math.abs(e.deltaX);
    
    // Check scroll boundaries
    const canScrollLeft = container.scrollLeft > 0;
    const canScrollRight = container.scrollLeft < (container.scrollWidth - container.clientWidth);
    const canScrollHorizontally = canScrollLeft || canScrollRight;
    
    // Handle horizontal scrolling intent
    if (isHorizontalIntent && canScrollHorizontally) {
      container.scrollLeft += e.deltaX;
    }
    // Handle vertical scrolling - convert to horizontal if possible
    else if (isVerticalIntent && canScrollHorizontally) {
      container.scrollLeft += e.deltaY * 0.5; // Reduce sensitivity for smoother scroll
    }
    // If no horizontal scrolling is possible, do nothing (prevent page scroll)
  };

  return (
    <div className={embedded ? '' : 'min-h-screen bg-gray-50'}>
      {/* Header - Simplified */}
      {showHeader && (
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 break-words">
            {task.name || 'Project Timeline'}
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6 break-words">
            {currentClient?.name && currentCategory?.name 
              ? `${currentClient.name} • ${currentCategory.name}`
              : currentClient?.name || currentCategory?.name || 'Project Details'
            }
          </p>
          
          {/* Project Info - Compact */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 text-xs sm:text-sm">
            <div>
              <span className="font-medium text-gray-700">Start:</span>
              <span className="ml-2 text-gray-900">
                {task.startDate ? dayNumToFormat(dateToDayNum(task.startDate)) : '—'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Deadline:</span>
              <span className="ml-2 text-gray-900">
                {task.deadline ? dayNumToFormat(dateToDayNum(task.deadline)) : '—'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Duration:</span>
              <span className="ml-2 text-gray-900">{totalDays} days</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Timeline Content */}
  <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {actualMilestones.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 md:p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">No Timeline Data</h3>
            <p className="text-sm sm:text-base text-gray-500">No milestones have been created for this project.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Timeline Header */}
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
                Timeline ({actualMilestones.length} milestones)
              </h2>
            </div>

            {/* Gantt Chart */}
            <div 
              ref={scrollRef}
              className="overflow-x-auto hover:overflow-x-scroll overscroll-contain" 
              style={{ scrollbarWidth: 'thin' }}
            >
              <div style={{ minWidth: `${canvasMinWidth}px` }}>
                {/* Date Headers */}
                <div className="relative bg-gray-50 border-b border-gray-200 h-10 sm:h-12 flex items-center">
                  <div 
                    className="flex-shrink-0 px-2 sm:px-4 md:px-6 text-xs sm:text-sm font-medium text-gray-700"
                    style={{ width: `${milestoneColWidth}px` }}
                  >
                    Milestone
                  </div>
                  <div 
                    ref={timelineAreaRef}
                    className="relative h-full" 
                    style={{ width: `${timelineAreaWidth}px` }}
                  >
                    {dateHeaders.map((header) => (
                      <div
                        key={header.index}
                        className="absolute text-xs text-gray-600 font-medium flex items-center justify-center h-full"
                        style={{ 
                          left: `${header.leftPx}px`, 
                          width: `${header.widthPx}px`,
                          fontSize: '11px'
                        }}
                      >
                        {header.label}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Milestone Rows; if quote exists, group by section */}
                <div className="divide-y divide-gray-100 relative">
                  {/* Full-height background grid */}
                  <div className="absolute inset-0 pointer-events-none">
                    {dateHeaders.map((header) => (
                      <div
                        key={header.index}
                        className="absolute border-l border-gray-200 h-full"
                        style={{ left: `${milestoneColWidth + header.leftPx}px` }}
                      />
                    ))}
                    {/* Right border to close the grid */}
                    <div 
                      className="absolute border-l border-gray-200 h-full" 
                      style={{ left: `${milestoneColWidth + timelineAreaWidth}px` }}
                    />
                  </div>
                  
                  {(sectionGroups ?? [{ id: 'all', name: '', items: actualMilestones }]).map((group, gIdx) => (
                    <React.Fragment key={group.id || gIdx}>
                      {group.name ? (
                        <div className="bg-gray-50 px-2 sm:px-4 md:px-6 py-2 text-xs sm:text-sm font-semibold text-gray-700">
                          {group.name}
                        </div>
                      ) : null}
                      {group.items.map((milestone, index) => {
                    const position = getMilestonePosition(milestone);
                    const progress = calculateProgress(milestone.startDate, milestone.endDate);
                    const statusText = getStatusText(milestone.startDate, milestone.endDate);
                    
                    return (
                      <div key={milestone.id || index} className="flex items-center py-2 hover:bg-gray-50">
                        {/* Milestone Info */}
                        <div 
                          className="flex-shrink-0 px-2 sm:px-4 md:px-6"
                          style={{ width: `${milestoneColWidth}px` }}
                        >
                          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <div 
                              className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: milestone.color || primaryColor }}
                            />
                            <h3 className="font-medium text-gray-900 text-xs sm:text-sm leading-tight line-clamp-2">
                              {milestone.name || `Milestone ${index + 1}`}
                            </h3>
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500 ml-4 sm:ml-6 truncate">
                            {milestone.startDate && milestone.endDate 
                              ? `${dayNumToFormat(dateToDayNum(milestone.startDate))} → ${dayNumToFormat(dateToDayNum(milestone.endDate))}`
                              : '—'
                            }
                          </div>
                          {/* Status badge removed per request */}
                        </div>
                        
                        {/* Timeline Bar */}
                        <div 
                          className="relative h-10 sm:h-12 px-1 sm:px-2"
                          style={{ width: `${timelineAreaWidth}px` }}
                        >
                          {/* Milestone Bar */}
                          <div
                            className="absolute top-1.5 h-7 sm:h-9 rounded-md shadow-sm border border-gray-200 flex items-center justify-center"
                            style={{
                              left: `${position.left}%`,
                              width: `${position.width}%`,
                              minWidth: `${Math.max(dayWidth * 0.3, 12)}px`,
                              backgroundColor: milestone.color || primaryColor,
                              opacity: statusText === 'Completed' ? 1 : 0.9
                            }}
                          >
                            {/* Milestone name on bar */}
                            <span className="relative text-white text-[10px] sm:text-xs font-medium px-1 sm:px-2 truncate">
                              {milestone.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom status summary removed per request */}
          </div>
        )}

        {/* Links Section */}
        {((showBriefLinks && task.briefLink && task.briefLink.length > 0) || (showDriveLinks && task.driveLink && task.driveLink.length > 0)) && (
          <div className="mt-6 sm:mt-8 space-y-4">
            {showBriefLinks && task.briefLink && task.briefLink.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Brief Links</h3>
                <div className="space-y-2">
                  {task.briefLink.map((link, idx) => (
                    <a 
                      key={idx} 
                      href={link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {showDriveLinks && task.driveLink && task.driveLink.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Drive Links</h3>
                <div className="space-y-2">
                  {task.driveLink.map((link, idx) => (
                    <a 
                      key={idx} 
                      href={link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
