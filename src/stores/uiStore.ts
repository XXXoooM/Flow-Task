import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ViewId } from "@/lib/constants";
import type { KanbanColumn } from "@/types/task";

export type Theme = "light" | "dark" | "system";

function colId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "todo", name: "待办", color: "#71717A" },
  { id: "doing", name: "进行中", color: "#6366F1" },
  { id: "done", name: "已完成", color: "#22C55E" },
];

const COLUMN_PALETTE = [
  "#6366F1",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#EC4899",
  "#71717A",
];

interface UiState {
  /** 侧边栏是否折叠。 */
  collapsed: boolean;
  /** 当前激活视图。 */
  activeView: ViewId;
  /** 主题偏好。 */
  theme: Theme;
  /** 看板列（顺序即展示顺序）。 */
  columns: KanbanColumn[];
  /** 智能默认：上一次新建使用的优先级。 */
  lastPriority: number | null;
  /** 智能默认：上一次新建使用的标签 id。 */
  lastTagIds: string[];
  /** 色盲友好模式：用文字/形状冗余编码优先级等信息。 */
  colorblind: boolean;
  /** 双模式：进度（默认）或日程。 */
  taskMode: "progress" | "schedule";

  toggleSidebar: () => void;
  setCollapsed: (value: boolean) => void;
  setActiveView: (view: ViewId) => void;
  setTheme: (theme: Theme) => void;
  setColorblind: (value: boolean) => void;
  setTaskMode: (mode: "progress" | "schedule") => void;

  addColumn: (name: string, color?: string) => void;
  renameColumn: (id: string, name: string) => void;
  removeColumn: (id: string) => void;
  moveColumn: (from: number, to: number) => void;

  setLastDefaults: (priority: number, tagIds: string[]) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      collapsed: false,
      activeView: "inbox",
      theme: "system",
      columns: DEFAULT_COLUMNS,
      lastPriority: null,
      lastTagIds: [],
      colorblind: false,
      taskMode: "progress",

      toggleSidebar: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (value) => set({ collapsed: value }),
      setActiveView: (view) => set({ activeView: view }),
      setTheme: (theme) => set({ theme }),
      setColorblind: (value) => set({ colorblind: value }),
      setTaskMode: (mode) => set({ taskMode: mode }),

      addColumn: (name, color) =>
        set((s) => ({
          columns: [
            ...s.columns,
            {
              id: colId(),
              name: name.trim() || "新列",
              color: color ?? COLUMN_PALETTE[s.columns.length % COLUMN_PALETTE.length],
            },
          ],
        })),
      renameColumn: (id, name) =>
        set((s) => ({
          columns: s.columns.map((c) =>
            c.id === id ? { ...c, name: name.trim() || c.name } : c
          ),
        })),
      removeColumn: (id) =>
        set((s) => ({ columns: s.columns.filter((c) => c.id !== id) })),
      moveColumn: (from, to) =>
        set((s) => {
          const next = [...s.columns];
          const [moved] = next.splice(from, 1);
          if (moved) next.splice(to, 0, moved);
          return { columns: next };
        }),

      setLastDefaults: (priority, tagIds) =>
        set({ lastPriority: priority, lastTagIds: tagIds }),
    }),
    {
      name: "flowtask-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        collapsed: s.collapsed,
        activeView: s.activeView,
        theme: s.theme,
        columns: s.columns,
        lastPriority: s.lastPriority,
        lastTagIds: s.lastTagIds,
        colorblind: s.colorblind,
        taskMode: s.taskMode,
      }),
    }
  )
);
