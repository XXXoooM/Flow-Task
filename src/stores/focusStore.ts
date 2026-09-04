import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { toast } from "sonner";
import { db, newId } from "@/lib/db";
import { playChime } from "@/lib/notify";

export interface FocusSettings {
  workMin: number;
  breakMin: number;
  longBreakMin: number;
  autoStartBreaks: boolean;
  sound: boolean;
}

export interface DayStat {
  date: string; // YYYY-MM-DD (local)
  seconds: number;
  count: number;
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type Phase = "work" | "break";

interface FocusState {
  settings: FocusSettings;
  setSettings: (patch: Partial<FocusSettings>) => void;

  // 全局番茄计时状态（跨页面切换保持运行）
  phase: Phase;
  running: boolean;
  remaining: number;
  cycles: number;
  workStartMs: number;

  startTimer: () => void;
  pauseTimer: () => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  skipPhase: () => void;
  tickSecond: () => void;

  todaySeconds: number;
  todayCount: number;
  week: DayStat[];

  loadStats: () => Promise<void>;
  record: (opts: {
    taskId: string | null;
    startedAt: string;
    endedAt: string;
    durationS: number;
    completed: boolean;
  }) => Promise<void>;
}

const DEFAULTS: FocusSettings = {
  workMin: 25,
  breakMin: 5,
  longBreakMin: 15,
  autoStartBreaks: true,
  sound: true,
};

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      settings: DEFAULTS,
      setSettings: (patch) => {
        set((s) => {
          const nextSettings = { ...s.settings, ...patch };
          // 如果当前未在运行，同步调整倒计时
          let remaining = s.remaining;
          if (!s.running) {
            remaining =
              s.phase === "work"
                ? Math.max(1, nextSettings.workMin) * 60
                : Math.max(1, nextSettings.breakMin) * 60;
          }
          return { settings: nextSettings, remaining };
        });
      },

      phase: "work",
      running: false,
      remaining: 25 * 60,
      cycles: 0,
      workStartMs: Date.now(),

      startTimer: () => set({ running: true }),
      pauseTimer: () => set({ running: false }),
      toggleTimer: () => set((s) => ({ running: !s.running })),
      resetTimer: () => {
        const s = get();
        const workS = Math.max(1, s.settings.workMin) * 60;
        set({
          running: false,
          phase: "work",
          remaining: workS,
          workStartMs: Date.now(),
        });
      },
      skipPhase: () => {
        const s = get();
        if (s.phase === "work") {
          const breakS = Math.max(1, s.settings.breakMin) * 60;
          set({ phase: "break", remaining: breakS });
        } else {
          const workS = Math.max(1, s.settings.workMin) * 60;
          set({ phase: "work", remaining: workS, workStartMs: Date.now() });
        }
      },
      tickSecond: () => {
        const s = get();
        if (!s.running) return;
        if (s.remaining > 1) {
          set({ remaining: s.remaining - 1 });
        } else {
          // 阶段结束
          const now = Date.now();
          const workS = Math.max(1, s.settings.workMin) * 60;
          const breakS = Math.max(1, s.settings.breakMin) * 60;

          if (s.phase === "work") {
            void s.record({
              taskId: null,
              startedAt: new Date(s.workStartMs).toISOString(),
              endedAt: new Date(now).toISOString(),
              durationS: workS,
              completed: true,
            });
            if (s.settings.sound) {
              playChime();
            }
            toast.success("🍅 番茄完成", {
              description: `专注了 ${s.settings.workMin} 分钟，休息 ${s.settings.breakMin} 分钟吧`,
            });
            set({
              phase: "break",
              remaining: breakS,
              cycles: s.cycles + 1,
              running: s.settings.autoStartBreaks,
            });
          } else {
            if (s.settings.sound) {
              playChime();
            }
            toast("☕ 休息结束", { description: "开始下一个番茄吧" });
            set({
              phase: "work",
              remaining: workS,
              workStartMs: now,
              running: true,
            });
          }
        }
      },

      todaySeconds: 0,
      todayCount: 0,
      week: [],

      loadStats: async () => {
        const since = new Date();
        since.setHours(0, 0, 0, 0);
        since.setDate(since.getDate() - 6);
        const rows = await db.select<
          { started_at: string; duration_s: number; completed: number }[]
        >(
          "SELECT started_at, duration_s, completed FROM focus_sessions WHERE started_at >= $1",
          [since.toISOString()]
        );

        // 预置 7 天桶
        const byDay = new Map<string, DayStat>();
        const order: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(since);
          d.setDate(since.getDate() + i);
          const key = localDateKey(d);
          order.push(key);
          byDay.set(key, { date: key, seconds: 0, count: 0 });
        }

        const todayKey = localDateKey(new Date());
        let todaySeconds = 0;
        let todayCount = 0;

        for (const r of rows) {
          const dayKey = localDateKey(new Date(r.started_at));
          const bucket = byDay.get(dayKey);
          if (bucket) {
            bucket.seconds += r.duration_s;
            if (r.completed) bucket.count += 1;
          }
          if (dayKey === todayKey) {
            todaySeconds += r.duration_s;
            if (r.completed) todayCount += 1;
          }
        }

        set({
          todaySeconds,
          todayCount,
          week: order.map((k) => byDay.get(k)!),
        });
      },

      record: async (opts) => {
        await db.execute(
          `INSERT INTO focus_sessions (id, task_id, started_at, ended_at, duration_s, completed)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            newId(),
            opts.taskId,
            opts.startedAt,
            opts.endedAt,
            Math.round(opts.durationS),
            opts.completed ? 1 : 0,
          ]
        );
        await get().loadStats();
      },
    }),
    {
      name: "flowtask-focus",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ settings: s.settings }),
    }
  )
);

// 向下兼容现有组件对 useFocusSettings 的调用
export const useFocusSettings = useFocusStore;
