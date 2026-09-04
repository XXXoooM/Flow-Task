import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Check } from "lucide-react";
import { useTaskStore } from "@/stores/taskStore";
import { PRIORITY_META } from "@/lib/constants";
import { dueMeta } from "@/lib/dateHelpers";
import { TagBadge } from "@/components/shared/TagBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

function closeDetail() {
  window.dispatchEvent(new CustomEvent("flowtask:detail", { detail: null }));
}

export function TaskDetail({ task }: { task: Task | null }) {
  const patchTask = useTaskStore((s) => s.patchTask);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task?.note_md ?? "");

  useEffect(() => {
    setDraft(task?.note_md ?? "");
    setEditing(false);
  }, [task?.id, task?.note_md]);

  const priority = task ? (PRIORITY_META[task.priority] ?? PRIORITY_META[3]) : null;
  const due = task ? dueMeta(task.due_date) : null;

  async function save() {
    if (!task) return;
    await patchTask(task.id, { note_md: draft });
    setEditing(false);
  }

  return (
    <AnimatePresence>
      {task && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDetail}
            className="absolute inset-0 z-30 bg-black/20"
          />
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute top-0 right-0 z-40 flex h-full w-[380px] max-w-[86vw] flex-col border-l border-border bg-bg-surface shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold text-text-primary">任务详情</span>
              <button
                type="button"
                onClick={closeDetail}
                className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-bg-hover"
                aria-label="关闭"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto ft-scroll p-4">
              <div>
                <div className="flex items-center gap-2">
                  {priority && (
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: priority.color }}
                    />
                  )}
                  <h2 className="text-base font-semibold text-text-primary">{task.title}</h2>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                  {due && (
                    <span className={cn(due.overdue && "text-danger", due.soon && "text-primary")}>
                      到期 · {due.label}
                    </span>
                  )}
                  {task.tags.map((t) => (
                    <TagBadge key={t.id} tag={t} />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary">
                    备注 / Markdown
                  </span>
                  {editing ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(task.note_md); }}>
                        取消
                      </Button>
                      <Button size="sm" className="gap-1" onClick={() => void save()}>
                        <Check className="size-3.5" /> 保存
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-xs"
                      onClick={() => setEditing(true)}
                    >
                      <Pencil className="size-3.5" /> 编辑
                    </Button>
                  )}
                </div>

                {editing ? (
                  <textarea
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="支持 Markdown：# 标题、- 列表、**粗体**、`代码`、```代码块```…"
                    className="h-64 w-full resize-none rounded-lg border border-border bg-bg-app p-3 font-mono text-[13px] leading-relaxed text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  />
                ) : task.note_md.trim() ? (
                  <div className="ft-md rounded-lg bg-bg-app p-3 text-[13px] leading-relaxed text-text-primary">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
                    >
                      {task.note_md}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="w-full rounded-lg border border-dashed border-border p-4 text-center text-xs text-text-tertiary transition-colors hover:border-primary/40 hover:text-text-secondary"
                  >
                    暂无备注，点击添加
                  </button>
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
