/* eslint-disable */
/**
 * Deadline Alerts Card
 * Displays deadline risk assessments with interactive task buttons and quick actions
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, CheckCircle, AlertTriangle, Flag, FlagOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboard } from '../../../contexts/dashboard-context';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import type { DeadlineIntelligenceMetrics } from '../../../ai/analytics/personal-deadline-intelligence';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface DeadlineAlertsCardProps {
  metrics: DeadlineIntelligenceMetrics;
  onTaskClick: (taskId: string) => void;
  onTaskUpdated?: () => void;
}

const FALLBACK_STATUSES = [
  { id: 'todo', label: 'Todo' },
  { id: 'inprogress', label: 'In Progress' },
  { id: 'done', label: 'Done' }
];

const eisenhowerSchemes: Record<string, Record<string,string>> = {
  colorScheme1: { do: '#ef4444', decide: '#3b82f6', delegate: '#f59e42', delete: '#6b7280' },
  colorScheme2: { do: '#d8b4fe', decide: '#bbf7d0', delegate: '#fed7aa', delete: '#bfdbfe' },
  colorScheme3: { do: '#99f6e4', decide: '#fbcfe8', delegate: '#fde68a', delete: '#c7d2fe' },
};

export function DeadlineAlertsCard({ metrics, onTaskClick, onTaskUpdated }: DeadlineAlertsCardProps) {
  const { appData, updateTask, handleTaskStatusChange, updateTaskEisenhowerQuadrant, T } = useDashboard() as any;
  const { tasks = [] } = appData || {};
  const statusSettings = appData?.appSettings?.statusSettings || FALLBACK_STATUSES;
  const statusColors = appData?.appSettings?.statusColors || {};
  const scheme = appData?.appSettings?.eisenhowerColorScheme || 'colorScheme1';

  const triggerRefresh = () => { if (onTaskUpdated) onTaskUpdated(); };
  const getTask = (taskId: string) => tasks.find((t: any) => t.id === taskId);
  const handleStatusChange = (taskId: string, statusId: string, subStatusId?: string) => { handleTaskStatusChange?.(taskId, statusId, subStatusId); triggerRefresh(); };
  const handleDeadlineExtend = (taskId: string, days: number) => { const task = getTask(taskId); if (!task?.deadline) return; const nd = new Date(task.deadline); nd.setDate(nd.getDate()+days); updateTask({ id: taskId, deadline: nd.toISOString() }); triggerRefresh(); };
  const handleDeadlinePick = (taskId: string, date: Date | undefined) => { if (!date) return; updateTask({ id: taskId, deadline: date.toISOString() }); triggerRefresh(); };
  const getFlagColor = (quadrant?: string) => { if (!quadrant) return '#e5e7eb'; const colors = eisenhowerSchemes[scheme] || eisenhowerSchemes.colorScheme1; return colors[quadrant] || '#e5e7eb'; };
  const formatDeadline = (deadline: string) => { const d = new Date(deadline); const diffDays = Math.ceil((d.getTime()-Date.now())/86400000); if (diffDays<0) return (T?.overdueByDays || 'Overdue by {days} days').replace('{days}', String(Math.abs(diffDays))); if (diffDays===0) return T?.dueToday || 'Due today'; if (diffDays===1) return T?.dueTomorrow || 'Due tomorrow'; return (T?.dueInDays || 'Due in {days} days').replace('{days}', String(diffDays)); };

  const colorClassFor = (hex?: string) => {
    if (!hex) return 'bg-gray-400';
    const h = hex.toLowerCase();
    if (h.includes('ef4444') || h.includes('ff0000')) return 'bg-red-500';
    if (h.includes('3b82f6') || h.includes('2563eb') || h.includes('1d4ed8')) return 'bg-blue-500';
    if (h.includes('f59e42') || h.includes('f59e0b') || h.includes('ffa500')) return 'bg-amber-500';
    if (h.includes('10b981') || h.includes('059669')) return 'bg-emerald-500';
    if (h.includes('6366f1') || h.includes('4f46e5')) return 'bg-indigo-500';
    if (h.includes('8b5cf6') || h.includes('7c3aed')) return 'bg-violet-500';
    if (h.includes('ec4899') || h.includes('db2777')) return 'bg-pink-500';
    if (h.includes('6b7280') || h.includes('9ca3af')) return 'bg-gray-500';
    return 'bg-gray-400';
  };

  return (
    <Card>
      <CardHeader>
  <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" />{T?.deadlineAlerts || 'Deadline Alerts'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.riskAssessments.slice(0,5).map((risk, idx) => {
            const task = getTask(risk.taskId); if (!task) return null;
            return (
              <div key={idx} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Button variant="link" className="p-0 h-auto font-medium text-left" onClick={()=>onTaskClick(risk.taskId)}>{risk.taskName}</Button>
                    <div className="text-sm text-muted-foreground mt-1">{T?.progressLabel || 'Progress:'} {risk.currentProgress}%</div>
                  </div>
                  <Badge variant={risk.riskLevel==='critical'||risk.riskLevel==='high' ? 'destructive' : risk.riskLevel==='medium' ? 'secondary' : 'outline'}>{risk.riskLevel}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 px-2 flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{task.deadline ? format(new Date(task.deadline),'dd/MM') : (T?.setDue || 'Set due')}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <Calendar mode="single" selected={task.deadline? new Date(task.deadline):undefined} onSelect={(date)=>handleDeadlinePick(risk.taskId, date)} initialFocus />
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="outline" className="h-6 px-2" onClick={()=>handleDeadlineExtend(risk.taskId,3)}>{T?.add3d || '+3d'}</Button>
                        <Button size="sm" variant="outline" className="h-6 px-2" onClick={()=>handleDeadlineExtend(risk.taskId,7)}>{T?.add1w || '+1w'}</Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">{task.deadline ? formatDeadline(task.deadline) : (T?.noDeadline || 'No deadline')}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge className="inline-flex items-center gap-2 cursor-pointer px-3 py-1 border-transparent hover:opacity-80 transition-opacity" style={{ backgroundColor: statusColors[task.status] || '#e5e7eb', color: '#fff' }}>
                        <CheckCircle className="h-3 w-3" />
                        <span className="font-medium text-xs truncate max-w-[90px]">{(statusSettings.find((s:any)=>s.id===task.status)?.label) || task.status}</span>
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuLabel>{T?.statusLabel || 'Status'}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {statusSettings.map((s:any)=>(
                        <div key={s.id} className="relative">
                          <DropdownMenuRadioItem value={s.id} onClick={()=>handleStatusChange(risk.taskId, s.id)} className={cn('flex items-center justify-between', task.status===s.id && 'font-semibold bg-accent')}>
                            {/* dynamic color dot */}
                            <div className="flex items-center gap-2">
                              <span className={"w-3 h-3 rounded-full inline-block " + colorClassFor(statusColors[s.id])} />
                              <span>{s.label || s.name}</span>
                            </div>
                          </DropdownMenuRadioItem>
                          {!!s.subStatuses?.length && (
                            <div className="ml-6 mt-1 flex flex-wrap gap-1">
                              {s.subStatuses.map((sub:any)=>(
                                <button key={sub.id} onClick={(e)=>{ e.stopPropagation(); handleStatusChange(risk.taskId, s.id, sub.id); }} className={cn('px-2 py-0.5 rounded text-[10px] border hover:bg-accent', task.subStatusId===sub.id && 'bg-accent font-medium')}>
                                  {sub.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title={T?.eisenhowerPriority || 'Eisenhower priority'}>{task.eisenhowerQuadrant ? (<Flag className="w-4 h-4" color={getFlagColor(task.eisenhowerQuadrant)} fill={getFlagColor(task.eisenhowerQuadrant)} />) : (<FlagOff className="w-4 h-4 text-muted-foreground" />)}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="start">
                      <div className="grid grid-cols-2 gap-2">
                        {['do','decide','delegate','delete'].map(q => (
                          <Button key={q} variant={task.eisenhowerQuadrant===q ? 'default':'outline'} size="sm" className="h-8 px-2 flex items-center gap-1 justify-start" onClick={()=>{ updateTaskEisenhowerQuadrant?.(risk.taskId, q); triggerRefresh(); }}>
                            <Flag className="w-3 h-3" color={getFlagColor(q)} fill={getFlagColor(q)} />
                            <span className="text-[11px] capitalize">{T?.[`quadrant_${q}`] || q}</span>
                          </Button>
                        ))}
                        <Button variant={!task.eisenhowerQuadrant ? 'default':'outline'} size="sm" className="h-8 px-2 col-span-2" onClick={()=>{ updateTaskEisenhowerQuadrant?.(risk.taskId, undefined); triggerRefresh(); }}>
                          <FlagOff className="w-3 h-3" />
                          <span className="text-[11px]">{T?.clearLabel || 'Clear'}</span>
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            );
          })}
          {metrics.riskAssessments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground"><CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" /><p>{T?.noDeadlineRisks || 'No deadline risks detected'}</p><p className="text-xs">{T?.allOnTrack || 'All tasks are on track!'}</p></div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
