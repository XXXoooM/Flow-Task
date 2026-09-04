import { create } from "zustand";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

interface StatusState {
  status: SaveStatus;
  error: string | null;
  /** 开始一次保存（写操作前调用）。 */
  beginSave: () => void;
  /** 保存成功（短暂显示"已保存"后回到 idle）。 */
  endSave: () => void;
  /** 保存失败或数据库不可用。 */
  fail: (msg: string, offline?: boolean) => void;
  retry: () => void;
}

let savedTimer: number | undefined;

export const useStatusStore = create<StatusState>((set, get) => ({
  status: "idle",
  error: null,

  beginSave: () => {
    if (savedTimer) window.clearTimeout(savedTimer);
    set({ status: "saving", error: null });
  },

  endSave: () => {
    set({ status: "saved", error: null });
    if (savedTimer) window.clearTimeout(savedTimer);
    savedTimer = window.setTimeout(() => {
      if (useStatusStore.getState().status === "saved")
        useStatusStore.setState({ status: "idle" });
    }, 1400);
  },

  fail: (msg, offline) =>
    set({ status: offline ? "offline" : "error", error: msg }),

  retry: () => {
    // 触发一次重新加载即可（fetchTasks 会重连 DB）。
    void import("@/stores/taskStore").then(({ useTaskStore }) => {
      useTaskStore.getState().fetchTasks();
    });
    set({ status: get().status === "offline" ? "saving" : "idle", error: null });
  },
}));
