import { z } from "zod";

/** 优先级：0 紧急 / 1 高 / 2 中 / 3 低 */
export type Priority = 0 | 1 | 2 | 3;

/** 数据库 tasks 行结构（列 -> 值）。 */
export interface TaskRow {
  id: string;
  parent_id: string | null;
  title: string;
  note_md: string;
  completed: number; // 0 | 1
  priority: number;
  due_date: string | null;
  sort_order: number;
  view_type: string;
  kanban_col: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // 双模式：日程模式字段
  scheduled_at: string | null; // ISO "YYYY-MM-DDTHH:mm"，NULL=纯进度
  reminder_enabled: number; // 0 | 1
  reminder_offset: number; // 提前量（秒）
  last_reminded_at: string | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export type RecurrenceFreq = "daily" | "weekly" | "monthly";

/** 重复规则（每 N 天/周/月）。 */
export interface Recurrence {
  freq: RecurrenceFreq;
  interval: number;
  end_date: string | null;
}

/** 看板列定义（存于本地设置，非 DB）。 */
export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
}

export type TaskMode = "progress" | "schedule";

/** 附带标签 + 子任务 + 重复规则的视图模型。 */
export interface Task extends TaskRow {
  tags: Tag[];
  subtasks: Task[];
  recurrence: Recurrence | null;
  mode: TaskMode; // 派生：scheduled_at 非空 => schedule
}

/** 删除快照（用于 Undo 恢复）。 */
export interface TaskSnapshot {
  task: TaskRow;
  subtasks: TaskRow[];
  tagIds: string[];
  recurrence: Recurrence | null;
}

/** 派生任务模式。 */
export function isScheduleMode(t: Pick<TaskRow, "scheduled_at">): boolean {
  return t.scheduled_at !== null && t.scheduled_at !== "";
}

export const REMINDER_OFFSETS = [0, 300, 900, 1800, 3600] as const;

export function reminderOffsetLabel(sec: number): string {
  if (sec === 0) return "准时";
  if (sec < 3600) return `${sec / 60} 分钟`;
  return `${sec / 3600} 小时`;
}

export const RecurrenceSchema = z.object({
  freq: z.enum(["daily", "weekly", "monthly"]),
  interval: z.number().int().min(1).max(365).default(1),
  end_date: z.string().nullable().default(null),
});

/** 新建/编辑任务的输入负载。 */
export const TaskInput = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(300),
  note_md: z.string().default(""),
  priority: z.number().int().min(0).max(3).default(3),
  due_date: z.string().nullable().default(null),
  view_type: z.string().default("list"),
  parent_id: z.string().nullable().default(null),
  tagIds: z.array(z.string()).default([]),
  recurrence: RecurrenceSchema.nullable().default(null),
  scheduled_at: z.string().nullable().default(null),
  reminder_enabled: z.number().int().min(0).max(1).default(0),
  reminder_offset: z.number().int().min(0).default(900),
});

export type TaskInput = z.infer<typeof TaskInput>;

/** 仅更新若干标量列（右键菜单/内联编辑用）。 */
export interface TaskFields {
  title?: string;
  note_md?: string;
  priority?: number;
  due_date?: string | null;
  view_type?: string;
  scheduled_at?: string | null;
  reminder_enabled?: number;
  reminder_offset?: number;
}

export const PRIORITY_ORDER: Priority[] = [0, 1, 2, 3];

/** 新建标签负载。 */
export const TagInput = z.object({
  name: z.string().trim().min(1, "标签名不能为空").max(30),
  color: z.string().default("#6366F1"),
});
export type TagInput = z.infer<typeof TagInput>;
