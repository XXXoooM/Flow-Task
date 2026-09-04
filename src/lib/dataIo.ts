import { db, newId } from "@/lib/db";
import { useTaskStore } from "@/stores/taskStore";
import type { TaskRow, Tag } from "@/types/task";

const VERSION = 1;

interface Backup {
  app: "FlowTask";
  version: number;
  exportedAt: string;
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

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
    d.getHours()
  )}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export async function exportJson() {
  const backup = await readBackup();
  triggerDownload(
    `flowtask-backup-${stamp()}.json`,
    JSON.stringify(backup, null, 2),
    "application/json"
  );
}

async function readBackup(): Promise<Backup> {
  const tasks = await db.select<TaskRow[]>("SELECT * FROM tasks");
  const tags = await db.select<Tag[]>("SELECT * FROM tags");
  const taskTags = await db.select<{ task_id: string; tag_id: string }[]>(
    "SELECT task_id, tag_id FROM task_tags"
  );
  const recurrences = await db.select<Backup["recurrences"]>(
    "SELECT id, task_id, freq, interval, weekdays, end_date, max_count FROM recurrences"
  );
  return {
    app: "FlowTask",
    version: VERSION,
    exportedAt: new Date().toISOString(),
    tasks,
    tags,
    taskTags,
    recurrences,
  };
}

function csvCell(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportCsv() {
  const tasks = await db.select<TaskRow[]>("SELECT * FROM tasks ORDER BY sort_order");
  const links = await db.select<{ task_id: string; tag_id: string; name: string }[]>(
    `SELECT tt.task_id AS task_id, t.tag_id AS tag_id, t.name AS name
     FROM task_tags tt JOIN tags t ON t.id = tt.tag_id`
  );
  const tagByTask = new Map<string, string[]>();
  for (const l of links) {
    const arr = tagByTask.get(l.task_id) ?? [];
    arr.push(l.name);
    tagByTask.set(l.task_id, arr);
  }

  const header = ["title", "completed", "priority", "due_date", "tags", "note"];
  const rows = tasks.map((t) =>
    [
      t.title,
      t.completed ? "1" : "0",
      String(t.priority),
      t.due_date ?? "",
      (tagByTask.get(t.id) ?? []).join("; "),
      t.note_md.replace(/\r?\n/g, " "),
    ].map(csvCell)
  );
  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  // BOM 以便 Excel 正确识别 UTF-8
  triggerDownload(`flowtask-tasks-${stamp()}.csv`, "" + csv, "text/csv");
}

export async function importJsonText(text: string): Promise<number> {
  const data = JSON.parse(text) as Partial<Backup>;
  if (!data || data.app !== "FlowTask" || !Array.isArray(data.tasks)) {
    throw new Error("不是有效的 FlowTask 备份文件");
  }
  await replaceAll(data as Backup);
  await useTaskStore.getState().fetchTasks();
  return data.tasks.length;
}

async function replaceAll(data: Backup) {
  await db.execute("DELETE FROM task_tags");
  await db.execute("DELETE FROM recurrences");
  await db.execute("DELETE FROM focus_sessions");
  await db.execute("DELETE FROM tags");
  await db.execute("DELETE FROM tasks");

  for (const t of data.tags ?? []) {
    await db.execute("INSERT OR IGNORE INTO tags (id, name, color) VALUES ($1,$2,$3)", [
      t.id ?? newId(),
      t.name,
      t.color ?? "#6366F1",
    ]);
  }
  for (const row of data.tasks) {
    await db.execute(
      `INSERT OR REPLACE INTO tasks
        (id, parent_id, title, note_md, completed, priority, due_date,
         sort_order, view_type, kanban_col, created_at, updated_at, completed_at,
         scheduled_at, reminder_enabled, reminder_offset, last_reminded_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        row.id ?? newId(),
        row.parent_id ?? null,
        row.title ?? "",
        row.note_md ?? "",
        row.completed ?? 0,
        row.priority ?? 3,
        row.due_date ?? null,
        row.sort_order ?? 0,
        row.view_type ?? "list",
        row.kanban_col ?? null,
        row.created_at ?? new Date().toISOString(),
        row.updated_at ?? new Date().toISOString(),
        row.completed_at ?? null,
        row.scheduled_at ?? null,
        row.reminder_enabled ?? 0,
        row.reminder_offset ?? 900,
        row.last_reminded_at ?? null,
      ]
    );
  }
  for (const l of data.taskTags ?? []) {
    await db.execute("INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES ($1,$2)", [
      l.task_id,
      l.tag_id,
    ]);
  }
  for (const r of data.recurrences ?? []) {
    await db.execute(
      `INSERT OR IGNORE INTO recurrences
        (id, task_id, freq, interval, weekdays, end_date, max_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [r.id ?? newId(), r.task_id, r.freq, r.interval, r.weekdays, r.end_date, r.max_count]
    );
  }
}
