
"use client"
import * as React from "react"
import { CalendarIcon } from "@radix-ui/react-icons"
import { addDays, format, startOfMonth } from "date-fns"
import { useDashboard } from "../../../contexts/dashboard-context";
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface TimeRangePickerProps extends React.HTMLAttributes<HTMLDivElement> { date: DateRange | undefined; setDate: React.Dispatch<React.SetStateAction<DateRange | undefined>> }

const buildPresets = (T:any): { id: string; label: string; compute: () => DateRange }[] => ([
  { id: 'last-7', label: T?.last7DaysPreset || 'Last 7 days', compute: () => { const now = new Date(); return { from: addDays(now, -6), to: now }; } },
  { id: 'last-30', label: T?.last30DaysPreset || 'Last 30 days', compute: () => { const now = new Date(); return { from: addDays(now, -29), to: now }; } },
  { id: 'this-month', label: T?.thisMonthPreset || 'This month', compute: () => { const now = new Date(); return { from: startOfMonth(now), to: now }; } },
]);

export function TimeRangePicker({ className, date, setDate }: TimeRangePickerProps) {
  const { T } = useDashboard() as any;
  const PRESETS = React.useMemo(()=>buildPresets(T), [T]);
  const [open, setOpen] = React.useState(false);
  const applyPreset = (id: string) => { const preset = PRESETS.find(p => p.id === id); if (preset) { setDate(preset.compute()); } };
  return (
    <div className={cn("", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date-range-trigger"
            variant="outline"
            className={cn(
              "h-9 w-[260px] justify-start text-left font-normal bg-background flex items-center gap-2 overflow-hidden",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground shrink-0">{T?.rangeLabel || 'Range:'}</span>
            <span className="text-sm font-normal truncate">
              {date?.from ? (
                date.to
                  ? `${format(date.from, "dd/MM/yyyy")} - ${format(date.to, "dd/MM/yyyy")}`
          : format(date.from, "dd/MM/yyyy")
        ) : (T?.pickADate || 'Pick a date')}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-background border shadow-md" align="start">
          <div className="flex flex-col sm:flex-row">
            <div className="p-3 w-full sm:w-40 border-b sm:border-b-0 sm:border-r flex sm:flex-col gap-2 sm:gap-3">
              {PRESETS.map(p => (
                <Button key={p.id} variant="secondary" size="sm" className="justify-start w-full text-xs" onClick={() => { applyPreset(p.id); }}>{p.label}</Button>
              ))}
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
              className="border-0 bg-background"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 p-3",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium text-foreground",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 text-foreground hover:bg-accent hover:text-accent-foreground",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.7rem]",
                row: "flex w-full mt-2",
                cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                day: "h-8 w-8 p-0 font-normal text-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors text-xs",
                day_selected: "!bg-primary !text-white hover:!bg-primary/90 hover:!text-white focus:!bg-primary focus:!text-white font-medium",
                day_range_start: "!bg-primary !text-white hover:!bg-primary/90 hover:!text-white focus:!bg-primary focus:!text-white font-medium rounded-l-md",
                day_range_end: "!bg-primary !text-white hover:!bg-primary/90 hover:!text-white focus:!bg-primary focus:!text-white font-medium rounded-r-md",
                day_range_middle: "!bg-primary/20 !text-foreground hover:!bg-primary/30 hover:!text-foreground focus:!bg-primary/30 focus:!text-foreground",
                day_today: "!bg-accent !text-accent-foreground font-semibold border border-primary/50",
                day_outside: "!text-muted-foreground/50 opacity-50",
                day_disabled: "!text-muted-foreground/30 opacity-30 cursor-not-allowed",
                day_hidden: "invisible",
              }}
            />
          </div>
          <div className="flex justify-end p-3 gap-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => { setDate(undefined); }}>{T?.clearLabel || 'Clear'}</Button>
            <Button size="sm" onClick={() => setOpen(false)}>{T?.applyLabel || 'Apply'}</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

