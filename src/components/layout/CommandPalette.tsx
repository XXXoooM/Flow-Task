import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import {
  Plus,
  Inbox,
  SunMedium,
  CalendarClock,
  CalendarDays,
  SquareKanban,
  Timer,
  Settings,
  Sun,
  Moon,
  MonitorSmartphone,
  Search,
} from "lucide-react";
import { NAV_ITEMS, type ViewId } from "@/lib/constants";
import { useUiStore, type Theme } from "@/stores/uiStore";
import { useTaskStore } from "@/stores/taskStore";

const VIEW_ICONS: Record<ViewId, typeof Inbox> = {
  inbox: Inbox,
  today: SunMedium,
  upcoming: CalendarClock,
  calendar: CalendarDays,
  kanban: SquareKanban,
  focus: Timer,
  settings: Settings,
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const setTheme = useUiStore((s) => s.setTheme);
  const tasks = useTaskStore((s) => s.tasks);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const flatTasks = useMemo(() => {
    const out: typeof tasks = [];
    const walk = (arr: typeof tasks) => {
      for (const t of arr) {
        out.push(t);
        if (t.subtasks.length) walk(t.subtasks);
      }
    };
    walk(tasks);
    return out;
  }, [tasks]);

  const go = (v: ViewId) => {
    setActiveView(v);
    setOpen(false);
  };
  const pickTask = (id: string) => {
    setActiveView("inbox");
    window.dispatchEvent(new CustomEvent("flowtask:edit", { detail: id }));
    setOpen(false);
  };

  const themeIcon = { light: Sun, dark: Moon, system: MonitorSmartphone };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="全局命令面板"
      className="fixed left-1/2 top-[15%] z-50 w-[92vw] max-w-lg -translate-x-1/2 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"
    >
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search className="size-4 shrink-0 text-text-tertiary" />
        <Command.Input
          autoFocus
          placeholder="搜索命令或任务…"
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-text-tertiary"
        />
      </div>

      <Command.List className="max-h-[55vh] overflow-y-auto p-2 ft-scroll">
        <Command.Empty className="py-10 text-center text-sm text-text-tertiary">
          没有匹配的结果
        </Command.Empty>

        <Command.Group heading="操作" className="mb-1">
          <Command.Item
            onSelect={() => {
              setActiveView("inbox");
              setOpen(false);
              window.setTimeout(
                () => window.dispatchEvent(new CustomEvent("flowtask:new", { detail: null })),
                30
              );
            }}
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
          >
            <Plus className="size-4 text-text-tertiary" /> 新建任务
          </Command.Item>
        </Command.Group>

        <Command.Group heading="前往视图" className="mb-1">
          {NAV_ITEMS.map((item) => {
            const Icon = VIEW_ICONS[item.id];
            return (
              <Command.Item
                key={item.id}
                value={`view-${item.id}`}
                onSelect={() => go(item.id)}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
              >
                <Icon className="size-4 text-text-tertiary" /> {item.label}
              </Command.Item>
            );
          })}
        </Command.Group>

        <Command.Group heading="主题" className="mb-1">
          {(["light", "dark", "system"] as Theme[]).map((t) => {
            const Icon = themeIcon[t];
            return (
              <Command.Item
                key={t}
                value={`theme-${t}`}
                onSelect={() => {
                  setTheme(t);
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
              >
                <Icon className="size-4 text-text-tertiary" />
                {t === "light" ? "亮色" : t === "dark" ? "暗色" : "跟随系统"}
              </Command.Item>
            );
          })}
        </Command.Group>

        {flatTasks.length > 0 && (
          <Command.Group heading="任务" className="mb-1">
            {flatTasks.slice(0, 40).map((t) => (
              <Command.Item
                key={t.id}
                value={`task-${t.id} ${t.title}`}
                onSelect={() => pickTask(t.id)}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: t.completed ? "var(--border)" : "var(--primary)" }}
                />
                <span className={t.completed ? "truncate text-text-tertiary line-through" : "truncate"}>
                  {t.title}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>

      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-text-tertiary">
        <span>↑↓ 导航 · Enter 选择</span>
        <span>Esc 关闭</span>
      </div>
    </Command.Dialog>
  );
}
