"use client";

import * as React from "react";
import { DateRange } from "react-day-picker";
import { format, addDays, endOfWeek, endOfMonth, isValid } from "date-fns";
import { CalendarIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type TLike = Record<string, any> | undefined;

export interface TaskDateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  T?: TLike; // i18n map from forms
  className?: string;
}

// Build presets per requirement: Tomorrow / End of week / End of month / Next 5 days / Next 14 days
function buildPresets(T: TLike) {
  const t = (key: string, fallback: string) => (T && (T as any)[key]) || fallback;
  const now = new Date();
  return [
    {
      id: "tomorrow",
      label: t("tomorrowPreset", "Ngày mai"),
      compute: (): DateRange => {
        const d = addDays(now, 1);
        return { from: d, to: d };
      },
    },
    {
      id: "end-week",
      label: t("endOfWeekPreset", "Cuối tuần"),
      compute: (): DateRange => ({ from: now, to: endOfWeek(now, { weekStartsOn: 1 }) }),
    },
    {
      id: "end-month",
      label: t("endOfMonthPreset", "Cuối tháng"),
      compute: (): DateRange => ({ from: now, to: endOfMonth(now) }),
    },
    {
      id: "next-5",
      label: t("next5DaysPreset", "Trong 5 ngày"),
      compute: (): DateRange => ({ from: now, to: addDays(now, 4) }),
    },
    {
      id: "next-14",
      label: t("next14DaysPreset", "Trong 14 ngày"),
      compute: (): DateRange => ({ from: now, to: addDays(now, 13) }),
    },
  ];
}

export function TaskDateRangePicker({ value, onChange, T, className }: TaskDateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const PRESETS = React.useMemo(() => buildPresets(T), [T]);

  // Safely normalize incoming range which may contain strings or invalid dates
  const toDateSafe = (d: any): Date | undefined => {
    if (!d) return undefined;
    const dt = d instanceof Date ? d : new Date(d);
    return isValid(dt) ? dt : undefined;
  };
  const safeFrom = toDateSafe(value?.from);
  const safeTo = toDateSafe(value?.to);
  const safeSelected = safeFrom || safeTo ? { from: safeFrom, to: safeTo } : undefined;
  const defaultMonth = safeFrom || safeTo || undefined;

  return (
    <div className={cn("", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="task-date-range-trigger"
            variant="outline"
            className={cn(
              "h-9 w-full justify-start text-left font-normal bg-background flex items-center gap-2 overflow-hidden",
              !value?.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground shrink-0">
              {(T as any)?.rangeLabel || "Range:"}
            </span>
            <span className="text-sm font-normal truncate">
              {safeFrom ? (
                safeTo
                  ? `${format(safeFrom, "dd/MM/yyyy")} - ${format(safeTo, "dd/MM/yyyy")}`
                  : format(safeFrom, "dd/MM/yyyy")
              ) : ((T as any)?.pickADate || "Pick a date")}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-background border shadow-md" align="start">
          <div className="flex flex-col sm:flex-row">
            <div className="p-3 w-full sm:w-44 border-b sm:border-b-0 sm:border-r flex sm:flex-col gap-2 sm:gap-3">
              {PRESETS.map((p) => (
                <Button
                  key={p.id}
                  variant="secondary"
                  size="sm"
                  className="justify-start w-full text-xs"
                  onClick={() => onChange(p.compute())}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={defaultMonth}
              selected={safeSelected as any}
              onSelect={(range) => onChange(range)}
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
            <Button variant="ghost" size="sm" onClick={() => onChange(undefined)}>
              {(T as any)?.clearLabel || "Clear"}
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              {(T as any)?.applyLabel || "Apply"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default TaskDateRangePicker;
