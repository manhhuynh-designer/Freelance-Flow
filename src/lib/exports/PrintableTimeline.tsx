import React from 'react';
import { Task, AppSettings, Milestone } from "@/lib/types";
import { i18n } from "@/lib/i18n";
import { format, differenceInDays } from "date-fns";

type Props = {
  task: Task;
  settings: AppSettings;
  milestones: Milestone[];
};

const rowHeight = 32;
const scale = 48; // Pixels per day for rendering

export const PrintableTimeline: React.FC<Props> = ({ 
  task, 
  settings,
  milestones
}) => {
  const T = i18n[settings.language] || i18n.vi;
  const primaryColor = settings.theme?.primary || '#2563eb'; // fallback to a default blue

  // Date parsing utility (Copied from TaskDetailsDialog.tsx for consistency)
  const safeParseDate = (date: any, fallback: Date | null = null): Date | null => {
    if (!date) return fallback;
    
    // Handle if it's already a valid Date object
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date;
    }
    
    // Handle string dates (ISO strings, timestamps, etc.)
    if (typeof date === 'string' || typeof date === 'number') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    return fallback;
  };

  const parsedStartDate = safeParseDate(task.startDate);
  const parsedDeadline = safeParseDate(task.deadline);
  
  const totalDurationDays = parsedStartDate && parsedDeadline 
    ? differenceInDays(parsedDeadline, parsedStartDate) + 1 
    : 0;
  
  const getTimelineWidth = () => {
    // Determine the full width needed based on total duration of the task
    // Ensure minimum width for better readability
    const minDays = 7; // Minimum 1 week for readability
    const displayDays = Math.max(minDays, totalDurationDays > 0 ? totalDurationDays : 30);
    return `${displayDays * scale + 200}px`; // Add padding for labels
  }

  const styles: { [key: string]: React.CSSProperties } = {
    container: {
        width: getTimelineWidth(), // Dynamic width
        backgroundColor: '#f1f5f9',
        fontFamily: '"Be Vietnam Pro", sans-serif',
        wordBreak: 'break-word',
        whiteSpace: 'normal',
        lineHeight: '1.75',
        fontSize: '1.5rem', // Adjusted for visual density
        padding: '2rem'
    },
    sheet: {
        backgroundColor: '#ffffff',
        padding: '3rem', // Reduced padding for compactness
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0'
    },
    header: {
        display: 'flex',
        flexDirection: 'column', // Stack children vertically
        alignItems: 'flex-start',
        marginBottom: '2rem', // Reduced margin
        paddingBottom: '1.5rem',
        borderBottom: `2px solid ${primaryColor}` // Reduced border size
    },
    h1: { fontSize: '3rem', fontWeight: 900, color: primaryColor, marginBottom: '0.5rem', lineHeight: 1 },
    taskInfo: { fontSize: '1.25rem', color: '#475569', lineHeight: '1.5' },
    taskInfoSpan: { fontWeight: 700, color: '#1e293b' },
    milestoneContainer: {
        position: 'relative',
        minHeight: `${milestones.length * (rowHeight + 4) + (rowHeight + 16)}px`, // Adjusted for spacing and header height
        padding: '1rem 0',
        overflowX: 'auto',
        border: '1px solid #cbd5e1',
        borderRadius: '0.5rem',
        marginTop: '2rem'
    },
    dateHeader: {
      position: 'relative', // Changed from sticky to relative for better rendering in static export
      width: 'max-content', // Allow content to dictate width
      minWidth: `${totalDurationDays * scale}px`, // Ensure it spans the full width of the timeline
      backgroundColor: '#f8fafc',
      padding: '0.5rem 0', // Reduced padding to match image
      borderBottom: '1px solid #e2e8f0',
      marginBottom: '0.5rem', // Reduced margin
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden',
      height: `${rowHeight}px`, // Explicit height
      alignItems: 'center',
      justifyContent: 'flex-start', // Align to start for day cells
    },
    dayCell: {
      flexShrink: 0,
      width: `${scale}px`, // Match scale
      textAlign: 'center',
      fontSize: '0.75rem',
      fontWeight: 500,
      color: '#475569',
      borderRight: '1px solid #e2e8f0',
      boxSizing: 'border-box',
      lineHeight: `${rowHeight}px`, // Center text vertically, fixed height.
      position: 'relative',
      overflow: 'hidden',
    },
    milestoneBar: {
      position: 'absolute',
      height: `${rowHeight - 8}px`, // Reduced height and added more spacing (8px for top/bottom margin simulation)
      backgroundColor: '#3b82f6', // Default color
      borderRadius: '0.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 0.5rem',
      fontSize: '0.875rem',
      color: '#fff',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      boxSizing: 'border-box'
    }
  };

  const renderDateHeaders = () => {
    if (!parsedStartDate || !parsedDeadline) return null;

    const days = [];
    let currentDate = new Date(parsedStartDate);
    let dayCount = 0;

    // Use loop to iterate dates, format dd/MM
    while (currentDate <= parsedDeadline && dayCount < 365) { 
      days.push(
        <div key={currentDate.toISOString()} style={styles.dayCell}>
          {format(currentDate, 'dd/MM')}
        </div>
      );
      currentDate.setDate(currentDate.getDate() + 1);
      dayCount++;
    }
    return days;
  };


  return (
    <div style={styles.container}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700;900&display=swap" rel="stylesheet" />
      
      <div style={styles.sheet}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.h1}>
              {task.name} - {(T as any).timelineCreator}
            </h1>
            <div style={styles.taskInfo}>
              <p><span style={styles.taskInfoSpan}>{T.startDate}:</span> {parsedStartDate ? format(parsedStartDate, 'MMM dd, yyyy') : 'N/A'}</p>
              <p><span style={styles.taskInfoSpan}>{T.deadline}:</span> {parsedDeadline ? format(parsedDeadline, 'MMM dd, yyyy') : 'N/A'}</p>
            </div>
          </div>
        </div>

        <div style={styles.milestoneContainer}>
            <div style={{ ...styles.dateHeader }}>
              {renderDateHeaders()}
            </div>
            {milestones.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#475569', fontSize: '1rem', marginTop: '1rem' }}>
                  {(T as any).noMilestonesYet}
                </p>
            ) : (
                milestones.map((milestone, index) => {
                    const msStartDate = safeParseDate(milestone.startDate);
                    const msEndDate = safeParseDate(milestone.endDate);

                    if (!msStartDate || !msEndDate || !parsedStartDate) return null;

                    // Calculate offset days from task start date
                    // Ensure offset is not negative (milestone can't start before task)
                    const rawOffsetDays = differenceInDays(msStartDate, parsedStartDate);
                    const offsetDays = Math.max(0, rawOffsetDays);

                    // Calculate duration, ensuring it's at least 1 day
                    const rawDurationDays = differenceInDays(msEndDate, msStartDate);
                    const durationDays = Math.max(1, rawDurationDays + 1);

                    // Calculate positions
                    const leftPosition = offsetDays * scale;
                    const barWidth = Math.min(durationDays * scale, (totalDurationDays - offsetDays) * scale);

                    // Only render if milestone is within task timeframe
                    if (msStartDate > parsedDeadline || msEndDate < parsedStartDate) {
                      return null;
                    }

                    return (
                        <div
                            key={milestone.id}
                            style={{
                                ...styles.milestoneBar,
                                top: `${rowHeight + 4 + (index * (rowHeight + 4))}px`,
                                left: `${leftPosition}px`,
                                width: `${barWidth}px`,
                                backgroundColor: milestone.color || primaryColor,
                            }}
                        >
                            <span style={{flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '0.5rem'}}>
                                {milestone.name}
                            </span>
                            {barWidth > 150 && (
                                <span style={{fontSize: '0.65rem', opacity: 0.8}}>
                                    {format(msStartDate, 'dd/MM')} - {format(msEndDate, 'dd/MM')}
                                </span>
                            )}
                        </div>
                    );
                })
            )}
        </div>
      </div>
    </div>
  );
};

export default PrintableTimeline;