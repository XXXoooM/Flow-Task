import { useEffect } from "react";
import { useFocusStore } from "@/stores/focusStore";
import { PRIORITY_META } from "@/lib/constants";

function fmtHours(totalS: number) {
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function FocusStats() {
  const week = useFocusStore((s) => s.week);
  const todaySeconds = useFocusStore((s) => s.todaySeconds);
  const todayCount = useFocusStore((s) => s.todayCount);
  const loadStats = useFocusStore((s) => s.loadStats);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const max = Math.max(1, ...week.map((d) => d.seconds));
  const accent = PRIORITY_META[2].color;

  return (
    <div className="rounded-[14px] bg-bg-surface p-6 shadow-sm ring-1 ring-border/50">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-text-primary">专注统计</h3>
        <div className="text-xs text-text-tertiary">
          今日 {fmtHours(todaySeconds)} · {todayCount} 个番茄
        </div>
      </div>

      <div className="flex h-36 items-end justify-between gap-2">
        {week.map((d) => {
          const day = new Date(d.date).getDay(); // 0=Sun
          const label = ["日", "一", "二", "三", "四", "五", "六"][day];
          const isToday = d.date === new Date().toISOString().slice(0, 10);
          const h = Math.max(4, (d.seconds / max) * 100);
          return (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-[6px] transition-all"
                  style={{
                    height: `${h}%`,
                    backgroundColor: d.seconds > 0 ? accent : "var(--border)",
                    opacity: isToday ? 1 : 0.85,
                  }}
                  title={`${fmtHours(d.seconds)} · ${d.count} 个番茄`}
                />
              </div>
              <span className="text-[11px] text-text-tertiary">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
