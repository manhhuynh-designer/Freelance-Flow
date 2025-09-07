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
};

export default function TimelineViewer({ task, quote, milestones = [], settings, clients, categories, showHeader = true, embedded = false }: Props) {
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

  // Generate date headers
  const generateDateHeaders = () => {
    if (totalDays <= 0) return [];
    const headers = [];
    const stepDays = totalDays > 60 ? 7 : totalDays > 30 ? 3 : 1;
    
    for (let i = 0; i < totalDays; i += stepDays) {
      const dayNum = startDay + i;
      headers.push({
        position: (i / totalDays) * 100,
        label: dayNumToFormat(dayNum)
      });
    }
    
    return headers;
  };

  const dateHeaders = generateDateHeaders();

  return (
    <div className={embedded ? '' : 'min-h-screen bg-gray-50'}>
      {/* Header - Simplified */}
      {showHeader && (
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {task.name || 'Project Timeline'}
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            {currentClient?.name && currentCategory?.name 
              ? `${currentClient.name} • ${currentCategory.name}`
              : currentClient?.name || currentCategory?.name || 'Project Details'
            }
          </p>
          
          {/* Project Info - Compact */}
          <div className="grid grid-cols-3 gap-6 text-sm">
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
  <div className="max-w-7xl mx-auto px-6 py-8">
        {actualMilestones.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Timeline Data</h3>
            <p className="text-gray-500">No milestones have been created for this project.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Timeline Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Timeline ({actualMilestones.length} milestones)
              </h2>
            </div>

            {/* Gantt Chart */}
            <div className="overflow-x-auto">
              <div style={{ minWidth: '800px' }}>
                {/* Date Headers */}
                <div className="relative bg-gray-50 border-b border-gray-200 h-12 flex items-center">
                  <div className="w-80 flex-shrink-0 px-6 text-sm font-medium text-gray-700">
                    Milestone
                  </div>
                  <div className="flex-1 relative h-full">
                    {dateHeaders.map((header, index) => (
                      <div
                        key={index}
                        className="absolute text-xs text-gray-600 font-medium flex items-center justify-center h-full"
                        style={{ 
                          left: `${header.position}%`, 
                          transform: 'translateX(-50%)',
                          minWidth: '60px'
                        }}
                      >
                        {header.label}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Milestone Rows; if quote exists, group by section */}
                <div className="divide-y divide-gray-100">
                  {(sectionGroups ?? [{ id: 'all', name: '', items: actualMilestones }]).map((group, gIdx) => (
                    <React.Fragment key={group.id || gIdx}>
                      {group.name ? (
                        <div className="bg-gray-50 px-6 py-2 text-sm font-semibold text-gray-700">
                          {group.name}
                        </div>
                      ) : null}
                      {group.items.map((milestone, index) => {
                    const position = getMilestonePosition(milestone);
                    const progress = calculateProgress(milestone.startDate, milestone.endDate);
                    const statusText = getStatusText(milestone.startDate, milestone.endDate);
                    
                    return (
                      <div key={milestone.id || index} className="flex items-center py-4 hover:bg-gray-50">
                        {/* Milestone Info */}
                        <div className="w-80 flex-shrink-0 px-6">
                          <div className="flex items-center gap-3 mb-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: milestone.color || primaryColor }}
                            />
                            <h3 className="font-medium text-gray-900 text-sm leading-tight">
                              {milestone.name || `Milestone ${index + 1}`}
                            </h3>
                          </div>
                          <div className="text-xs text-gray-500 ml-6">
                            {milestone.startDate && milestone.endDate 
                              ? `${dayNumToFormat(dateToDayNum(milestone.startDate))} → ${dayNumToFormat(dateToDayNum(milestone.endDate))}`
                              : '—'
                            }
                          </div>
                          {/* Status badge removed per request */}
                        </div>
                        
                        {/* Timeline Bar */}
                        <div className="flex-1 relative h-12 px-2">
                          {/* Background grid */}
                          <div className="absolute inset-0">
                            {dateHeaders.map((_, index) => (
                              <div
                                key={index}
                                className="absolute border-l border-gray-100 h-full"
                                style={{ left: `${(index / (dateHeaders.length - 1)) * 100}%` }}
                              />
                            ))}
                          </div>
                          
                          {/* Milestone Bar */}
                          <div
                            className="absolute top-2 h-8 rounded-md shadow-sm border border-gray-200 flex items-center justify-center"
                            style={{
                              left: `${Math.max(0, position.left)}%`,
                              width: `${Math.min(100 - Math.max(0, position.left), Math.max(2, position.width))}%`,
                              backgroundColor: milestone.color || primaryColor,
                              opacity: statusText === 'Completed' ? 1 : 0.9
                            }}
                          >
                            {/* Progress indicator */}
                            <div
                              className="absolute left-0 top-0 h-full bg-black bg-opacity-10 rounded-md"
                              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                            />
                            
                            {/* Milestone name on bar */}
                            <span className="relative text-white text-xs font-medium px-2 truncate">
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
      </div>
    </div>
  );
}
