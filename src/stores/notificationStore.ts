import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { toast } from "sonner";
import { notify, playChime } from "@/lib/notify";
import type { Task } from "@/types/task";
import { dueMeta, parseDue } from "@/lib/dateHelpers";

export type NotifLevel = "urgent" | "normal" | "silent";

export interface NotifPrefs {
  urgentEnabled: boolean;
  normalEnabled: boolean;
  silentEnabled: boolean;
  soundEnabled: boolean;
  // 提醒引擎配置
  remindersEnabled: boolean; // 全局开关
  defaultOffset: number; // 新建日程默认提前量（秒）
  dndEnabled: boolean; // 免打扰时段
  dndStart: number; // 分钟 0-1439
  dndEnd: number;
  cooldownMin: number; // 同一任务重复提醒最小间隔（分钟）
}

interface NotifState extends NotifPrefs {
  focusing: boolean;
  queue: string[];
  missedQueue: string[];
  setPrefs: (p: Partial<NotifPrefs>) => void;
  setFocusing: (v: boolean) => void;
  dispatch: (level: NotifLevel, title: string, body?: string) => void;
  pushMissed: (title: string) => void;
  flushMissed: () => void;
}

/** 依据任务判定通知级别（用于到期任务，非日程）。无到期返回 null。 */
export function classifyTask(task: Task): NotifLevel | null {
  if (task.completed) return null;
  const d = parseDue(task.due_date);
  if (!d) return null;
  const meta = dueMeta(task.due_date);
  if (!meta) return null;
  const isDueNow = d.getTime() <= Date.now() + 30 * 60 * 1000;
  if (!isDueNow) return null;
  if (task.priority === 0) return "urgent";
  return "normal";
}

export const useNotifStore = create<NotifState>()(
  persist(
    (set, get) => ({
      urgentEnabled: true,
      normalEnabled: true,
      silentEnabled: false,
      soundEnabled: true,
      remindersEnabled: true,
      defaultOffset: 900,
      dndEnabled: true,
      dndStart: 22 * 60,
      dndEnd: 8 * 60,
      cooldownMin: 5,

      focusing: false,
      queue: [],
      missedQueue: [],

      setPrefs: (p) => set(p),

      setFocusing: (v) => {
        if (!v && get().queue.length > 0) {
          const items = get().queue;
          set({ focusing: false, queue: [] });
          toast.info(`专注期间收到 ${items.length} 条提醒`, {
            description: items.slice(0, 4).join("；"),
            duration: 8000,
          });
        } else {
          set({ focusing: v });
        }
      },

      dispatch: (level, title, body) => {
        const s = get();
        if (s.focusing && level !== "urgent") {
          set({ queue: [...s.queue, title] });
          return;
        }
        if (level === "urgent") {
          if (!s.urgentEnabled) return;
          notify(title, body);
          toast.warning(title, { description: body, duration: 10000 });
          if (s.soundEnabled) playChime();
        } else if (level === "normal") {
          if (!s.normalEnabled) return;
          toast(title, { description: body });
        } else {
          if (!s.silentEnabled) return;
          toast.dismiss();
        }
      },

      pushMissed: (title) =>
        set((s) =>
          s.missedQueue.includes(title)
            ? {}
            : { missedQueue: [...s.missedQueue, title] }
        ),

      flushMissed: () => {
        const items = get().missedQueue;
        if (items.length === 0) return;
        set({ missedQueue: [] });
        toast.info(`有 ${items.length} 条提醒（免打扰/错过）`, {
          description: items.slice(0, 4).join("；"),
          duration: 9000,
        });
      },
    }),
    {
      name: "flowtask-notif",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        urgentEnabled: s.urgentEnabled,
        normalEnabled: s.normalEnabled,
        silentEnabled: s.silentEnabled,
        soundEnabled: s.soundEnabled,
        remindersEnabled: s.remindersEnabled,
        defaultOffset: s.defaultOffset,
        dndEnabled: s.dndEnabled,
        dndStart: s.dndStart,
        dndEnd: s.dndEnd,
        cooldownMin: s.cooldownMin,
      }),
    }
  )
);
