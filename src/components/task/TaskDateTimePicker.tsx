import { useState } from "react";
import { Clock, X } from "lucide-react";
import { format, parseISO, startOfToday, addDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskDateTimePickerProps {
  value: string; // "YYYY-MM-DDTHH:mm" 或 ""
  onChange: (v: string) => void;
  className?: string;
}

export function TaskDateTimePicker({
  value,
  onChange,
  className,
}: TaskDateTimePickerProps) {
  const [open, setOpen] = useState(false);

  let parsedDate: Date | undefined = undefined;
  let timeStr = "09:00";

  if (value) {
    const d = parseISO(value);
    if (!Number.isNaN(d.getTime())) {
      parsedDate = d;
      timeStr = format(d, "HH:mm");
    }
  }

  const [hours, minutes] = timeStr.split(":");
  const currentHour = hours ?? "09";
  const currentMinute = minutes ?? "00";

  function handleDateSelect(d: Date | undefined) {
    if (!d) return;
    const datePart = format(d, "yyyy-MM-dd");
    onChange(`${datePart}T${currentHour}:${currentMinute}`);
  }

  function handleTimeChange(h: string, m: string) {
    const datePart = parsedDate ? format(parsedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    onChange(`${datePart}T${h}:${m}`);
  }

  const displayLabel = value && parsedDate
    ? format(parsedDate, "M月d日 EEE HH:mm", { locale: zhCN })
    : "选择日期与时间";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-9 w-full justify-start gap-2 font-normal text-left",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="size-4 text-primary" />
          <span className="flex-1 truncate">{displayLabel}</span>
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0" side="bottom" sideOffset={4}>
        <div className="flex flex-col sm:flex-row">
          {/* 左侧：日历选择器（与 TaskDueDatePicker 样式完全一致） */}
          <div className="border-b sm:border-b-0 sm:border-r border-border">
            <Calendar
              mode="single"
              selected={parsedDate}
              defaultMonth={parsedDate}
              onSelect={handleDateSelect}
            />
            <div className="flex gap-1 border-t border-border p-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs flex-1"
                onClick={() => handleDateSelect(startOfToday())}
              >
                今天
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs flex-1"
                onClick={() => handleDateSelect(addDays(startOfToday(), 1))}
              >
                明天
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs flex-1"
                onClick={() => handleDateSelect(addDays(startOfToday(), 7))}
              >
                下周
              </Button>
            </div>
          </div>

          {/* 右侧：时间点滚轮选择 */}
          <div className="flex flex-col w-[160px] p-3 bg-bg-surface/30">
            <div className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-1.5">
              <Clock className="size-3.5" />
              <span>设定时间</span>
            </div>

            <div className="grid grid-cols-2 gap-2 my-auto">
              {/* 小时 */}
              <div className="flex flex-col">
                <span className="text-[10px] text-text-tertiary mb-1 text-center">时</span>
                <div className="h-44 overflow-y-auto rounded-md border border-border bg-background p-1 ft-scroll">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const val = String(i).padStart(2, "0");
                    const isSelected = val === currentHour;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleTimeChange(val, currentMinute)}
                        className={cn(
                          "w-full rounded py-1 text-xs text-center transition-colors font-mono",
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "hover:bg-bg-hover text-text-primary"
                        )}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 分钟（按5分钟粒度） */}
              <div className="flex flex-col">
                <span className="text-[10px] text-text-tertiary mb-1 text-center">分</span>
                <div className="h-44 overflow-y-auto rounded-md border border-border bg-background p-1 ft-scroll">
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const val = String(idx * 5).padStart(2, "0");
                    const isSelected = Number(currentMinute) >= idx * 5 && Number(currentMinute) < idx * 5 + 5;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleTimeChange(currentHour, val)}
                        className={cn(
                          "w-full rounded py-1 text-xs text-center transition-colors font-mono",
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "hover:bg-bg-hover text-text-primary"
                        )}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              className="mt-3 h-8 w-full text-xs"
              onClick={() => setOpen(false)}
            >
              确定
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
