import React from 'react';
import { Task, Quote, AppSettings, Milestone, Client, Category } from '@/lib/types';
import { format, addDays } from 'date-fns';
import { i18n } from '@/lib/i18n';

// Minimal server-safe translations used by PrintableTimeline
const fallbackT = {
  startDate: 'Start Date',
  deadline: 'Deadline',
};

type Props = {
  task: Task;
  quote?: Quote;
  milestones?: Milestone[];
  settings: AppSettings;
  clients?: Client[];
  categories?: Category[];
  viewMode?: 'day' | 'week' | 'month';
  timelineScale?: number;
  displayDate?: Date;
  fileName?: string;
};

const scale = 48; // Pixels per day for rendering
const SECTION_HEADER_HEIGHT = 48; // Increased for larger text
const MILESTONE_ROW_HEIGHT = 120; // Taller rows for larger text and bars
const BAR_HEIGHT = 84; // Increased bar height to accommodate text better
const DATE_HEADER_HEIGHT = 40; // Increased for larger text
const DATE_HEADER_BORDER = 1;
const MILESTONES_TITLE_HEIGHT = 60; // Increased for larger title text

export const PrintableTimeline: React.FC<Props> = ({
  task,
  quote,
  milestones = [],
  settings,
  clients = [],
  categories = [],
  viewMode = 'month',
  timelineScale = 1,
  displayDate = new Date()
}) => {
  // Add defensive checks for required props
  if (!task || !settings) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold text-red-600">Error loading timeline</h1>
        <p className="text-sm text-gray-500">Missing required data: task or settings</p>
      </div>
    );
  }

  const currency = settings.currency || 'USD';
  // Build a safe T object (prefer i18n, fallback to minimal)
  const T = { ...fallbackT, ...(i18n[settings.language] || {}) } as typeof fallbackT & Record<string, string>;
  const primaryColor = settings.theme?.primary || '#2563eb';

  const currentClient = clients.find(c => c.id === task.clientId);
  const currentCategory = categories.find(cat => cat.id === task.categoryId);

  // Timeline calculations - Use same logic as TimelineCreatorTab
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const CONTAINER_WIDTH = 4096; // 4096px width
  const SIDEBAR_WIDTH = 400; 
  const TIMELINE_WIDTH = CONTAINER_WIDTH - SIDEBAR_WIDTH;

  // Date utilities - Match TimelineCreatorTab exactly
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

  const getTimelineRange = () => {
    // Use same logic as TimelineCreatorTab
    const taskStartDay = dateToDayNum(task.startDate);
    const taskEndDay = dateToDayNum(task.deadline);
    
    if (taskStartDay === null || taskEndDay === null) {
      // Fallback to current date range
      const today = new Date();
      return {
        startDay: dateToDayNum(today)!,
        endDay: dateToDayNum(addDays(today, 30))!
      };
    }

    // Crop timeline exactly from task start to deadline (no extra padding)
    return {
      startDay: taskStartDay,
      endDay: taskEndDay
    };
  };

  const { startDay, endDay } = getTimelineRange();
  const totalDays = Math.max(1, endDay - startDay + 1);
  const dayWidth = TIMELINE_WIDTH / totalDays;

  const formatDateHeader = (dayNum: number) => {
    return dayNumToFormat(dayNum);
  };

  const getMilestonePosition = (milestone: Milestone) => {
    const milestoneStartDay = dateToDayNum(milestone.startDate);
    const milestoneEndDay = dateToDayNum(milestone.endDate) || milestoneStartDay;
    
    if (milestoneStartDay === null) return { left: 0, width: 0 };
    
    // Calculate relative position from timeline start
    const relativeStart = milestoneStartDay - startDay;
    const duration = Math.max(1, milestoneEndDay ? milestoneEndDay - milestoneStartDay + 1 : 1);
    
    return {
      left: relativeStart * dayWidth,
      width: duration * dayWidth
    };
  };

  const renderDateHeaders = () => {
    const headers = [];
    const headerInterval = viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30;
    
    for (let i = 0; i < totalDays; i += headerInterval) {
      const currentDay = startDay + i;
      headers.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${i * dayWidth}px`,
            width: `${headerInterval * dayWidth}px`,
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '1px solid #e5e7eb',
            fontSize: '24px',
            color: '#6b7280',
            backgroundColor: '#f9fafb'
          }}
        >
          {dayNumToFormat(currentDay)}
        </div>
      );
    }
    
    return headers;
  };

  const renderGridLines = () => {
    const lines = [];
    const interval = viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30;
    
    // Vertical grid lines
    for (let i = 0; i <= totalDays; i += interval) {
      lines.push(
        <div
          key={`v-${i}`}
          style={{
            position: 'absolute',
            left: `${i * dayWidth}px`,
            top: '0',
            bottom: '0',
            width: '1px',
            backgroundColor: '#f3f4f6',
            opacity: 0.7
          }}
        />
      );
    }
    
    return lines;
  };

  // Build rows grouped by sections to keep sidebar and bars perfectly aligned
  type Row = 
    | { type: 'section'; id: string; name: string }
    | { type: 'milestone'; id: string; name: string; milestone: Milestone | null };

  const buildRows = (): Row[] => {
    const rows: Row[] = [];
    const used = new Set<string>();

    // Helper to find a milestone for a quote item by common patterns
    const findMilestoneForItem = (sectionIndex: number, itemIndex: number, itemName?: string): Milestone | null => {
      // Primary: match exact milestone id format used in TimelineCreatorTab
      const sectionObj = (quote as any)?.sections?.[sectionIndex];
      const sectionId = sectionObj?.id || `section-${sectionIndex}`;
      const itemObj = sectionObj?.items?.[itemIndex];
      const itemId = itemObj?.id || `item-${itemIndex}`;
      const expectedId = `${sectionId}-${itemId}`;
      const byExactKey = milestones.find(m => m.id === expectedId);
      if (byExactKey && !used.has(byExactKey.id)) return byExactKey;

      // Fallbacks
      if (itemName) {
        const byName = milestones.find(m => !used.has(m.id) && m.name === itemName);
        if (byName) return byName;
      }
      const any = milestones.find(m => !used.has(m.id));
      return any || null;
    };

    if (quote?.sections && quote.sections.length > 0) {
      quote.sections.forEach((section, sIdx) => {
        const sectionId = section.id || `section-${sIdx}`;
        rows.push({ type: 'section', id: String(sectionId), name: section.name || `Section ${sIdx + 1}` });
        const items = section.items || [];
        items.forEach((item: any, iIdx: number) => {
          const ms = findMilestoneForItem(sIdx, iIdx, item?.description);
          if (ms) used.add(ms.id);
          rows.push({ type: 'milestone', id: `${sectionId}-item-${iIdx}`, name: item?.description || ms?.name || `Item ${iIdx + 1}` , milestone: ms || null });
        });
      });
    } else {
      // No quote sections, just list milestones
      milestones.forEach((m, idx) => {
        rows.push({ type: 'milestone', id: m.id || `ms-${idx}`, name: m.name, milestone: m });
      });
    }
    return rows;
  };

  const rows = buildRows();
  const rowHeights = rows.map(r => r.type === 'section' ? SECTION_HEADER_HEIGHT : MILESTONE_ROW_HEIGHT);
  const rowTops = rowHeights.reduce<number[]>((acc, h, i) => {
    const prev = i === 0 ? 0 : acc[i - 1] + rowHeights[i - 1];
    acc.push(prev);
    return acc;
  }, []);
  const totalRowsHeight = rowHeights.reduce((a, b) => a + b, 0);

  const renderHorizontalGridLines = () => {
    const lines = [] as React.ReactNode[];
    rows.forEach((r, i) => {
      if (r.type === 'milestone') {
        lines.push(
          <div
            key={`h-${i}`}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${MILESTONES_TITLE_HEIGHT + rowTops[i]}px`, // Account for title height
              height: '1px',
              backgroundColor: '#f3f4f6',
              opacity: 0.5
            }}
          />
        );
      }
    });
    // bottom line
    lines.push(
      <div
        key={`h-bottom`}
        style={{ position: 'absolute', left: 0, right: 0, top: `${MILESTONES_TITLE_HEIGHT + totalRowsHeight}px`, height: '1px', backgroundColor: '#f3f4f6', opacity: 0.5 }}
      />
    );
    return lines;
  };

  const styles = {
    container: {
      width: `${CONTAINER_WIDTH}px`,
      minHeight: '800px',
      backgroundColor: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative' as const,
      overflow: 'hidden'
    },
    header: {
      padding: '24px',
      borderBottom: '2px solid #e5e7eb',
      backgroundColor: '#f9fafb'
    },
    title: {
      fontSize: '48px', // x2 from 24px
      fontWeight: 'bold',
      color: primaryColor,
      marginBottom: '8px'
    },
    subtitle: {
      fontSize: '32px', // x2 from 16px
      color: '#6b7280',
      marginBottom: '16px'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '16px',
      fontSize: '28px' // x2 from 14px
    },
    infoItem: {
      display: 'flex',
      flexDirection: 'column' as const
    },
    infoLabel: {
      fontWeight: '600',
      color: '#374151',
      marginBottom: '4px'
    },
    infoValue: {
      color: '#6b7280'
    },
    content: {
      display: 'flex',
      minHeight: '700px'
    },
    sidebar: {
      width: `${SIDEBAR_WIDTH}px`,
      borderRight: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb',
      padding: '16px',
      paddingTop: `${DATE_HEADER_HEIGHT + DATE_HEADER_BORDER}px` // Align with date header height + border
    },
    timelineArea: {
      flex: 1,
      position: 'relative' as const,
      overflow: 'hidden'
    },
    dateHeader: {
      height: `${DATE_HEADER_HEIGHT}px`,
      borderBottom: '1px solid #e5e7eb',
      position: 'relative' as const,
      backgroundColor: '#f9fafb'
    },
    timelineContent: {
      height: `${MILESTONES_TITLE_HEIGHT + totalRowsHeight}px`, // Include title height
      position: 'relative' as const,
      backgroundColor: '#ffffff'
    },
    milestoneBar: {
      position: 'absolute' as const,
      height: `${BAR_HEIGHT}px`, 
      borderRadius: '6px',
      backgroundColor: '#3b82f6',
      border: 'none',
      overflow: 'hidden',
      boxSizing: 'border-box' as const
    },
    footer: {
      padding: '16px 24px',
      borderTop: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb',
      fontSize: '12px',
      color: '#6b7280',
      textAlign: 'center' as const
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          {task.name || 'Timeline'}
        </h1>
        <p style={styles.subtitle}>
          {currentClient?.name || 'Client'} • {currentCategory?.name || 'Category'}
        </p>
        
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>{T.startDate || 'Start Date'}:</span>
            <span style={styles.infoValue}>
              {task.startDate ? dayNumToFormat(dateToDayNum(task.startDate)) : '-'}
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>{T.deadline || 'Deadline'}:</span>
            <span style={styles.infoValue}>
              {task.deadline ? dayNumToFormat(dateToDayNum(task.deadline)) : '-'}
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>View:</span>
            <span style={styles.infoValue}>
              {viewMode === 'day' ? 'Day View' : 
               viewMode === 'week' ? 'Week View' : 
               'Month View'}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div style={styles.content}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <h3 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '16px', color: '#374151', height: `${MILESTONES_TITLE_HEIGHT}px`, display: 'flex', alignItems: 'center', margin: '0 0 0 0' }}>
            Milestones ({milestones.length})
          </h3>
          {rows.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '28px', marginTop: '32px' }}>
              No milestones found
            </div>
          ) : (
            rows.map((row, i) => (
              row.type === 'section' ? (
                <div key={`s-${row.id}`} style={{ height: `${SECTION_HEADER_HEIGHT}px`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: '0 8px', color: '#111827', fontWeight: 700, borderBottom: '1px solid #e5e7eb', background: '#fafafa', fontSize: '28px' }}>
                  {row.name}
                </div>
              ) : (
                <div key={`m-${row.id}`} style={{ height: `${MILESTONE_ROW_HEIGHT}px`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', paddingLeft: '8px', borderBottom: '1px solid #f3f4f6' }}>
                  {/* bullet */}
                  <div style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '9999px', background: row.milestone?.color || '#9ca3af' }} />
                  </div>
                  {/* text block */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '12px' }}>
                    <div style={{ fontSize: '32px', fontWeight: 600, color: '#374151', lineHeight: '1.2', marginBottom: '4px' }}>
                      {row.name}
                    </div>
                    {row.milestone && (
                      <div style={{ fontSize: '26px', color: '#6b7280', lineHeight: '1.2' }}>
                        {row.milestone.startDate && row.milestone.endDate ?
                          `${dayNumToFormat(dateToDayNum(row.milestone.startDate))} - ${dayNumToFormat(dateToDayNum(row.milestone.endDate))}` :
                          row.milestone.startDate ? dayNumToFormat(dateToDayNum(row.milestone.startDate)) : '-'}
                      </div>
                    )}
                  </div>
                </div>
              )
            ))
          )}
        </div>

        {/* Timeline Area */}
        <div style={styles.timelineArea}>
          {/* Date Headers */}
          <div style={styles.dateHeader}>
            {renderDateHeaders()}
          </div>

          {/* Timeline Content */}
          <div style={styles.timelineContent}>
            {/* Grid Lines */}
            {renderGridLines()}
            
            {/* Horizontal Grid Lines */}
            {renderHorizontalGridLines()}

            {/* Today Marker */}
            {(() => {
              const today = new Date();
              const todayDayNum = dateToDayNum(today);
              if (todayDayNum !== null && todayDayNum >= startDay && todayDayNum <= endDay) {
                const todayPosition = (todayDayNum - startDay) * dayWidth;
                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${todayPosition}px`,
                      top: '0',
                      bottom: '0',
                      width: '2px',
                      backgroundColor: '#ef4444',
                      zIndex: 10,
                      opacity: 0.8
                    }}
                  />
                );
              }
              return null;
            })()}

            {/* Section-aware Milestone Bars */}
            {rows.map((row, i) => {
              if (row.type !== 'milestone' || !row.milestone) return null;
              const milestone = row.milestone;
              const position = getMilestonePosition(milestone);
              // Add MILESTONES_TITLE_HEIGHT to account for "Milestones (11)" header
              const top = MILESTONES_TITLE_HEIGHT + rowTops[i] + (MILESTONE_ROW_HEIGHT - BAR_HEIGHT) / 2; 
              return (
                <div key={`bar-${milestone.id}-${i}`} style={{
                  position: 'absolute',
                  height: `${BAR_HEIGHT}px`,
                  borderRadius: '6px',
                  backgroundColor: milestone.color || primaryColor,
                  border: 'none',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                  left: `${position.left}px`,
                  width: `${Math.max(100, position.width)}px`,
                  top: `${top}px`,
                  display: 'table'
                }}>
                  <div style={{
                    display: 'table-cell',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    width: '100%',
                    height: `${BAR_HEIGHT}px`,
                    padding: '8px 16px',
                    color: '#ffffff',
                    fontSize: '28px',
                    fontWeight: '600',
                    lineHeight: '1.0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    boxSizing: 'border-box'
                  }}>
                    {milestone.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        Exported on {format(new Date(), 'dd/MM/yyyy HH:mm')} • Freelance Flow
      </div>
    </div>
  );
};

export default PrintableTimeline;