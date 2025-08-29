"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { WorkSession } from '@/lib/helpers/time-analyzer';

const STORAGE_KEY = 'work-time-sessions';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function useWorkTimeData(initialSessions?: WorkSession[]) {
  // Prefer persisted localStorage sessions (most-recent local changes) when available.
  const [sessions, setSessions] = useState<WorkSession[]>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        try { console.debug('[worktime] init: read from localStorage', JSON.parse(raw)); } catch {}
        return JSON.parse(raw);
      }
    } catch {}
    return Array.isArray(initialSessions) ? initialSessions : [];
  });
  const initializedRef = useRef(false);

  // Ensure we synchronously reconcile localStorage on mount. This protects
  // against hydration/race issues where initialSessions may arrive as an
  // empty array and unintentionally cause local state to be treated as empty.
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.debug('[worktime] mount: loaded sessions from localStorage (mount-time)', parsed);
          setSessions(parsed);
          // Mark initialized so incoming appData won't clobber local active session
          initializedRef.current = true;
          return;
        }
      }
    } catch (err) {
      console.debug('[worktime] mount: failed to read localStorage', err);
    }
  }, []);

  useEffect(() => {
    // Initialize from app-provided sessions only once (or when they contain data).
    // Important: do NOT clear local sessions when app data provides an empty array —
    // that causes a surprising feedback loop where local check-in/out is reverted when
    // the central appData hasn't been intentionally cleared (e.g. on load).
    if (Array.isArray(initialSessions)) {
      // Filter out active sessions (no endTime) from app-provided data to avoid
      // unintentionally re-opening a user's check-in on reload. We'll only merge
      // completed sessions from appData and prefer local entries when IDs conflict.
      const appCompleted = initialSessions.filter(s => !!s.endTime);

      if (!initializedRef.current) {
        initializedRef.current = true;
        // If local already has sessions, merge completed ones without overwriting local
        if ((sessions || []).length === 0 && appCompleted.length > 0) {
          console.debug('[worktime] init: applying app-provided completed sessions because local is empty', appCompleted);
          setSessions(appCompleted);
          return;
        }
        if ((sessions || []).length > 0 && appCompleted.length > 0) {
          // merge dedupe by id, prefer local
          const byId: Record<string, any> = {};
          [...appCompleted, ...sessions].forEach(s => { byId[s.id] = byId[s.id] || s; });
          const merged = Object.values(byId) as WorkSession[];
          console.debug('[worktime] init: merging app-completed sessions into local', merged);
          setSessions(merged);
          return;
        }
      } else {
        // Post-init updates (e.g., after a restore): only add completed sessions that don't exist locally
        if (appCompleted.length > 0) {
          const localIds = new Set((sessions || []).map(s => s.id));
          const toAdd = appCompleted.filter(s => !localIds.has(s.id));
          if (toAdd.length > 0) {
            console.debug('[worktime] update: adding non-duplicate completed sessions from appData', toAdd);
            setSessions(prev => [...prev, ...toAdd]);
          }
        }
      }
    }
  }, [initialSessions, sessions.length]);

  useEffect(() => {
    try {
      if (sessions.length > 0) {
        console.debug('[worktime] persist: writing to localStorage', sessions);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      } else {
        // Keep existing key when sessions empty to avoid accidental race conditions.
        console.debug('[worktime] persist: sessions empty — leaving localStorage intact');
      }
    } catch {}
  }, [sessions]);

  // Provide a safe reset if sessions field missing after a restore
  useEffect(() => {
    if (!Array.isArray(initialSessions) && sessions.length === 0) {
      // Seed empty structure (no-op, but makes intent explicit)
      setSessions([]);
    }
  }, [initialSessions, sessions.length]);

  const checkIn = useCallback(() => {
    setSessions(prev => {
      const hasActive = prev.some(s=> s.type === 'WORK_SESSION' && !s.endTime);
      if (hasActive) return prev;
      const next = [
        ...prev, ({ 
          id: generateId(),
          type: 'WORK_SESSION',
          startTime: new Date().toISOString(),
          endTime: '' // Marked as active
        } as unknown) as WorkSession
      ];
      try { console.debug('[worktime] action: checkIn ->', next); } catch {}
      return next;
    });
  }, []);

  const checkOut = useCallback(() => {
    setSessions(prev => {
      const next = prev.map(s => (s.type === 'WORK_SESSION' && !s.endTime) ? { ...s, endTime: new Date().toISOString() } : s);
      try { console.debug('[worktime] action: checkOut ->', next); } catch {}
      return next;
    });
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
