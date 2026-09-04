import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfToday,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  CalendarX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTaskStore } from "@/stores/taskStore";
import { reminderOffsetLabel, type Task } from "@/types/task";
import { cn } from "@/lib/utils";

const HOUR_H = 56;
const PX_PER_MIN = HOUR_H / 60;
const TOTAL_H = HOUR_H * 24;

function minutesOf(iso: string): number {
  const d = parseISO(iso);
  return Number.isNaN(d.getTime()) ? 0 : d.getHours() * 60 + d.getMinutes();
}
function dayKey(iso: string): string {
  const d = parseISO(iso);
  return Number.isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
}

function EventNode({
  task,
  compact,
}: {
  task: Task;
  compact?: boolean;
}) {
  const done = !!task.completed;
  const mins = minutesOf(task.scheduled_at!);
  const top = mins * PX_PER_MIN;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: compact,
  });
  const timeStr = task.scheduled_at ? format(parseISO(task.scheduled_at), "HH:mm") : "";

  return (
    <div
      ref={setNodeRef}
      {...(compact ? {} : attributes)}
      {...(compact ? {} : listeners)}
      style={compact ? undefined : { top }}
      className={cn(
        compact
          ? "pointer-events-none"
          : "absolute right-2 left-14 z-10 cursor-grab touch-none active:cursor-grabbing",
        isDragging && "opacity-30"
      )}
    >
      {!compact && (
        <div
          className="absolute -left-10 w-9 text-right font-mono text-[11px] tabular-nums text-text-tertiary"
          style={{ top: -2 }}
        >
          {timeStr}
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !compact && window.dispatchEvent(new CustomEvent("flowtask:detail", { detail: task.id }))}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm shadow-sm transition-colors",
          done
            ? "border-border bg-bg-elevated text-text-tertiary"
            : "border-primary/40 bg-bg-surface text-text-primary hover:bg-accent/40"
        )}
      >
        <span
          className={cn(
            "size-2.5 shrink-0 rounded-full",
            done ? "border-2 border-text-tertiary bg-transparent" : "bg-primary"
          )}
        />
        <span className={cn("line-clamp-1 flex-1", done && "line-through")}>
          {task.title}
        </span>
        {task.reminder_enabled === 1 && (
          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-brand-muted px-1.5 py-0.5 text-[10px] text-brand">
            <Bell className="size-2.5" />
            {reminderOffsetLabel(task.reminder_offset)}
          </span>
        )}
      </div>
    </div>
  );
}

function Slot({ index }: { index: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `s${index}` });
  return (
    <div
      ref={setNodeRef}
      style={{ top: index * (HOUR_H / 2), height: HOUR_H / 2, left: 56, right: 0 }}
      className={cn(
        "absolute rounded transition-colors",
        isOver && "bg-primary/15 ring-2 ring-primary/40"
      )}
    />
  );
}

export function TimelineView({
  tasks,
  query = "",
}: {
  tasks: Task[];
  query?: string;
}) {
  const patchTask = useTaskStore((s) => s.patchTask);
  const [day, setDay] = useState<Date>(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const dayStr = format(day, "yyyy-MM-dd");
  const isToday = differenceInCalendarDays(day, startOfToday()) === 0;

  const dayTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (!t.scheduled_at || dayKey(t.scheduled_at) !== dayStr) return false;
        if (!q) return true;
        return (
          t.title.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.name.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => minutesOf(a.scheduled_at!) - minutesOf(b.scheduled_at!));
  }, [tasks, dayStr, query]);

  // 自动滚到当前时间附近
  useEffect(() => {
    if (isToday && scrollRef.current) {
      const mins = now.getHours() * 60 + now.getMinutes();
      scrollRef.current.scrollTop = Math.max(0, mins * PX_PER_MIN - 120);
    }
  }, [isToday]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function handleEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const slot = Number(String(over.id).slice(1));
    if (!Number.isFinite(slot)) return;
    const hh = String(Math.floor(slot / 2)).padStart(2, "0");
    const mm = slot % 2 === 0 ? "00" : "30";
    void patchTask(String(active.id), { scheduled_at: `${dayStr}T${hh}:${mm}` });
  }

  const activeTask = activeId ? dayTasks.find((t) => t.id === activeId) : null;
  const nowMins = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="flex h-full flex-col">
      {/* 日期导航 */}
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setDay((d) => addDays(d, -1))} aria-label="前一天">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setDay((d) => addDays(d, 1))} aria-label="后一天">
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8" onClick={() => setDay(new Date())}>
            今天
          </Button>
        </div>
        <div className="text-sm font-semibold text-text-primary">
          {format(day, "M月d日 EEEE", { locale: zhCN })}
          <span className="ml-2 text-xs font-normal text-text-tertiary">
            {dayTasks.length} 个日程
          </span>
        </div>
      </div>

      {dayTasks.length === 0 ? (
        <div className="grid flex-1 place-items-center text-center">
          <div>
            <CalendarX className="mx-auto mb-3 size-8 text-text-tertiary" />
            <p className="text-sm text-text-secondary">这一天还没有日程</p>
            <p className="mt-1 text-xs text-text-tertiary">
              新建任务时打开「设为日程」选时间，或拖动其它日程到此处。
            </p>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleStart}
          onDragEnd={handleEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto ft-scroll">
            <div className="relative" style={{ height: TOTAL_H }}>
              {/* 小时网格 */}
              {Array.from({ length: 24 }).map((_, h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-border/40"
                  style={{ top: h * HOUR_H }}
                >
                  <span className="absolute -top-2 left-0 w-12 text-right font-mono text-[11px] text-text-tertiary">
                    {String(h).padStart(2, "0")}:00
                  </span>
                </div>
              ))}

              {/* 半小时放置槽 */}
              {Array.from({ length: 48 }).map((_, i) => (
                <Slot key={i} index={i} />
              ))}

              {/* 现在线 */}
              {isToday && (
                <div
                  className="pointer-events-none absolute left-14 right-0 z-20 flex items-center"
                  style={{ top: nowMins * PX_PER_MIN }}
                >
                  <span className="size-2 -translate-x-1 rounded-full bg-danger" />
                  <span className="h-px flex-1 bg-danger/70" />
                </div>
              )}

              {/* 事件节点 */}
              {dayTasks.map((t) => (
                <EventNode key={t.id} task={t} />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-bg-surface px-2.5 py-1.5 text-sm shadow-lg ring-2 ring-primary/40">
                <span className="size-2.5 shrink-0 rounded-full bg-primary" />
                <span className="line-clamp-1 flex-1 text-text-primary">
                  {activeTask.title}
                </span>
                {activeTask.reminder_enabled === 1 && (
                  <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-brand-muted px-1.5 py-0.5 text-[10px] text-brand">
                    <Bell className="size-2.5" />
                    {reminderOffsetLabel(activeTask.reminder_offset)}
                  </span>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
