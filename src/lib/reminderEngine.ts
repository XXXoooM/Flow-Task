import { parseISO } from "date-fns";
import type { Task } from "@/types/task";

export interface DueReminder {
  task: Task;
  fireAt: number; // 计划提醒时刻（ms）
  missed: boolean; // 计划时间点是否已过
}

export function flattenTasks(tasks: Task[]): Task[] {
  const out: Task[] = [];
  for (const t of tasks) {
    out.push(t);
    if (t.subtasks.length) out.push(...flattenTasks(t.subtasks));
  }
  return out;
}

/** 现在是否处于免打扰时段（支持跨零点）。分钟粒度。 */
export function isInDnd(now: Date, enabled: boolean, start: number, end: number): boolean {
  if (!enabled) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  if (start === end) return false;
  if (start < end) return cur >= start && cur < end;
  return cur >= start || cur < end; // 跨零点
}

/**
 * 计算到点应触发的日程提醒：
 * scheduled_at - reminder_offset <= now，且未完成、开启了提醒、且距上次提醒超过冷却期。
 */
export function computeDueReminders(
  tasks: Task[],
  nowMs: number,
  cooldownMs: number
): DueReminder[] {
  const result: DueReminder[] = [];
  for (const t of flattenTasks(tasks)) {
    if (t.completed) continue;
    if (t.reminder_enabled !== 1) continue;
    if (!t.scheduled_at) continue;
    const sched = parseISO(t.scheduled_at);
    if (Number.isNaN(sched.getTime())) continue;
    const fireAt = sched.getTime() - (t.reminder_offset ?? 0) * 1000;
    if (nowMs < fireAt) continue;
    if (t.last_reminded_at) {
      const last = parseISO(t.last_reminded_at).getTime();
      if (!Number.isNaN(last) && nowMs - last < cooldownMs) continue;
    }
    result.push({ task: t, fireAt, missed: nowMs > sched.getTime() });
  }
  return result;
}
