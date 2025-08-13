"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';

export type PomodoroSessionType = 'work' | 'break';

type UsePomodoroTimerProps = {
    initialSettings: { work: number, break: number };
    onSessionComplete?: (sessionType: PomodoroSessionType, durationMinutes: number) => void;
};

export const usePomodoroTimer = ({ initialSettings, onSessionComplete }: UsePomodoroTimerProps) => {
    const [settings, setSettings] = useState(initialSettings);
    const [sessionType, setSessionType] = useState<PomodoroSessionType>('work');
    const [timeRemaining, setTimeRemaining] = useState(settings.work * 60);
    const [isActive, setIsActive] = useState(false);

    const audio = useMemo(() => {
        if (typeof window !== 'undefined') {
            return new Audio('https://www.soundjay.com/buttons/sounds/button-3.mp3');
        }
        return null;
    }, []);
    
    const skipSession = useCallback((isCompleted: boolean = false) => {
        // CHÈN LOGIC MỚI: Chỉ gọi callback khi một phiên "work" thực sự hoàn thành
        if (isCompleted && sessionType === 'work') {
            onSessionComplete?.(sessionType, settings.work);
        }
        
        setIsActive(false);
        const nextSession = sessionType === 'work' ? 'break' : 'work';
        setSessionType(nextSession);
        setTimeRemaining(settings[nextSession] * 60);
    }, [sessionType, settings, onSessionComplete]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isActive && timeRemaining > 0) {
            interval = setInterval(() => setTimeRemaining(time => time - 1), 1000);
        } else if (isActive && timeRemaining === 0) {
            audio?.play().catch(e => console.error("Error playing sound:", e));
            skipSession(true); // Đánh dấu là phiên đã hoàn thành
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isActive, timeRemaining, skipSession, audio]);
    
    const toggle = () => setIsActive(!isActive);
    
    const reset = () => {
        setIsActive(false);
        setTimeRemaining(settings[sessionType] * 60);
    }
    
    const updateSettings = (newSettings: { work: number, break: number }) => {
        setSettings(newSettings);
        if (!isActive) {
           setTimeRemaining(newSettings[sessionType] * 60);
        }
    };
    
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    return { timeRemaining, isActive, sessionType, toggle, reset, skipSession, updateSettings, settings, formatTime };
};
