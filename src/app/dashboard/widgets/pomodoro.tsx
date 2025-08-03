"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AppSettings } from '@/lib/types';
import { i18n } from '@/lib/i18n';
import { Timer, Play, Pause, RefreshCw, MoreVertical, SkipForward, Expand, Minimize } from 'lucide-react';

type SessionType = 'work' | 'break';

type PomodoroProps = {
    settings: AppSettings;
}

const usePomodoroTimer = () => {
    const [settings, setSettings] = useState({ work: 25, break: 5 });
    const [sessionType, setSessionType] = useState<SessionType>('work');
    const [timeRemaining, setTimeRemaining] = useState(settings.work * 60);
    const [isActive, setIsActive] = useState(false);

    const audio = useMemo(() => {
        if (typeof window !== 'undefined') {
            return new Audio('https://www.soundjay.com/buttons/sounds/button-3.mp3');
        }
        return null;
    }, []);
    
    const skipSession = useCallback(() => {
        setIsActive(false);
        const nextSession = sessionType === 'work' ? 'break' : 'work';
        setSessionType(nextSession);
        setTimeRemaining(settings[nextSession] * 60);
    }, [sessionType, settings]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isActive && timeRemaining > 0) {
            interval = setInterval(() => setTimeRemaining(time => time - 1), 1000);
        } else if (isActive && timeRemaining === 0) {
            audio?.play().catch(e => console.error("Error playing sound:", e));
            skipSession();
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

const FullscreenPomodoro = ({ T, timeRemaining, isActive, sessionType, toggle, reset, skipSession, formatTime, onClose }: any) => {
    const getBackgroundColor = () => {
        if (!isActive) return '#FFFFFF'; // White
        if (sessionType === 'work') return '#cb4848ff'; // Pastel Red
        if (sessionType === 'break') return '#3bb86fff';
        return '#FFFFFF';
    };

    const textColorClass = isActive ? 'text-white' : 'text-foreground';

    const cardStyle: React.CSSProperties = {
        backgroundColor: getBackgroundColor(),
        transition: 'background-color 0.3s ease',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <Card className="w-screen h-screen flex flex-col border-0 shadow-none" style={cardStyle}>
                <CardHeader className="flex-shrink-0">
                    <div className="flex items-center justify-end p-4">
                        <Button variant="ghost" size="icon" className={`h-8 w-8 ${textColorClass}`} onClick={onClose}>
                            <Minimize className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center justify-center space-y-8">
                    <p className={`font-bold font-mono ${textColorClass} text-8xl md:text-9xl`}>
                      {formatTime(timeRemaining)}
                    </p>
                    <div className={`flex items-center space-x-4 ${textColorClass}`}>
                      <Button variant="ghost" size="icon" className={`${textColorClass} hover:${textColorClass}`} onClick={reset}>
                        <RefreshCw className="h-6 w-6" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={toggle} className={`h-20 w-20 ${textColorClass} hover:${textColorClass}`}>
                        {isActive ? <Pause className="h-12 w-12" /> : <Play className="h-12 w-12" />}
                      </Button>
                      <Button variant="ghost" size="icon" className={`${textColorClass} hover:${textColorClass}`} onClick={skipSession}>
                          <SkipForward className="h-6 w-6"/>
                      </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};


export function PomodoroWidget({ settings: appSettings }: PomodoroProps) {
  const T = i18n[appSettings.language];
  const pomodoro = usePomodoroTimer();
  const [localSettings, setLocalSettings] = useState(pomodoro.settings);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSettingsSave = () => pomodoro.updateSettings(localSettings);

  const sessionTitles: Record<SessionType, string> = {
      work: T.pomodoroWork,
      break: T.pomodoroBreak,
  };
  
  const getBackgroundColor = () => {
      if (!pomodoro.isActive) return 'transparent'; // White
      if (pomodoro.sessionType === 'work') return '#cb4848ff'; // Pastel Red
      if (pomodoro.sessionType === 'break') return '#3bb86fff';
      return 'transparent';
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: getBackgroundColor(),
    transition: 'background-color 0.3s ease',
  };


  return (
    <>
      <Card className="w-full h-full flex flex-col" style={cardStyle}>
        <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <Timer className={`h-4 w-4 mr-2 ${pomodoro.isActive ? 'text-white' : 'text-muted-foreground'}`} />
                    <CardTitle className={`text-sm font-normal ${pomodoro.isActive ? 'text-white' : 'text-muted-foreground'}`}>
                        {(T as any).pomodoroWidgetName} - {sessionTitles[pomodoro.sessionType]}
                    </CardTitle>
                </div>
                <div className="flex items-center space-x-1">
                     <Dialog onOpenChange={() => setLocalSettings(pomodoro.settings)}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className={`h-6 w-6 ${pomodoro.isActive ? 'text-white hover:bg-white/10' : ''}`}><MoreVertical className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                        <DialogTitle>{T.pomodoroSettings}</DialogTitle>
                        <DialogDescription>{T.pomodoroSettingsDesc}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                <Label htmlFor="work-duration">{T.pomodoroWorkMinutes}</Label>
                                    <Input id="work-duration" type="number" value={localSettings.work} onChange={(e) => setLocalSettings({...localSettings, work: parseInt(e.target.value, 10) || 0})}/>
                                </div>
                                <div className="space-y-2">
                                <Label htmlFor="break-duration">{T.pomodoroBreakMinutes}</Label>
                                    <Input id="break-duration" type="number" value={localSettings.break} onChange={(e) => setLocalSettings({...localSettings, break: parseInt(e.target.value, 10) || 0})} />
                                </div>
                            </div>
                            <DialogFooter><DialogTrigger asChild><Button onClick={handleSettingsSave}>{T.save}</Button></DialogTrigger></DialogFooter>
                        </DialogContent>
                    </Dialog>
                     <Button variant="ghost" size="icon" className={`h-6 w-6 ${pomodoro.isActive ? 'text-white hover:bg-white/10' : ''}`} onClick={() => setIsFullscreen(true)}>
                        <Expand className="h-4 w-4" />
                     </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center space-y-4 react-grid-draggable-cancel">
            <p className={`font-bold font-mono text-6xl ${pomodoro.isActive ? 'text-white' : 'text-foreground'}`}>
              {pomodoro.formatTime(pomodoro.timeRemaining)}
            </p>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={pomodoro.reset} className={`${pomodoro.isActive ? 'text-white hover:bg-white/10' : ''}`}>
                <RefreshCw className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={pomodoro.toggle} className={`h-16 w-16 ${pomodoro.isActive ? 'text-white hover:bg-white/10' : ''}`}>
                {pomodoro.isActive ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => pomodoro.skipSession()} className={`${pomodoro.isActive ? 'text-white hover:bg-white/10' : ''}`}>
                  <SkipForward className="h-5 w-5"/>
              </Button>
            </div>
        </CardContent>
      </Card>
      {isClient && isFullscreen && document.body && ReactDOM.createPortal(
        <FullscreenPomodoro
          {...pomodoro}
          T={T}
          onClose={() => setIsFullscreen(false)}
        />,
        document.body
      )}
    </>
  );
}