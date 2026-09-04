import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { ChevronRight, Trash2 } from "lucide-react";
import { TaskItem } from "@/components/task/TaskItem";
import { Checkbox } from "@/components/ui/checkbox";
import { useTaskStore } from "@/stores/taskStore";
import { useHistoryStore } from "@/stores/historyStore";
import { PRIORITY_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

const VIRTUAL_THRESHOLD = 200;

function isTyping(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    t.isContentEditable === true
  );
}

export function TaskList({
  active,
  completed,
}: {
  active: Task[];
  completed: Task[];
}) {
  const [showDone, setShowDone] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const reorder = useTaskStore((s) => s.reorder);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const ids = active.map((t) => t.id);
  const virtualize = active.length > VIRTUAL_THRESHOLD;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const rowVirtualizer = useVirtualizer({
    count: active.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 8,
    enabled: virtualize,
  });

  function handleDragStart(e: DragStartEvent) {
    setActiveDragId(String(e.active.id));
  }
  function handleDragEnd(e: DragEndEvent) {
    setActiveDragId(null);
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    const from = ids.indexOf(String(a.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    void reorder(arrayMove(ids, from, to));
  }

  // 全键盘导航：↑↓ 移动焦点，Enter 内联编辑，Space 完成，Delete 删除
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (active.length === 0) return;
      if (isTyping(e.target)) return;
      const key = e.key;
      if (key === "ArrowDown") {
        e.preventDefault();
        setFocusIdx((i) => Math.min(active.length - 1, i + 1));
      } else if (key === "ArrowUp") {
        e.preventDefault();
        setFocusIdx((i) => Math.max(0, i - 1));
      } else if (focusIdx >= 0 && focusIdx < active.length) {
        const t = active[focusIdx];
        if (key === "Enter") {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent("flowtask:inline-edit", { detail: t.id })
          );
        } else if (key === " ") {
          e.preventDefault();
          void toggleTask(t.id, !t.completed);
        } else if (key === "Delete" || key === "Backspace") {
          e.preventDefault();
          void (async () => {
            await deleteTask(t.id);
            toast.success("已删除任务", {
              action: {
                label: "撤销",
                onClick: () => void useHistoryStore.getState().undo(),
              },
            });
            setFocusIdx(-1);
          })();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, focusIdx, toggleTask, deleteTask]);

  async function removeCompleted(task: Task) {
    await deleteTask(task.id);
    toast.success("已删除任务", {
      action: {
        label: "撤销",
        onClick: () => void useHistoryStore.getState().undo(),
      },
    });
  }

  const activeDragTask = activeDragId
    ? active.find((t) => t.id === activeDragId)
    : null;
  const dragPriority = activeDragTask
    ? PRIORITY_META[activeDragTask.priority] ?? PRIORITY_META[3]
    : null;

  const renderItem = (task: Task, i: number) => (
    <TaskItem task={task} focused={i === focusIdx} />
  );

  const activeItems = virtualize ? (
    <div ref={parentRef} className="h-full overflow-y-auto ft-scroll">
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          position: "relative",
          width: "100%",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((vi) => {
          const task = active[vi.index];
          if (!task) return null;
          return (
            <div
              key={task.id}
              data-index={vi.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vi.start}px)`,
                paddingBottom: "8px",
              }}
            >
              {renderItem(task, vi.index)}
            </div>
          );
        })}
      </div>
    </div>
  ) : (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {active.map((task, i) => (
          <div key={task.id}>{renderItem(task, i)}</div>
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDragId(null)}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {virtualize ? <div className="h-full">{activeItems}</div> : activeItems}
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2,0,0,1)" }}>
        {activeDragTask && dragPriority ? (
          <div
            className="flex items-center gap-2 rounded-[10px] bg-bg-surface py-2.5 pr-3 pl-4 shadow-lg ring-2 ring-primary/50"
            style={{ width: "100%" }}
          >
            <span
              className="h-5 w-1 rounded-full"
              style={{ backgroundColor: dragPriority.color }}
            />
            <span className="line-clamp-1 text-sm font-medium text-text-primary">
              {activeDragTask.title}
            </span>
          </div>
        ) : null}
      </DragOverlay>

      {completed.length > 0 && (
        <div className={cn(virtualize ? "shrink-0 pt-2" : "pt-1")}>
          <button
            type="button"
            onClick={() => setShowDone((s) => !s)}
            className="flex items-center gap-1.5 px-1 py-1 text-xs font-medium text-text-tertiary transition-colors hover:text-text-secondary"
          >
            <ChevronRight
              className={cn("size-3.5 transition-transform", showDone && "rotate-90")}
            />
            已完成 · {completed.length}
          </button>
          <AnimatePresence initial={false}>
            {showDone && (
              <motion.div
                key="done"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="max-h-72 overflow-y-auto ft-scroll"
              >
                <div className="space-y-1.5 pt-2">
                  {completed.map((task) => (
                    <div
                      key={task.id}
                      className="group flex items-center gap-3 rounded-[10px] bg-bg-surface/60 py-2 pr-2 pl-4 ring-1 ring-border/40"
                    >
                      <Checkbox
                        checked
                        onCheckedChange={() => void toggleTask(task.id, false)}
                        className="size-3.5"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-text-tertiary line-through">
                        {task.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => void removeCompleted(task)}
                        className="shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
                        aria-label="删除"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </DndContext>
  );
}
