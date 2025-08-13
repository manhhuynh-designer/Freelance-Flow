"use client";
import type { StatusColors } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import React from 'react';

interface Props { statusSettings: { id: string; label: string }[]; statusColors: StatusColors; excluded: Set<string>; onToggle: (statusId: string) => void; dense?: boolean; }

const STYLE_ID = 'status-filter-color-styles';
const injected: Record<string, boolean> = {};
function ensureStyleEl() { if (typeof document === 'undefined') return; let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null; if (!el) { el = document.createElement('style'); el.id = STYLE_ID; document.head.appendChild(el); } return el; }
function colorClass(hex: string) { return 'sf_' + hex.replace(/[^a-fA-F0-9]/g,'').slice(0,10) || 'x'; }

export const StatusFilter = ({ statusSettings, statusColors, excluded, onToggle, dense }: Props) => {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-3">
        {statusSettings.map(status => {
          const color = ((statusColors as any)[status.id] || '#ccc').toLowerCase();
          const included = !excluded.has(status.id);
          const cls = colorClass(color);
          if (typeof document !== 'undefined' && !injected[cls]) {
            const el = ensureStyleEl();
            el?.appendChild(document.createTextNode(`.${cls}{background:${color};}`));
            injected[cls] = true;
          }
          const btnClasses = [
            'relative w-7 h-7 md:w-8 md:h-8 rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring', cls,
            included ? 'opacity-100 shadow-sm border-white' : 'opacity-40 hover:opacity-70 border-transparent',
          ].join(' ');
          return (
            <Tooltip key={status.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`${status.label} ${included ? 'included' : 'excluded'}`}
                  onClick={() => onToggle(status.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(status.id); } }}
                  className={btnClasses}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {status.label} {included ? '' : '(hidden)'}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      {!dense && (
        <div className="flex flex-wrap gap-2 mt-3">
          {statusSettings.map(s => !excluded.has(s.id) && (
            <span key={s.id} className="px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground uppercase tracking-wide">
              {s.label}
            </span>
          ))}
        </div>
      )}
    </TooltipProvider>
  );
};
