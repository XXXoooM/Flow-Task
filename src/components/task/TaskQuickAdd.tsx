import { useState } from "react";
import { Plus, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { parseQuickAdd } from "@/lib/nlParse";
import { dueMeta } from "@/lib/dateHelpers";
import { PRIORITY_META } from "@/lib/constants";
import { reminderOffsetLabel } from "@/types/task";
import { cn } from "@/lib/utils";

export function TaskQuickAdd({
  onSubmit,
  placeholder = "添加任务，支持 !p0 #标签 明天 下午3点 !remind15，回车保存…",
  className,
}: {
  onSubmit: (raw: string) => Promise<void> | void;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const raw = value.trim();
  const parsed = raw ? parseQuickAdd(raw) : null;
  const priority =
    parsed && parsed.priority !== null ? PRIORITY_META[parsed.priority] : null;
  const due = parsed?.due ? dueMeta(parsed.due) : null;
  const schedTime = parsed?.scheduledAt ? parsed.scheduledAt.slice(11) : "";
  const showPreview =
    !!parsed &&
    (priority !== null || !!due || !!schedTime || parsed.tagNames.length > 0);

  async function submit() {
    if (!raw || busy) return;
    setBusy(true);
    try {
      await onSubmit(raw);
      setValue("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="group flex items-center gap-2.5 rounded-[10px] bg-bg-surface px-3 ring-1 ring-border/60 transition focus-within:ring-2 focus-within:ring-primary/60">
        <Plus className="size-4 shrink-0 text-text-tertiary group-focus-within:text-primary" />
        <Input
          value={value}
          disabled={busy}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            } else if (e.key === "Escape") {
              setValue("");
            }
          }}
          placeholder={placeholder}
          className="h-11 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
        />
      </div>

      {showPreview && parsed && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 text-[11px] text-text-tertiary">
          <span className="truncate">
            标题：<span className="text-text-secondary">{parsed.title || "（空）"}</span>
          </span>
          {priority && (
            <span className="flex items-center gap-1">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: priority.color }}
              />
              {priority.label}
            </span>
          )}
          {due && (
            <span className={due.overdue ? "text-danger" : "text-primary"}>
              📅 {due.label}
            </span>
          )}
          {parsed.scheduledAt && (
            <span className="flex items-center gap-1 text-brand">
              🕒 {parsed.scheduledAt.slice(0, 10)} {schedTime}
              {parsed.reminderEnabled && (
                <span className="flex items-center gap-0.5">
                  <Bell className="size-2.5" />
                  {reminderOffsetLabel(parsed.reminderOffset)}
                </span>
              )}
            </span>
          )}
          {parsed.tagNames.map((t) => (
            <span key={t} className="rounded-full bg-bg-elevated px-1.5 py-0.5">
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
