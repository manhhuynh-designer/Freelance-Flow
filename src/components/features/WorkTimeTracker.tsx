"use client";
import { useEffect, useState } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { Check, Play } from 'lucide-react';

// Header pill style work time tracker (clickable pill toggles state)
export function WorkTimeTracker() {
  const { workTime } = useDashboard() as any;
  const activeSession = Array.isArray(workTime?.sessions)
    ? workTime.sessions.find((s: any) => s?.type === 'WORK_SESSION' && !s?.endTime)
    : undefined;
  const active = !!activeSession;
  const [_, setTick] = useState(0);
  useEffect(() => {
    if (active) {
      const id = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(id);
    }
  }, [active]);
  const duration = activeSession
    ? Math.floor((Date.now() - new Date(activeSession.startTime).getTime()) / 1000)
    : 0;
  const h = Math.floor(duration / 3600), m = Math.floor((duration % 3600) / 60), s = duration % 60;
  const handleToggle = () => { active ? workTime?.checkOut?.() : workTime?.checkIn?.(); };
  const timeText = active ? `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}` : 'OFF';
  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={active ? 'Stop work session' : 'Start work session'}
      className={
        `group relative flex h-10 w-28 select-none items-center rounded-full border-2 shadow-sm overflow-hidden transition-colors duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background ` +
        (active
          ? 'bg-green-600'
          : 'bg-muted/40 hover:bg-muted/60')
      }
    >
      <div className={`flex w-full items-center ${active ? 'flex-row-reverse' : ''} justify-between px-2 transition-all duration-500 ease-in-out`}>
        {/* Knob */}
        <span
          className={
            'flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500 ease-in-out shadow-inner ' +
            (active
              ? 'bg-white text-green-600 translate-x-1'
              : 'bg-background text-muted-foreground translate-x-0')
          }
        >
          {active ? <Check className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </span>
        {/* Text */}
        <span
          className={
            'p-3 font-mono tabular-nums text-sm tracking-tight min-w-[40px] text-center transition-colors duration-300 ' +
            (active ? 'text-white' : 'text-foreground/80')
          }
        >
          {timeText}
        </span>
      </div>
    </button>
  );
}
