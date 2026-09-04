import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Search,
  Plus,
  ListTodo,
  MoreHorizontal,
  CheckCheck,
  Trash2,
  PartyPopper,
} from "lucide-react";
import { VIEW_META, type ViewId } from "@/lib/constants";
import { useUiStore } from "@/stores/uiStore";
import { useTagStore } from "@/stores/tagStore";
import { useTaskStore } from "@/stores/taskStore";
import { useHistoryStore } from "@/stores/historyStore";
import { parseQuickAdd } from "@/lib/nlParse";
import { useTasks, filterTasks } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/EmptyState";
import { TaskList } from "@/components/task/TaskList";
import { TaskQuickAdd } from "@/components/task/TaskQuickAdd";
import { TaskForm } from "@/components/task/TaskForm";
import { TaskDetail } from "@/components/task/TaskDetail";
import { cn } from "@/lib/utils";
import type { Task, TaskInput } from "@/types/task";

// 重型视图懒加载，减小首屏包体、加快冷启动。
const CalendarView = lazy(() =>
  import("@/components/views/CalendarView").then((m) => ({ default: m.CalendarView }))
);
const KanbanView = lazy(() =>
  import("@/components/views/KanbanView").then((m) => ({ default: m.KanbanView }))
);
const FocusView = lazy(() =>
  import("@/components/views/FocusView").then((m) => ({ default: m.FocusView }))
);
const SettingsView = lazy(() =>
  import("@/components/views/SettingsView").then((m) => ({ default: m.SettingsView }))
);
const TimelineView = lazy(() =>
  import("@/components/views/TimelineView").then((m) => ({ default: m.TimelineView }))
);

const ViewFallback = () => (
  <div className="grid h-full place-items-center">
    <div className="h-6 w-24 animate-pulse rounded-full bg-bg-elevated" />
  </div>
);

const isTaskView = (v: ViewId) =>
  v === "inbox" || v === "today" || v === "upcoming";
const isBoardView = (v: ViewId) => v === "calendar" || v === "kanban";

export function MainView() {
  const activeView = useUiStore((s) => s.activeView);
  const meta = VIEW_META[activeView];
  const lastPriority = useUiStore((s) => s.lastPriority);
  const setLastDefaults = useUiStore((s) => s.setLastDefaults);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const createTag = useTagStore((s) => s.createTag);
  const seedSamples = useTaskStore((s) => s.seedSamples);
  const taskMode = useUiStore((s) => s.taskMode);
  const setTaskMode = useUiStore((s) => s.setTaskMode);

  const { tasks, loading, addTask, editTask, completeMany, deleteMany } =
    useTasks();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [newDue, setNewDue] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const detailTask = useMemo(
    () => tasks.find((t) => t.id === detailId) ?? null,
    [tasks, detailId]
  );

  // 详情事件（TaskItem 右键/菜单触发）
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string | null>).detail;
      setDetailId(id ?? null);
    };
    window.addEventListener("flowtask:detail", handler);
    return () => window.removeEventListener("flowtask:detail", handler);
  }, []);

  const { active, completed } = useMemo(
    () => filterTasks(tasks, activeView, query),
    [tasks, activeView, query]
  );

  const empty = !loading && active.length === 0 && completed.length === 0;

  // 编辑事件（TaskItem / KanbanCard 触发）
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const t = tasks.find((x) => x.id === id);
      if (t) {
        setEditing(t);
        setNewDue(null);
        setFormOpen(true);
      }
    };
    window.addEventListener("flowtask:edit", handler);
    return () => window.removeEventListener("flowtask:edit", handler);
  }, [tasks]);

  // 新建事件（CalendarView 点击某天触发），带预填日期
  useEffect(() => {
    const handler = (e: Event) => {
      const due = (e as CustomEvent<string>).detail ?? null;
      setEditing(null);
      setNewDue(due);
      setFormOpen(true);
    };
    window.addEventListener("flowtask:new", handler);
    return () => window.removeEventListener("flowtask:new", handler);
  }, []);

  function openNew(due?: string | null) {
    setEditing(null);
    setNewDue(due ?? null);
    setFormOpen(true);
  }

  async function handleSubmit(id: string | null, input: TaskInput) {
    if (id) {
      await editTask(id, input);
    } else {
      await addTask(input);
      // 记住本次优先级/标签，作为下次新建的默认值
      setLastDefaults(input.priority, input.tagIds);
    }
  }

  async function handleQuickAdd(raw: string) {
    const p = parseQuickAdd(raw);
    if (!p.title) return;
    const tagIds: string[] = [];
    for (const name of p.tagNames) {
      const t = await createTag(name);
      tagIds.push(t.id);
    }
    const inheritedTags =
      tagIds.length > 0 ? tagIds : useUiStore.getState().lastTagIds;
    const priority =
      p.priority ?? (lastPriority ?? 2) ?? 2;
    let due = p.due;
    if (due == null) {
      if (activeView === "today") due = format(new Date(), "yyyy-MM-dd");
    }
    await addTask({
      title: p.title,
      note_md: "",
      priority,
      due_date: due,
      view_type: "list",
      parent_id: null,
      tagIds: inheritedTags,
      recurrence: null,
      scheduled_at: p.scheduledAt,
      reminder_enabled: p.reminderEnabled ? 1 : 0,
      reminder_offset: p.reminderOffset,
    });
    setLastDefaults(priority, inheritedTags);
  }

  async function handleCompleteAll() {
    const ids = active.map((t) => t.id);
    if (ids.length === 0) return;
    await completeMany(ids, true);
    toast.success(`已完成 ${ids.length} 个任务`, {
      action: { label: "撤销", onClick: () => void useHistoryStore.getState().undo() },
    });
  }

  async function handleClearCompleted() {
    const ids = completed.map((t) => t.id);
    if (ids.length === 0) return;
    await deleteMany(ids);
    toast.success(`已删除 ${ids.length} 个已完成任务`, {
      action: { label: "撤销", onClick: () => void useHistoryStore.getState().undo() },
    });
  }

  const renderTaskBody = () => {
    if (taskMode === "schedule") {
      return <TimelineView tasks={tasks} query={query} />;
    }
    // 今日视图：只剩已完成 → 庆祝 + 引导下一步
    if (
      !loading &&
      activeView === "today" &&
      active.length === 0 &&
      completed.length > 0
    ) {
      return (
        <EmptyState
          icon={PartyPopper}
          title="今天的任务都搞定了 🎉"
          description="去看看明天安排了什么，或者休息一下。"
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setActiveView("upcoming")}>
                查看明日待办
              </Button>
              <Button size="sm" onClick={() => openNew()}>
                <Plus className="size-4" />
                添加任务
              </Button>
            </div>
          }
        />
      );
    }

    if (empty) {
      if (query) {
        return (
          <EmptyState
            icon={Search}
            title="没找到匹配任务"
            description={`关键词“${query}”没有命中，换个词或清除筛选试试。`}
            action={
              <Button size="sm" variant="outline" onClick={() => setQuery("")}>
                清除筛选
              </Button>
            }
          />
        );
      }
      return (
        <EmptyState
          icon={ListTodo}
          title="开始你的第一个任务流"
          description="在下方输入即可快速添加，支持 !p0 #标签 明天 这样的自然语言。"
          action={
            <div className="flex gap-2">
              <Button size="sm" onClick={() => openNew()}>
                <Plus className="size-4" />
                创建任务
              </Button>
              <Button size="sm" variant="outline" onClick={() => void seedSamples()}>
                导入示例
              </Button>
            </div>
          }
        />
      );
    }
    return <TaskList active={active} completed={completed} />;
  };

  const renderBody = () => {
    switch (activeView) {
      case "calendar":
        return <CalendarView />;
      case "kanban":
        return <KanbanView />;
      case "focus":
        return <FocusView />;
      case "settings":
        return <SettingsView />;
      default:
        return renderTaskBody();
    }
  };

  const hasActions = active.length > 0 || completed.length > 0;

  return (
    <section className="relative flex h-full min-w-0 flex-1 flex-col bg-bg-app">
      {/* 顶栏 */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-5">
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold text-text-primary">
            {meta.label}
          </h1>
          <p className="truncate text-xs text-text-tertiary">{meta.description}</p>
        </div>

        <div className="flex items-center gap-2">
          {isTaskView(activeView) && (
            <div className="relative flex items-center rounded-lg bg-bg-elevated p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTaskMode("progress")}
                className={cn(
                  "relative z-10 flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors",
                  taskMode === "progress"
                    ? "text-text-primary"
                    : "text-text-tertiary hover:text-text-secondary"
                )}
              >
                {taskMode === "progress" && (
                  <motion.span
                    layoutId="mode-tab-active"
                    className="absolute inset-0 rounded-md bg-bg-surface shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10">⚡ 进度</span>
              </button>
              <button
                type="button"
                onClick={() => setTaskMode("schedule")}
                className={cn(
                  "relative z-10 flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors",
                  taskMode === "schedule"
                    ? "text-text-primary"
                    : "text-text-tertiary hover:text-text-secondary"
                )}
              >
                {taskMode === "schedule" && (
                  <motion.span
                    layoutId="mode-tab-active"
                    className="absolute inset-0 rounded-md bg-bg-surface shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10">📅 日程</span>
              </button>
            </div>
          )}

          {isTaskView(activeView) && (
            <>
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2.5 size-4 text-text-tertiary" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={taskMode === "schedule" ? "搜索日程…" : "搜索任务…"}
                  className="h-8 w-44 pl-8 text-sm transition-all"
                />
              </div>
              {taskMode === "progress" && hasActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="size-8 p-0">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      disabled={active.length === 0}
                      onSelect={() => void handleCompleteAll()}
                    >
                      <CheckCheck className="size-4" /> 标记全部完成
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={completed.length === 0}
                      onSelect={() => void handleClearCompleted()}
                    >
                      <Trash2 className="size-4" /> 删除已完成（{completed.length}）
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
          {activeView !== "focus" && activeView !== "settings" && (
            <Button size="sm" className="gap-1.5" onClick={() => openNew()}>
              <Plus className="size-4" />
              添加
            </Button>
          )}
        </div>
      </header>

      {/* 主体 */}
      <div
        className={cn(
          "min-h-0 flex-1 px-5 pb-5",
          isBoardView(activeView) ? "overflow-hidden" : "overflow-y-auto ft-scroll"
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full"
          >
            <Suspense fallback={<ViewFallback />}>{renderBody()}</Suspense>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 快速添加 */}
      {isTaskView(activeView) && (
        <div className="shrink-0 px-5 pb-4">
          <TaskQuickAdd onSubmit={handleQuickAdd} />
        </div>
      )}

      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editing}
        defaultDue={newDue}
        onSubmit={handleSubmit}
      />

      <TaskDetail task={detailTask} />
    </section>
  );
}
