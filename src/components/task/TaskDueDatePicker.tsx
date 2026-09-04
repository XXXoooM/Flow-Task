import { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { format, addDays, startOfToday } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { dueMeta, parseDue } from "@/lib/dateHelpers";
import { cn } from "@/lib/utils";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

export function TaskDueDatePicker({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const meta = dueMeta(value);
  const selected = parseDue(value) ?? undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarDays className="size-3.5" />
          {meta ? (
            <span
              className={cn(
                meta.overdue ? "text-danger" : meta.soon ? "text-primary" : ""
              )}
            >
              {meta.label}
            </span>
          ) : (
            "设置日期"
          )}
          {meta && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(d) => {
            if (d) {
              onChange(iso(d));
              setOpen(false);
            }
          }}
        />
        <div className="flex gap-1 border-t border-border p-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => {
              onChange(iso(startOfToday()));
              setOpen(false);
            }}
          >
            今天
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => {
              onChange(iso(addDays(startOfToday(), 1)));
              setOpen(false);
            }}
          >
            明天
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => {
              onChange(iso(addDays(startOfToday(), 7)));
              setOpen(false);
            }}
          >
            下周
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
