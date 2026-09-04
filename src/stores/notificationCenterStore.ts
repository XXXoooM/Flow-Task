import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CenterItem {
  id: string;
  taskId: string;
  title: string;
  body: string;
  at: string; // ISO 提醒发生时间
  read: boolean;
}

interface CenterState {
  items: CenterItem[];
  add: (i: Omit<CenterItem, "id" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
}

const MAX = 100;

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useCenterStore = create<CenterState>()(
  persist(
    (set) => ({
      items: [],
      add: (i) =>
        set((s) => {
          // 去重：同一任务同一分钟只留一条
          if (s.items.some((x) => x.taskId === i.taskId && x.at.slice(0, 16) === i.at.slice(0, 16))) {
            return {};
          }
          const next = [{ ...i, id: genId(), read: false }, ...s.items];
          return { items: next.slice(0, MAX) };
        }),
      markRead: (id) =>
        set((s) => ({
          items: s.items.map((x) => (x.id === id ? { ...x, read: true } : x)),
        })),
      markAllRead: () =>
        set((s) => ({ items: s.items.map((x) => ({ ...x, read: true })) })),
      remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "flowtask-center",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    }
  )
);

export const unreadCount = (items: CenterItem[]) =>
  items.filter((i) => !i.read).length;
