import { useState } from "react";
import { Plus, X, ListChecks } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useTaskStore } from "@/stores/taskStore";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

export function SubTaskList({ parent }: { parent: Task }) {
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const addSubtask = useTaskStore((s) => s.addSubtask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");

  const subs = parent.subtasks;
  const done = subs.filter((s) => s.completed).length;

  async function submit() {
    const title = text.trim();
    if (!title) return;
    await addSubtask(parent.id, title);
    setText("");
  }

  return (
    <div className="mt-1.5 space-y-1 pl-[26px]">
      {subs.length > 0 && (
        <div className="flex items-center gap-1.5 pb-0.5 text-[11px] text-text-tertiary">
          <ListChecks className="size-3" />
          子任务 {done}/{subs.length}
        </div>
      )}

      {subs.map((s) => (
        <div key={s.id} className="group/sub flex items-center gap-2.5">
          <Checkbox
            checked={!!s.completed}
            onCheckedChange={(v) => void toggleTask(s.id, v === true)}
            className="size-3.5"
          />
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13px]",
              s.completed ? "text-text-tertiary line-through" : "text-text-secondary"
            )}
          >
            {s.title}
          </span>
          <button
            type="button"
            onClick={() => void deleteTask(s.id)}
            className="shrink-0 text-text-tertiary opacity-0 transition-opacity hover:text-danger group-hover/sub:opacity-100"
            aria-label="删除子任务"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="flex items-center gap-2.5">
          <Plus className="size-3.5 text-text-tertiary" />
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              } else if (e.key === "Escape") {
                setText("");
                setAdding(false);
              }
            }}
            onBlur={() => {
              if (!text.trim()) setAdding(false);
            }}
            placeholder="子任务标题，回车添加"
            className="h-6 flex-1 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-tertiary"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-[11px] text-text-tertiary transition-colors hover:text-primary"
        >
          <Plus className="size-3" />
          添加子任务
        </button>
      )}
    </div>
  );
}
