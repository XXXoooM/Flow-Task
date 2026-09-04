import { useEffect } from "react";
import { useTaskStore } from "@/stores/taskStore";
import type { Task } from "@/types/task";
import { type ViewId } from "@/lib/constants";
import { isToday, isBefore, startOfDay, startOfTomorrow } from "date-fns";
import { parseDue } from "@/lib/dateHelpers";

/** 列表仅显示顶层任务（子任务留待 P2）。 */
export function isTopLevel(t: Task): boolean {
  return t.parent_id === null;
}

function matchesQuery(t: Task, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    t.title.toLowerCase().includes(needle) ||
    t.tags.some((tag) => tag.name.toLowerCase().includes(needle))
  );
}

function inView(t: Task, view: ViewId): boolean {
  if (view === "today" || view === "upcoming") {
    const d = parseDue(t.due_date);
    if (!d) return view === "today" ? false : false;
    const now = new Date();
    if (view === "today") {
      // 今天到期，或已逾期
      return isToday(d) || isBefore(d, startOfDay(now));
    }
    // upcoming：未来（明天及以后）
    return !isBefore(d, startOfTomorrow());
  }
  // inbox（及 calendar/kanban/focus 的兜底）显示全部
  return true;
}

export interface FilteredTasks {
  active: Task[];
  completed: Task[];
}

export function filterTasks(
  tasks: Task[],
  view: ViewId,
  query: string
): FilteredTasks {
  const pool = tasks.filter(
    (t) => isTopLevel(t) && inView(t, view) && matchesQuery(t, query)
  );
  return {
    active: pool.filter((t) => !t.completed),
    completed: pool.filter((t) => t.completed),
  };
}

/** 拉取并订阅任务；返回常用动作。 */
export function useTasks() {
  const tasks = useTaskStore((s) => s.tasks);
  const loading = useTaskStore((s) => s.loading);
  const loaded = useTaskStore((s) => s.loaded);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const addTask = useTaskStore((s) => s.addTask);
  const addSubtask = useTaskStore((s) => s.addSubtask);
  const editTask = useTaskStore((s) => s.editTask);
  const patchTask = useTaskStore((s) => s.patchTask);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const restoreTask = useTaskStore((s) => s.restoreTask);
  const reorder = useTaskStore((s) => s.reorder);
  const completeMany = useTaskStore((s) => s.completeMany);
  const deleteMany = useTaskStore((s) => s.deleteMany);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    loaded,
    fetchTasks,
    addTask,
    addSubtask,
    editTask,
    patchTask,
    toggleTask,
    deleteTask,
    restoreTask,
    reorder,
    completeMany,
    deleteMany,
  };
}
