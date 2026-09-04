import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useTasks } from "@/hooks/useTasks";
import { useTaskStore } from "@/stores/taskStore";
import { useNotifStore } from "@/stores/notificationStore";
import { useCenterStore } from "@/stores/notificationCenterStore";
import { ensureNotifyPermission, notify, playChime } from "@/lib/notify";
import { computeDueReminders, isInDnd } from "@/lib/reminderEngine";

function fmtTime(s: string | null): string {
  if (!s) return "";
  const d = parseISO(s);
  if (Number.isNaN(d.getTime())) return s;
  return format(d, "M月d日 HH:mm EEE", { locale: zhCN });
}

const isForeground = () =>
  typeof document !== "undefined" && document.visibilityState === "visible";

/** 无渲染组件：驱动日程提醒引擎（到点/提前量、冷却、前台/后台、专注/免打扰排队、错过补发）。 */
export function ReminderScheduler() {
  const { tasks } = useTasks();
  const markReminded = useTaskStore((s) => s.markReminded);
  const firstRun = useRef(true);
  const wasDnd = useRef(false);

  useEffect(() => {
    void ensureNotifyPermission();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function tick() {
      if (!mounted) return;
      const n = useNotifStore.getState();
      const now = new Date();
      const inDnd = isInDnd(now, n.dndEnabled, n.dndStart, n.dndEnd);

      // 离开免打扰时段 → 补发排队的提醒
      if (wasDnd.current && !inDnd) n.flushMissed();
      wasDnd.current = inDnd;

      if (!n.remindersEnabled) return;

      const due = computeDueReminders(tasks, now.getTime(), n.cooldownMin * 60000);
      if (due.length === 0) return;

      let toHandle = due;
      const addCenter = useCenterStore.getState().add;
      if (firstRun.current) {
        firstRun.current = false;
        const missed = due.filter((d) => d.missed);
        if (missed.length > 0) {
          toast.info(`有 ${missed.length} 条错过的提醒`, {
            description: missed.map((m) => m.task.title).slice(0, 4).join("；"),
            duration: 9000,
          });
          for (const m of missed) {
            addCenter({
              taskId: m.task.id,
              title: m.task.title,
              body: fmtTime(m.task.scheduled_at),
              at: new Date(m.fireAt).toISOString(),
            });
            await markReminded(m.task.id);
          }
        }
        toHandle = due.filter((d) => !d.missed);
      }

      for (const d of toHandle) {
        const title = `⏰ ${d.task.title}`;
        const body = fmtTime(d.task.scheduled_at);
        addCenter({
          taskId: d.task.id,
          title: d.task.title,
          body,
          at: new Date(d.fireAt).toISOString(),
        });
        if (inDnd) {
          n.pushMissed(d.task.title);
        } else if (n.focusing) {
          n.dispatch("normal", title, body); // 专注中 → 排队
        } else if (isForeground()) {
          toast.warning(title, { description: body, duration: 8000 });
          if (n.soundEnabled) playChime();
        } else {
          notify(title, body); // 后台 → 系统通知
        }
        await markReminded(d.task.id);
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), 30000);
    const onVis = () => void tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mounted = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [tasks, markReminded]);

  return null;
}
