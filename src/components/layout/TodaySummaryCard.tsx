import { useMemo } from "react";
import { useTaskStore } from "@/stores/taskStore";
import { useUiStore } from "@/stores/uiStore";
import { parseDue } from "@/lib/dateHelpers";
import { isToday, isBefore, startOfDay } from "date-fns";
import { CheckCircle2, Circle, Clock } from "lucide-react";

export function TodaySummaryCard({ collapsed }: { collapsed?: boolean }) {
  const tasks = useTaskStore((s) => s.tasks);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const setTaskMode = useUiStore((s) => s.setTaskMode);

  const { todayTotal, todayDone, percent, nextSchedule } = useMemo(() => {
    const now = new Date();
    const todayTasks = tasks.filter((t) => {
      if (t.parent_id !== null) return false;
      const d = parseDue(t.due_date);
      if (!d) return false;
      return isToday(d) || isBefore(d, startOfDay(now));
    });

    const total = todayTasks.length;
    const done = todayTasks.filter((t) => t.completed).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    // 获取今天接下来最近的一个未完成日程
    const upcomingSchedules = tasks
      .filter((t) => !t.completed && t.scheduled_at)
      .map((t) => {
        const timeStr = t.scheduled_at?.split("T")[1]?.slice(0, 5) ?? "";
        return { task: t, timeStr };
      })
      .filter((s) => s.timeStr)
      .sort((a, b) => (a.task.scheduled_at ?? "").localeCompare(b.task.scheduled_at ?? ""));

    return {
      todayTotal: total,
      todayDone: done,
      percent: pct,
      nextSchedule: upcomingSchedules[0] ?? null,
    };
  }, [tasks]);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setActiveView("today")}
        title={`今日进度: ${todayDone}/${todayTotal} (${percent}%)`}
        className="group mx-auto my-1 flex size-9 flex-col items-center justify-center rounded-lg border border-border/60 bg-bg-surface/50 text-text-secondary transition-colors hover:border-primary/40 hover:bg-bg-hover hover:text-text-primary"
      >
        <span className="text-[11px] font-semibold text-primary">{percent}%</span>
      </button>
    );
  }

  return (
    <div className="mx-2 mb-2 rounded-xl border border-border/70 bg-bg-surface/60 p-2.5 shadow-2xs backdrop-blur-xs transition-colors hover:border-border">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveView("today")}
          className="text-xs font-semibold text-text-primary hover:text-primary transition-colors"
        >
          今日概览
        </button>
        <span className="text-[11px] font-medium text-text-tertiary">
          {todayDone}/{todayTotal}
        </span>
      </div>

      {/* 进度条 */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* 下一个日程或快速跳转 */}
      {nextSchedule ? (
        <button
          type="button"
          onClick={() => {
            setActiveView("today");
            setTaskMode("schedule");
          }}
          className="mt-2 flex w-full items-center gap-1.5 truncate text-left text-[11px] text-text-secondary hover:text-text-primary"
        >
          <Clock className="size-3 shrink-0 text-primary" />
          <span className="font-mono text-[10px] text-primary">{nextSchedule.timeStr}</span>
          <span className="truncate">{nextSchedule.task.title}</span>
        </button>
      ) : (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-text-tertiary">
          {todayTotal > 0 && todayDone === todayTotal ? (
            <>
              <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
              <span>今日任务已全部完成！</span>
            </>
          ) : (
            <>
              <Circle className="size-3 shrink-0 opacity-40" />
              <span>{todayTotal === 0 ? "今天暂无待办" : `还有 ${todayTotal - todayDone} 项待完成`}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
