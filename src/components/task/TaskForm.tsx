import { useEffect, useState, type FormEvent } from "react";
import { CalendarClock, Bell, BellOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskPrioritySelect } from "@/components/task/TaskPrioritySelect";
import { TaskDueDatePicker } from "@/components/task/TaskDueDatePicker";
import { TaskDateTimePicker } from "@/components/task/TaskDateTimePicker";
import { TaskTagPicker } from "@/components/task/TaskTagPicker";
import { RecurrencePicker } from "@/components/task/RecurrencePicker";
import { cn } from "@/lib/utils";
import {
  TaskInput,
  isScheduleMode,
  REMINDER_OFFSETS,
  reminderOffsetLabel,
  type Task,
  type Recurrence,
} from "@/types/task";
import { useUiStore } from "@/stores/uiStore";
import { useNotifStore } from "@/stores/notificationStore";

interface FormState {
  title: string;
  note_md: string;
  priority: number;
  due_date: string | null;
  tagIds: string[];
  recurrence: Recurrence | null;
  // 日程模式
  scheduleOn: boolean;
  scheduledAt: string; // "YYYY-MM-DDTHH:mm" 或 ""
  reminderOn: boolean;
  offset: number; // 秒
}

const EMPTY: FormState = {
  title: "",
  note_md: "",
  priority: 2,
  due_date: null,
  tagIds: [],
  recurrence: null,
  scheduleOn: false,
  scheduledAt: "",
  reminderOn: false,
  offset: 900,
};

/** 智能默认：新任务继承上次的优先级与标签（从未设过默认 P2）。 */
function newDefaults(): FormState {
  const { lastPriority, lastTagIds } = useUiStore.getState();
  return {
    ...EMPTY,
    priority: lastPriority ?? 2,
    tagIds: [...lastTagIds],
  };
}

function fromTask(
  task: Task | null,
  defaultDue?: string | null,
  defaultScheduledAt?: string | null
): FormState {
  const notifDefaultOffset = useNotifStore.getState().defaultOffset;
  if (!task) {
    const isSchedule = !!defaultScheduledAt;
    return {
      ...newDefaults(),
      due_date: defaultDue ?? null,
      scheduleOn: isSchedule,
      scheduledAt: defaultScheduledAt ?? "",
      reminderOn: isSchedule,
      offset: notifDefaultOffset,
    };
  }
  return {
    title: task.title,
    note_md: task.note_md,
    priority: task.priority,
    due_date: task.due_date,
    tagIds: task.tags.map((t) => t.id),
    recurrence: task.recurrence,
    scheduleOn: isScheduleMode(task),
    scheduledAt: task.scheduled_at ?? "",
    reminderOn: task.reminder_enabled === 1,
    offset: task.reminder_offset ?? notifDefaultOffset,
  };
}

export function TaskForm({
  open,
  onOpenChange,
  task,
  defaultDue,
  defaultScheduledAt,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  defaultDue?: string | null;
  defaultScheduledAt?: string | null;
  onSubmit: (id: string | null, input: TaskInput) => Promise<void> | void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    fromTask(task, defaultDue, defaultScheduledAt)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(fromTask(task, defaultDue, defaultScheduledAt));
      setError(null);
    }
  }, [open, task, defaultDue, defaultScheduledAt]);

  const patch = (p: Partial<FormState>) => setForm((s) => ({ ...s, ...p }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.scheduleOn && !form.scheduledAt) {
      setError("请选择日程时间");
      return;
    }
    const parsed = TaskInput.safeParse({
      title: form.title,
      note_md: form.note_md,
      priority: form.priority,
      due_date: form.due_date,
      view_type: task?.view_type ?? "list",
      parent_id: task?.parent_id ?? null,
      tagIds: form.tagIds,
      recurrence: form.recurrence,
      scheduled_at: form.scheduleOn ? form.scheduledAt : null,
      reminder_enabled: form.scheduleOn && form.reminderOn ? 1 : 0,
      reminder_offset: form.offset,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查输入");
      return;
    }
    setError(null);
    await onSubmit(task?.id ?? null, parsed.data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{task ? "编辑任务" : "新建任务"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4 ft-scroll">
            <div className="space-y-1.5">
              <Label htmlFor="tf-title">标题</Label>
              <Input
                id="tf-title"
                autoFocus
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="要做点什么？"
              />
              {error && <p className="text-xs text-danger">{error}</p>}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>优先级</Label>
                <TaskPrioritySelect
                  value={form.priority}
                  onChange={(v) => patch({ priority: v })}
                  size="sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label>截止日期</Label>
                <TaskDueDatePicker
                  value={form.due_date}
                  onChange={(v) => patch({ due_date: v })}
                />
              </div>
            </div>

            {/* 日程模式 */}
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-text-primary">
                  <CalendarClock className="size-4 text-text-tertiary" />
                  <div>
                    <div>设为日程（定时事件）</div>
                    <div className="text-[11px] text-text-tertiary">
                      精确到时间点，可开启到点提醒
                    </div>
                  </div>
                </div>
                <Switch
                  checked={form.scheduleOn}
                  onCheckedChange={(v) =>
                    patch({
                      scheduleOn: v,
                      offset: useNotifStore.getState().defaultOffset,
                    })
                  }
                />
              </div>

              {form.scheduleOn && (
                <div className="space-y-3 border-t border-border pt-3">
                  <div className="space-y-1.5">
                    <Label>日程时间</Label>
                    <TaskDateTimePicker
                      value={form.scheduledAt}
                      onChange={(v) => patch({ scheduledAt: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-text-primary">
                      {form.reminderOn ? (
                        <Bell className="size-4 text-primary" />
                      ) : (
                        <BellOff className="size-4 text-text-tertiary" />
                      )}
                      到时提醒
                    </div>
                    <Switch
                      checked={form.reminderOn}
                      onCheckedChange={(v) => patch({ reminderOn: v })}
                    />
                  </div>
                  {form.reminderOn && (
                    <div className="space-y-1.5">
                      <Label>提前提醒</Label>
                      <Select
                        value={String(form.offset)}
                        onValueChange={(v) => patch({ offset: Number(v) })}
                      >
                        <SelectTrigger size="sm" className="w-[140px]">
                          <SelectValue>{reminderOffsetLabel(form.offset)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {REMINDER_OFFSETS.map((o) => (
                            <SelectItem key={o} value={String(o)}>
                              {reminderOffsetLabel(o)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>重复</Label>
              <RecurrencePicker
                value={form.recurrence}
                onChange={(rec) => patch({ recurrence: rec })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>标签</Label>
              <TaskTagPicker
                value={form.tagIds}
                onChange={(ids) => patch({ tagIds: ids })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tf-note">备注 / Markdown</Label>
              <Textarea
                id="tf-note"
                value={form.note_md}
                onChange={(e) => patch({ note_md: e.target.value })}
                placeholder="支持 Markdown"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border bg-bg-surface/50">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" className={cn("gap-1.5")}>
              {task ? "保存" : "添加任务"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
