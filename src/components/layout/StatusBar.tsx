import type { ReactNode } from "react";
import { Command, Zap, Circle, CloudOff } from "lucide-react";
import { APP_NAME, APP_VERSION, VIEW_META } from "@/lib/constants";
import { useUiStore } from "@/stores/uiStore";
import { useStatusStore } from "@/stores/statusStore";
import { cn } from "@/lib/utils";

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] items-center rounded border border-border bg-bg-elevated px-1 font-mono text-[10px] text-text-secondary">
      {children}
    </kbd>
  );
}

export function StatusBar() {
  const activeView = useUiStore((s) => s.activeView);
  const meta = VIEW_META[activeView];
  const status = useStatusStore((s) => s.status);

  const offline = status === "offline" || status === "error";

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-border bg-bg-app px-3 text-[11px] text-text-tertiary select-none">
      <div className="flex items-center gap-2">
        {offline ? (
          <span className="flex items-center gap-1 font-medium text-warning">
            <CloudOff className="size-3" />
            数据库离线，更改可能未保存
          </span>
        ) : (
          <>
            <Circle
              className={cn(
                "size-2",
                status === "saving"
                  ? "fill-text-tertiary text-text-tertiary"
                  : "fill-success text-success"
              )}
            />
            <span className="font-medium text-text-secondary">{APP_NAME}</span>
            <span>v{APP_VERSION}</span>
          </>
        )}
        <span className="text-border">·</span>
        <span>{meta.label}</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1 sm:flex">
          <Zap className="size-3" strokeWidth={1.75} />
          <span>快速添加</span>
          <Kbd>Ctrl</Kbd>
          <Kbd>⇧</Kbd>
          <Kbd>N</Kbd>
        </span>
        <span className="hidden items-center gap-1 md:flex">
          <Command className="size-3" strokeWidth={1.75} />
          <span>命令面板</span>
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
      </div>
    </footer>
  );
}
