import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { db, newId } from "@/lib/db";

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

interface FocusState {
  settings: FocusSettings;
  setSettings: (patch: Partial<FocusSettings>) => void;

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

export const useFocusStore = create<FocusState>()((set, get) => ({
  settings: DEFAULTS,
  setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

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
}));

// 设置持久化包装
export const useFocusSettings = create<
  Pick<FocusState, "settings" | "setSettings">
>()(
  persist(
    (set) => ({
      settings: DEFAULTS,
      setSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: "flowtask-focus",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ settings: s.settings }),
    }
  )
);
