import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TagBadge } from "@/components/shared/TagBadge";
import { useTasks, isTopLevel } from "@/hooks/useTasks";
import { useUiStore } from "@/stores/uiStore";
import { useTaskStore } from "@/stores/taskStore";
import { PRIORITY_META } from "@/lib/constants";
import { dueMeta } from "@/lib/dateHelpers";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

function dispatchEdit(id: string) {
  window.dispatchEvent(new CustomEvent("flowtask:edit", { detail: id }));
}

export function KanbanView() {
  const { tasks } = useTasks();
  const columns = useUiStore((s) => s.columns);
  const addColumn = useUiStore((s) => s.addColumn);
  const renameColumn = useUiStore((s) => s.renameColumn);
  const removeColumn = useUiStore((s) => s.removeColumn);
  const applyBoardLayout = useTaskStore((s) => s.applyBoardLayout);

  const byId = useMemo(() => {
    const m = new Map<string, Task>();
    for (const t of tasks.filter(isTopLevel)) m.set(t.id, t);
    return m;
  }, [tasks]);

  const initial = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const c of columns) map[c.id] = [];
    const fallback = columns[0]?.id;
    for (const id of byId.keys()) {
      const t = byId.get(id)!;
      const col = t.kanban_col && map[t.kanban_col] ? t.kanban_col : fallback;
      if (col) map[col].push(id);
    }
    return map;
  }, [byId, columns]);

  const [containers, setContainers] = useState<Record<string, string[]>>(initial);
  const dragging = useRef(false);

  // 数据变化时同步（拖拽过程中不打断）。
  useEffect(() => {
    if (!dragging.current) setContainers(initial);
  }, [initial]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function findContainer(id: string): string | undefined {
    if (id in containers) return id;
    return Object.keys(containers).find((k) => containers[k].includes(id));
  }

  function handleStart() {
    dragging.current = true;
  }

  function handleOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const aId = String(active.id);
    const oId = String(over.id);
    const from = findContainer(aId);
    const to = findContainer(oId);
    if (!from || !to || from === to) return;
    setContainers((prev) => {
      const fromItems = prev[from].filter((x) => x !== aId);
      const toItems = [...prev[to]];
      const overIndex = toItems.indexOf(oId);
      const insertAt = overIndex >= 0 ? overIndex : toItems.length;
      toItems.splice(insertAt, 0, aId);
      return { ...prev, [from]: fromItems, [to]: toItems };
    });
  }

  function handleEnd(e: DragEndEvent) {
    dragging.current = false;
    const { active, over } = e;
    if (!over) {
      setContainers(initial);
      return;
    }
    const aId = String(active.id);
    const oId = String(over.id);
    const from = findContainer(aId);
    const to = findContainer(oId);
    if (!from || !to) {
      setContainers(initial);
      return;
    }
    let next = containers;
    if (from === to) {
      const items = containers[from];
      const oldI = items.indexOf(aId);
      const newI = items.indexOf(oId);
      if (oldI !== newI && newI >= 0) {
        next = { ...containers, [from]: arrayMove(items, oldI, newI) };
      }
    }
    setContainers(next);
    void applyBoardLayout(next);
  }

  function deleteColumn(colId: string) {
    const target = columns.find((c) => c.id !== colId)?.id;
    if (target) {
      const moved = containers[colId] ?? [];
      const merged = {
        ...containers,
        [target]: [...(containers[target] ?? []), ...moved],
        [colId]: [],
      };
      void applyBoardLayout(merged).then(() => removeColumn(colId));
    } else {
      removeColumn(colId);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleStart}
        onDragOver={handleOver}
        onDragEnd={handleEnd}
        onDragCancel={() => {
          dragging.current = false;
          setContainers(initial);
        }}
      >
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto ft-scroll pb-1">
          {columns.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              name={col.name}
              color={col.color}
              taskIds={containers[col.id] ?? []}
              byId={byId}
              onRename={(name) => renameColumn(col.id, name)}
              onDelete={() => deleteColumn(col.id)}
              canDelete={columns.length > 1}
            />
          ))}
          <AddColumn onAdd={(name) => addColumn(name)} />
        </div>
      </DndContext>
    </div>
  );
}

function Column({
  id,
  name,
  color,
  taskIds,
  byId,
  onRename,
  onDelete,
  canDelete,
}: {
  id: string;
  name: string;
  color: string;
  taskIds: string[];
  byId: Map<string, Task>;
  onRename: (name: string) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  return (
    <div className="flex h-full w-72 shrink-0 flex-col">
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                onRename(draft);
                setEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onRename(draft);
                  setEditing(false);
                } else if (e.key === "Escape") {
                  setDraft(name);
                  setEditing(false);
                }
              }}
              className="h-6 w-full rounded bg-transparent text-sm font-medium text-text-primary outline-none ring-1 ring-primary/50"
            />
          ) : (
            <button
              type="button"
              onDoubleClick={() => setEditing(true)}
              className="truncate text-sm font-semibold text-text-primary"
            >
              {name}
              <span className="ml-1.5 text-xs font-normal text-text-tertiary">
                {taskIds.length}
              </span>
            </button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="grid size-6 place-items-center rounded text-text-tertiary hover:bg-bg-hover">
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil className="size-4" /> 重命名
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={!canDelete}
              onSelect={onDelete}
            >
              <Trash2 className="size-4" /> 删除列
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "min-h-0 flex-1 space-y-2 overflow-y-auto ft-scroll rounded-[10px] bg-bg-elevated/40 p-2 transition-colors",
          isOver && "ring-2 ring-primary/40"
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {taskIds.map((tid) => {
            const t = byId.get(tid);
            return t ? <KanbanCard key={tid} task={t} /> : null;
          })}
        </SortableContext>
        {taskIds.length === 0 && (
          <div className="grid h-16 place-items-center text-xs text-text-tertiary">
            拖拽任务到此
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const priority = PRIORITY_META[task.priority] ?? PRIORITY_META[3];
  const due = dueMeta(task.due_date);
  const checked = !!task.completed;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group cursor-grab touch-none rounded-lg bg-bg-surface p-3 shadow-sm ring-1 ring-border/60 active:cursor-grabbing",
        isDragging && "z-10 opacity-70 shadow-lg ring-primary/50"
      )}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => void toggleTask(task.id, v === true)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 size-3.5 shrink-0"
        />
        <button
          type="button"
          onClick={() => dispatchEdit(task.id)}
          className={cn(
            "min-w-0 flex-1 text-left text-sm font-medium",
            checked ? "text-text-tertiary line-through" : "text-text-primary"
          )}
        >
          <span
            className="mr-1 inline-block size-2 rounded-full align-middle"
            style={{ backgroundColor: priority.color }}
          />
          {task.title}
        </button>
      </div>
      {(due || task.tags.length > 0) && (
        <div className="mt-2 flex items-center gap-1.5 pl-5">
          {due && (
            <span
              className={cn(
                "text-[11px]",
                due.overdue ? "text-danger" : due.soon ? "text-primary" : "text-text-tertiary"
              )}
            >
              {due.label}
            </span>
          )}
          {task.tags.slice(0, 2).map((t) => (
            <TagBadge key={t.id} tag={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddColumn({ onAdd }: { onAdd: (name: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  function submit() {
    if (name.trim()) onAdd(name);
    setName("");
    setAdding(false);
  }

  if (adding) {
    return (
      <div className="w-72 shrink-0 p-2">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            else if (e.key === "Escape") setAdding(false);
          }}
          onBlur={submit}
          placeholder="列名称，回车添加"
          className="h-9"
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setAdding(true)}
      className="flex h-11 w-56 shrink-0 items-center gap-2 self-start rounded-[10px] px-3 text-sm text-text-tertiary transition-colors hover:bg-bg-elevated hover:text-text-secondary"
    >
      <Plus className="size-4" /> 添加列
    </button>
  );
}
