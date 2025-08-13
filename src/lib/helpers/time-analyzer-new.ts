// Work time analysis helper pure functions

export type SessionType = 'WORK_SESSION' | 'POMODORO_FOCUS';

export interface WorkSession { 
  id: string;
  type: SessionType;
  startTime: string; 
  endTime: string; 
  durationMinutes?: number; // duration for pomodoro
}

export interface WorkTimeStats {
  sessions: WorkSession[];
  activeSession?: WorkSession;
  totalWorkHours: number;
  totalFocusHours: number;
  completedPomodoros: number;
  dailyBreakdown: Array<{ date: string; workHours: number; pomodoros: number }>;
}

const MS_PER_HOUR = 1000 * 60 * 60;

function calculateDurationHours(session: WorkSession): number {
    if (session.type === 'POMODORO_FOCUS' && session.durationMinutes) {
        return session.durationMinutes / 60;
    }
    if (!session.endTime) return 0; // For active sessions, return 0
    const end = new Date(session.endTime).getTime();
    return Math.max(0, (end - new Date(session.startTime).getTime()) / MS_PER_HOUR);
}

export function buildWorkTimeStats(sessions: WorkSession[], startDate: Date, endDate: Date): WorkTimeStats {
    const startMs = startDate.getTime();
    // Set end of day for endDate
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    const endMs = endOfDay.getTime();
    
    const relevantSessions = sessions.filter(s => {
        const sessionStartMs = new Date(s.startTime).getTime();
        return sessionStartMs >= startMs && sessionStartMs <= endMs && s.endTime; // Only completed sessions
    });

    const activeSession = sessions.find(s => s.type === 'WORK_SESSION' && !s.endTime);
    
    const totalWorkHours = relevantSessions
        .filter(s => s.type === 'WORK_SESSION')
        .reduce((sum, s) => sum + calculateDurationHours(s), 0);

    const completedPomodoros = relevantSessions.filter(s => s.type === 'POMODORO_FOCUS').length;
    
    const totalFocusHours = relevantSessions
        .filter(s => s.type === 'POMODORO_FOCUS')
        .reduce((sum, s) => sum + calculateDurationHours(s), 0);
        
    const dailyBreakdown: Array<{ date: string; workHours: number; pomodoros: number }> = [];
    const dateCursor = new Date(startDate);
    while (dateCursor <= endDate) {
        const dayStartMs = new Date(dateCursor).setHours(0, 0, 0, 0);
        const dayEndMs = dayStartMs + 24 * MS_PER_HOUR;
        
        const workHours = relevantSessions
            .filter(s => s.type === 'WORK_SESSION' && new Date(s.startTime).getTime() >= dayStartMs && new Date(s.startTime).getTime() < dayEndMs)
            .reduce((sum, s) => sum + calculateDurationHours(s), 0);

        const pomodoros = relevantSessions
            .filter(s => s.type === 'POMODORO_FOCUS' && new Date(s.startTime).getTime() >= dayStartMs && new Date(s.startTime).getTime() < dayEndMs)
            .length;

        dailyBreakdown.push({
            date: new Date(dayStartMs).toISOString().substring(0, 10),
            workHours: parseFloat(workHours.toFixed(2)),
            pomodoros
        });
        
        dateCursor.setDate(dateCursor.getDate() + 1);
    }

    return {
        sessions: relevantSessions,
        activeSession,
        totalWorkHours,
        totalFocusHours,
        completedPomodoros,
        dailyBreakdown,
    };
}
