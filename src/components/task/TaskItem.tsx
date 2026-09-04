import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  GripVertical,
  Pencil,
  Trash2,
  MoreHorizontal,
  Flag,
  FileText,
  ChevronDown,
  Repeat2,
  CalendarClock,
  Bell,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { TagBadge } from "@/components/shared/TagBadge";
import { SubTaskList } from "@/components/task/SubTaskList";
import { TaskDueDatePicker } from "@/components/task/TaskDueDatePicker";
import { PRIORITY_META } from "@/lib/constants";
import { recurrenceLabel } from "@/lib/dateHelpers";
import { useTaskStore } from "@/stores/taskStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

export function TaskItem({
  task,
  focused,
}: {
  task: Task;
  focused?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const toggleTask = useTaskStore((s) => s.toggleTask);
  const patchTask = useTaskStore((s) => s.patchTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const colorblind = useUiStore((s) => s.colorblind);

  const [editingTitle, setEditingTitle] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [expanded, setExpanded] = useState(false);

  const priority = PRIORITY_META[task.priority] ?? PRIORITY_META[3];
  const checked = !!task.completed;
  const hasNote = !!task.note_md.trim();
  const hasSub = task.subtasks.length > 0;
  const hasRecur = !!task.recurrence;
  const hasSched = !!task.scheduled_at;
  const schedTime = hasSched
    ? (() => {
        const d = parseISO(task.scheduled_at!);
        return Number.isNaN(d.getTime())
          ? ""
          : format(d, "M月d日 HH:mm");
      })()
    : "";
  const expandable = hasNote || hasSub || hasRecur || hasSched;

  function openEditor() {
    window.dispatchEvent(new CustomEvent("flowtask:edit", { detail: task.id }));
  }
  function startEdit() {
    setDraft(task.title);
    setEditingTitle(true);
  }
  function commitTitle() {
    setEditingTitle(false);
    const next = draft.trim();
    if (next && next !== task.title) void patchTask(task.id, { title: next });
  }
  function cyclePriority() {
    const next = ((task.priority + 1) % 4) as 0 | 1 | 2 | 3;
    void patchTask(task.id, { priority: next });
  }
  async function handleDelete() {
    await deleteTask(task.id);
    toast.success("已删除任务", {
      action: {
        label: "撤销",
        onClick: () => void useHistoryStore.getState().undo(),
      },
    });
  }

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<string>).detail === task.id) startEdit();
    };
    window.addEventListener("flowtask:inline-edit", handler);
    return () => window.removeEventListener("flowtask:inline-edit", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          ref={setNodeRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ transform: CSS.Transform.toString(transform), transition }}
          className={cn(
            "group relative rounded-[10px] bg-bg-surface py-2.5 pr-2 pl-3",
            "shadow-sm ring-1 ring-border/50 transition-[box-shadow,opacity] duration-200",
            focused && "ring-2 ring-primary/70",
            isDragging && "z-10 opacity-90 shadow-lg ring-primary/60"
          )}
        >
          {/* L0：优先级色条（点击循环）；色盲模式下附加文字标签 */}
          <button
            type="button"
            onClick={cyclePriority}
            title={`优先级：${priority.label}（点击切换）`}
            aria-label={`优先级 ${priority.label}，点击切换`}
            className="absolute top-1/2 left-0 flex h-6 w-1.5 -translate-y-1/2 items-center justify-center rounded-r-full transition-opacity hover:opacity-80"
            style={{ backgroundColor: priority.color }}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label="拖动排序"
              className="-ml-1 hidden size-6 shrink-0 cursor-grab touch-none place-items-center rounded text-text-tertiary hover:bg-bg-hover active:cursor-grabbing group-hover:grid"
            >
              <GripVertical className="size-4" />
            </button>

            {expandable ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-label={expanded ? "收起详情" : "展开详情"}
                className="grid size-5 shrink-0 place-items-center rounded text-text-tertiary hover:bg-bg-hover"
              >
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    expanded && "rotate-180"
                  )}
                />
              </button>
            ) : (
              <span className="size-5 shrink-0" aria-hidden />
            )}

            <Checkbox
              checked={checked}
              onCheckedChange={(v) => void toggleTask(task.id, v === true)}
              className="shrink-0"
            />

            {/* 标题（单击内联编辑） */}
            {editingTitle ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTitle();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setEditingTitle(false);
                  }
                }}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded border border-primary/50 bg-bg-app px-1.5 py-0.5 text-sm font-medium text-text-primary outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={startEdit}
                title="单击编辑标题"
                className="min-w-0 flex-1 text-left"
              >
                <span
                  className={cn(
                    "line-clamp-1 text-sm font-medium transition-colors",
                    checked
                      ? "text-text-tertiary line-through"
                      : "text-text-primary"
                  )}
                >
                  {task.title}
                </span>
                {/* L1：色盲模式在标题行加文字/形状冗余，不靠颜色区分 */}
                {colorblind && (
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-text-tertiary">
                    <span>{priority.label}</span>
                    {hasRecur && (
                      <span className="flex items-center gap-0.5">
                        · 重复 {recurrenceLabel(task.recurrence!.freq, task.recurrence!.interval)}
                      </span>
                    )}
                    {hasSub && <span>· {task.subtasks.length} 子任务</span>}
                    {hasNote && !expanded && <span>· 有备注</span>}
                  </span>
                )}
                {/* L0：轻量状态指示点（非色盲模式的极简提示） */}
                {!colorblind &&
                  (hasRecur || hasSub || hasNote || hasSched) && (
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-tertiary">
                      {hasSched && (
                        <span className="flex items-center gap-0.5 text-brand">
                          <CalendarClock className="size-3" />
                          {schedTime}
                          {task.reminder_enabled === 1 && (
                            <Bell className="size-2.5" />
                          )}
                        </span>
                      )}
                      {hasRecur && <Repeat2 className="size-3" />}
                      {hasSub && (
                        <span>
                          {task.subtasks.filter((s) => s.completed).length}/
                          {task.subtasks.length}
                        </span>
                      )}
                      {hasNote && <FileText className="size-3" />}
                    </span>
                  )}
              </button>
            )}

            {task.tags.length > 0 && (
              <div className="hidden shrink-0 items-center gap-1 lg:flex">
                {task.tags.slice(0, 2).map((t) => (
                  <TagBadge key={t.id} tag={t} />
                ))}
                {task.tags.length > 2 && (
                  <span className="text-[11px] text-text-tertiary">
                    +{task.tags.length - 2}
                  </span>
                )}
              </div>
            )}

            <div className="hidden shrink-0 sm:block">
              <TaskDueDatePicker
                value={task.due_date}
                onChange={(v) => void patchTask(task.id, { due_date: v })}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                className="grid size-7 shrink-0 place-items-center rounded-md text-text-tertiary opacity-0 transition-opacity hover:bg-bg-hover group-hover:opacity-100 data-[state=open]:opacity-100"
                aria-label="任务操作"
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onSelect={() =>
                    window.dispatchEvent(
                      new CustomEvent("flowtask:detail", { detail: task.id })
                    )
                  }
                >
                  <FileText className="size-4" /> 详情
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={openEditor}>
                  <Pencil className="size-4" /> 编辑
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void toggleTask(task.id, !checked)}>
                  <Flag className="size-4" /> {checked ? "重新打开" : "标记完成"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => void handleDelete()}
                >
                  <Trash2 className="size-4" /> 删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* L2：展开时揭示子任务、备注与重复规则 */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="detail"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="mt-2 ml-7 space-y-2 border-t border-border/60 pt-2">
                  {hasRecur && (
                    <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                      <Repeat2 className="size-3.5" />
                      重复：
                      {recurrenceLabel(
                        task.recurrence!.freq,
                        task.recurrence!.interval
                      )}
                      {task.recurrence!.end_date &&
                        ` · 截止 ${task.recurrence!.end_date}`}
                    </div>
                  )}
                  {hasNote && (
                    <div className="ft-md whitespace-pre-wrap rounded-md bg-bg-app p-2 text-xs leading-relaxed text-text-secondary">
                      {task.note_md}
                    </div>
                  )}
                  <SubTaskList parent={task} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onSelect={() =>
            window.dispatchEvent(
              new CustomEvent("flowtask:detail", { detail: task.id })
            )
          }
        >
          <FileText className="size-4" /> 详情
        </ContextMenuItem>
        <ContextMenuItem onSelect={openEditor}>
          <Pencil className="size-4" /> 编辑
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => void toggleTask(task.id, !checked)}>
          <Flag className="size-4" /> {checked ? "重新打开" : "标记完成"}
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: priority.color }}
            />
            优先级
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-36">
            <ContextMenuRadioGroup
              value={String(task.priority)}
              onValueChange={(v) =>
                void patchTask(task.id, { priority: Number(v) })
              }
            >
              {PRIORITY_META.map((p) => (
                <ContextMenuRadioItem key={p.level} value={String(p.level)}>
                  <span
                    className="mr-1 size-2 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.label}
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onSelect={() => void handleDelete()}
        >
          <Trash2 className="size-4" /> 删除
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
