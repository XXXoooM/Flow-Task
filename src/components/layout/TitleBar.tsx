import { useEffect, useState, type ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, Minimize2, X, SunMedium, Moon, MonitorSmartphone } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { useTheme } from "@/hooks/useTheme";
import { SaveIndicator } from "@/components/layout/SaveIndicator";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { cn } from "@/lib/utils";

const themeIcon = {
  light: SunMedium,
  dark: Moon,
  system: MonitorSmartphone,
} as const;

export function TitleBar() {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = useState(false);
  const { theme, cycle } = useTheme();
  const ThemeIcon = themeIcon[theme];

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;

    appWindow
      .isMaximized()
      .then((v) => !disposed && setIsMaximized(v))
      .catch(() => {});

    appWindow
      .onResized(async () => {
        try {
          setIsMaximized(await appWindow.isMaximized());
        } catch {
          /* ignore */
        }
      })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      })
      .catch(() => {});

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [appWindow]);

  return (
    <div
      data-tauri-drag-region
      className="drag-region flex h-9 shrink-0 items-center justify-between border-b border-border/60 bg-bg-app pl-3 select-none"
    >
      {/* 品牌区（整块可拖拽） */}
      <div data-tauri-drag-region className="flex items-center gap-2">
        <div
          data-tauri-drag-region
          className="grid size-5 place-items-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground"
        >
          F
        </div>
        <span
          data-tauri-drag-region
          className="text-xs font-medium tracking-wide text-text-secondary"
        >
          {APP_NAME}
        </span>
      </div>

      {/* 右侧：状态 · 主题切换 + 窗口控制 */}
      <div className="flex items-center">
        <div className="mr-1" data-tauri-drag-region>
          <NotificationCenter />
        </div>
        <div className="mr-1.5" data-tauri-drag-region>
          <SaveIndicator />
        </div>
        <button
          type="button"
          onClick={cycle}
          title={`主题：${theme === "system" ? "跟随系统" : theme === "dark" ? "暗色" : "亮色"}`}
          className="grid size-9 place-items-center text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          <ThemeIcon className="size-[15px]" strokeWidth={1.75} />
        </button>

        <div className="mx-1 h-4 w-px bg-border" />

        <WinButton label="最小化" onClick={() => appWindow.minimize()}>
          <Minus className="size-4" strokeWidth={1.75} />
        </WinButton>
        <WinButton
          label={isMaximized ? "还原" : "最大化"}
          onClick={() => appWindow.toggleMaximize()}
        >
          {isMaximized ? (
            <Minimize2 className="size-[13px]" strokeWidth={1.75} />
          ) : (
            <Square className="size-3.5" strokeWidth={1.75} />
          )}
        </WinButton>
        <WinButton label="关闭" danger onClick={() => appWindow.close()}>
          <X className="size-4" strokeWidth={1.75} />
        </WinButton>
      </div>
    </div>
  );
}

function WinButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-9 place-items-center text-text-secondary transition-colors",
        danger
          ? "hover:bg-[#E81123] hover:text-white"
          : "hover:bg-bg-hover hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}
