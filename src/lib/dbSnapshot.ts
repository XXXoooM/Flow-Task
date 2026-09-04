import { db } from "@/lib/db";
import type { TaskRow, Tag } from "@/types/task";

export interface DbSnapshot {
  tasks: TaskRow[];
  tags: Tag[];
  taskTags: { task_id: string; tag_id: string }[];
  recurrences: {
    id: string;
    task_id: string;
    freq: string;
    interval: number;
    weekdays: string | null;
    end_date: string | null;
    max_count: number | null;
  }[];
}

type RecRow = DbSnapshot["recurrences"][number];

/** 捕获任务相关的全部状态（不含 focus_sessions，避免回滚影响专注统计）。 */
export async function takeSnapshot(): Promise<DbSnapshot> {
  const [tasks, tags, taskTags, recurrences] = await Promise.all([
    db.select<TaskRow[]>(
      "SELECT id, parent_id, title, note_md, completed, priority, due_date, sort_order, view_type, kanban_col, created_at, updated_at, completed_at, scheduled_at, reminder_enabled, reminder_offset, last_reminded_at FROM tasks"
    ),
    db.select<Tag[]>("SELECT id, name, color FROM tags"),
    db.select<{ task_id: string; tag_id: string }[]>(
      "SELECT task_id, tag_id FROM task_tags"
    ),
    db.select<RecRow[]>(
      "SELECT id, task_id, freq, interval, weekdays, end_date, max_count FROM recurrences"
    ),
  ]);
  return { tasks, tags, taskTags, recurrences };
}

/** 将数据库恢复为给定快照。focus_sessions 不受影响。 */
export async function restoreSnapshot(snap: DbSnapshot): Promise<void> {
  await db.execute("DELETE FROM task_tags");
  await db.execute("DELETE FROM recurrences");
  await db.execute("DELETE FROM tags");
  await db.execute("DELETE FROM tasks");

  for (const t of snap.tasks) {
    await db.execute(
      `INSERT INTO tasks
        (id, parent_id, title, note_md, completed, priority, due_date,
         sort_order, view_type, kanban_col, created_at, updated_at, completed_at,
         scheduled_at, reminder_enabled, reminder_offset, last_reminded_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        t.id,
        t.parent_id,
        t.title,
        t.note_md,
        t.completed,
        t.priority,
        t.due_date,
        t.sort_order,
        t.view_type,
        t.kanban_col,
        t.created_at,
        t.updated_at,
        t.completed_at,
        t.scheduled_at,
        t.reminder_enabled,
        t.reminder_offset,
        t.last_reminded_at,
      ]
    );
  }
  for (const t of snap.tags) {
    await db.execute("INSERT INTO tags (id, name, color) VALUES ($1,$2,$3)", [
      t.id,
      t.name,
      t.color,
    ]);
  }
  for (const l of snap.taskTags) {
    await db.execute(
      "INSERT INTO task_tags (task_id, tag_id) VALUES ($1,$2)",
      [l.task_id, l.tag_id]
    );
  }
  for (const r of snap.recurrences) {
    await db.execute(
      `INSERT INTO recurrences (id, task_id, freq, interval, weekdays, end_date, max_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        r.id,
        r.task_id,
        r.freq,
        r.interval,
        r.weekdays,
        r.end_date,
        r.max_count,
      ]
    );
  }
}
