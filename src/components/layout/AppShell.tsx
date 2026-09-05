import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { TitleBar } from "@/components/layout/TitleBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatusBar } from "@/components/layout/StatusBar";
import { MainView } from "@/components/views/MainView";
import { ReminderScheduler } from "@/components/layout/ReminderScheduler";
import { PomodoroScheduler } from "@/components/layout/PomodoroScheduler";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ShortcutHelp } from "@/components/layout/ShortcutHelp";
import { ensureNotifyPermission } from "@/lib/notify";
import { useHistoryStore } from "@/stores/historyStore";
import { useTaskStore } from "@/stores/taskStore";
import { useTagStore } from "@/stores/tagStore";
import { useUiStore } from "@/stores/uiStore";

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

export function AppShell() {
  const [helpOpen, setHelpOpen] = useState(false);

  // Rust 全局快捷键 Ctrl+Shift+T → 触发快速新建；顺带请求通知权限。
  useEffect(() => {
    void ensureNotifyPermission();
    let unlisten: (() => void) | undefined;
    listen("shortcuts://quick-add", () => {
      window.dispatchEvent(new CustomEvent("flowtask:new", { detail: null }));
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);

  // 监听快照恢复（Undo / Redo 触发），重新刷新任务与标签
  useEffect(() => {
    const onRefresh = () => {
      void useTaskStore.getState().fetchTasks();
      void useTagStore.getState().loadTags();
    };
    window.addEventListener("flowtask:refresh-all", onRefresh);
    return () => window.removeEventListener("flowtask:refresh-all", onRefresh);
  }, []);

  // Undo / Redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      const history = useHistoryStore.getState();
      if (k === "z" && !e.shiftKey) {
        if (isTyping(e.target)) return; // 让输入框用原生撤销
        e.preventDefault();
        void history.undo().then((label) => {
          if (label) toast(`已撤销：${label}`);
        });
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        if (isTyping(e.target)) return;
        e.preventDefault();
        void history.redo().then((label) => {
          if (label) toast(`已重做：${label}`);
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 全局：新建 / 切换视图 / 帮助
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === "n" && !e.shiftKey) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("flowtask:new", { detail: null }));
          return;
        }
        if (k === "1" || k === "2" || k === "3") {
          const view = k === "1" ? "inbox" : k === "2" ? "calendar" : "kanban";
          e.preventDefault();
          useUiStore.getState().setActiveView(view);
          return;
        }
      }
      if (e.key === "?" && !isTyping(e.target)) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 来自设置弹层的"键盘快捷键"入口
  useEffect(() => {
    const handler = () => setHelpOpen(true);
    window.addEventListener("flowtask:show-help", handler);
    return () => window.removeEventListener("flowtask:show-help", handler);
  }, []);

  return (
    <TooltipProvider>
      <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-bg-app">
        <TitleBar />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <MainView />
        </div>
        <StatusBar />
      </div>
      <Toaster position="bottom-right" richColors closeButton />
      <ReminderScheduler />
      <PomodoroScheduler />
      <CommandPalette />
      <ShortcutHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </TooltipProvider>
  );
}
