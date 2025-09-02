"use client";
import { useState, useEffect, useCallback } from 'react';
import { WorkSession } from '@/lib/helpers/time-analyzer';
import { browserLocal } from '@/lib/browser';

const STORAGE_KEY = 'work-time-sessions';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function useWorkTimeData() {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  
  useEffect(() => {
    try {
      const raw = browserLocal.getItem(STORAGE_KEY);
      if (raw) setSessions(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
  try { 
    if (sessions.length > 0) {
      browserLocal.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  } catch {}
  }, [sessions]);

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
