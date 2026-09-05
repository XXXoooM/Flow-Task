import { create } from "zustand";
import {
  takeSnapshot,
  restoreSnapshot,
  type DbSnapshot,
} from "@/lib/dbSnapshot";
import { useStatusStore } from "@/stores/statusStore";

interface Entry {
  label: string;
  before: DbSnapshot;
  after: DbSnapshot;
}

interface HistoryState {
  past: Entry[];
  future: Entry[];
  lastLabel: string | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => Promise<string | null>;
  redo: () => Promise<string | null>;
}

const MAX = 50;

async function refresh() {
  // 触发全局事件通知各 Store 重新从 SQLite 加载数据，彻底避免循环与交叉动态导入
  window.dispatchEvent(new CustomEvent("flowtask:refresh-all"));
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  lastLabel: null,

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  undo: async () => {
    const { past, future } = get();
    if (!past.length) return null;
    const entry = past[past.length - 1];
    set({ past: past.slice(0, -1), future: [...future, entry] });
    await restoreSnapshot(entry.before);
    await refresh();
    set({ lastLabel: entry.label });
    return entry.label;
  },

  redo: async () => {
    const { past, future } = get();
    if (!future.length) return null;
    const entry = future[future.length - 1];
    set({ future: future.slice(0, -1), past: [...past, entry] });
    await restoreSnapshot(entry.after);
    await refresh();
    set({ lastLabel: entry.label });
    return entry.label;
  },
}));

/**
 * 包裹一次写操作：执行前/后各取一次快照并入历史栈。
 * 仅"叶子"写操作调用，避免嵌套重复记录。
 */
export async function recordHistory(
  label: string,
  mutate: () => Promise<void>
): Promise<void> {
  const status = useStatusStore.getState();
  status.beginSave();
  try {
    const before = await takeSnapshot();
    await mutate();
    const after = await takeSnapshot();
    const { past } = useHistoryStore.getState();
    const next = [...past, { label, before, after }];
    if (next.length > MAX) next.shift();
    useHistoryStore.setState({ past: next, future: [], lastLabel: null });
    useStatusStore.getState().endSave();
  } catch (err) {
    useStatusStore.getState().fail(String(err));
    throw err;
  }
}
