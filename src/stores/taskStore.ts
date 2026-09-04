import { create } from "zustand";
import { format } from "date-fns";
import { db, newId } from "@/lib/db";
import { parseDue, nextDueDate } from "@/lib/dateHelpers";
import { recordHistory } from "@/stores/historyStore";
import type {
  Task,
  TaskInput,
  Tag,
  TaskRow,
  TaskFields,
  TaskSnapshot,
  Recurrence,
} from "@/types/task";

const nowIso = () => new Date().toISOString();

async function linkTags(taskId: string, tagIds: string[]): Promise<void> {
  await db.execute("DELETE FROM task_tags WHERE task_id = $1", [taskId]);
  for (const id of Array.from(new Set(tagIds))) {
    await db.execute(
      "INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES ($1, $2)",
      [taskId, id]
    );
  }
}

async function getTagIds(taskId: string): Promise<string[]> {
  const rows = await db.select<{ tag_id: string }[]>(
    "SELECT tag_id FROM task_tags WHERE task_id = $1",
    [taskId]
  );
  return rows.map((r) => r.tag_id);
}

async function getRecurrence(taskId: string): Promise<Recurrence | null> {
  const row = await db.selectOne<{
    freq: string;
    interval: number;
    end_date: string | null;
  }>(
    "SELECT freq, interval, end_date FROM recurrences WHERE task_id = $1",
    [taskId]
  );
  if (!row) return null;
  return {
    freq: row.freq as Recurrence["freq"],
    interval: row.interval,
    end_date: row.end_date,
  };
}

async function upsertRecurrence(
  taskId: string,
  rec: Recurrence | null
): Promise<void> {
  await db.execute("DELETE FROM recurrences WHERE task_id = $1", [taskId]);
  if (rec) {
    await db.execute(
      `INSERT INTO recurrences (id, task_id, freq, interval, end_date)
       VALUES ($1,$2,$3,$4,$5)`,
      [newId(), taskId, rec.freq, rec.interval, rec.end_date]
    );
  }
}

async function insertTaskRow(row: TaskRow): Promise<void> {
  await db.execute(
    `INSERT INTO tasks
       (id, parent_id, title, note_md, completed, priority, due_date,
        sort_order, view_type, kanban_col, created_at, updated_at, completed_at,
        scheduled_at, reminder_enabled, reminder_offset, last_reminded_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [
      row.id,
      row.parent_id,
      row.title,
      row.note_md,
      row.completed,
      row.priority,
      row.due_date,
      row.sort_order,
      row.view_type,
      row.kanban_col,
      row.created_at,
      row.updated_at,
      row.completed_at,
      row.scheduled_at,
      row.reminder_enabled,
      row.reminder_offset,
      row.last_reminded_at,
    ]
  );
}

function buildTree(
  rows: TaskRow[],
  tagsByTask: Map<string, Tag[]>,
  recByTask: Map<string, Recurrence>
): Task[] {
  const map = new Map<string, Task>();
  for (const r of rows) {
    map.set(r.id, {
      ...r,
      tags: tagsByTask.get(r.id) ?? [],
      subtasks: [],
      recurrence: recByTask.get(r.id) ?? null,
      mode: r.scheduled_at ? "schedule" : "progress",
    });
  }
  const roots: Task[] = [];
  for (const r of rows) {
    const node = map.get(r.id)!;
    if (r.parent_id && map.has(r.parent_id)) {
      map.get(r.parent_id)!.subtasks.push(node);
    } else {
      roots.push(node);
    }
  }
  for (const t of map.values()) {
    t.subtasks.sort((a, b) => a.sort_order - b.sort_order);
  }
  roots.sort((a, b) => a.sort_order - b.sort_order);
  return roots;
}

interface TaskState {
  tasks: Task[];
  loading: boolean;
  loaded: boolean;

  fetchTasks: () => Promise<void>;
  addTask: (input: TaskInput) => Promise<string>;
  addSubtask: (parentId: string, title: string) => Promise<void>;
  editTask: (id: string, input: TaskInput) => Promise<void>;
  patchTask: (id: string, fields: TaskFields) => Promise<void>;
  toggleTask: (id: string, completed: boolean) => Promise<void>;
  deleteTask: (id: string) => Promise<TaskSnapshot | null>;
  restoreTask: (snapshot: TaskSnapshot) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
  applyBoardLayout: (order: Record<string, string[]>) => Promise<void>;
  completeMany: (ids: string[], completed: boolean) => Promise<void>;
  deleteMany: (ids: string[]) => Promise<void>;
  markReminded: (id: string) => Promise<void>;
  seedSamples: () => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  loaded: false,

  fetchTasks: async () => {
    set({ loading: true });
    try {
      const rows = await db.select<TaskRow[]>(
        "SELECT * FROM tasks ORDER BY sort_order ASC, created_at DESC"
      );
      const links = await db.select<
        { task_id: string; id: string; name: string; color: string }[]
      >(
        `SELECT tt.task_id AS task_id, t.id AS id, t.name AS name, t.color AS color
         FROM task_tags tt JOIN tags t ON t.id = tt.tag_id`
      );
      const recs = await db.select<
        { task_id: string; freq: string; interval: number; end_date: string | null }[]
      >("SELECT task_id, freq, interval, end_date FROM recurrences");

      const tagsByTask = new Map<string, Tag[]>();
      for (const l of links) {
        const arr = tagsByTask.get(l.task_id) ?? [];
        arr.push({ id: l.id, name: l.name, color: l.color });
        tagsByTask.set(l.task_id, arr);
      }
      const recByTask = new Map<string, Recurrence>();
      for (const r of recs) {
        recByTask.set(r.task_id, {
          freq: r.freq as Recurrence["freq"],
          interval: r.interval,
          end_date: r.end_date,
        });
      }
      set({
        tasks: buildTree(rows, tagsByTask, recByTask),
        loading: false,
        loaded: true,
      });
    } catch (err) {
      console.error("fetchTasks failed", err);
      set({ loading: false });
    }
  },

  addTask: async (input) => {
    const id = newId();
    await recordHistory("新建任务", async () => {
      await db.execute(
        `INSERT INTO tasks
           (id, parent_id, title, note_md, completed, priority, due_date, sort_order, view_type,
            scheduled_at, reminder_enabled, reminder_offset)
         VALUES ($1,$2,$3,$4,0,$5,$6,$7,$8,$9,$10,$11)`,
        [
          id,
          input.parent_id,
          input.title,
          input.note_md,
          input.priority,
          input.due_date,
          Date.now(),
          input.view_type,
          input.scheduled_at,
          input.reminder_enabled,
          input.reminder_offset,
        ]
      );
      await linkTags(id, input.tagIds);
      await upsertRecurrence(id, input.recurrence);
      await get().fetchTasks();
    });
    return id;
  },

  addSubtask: async (parentId, title) => {
    await get().addTask({
      title,
      note_md: "",
      priority: 3,
      due_date: null,
      view_type: "list",
      parent_id: parentId,
      tagIds: [],
      recurrence: null,
      scheduled_at: null,
      reminder_enabled: 0,
      reminder_offset: 900,
    });
  },

  editTask: async (id, input) => {
    await recordHistory("编辑任务", async () => {
      await db.execute(
        `UPDATE tasks
           SET title=$1, note_md=$2, priority=$3, due_date=$4,
               view_type=$5, updated_at=$6,
               scheduled_at=$7, reminder_enabled=$8, reminder_offset=$9
         WHERE id=$10`,
        [
          input.title,
          input.note_md,
          input.priority,
          input.due_date,
          input.view_type,
          nowIso(),
          input.scheduled_at,
          input.reminder_enabled,
          input.reminder_offset,
          id,
        ]
      );
      await linkTags(id, input.tagIds);
      await upsertRecurrence(id, input.recurrence);
      await get().fetchTasks();
    });
  },

  patchTask: async (id, fields) => {
    const cols: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    const add = (col: string, val: unknown) => {
      cols.push(`${col}=$${i++}`);
      vals.push(val);
    };
    if (fields.title !== undefined) add("title", fields.title);
    if (fields.note_md !== undefined) add("note_md", fields.note_md);
    if (fields.priority !== undefined) add("priority", fields.priority);
    if (fields.due_date !== undefined) add("due_date", fields.due_date);
    if (fields.view_type !== undefined) add("view_type", fields.view_type);
    if (fields.scheduled_at !== undefined)
      add("scheduled_at", fields.scheduled_at);
    if (fields.reminder_enabled !== undefined)
      add("reminder_enabled", fields.reminder_enabled);
    if (fields.reminder_offset !== undefined)
      add("reminder_offset", fields.reminder_offset);
    if (cols.length === 0) return;
    vals.push(nowIso(), id);
    await recordHistory("编辑任务", async () => {
      await db.execute(
        `UPDATE tasks SET ${cols.join(", ")}, updated_at=$${i++} WHERE id=$${i}`,
        vals
      );
      await get().fetchTasks();
    });
  },

  toggleTask: async (id, completed) => {
    await recordHistory(completed ? "完成任务" : "重新打开", async () => {
      // 完成一个重复任务：生成下一次实例（若未超过截止日期）。
      if (completed) {
        const row = await db.selectOne<TaskRow>(
          "SELECT * FROM tasks WHERE id = $1",
          [id]
        );
        const rec = row ? await getRecurrence(id) : null;
        if (row && rec) {
          const base = parseDue(row.due_date) ?? new Date();
          const next = nextDueDate(rec.freq, rec.interval, base);
          const endDate = rec.end_date ? parseDue(rec.end_date) : null;
          if (!endDate || next.getTime() <= endDate.getTime()) {
            const nid = newId();
            const now = nowIso();
            await db.execute(
              `INSERT INTO tasks
                 (id, parent_id, title, note_md, completed, priority, due_date,
                  sort_order, view_type, kanban_col, created_at, updated_at)
               VALUES ($1,$2,$3,$4,0,$5,$6,$7,$8,$9,$10,$11)`,
              [
                nid,
                row.parent_id,
                row.title,
                row.note_md,
                row.priority,
                format(next, "yyyy-MM-dd"),
                Date.now(),
                row.view_type,
                row.kanban_col,
                now,
                now,
              ]
            );
            await linkTags(nid, await getTagIds(id));
            await upsertRecurrence(nid, rec);
          }
        }
      }
      await db.execute(
        `UPDATE tasks
           SET completed=$1,
               completed_at=CASE WHEN $1=1 THEN $2 ELSE NULL END,
               updated_at=$2
         WHERE id=$3`,
        [completed ? 1 : 0, nowIso(), id]
      );
      await get().fetchTasks();
    });
  },

  deleteTask: async (id) => {
    const task = await db.selectOne<TaskRow>(
      "SELECT * FROM tasks WHERE id = $1",
      [id]
    );
    if (!task) return null;
    const subtasks = await db.select<TaskRow[]>(
      "SELECT * FROM tasks WHERE parent_id = $1",
      [id]
    );
    const recurrence = await getRecurrence(id);
    const tagIds = await getTagIds(id);
    const snapshot: TaskSnapshot = { task, subtasks, tagIds, recurrence };
    await recordHistory("删除任务", async () => {
      await db.execute("DELETE FROM tasks WHERE id = $1", [id]);
      await get().fetchTasks();
    });
    return snapshot;
  },

  restoreTask: async (snap) => {
    await insertTaskRow(snap.task);
    for (const s of snap.subtasks) await insertTaskRow(s);
    await linkTags(snap.task.id, snap.tagIds);
    await upsertRecurrence(snap.task.id, snap.recurrence);
    await get().fetchTasks();
  },

  reorder: async (orderedIds) => {
    await recordHistory("调整顺序", async () => {
      await Promise.all(
        orderedIds.map((id, idx) =>
          db.execute("UPDATE tasks SET sort_order=$1 WHERE id=$2", [idx, id])
        )
      );
      await get().fetchTasks();
    });
  },

  applyBoardLayout: async (order) => {
    await recordHistory("移动卡片", async () => {
      const entries = Object.entries(order);
      for (const [colId, ids] of entries) {
        for (let idx = 0; idx < ids.length; idx++) {
          await db.execute(
            "UPDATE tasks SET kanban_col=$1, sort_order=$2, updated_at=$3 WHERE id=$4",
            [colId, idx, nowIso(), ids[idx]]
          );
        }
      }
      await get().fetchTasks();
    });
  },

  completeMany: async (ids, completed) => {
    if (ids.length === 0) return;
    await recordHistory(completed ? "批量完成" : "批量重新打开", async () => {
      for (const id of ids) {
        await db.execute(
          `UPDATE tasks
             SET completed=$1,
                 completed_at=CASE WHEN $1=1 THEN $2 ELSE NULL END,
                 updated_at=$2
           WHERE id=$3`,
          [completed ? 1 : 0, nowIso(), id]
        );
      }
      await get().fetchTasks();
    });
  },

  deleteMany: async (ids) => {
    if (ids.length === 0) return;
    await recordHistory("批量删除", async () => {
      for (const id of ids)
        await db.execute("DELETE FROM tasks WHERE id=$1", [id]);
      await get().fetchTasks();
    });
  },

  markReminded: async (id) => {
    await db.execute("UPDATE tasks SET last_reminded_at = $1 WHERE id = $2", [
      nowIso(),
      id,
    ]);
  },

  seedSamples: async () => {
    await recordHistory("导入示例", async () => {
      const tagDefs = [
        { name: "工作", color: "#6366F1" },
        { name: "生活", color: "#22C55E" },
        { name: "学习", color: "#F59E0B" },
      ];
      const tagIds: Record<string, string> = {};
      for (const td of tagDefs) {
        const id = newId();
        tagIds[td.name] = id;
        await db.execute(
          "INSERT OR IGNORE INTO tags (id, name, color) VALUES ($1,$2,$3)",
          [id, td.name, td.color]
        );
      }
      const today = format(new Date(), "yyyy-MM-dd");
      const tomorrow = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");
      const samples: {
        t: string;
        p: number;
        due: string | null;
        tags: string[];
        done?: boolean;
      }[] = [
        { t: "欢迎使用 FlowTask 🎉", p: 1, due: today, tags: ["工作"] },
        {
          t: "试试自然语言快添：写周报 !p0 #工作 明天",
          p: 0,
          due: tomorrow,
          tags: ["工作"],
        },
        { t: "去「专注」页面体验番茄钟与统计", p: 2, due: today, tags: ["学习"] },
        {
          t: "点开任务详情，试试 Markdown 备注与代码高亮",
          p: 3,
          due: null,
          tags: ["生活"],
        },
        {
          t: "这条已完成任务可以撤销删除",
          p: 2,
          due: null,
          tags: ["生活"],
          done: true,
        },
      ];
      let order = 0;
      for (const s of samples) {
        const id = newId();
        const now = nowIso();
        await db.execute(
          `INSERT INTO tasks
             (id, title, note_md, completed, priority, due_date, sort_order, view_type, created_at, updated_at, completed_at)
           VALUES ($1,$2,'',$3,$4,$5,$6,'list',$7,$7,$8)`,
          [
            id,
            s.t,
            s.done ? 1 : 0,
            s.p,
            s.due,
            Date.now() + order++,
            now,
            s.done ? now : null,
          ]
        );
        for (const name of s.tags) {
          await db.execute(
            "INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES ($1,$2)",
            [id, tagIds[name]]
          );
        }
      }
      await get().fetchTasks();
    });
  },
}));
