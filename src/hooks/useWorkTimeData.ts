"use client";
import { useState, useEffect, useCallback } from 'react';
import { WorkSession } from '@/lib/helpers/time-analyzer';

const STORAGE_KEY = 'work-time-sessions';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function useWorkTimeData(initialSessions?: WorkSession[]) {
  const [sessions, setSessions] = useState<WorkSession[]>(Array.isArray(initialSessions) ? initialSessions : []);
  
  useEffect(() => {
    if (Array.isArray(initialSessions)) {
      if (initialSessions.length === 0 && sessions.length > 0) {
        // Clear triggered -> reset sessions
        setSessions([]);
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      if (initialSessions.length > 0) {
        setSessions(initialSessions);
        return;
      }
    }
    if (sessions.length === 0) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setSessions(JSON.parse(raw));
      } catch {}
    }
  }, [initialSessions]);

  useEffect(() => {
    try { 
      if (sessions.length > 0 && (!initialSessions || initialSessions.length === 0)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      }
      if (sessions.length === 0 && (!initialSessions || initialSessions.length === 0)) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, [sessions, initialSessions]);

  // Provide a safe reset if sessions field missing after a restore
  useEffect(() => {
    if (!Array.isArray(initialSessions) && sessions.length === 0) {
      // Seed empty structure (no-op, but makes intent explicit)
      setSessions([]);
    }
  }, [initialSessions, sessions.length]);

  const checkIn = useCallback(() => {
    setSessions(prev => prev.some(s=> s.type === 'WORK_SESSION' && !s.endTime) ? prev : [
        ...prev, { 
            id: generateId(),
            type: 'WORK_SESSION',
            startTime: new Date().toISOString(),
            endTime: '' // Marked as active
        }
    ]);
  }, []);

  const checkOut = useCallback(() => {
    setSessions(prev => prev.map(s => (s.type === 'WORK_SESSION' && !s.endTime) ? { ...s, endTime: new Date().toISOString() } : s));
  }, []);
  
  const savePomodoroSession = useCallback((durationMinutes: number) => {
      const now = new Date();
      setSessions(prev => [
          ...prev, {
              id: generateId(),
              type: 'POMODORO_FOCUS',
              startTime: new Date(now.getTime() - durationMinutes * 60 * 1000).toISOString(),
              endTime: now.toISOString(),
              durationMinutes
          }
      ])
  }, []);

  return { sessions, checkIn, checkOut, savePomodoroSession };
}
