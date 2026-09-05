import {
  Inbox,
  SunMedium,
  CalendarClock,
  CalendarDays,
  SquareKanban,
  Timer,
  Settings,
  type LucideIcon,
} from "lucide-react";

export const APP_NAME = "FlowTask";
export const APP_VERSION = "1.0.2";

export type ViewId =
  | "inbox"
  | "today"
  | "upcoming"
  | "calendar"
  | "kanban"
  | "focus"
  | "settings";

export interface NavItem {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "inbox", label: "收集箱", icon: Inbox, description: "全部未归档任务" },
  { id: "today", label: "今天", icon: SunMedium, description: "今天到期与进行中的任务" },
  { id: "upcoming", label: "计划", icon: CalendarClock, description: "即将到来的任务" },
  { id: "calendar", label: "日历", icon: CalendarDays, description: "按月/周查看任务" },
  { id: "kanban", label: "看板", icon: SquareKanban, description: "按状态/标签分列" },
  { id: "focus", label: "专注", icon: Timer, description: "番茄钟与专注统计" },
  { id: "settings", label: "设置", icon: Settings, description: "外观 · 系统 · 数据" },
];

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_WIDTH_COLLAPSED = 64;

/** 优先级色彩映射（见设计系统 3.3）。 */
export const PRIORITY_META = [
  { level: 0, label: "紧急", color: "#EF4444" },
  { level: 1, label: "高", color: "#F59E0B" },
  { level: 2, label: "中", color: "#6366F1" },
  { level: 3, label: "低", color: "#71717A" },
] as const;

export const VIEW_META: Record<ViewId, NavItem> = NAV_ITEMS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<ViewId, NavItem>
);
