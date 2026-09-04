import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { ensureNotifyPermission, notify } from "@/lib/notify";
import { useNotifStore } from "@/stores/notificationStore";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import {
  Settings2,
  SunMedium,
  Moon,
  MonitorSmartphone,
  Rocket,
  Bell,
  Keyboard,
} from "lucide-react";
import type { Theme } from "@/stores/uiStore";

const THEMES: { v: Theme; label: string; Icon: typeof SunMedium }[] = [
  { v: "light", label: "亮色", Icon: SunMedium },
  { v: "dark", label: "暗色", Icon: Moon },
  { v: "system", label: "系统", Icon: MonitorSmartphone },
];

export function SettingsPopover() {
  const { theme, setTheme } = useTheme();
  const [autostart, setAutostart] = useState(false);
  const notif = useNotifStore();

  useEffect(() => {
    isEnabled().then(setAutostart).catch(() => undefined);
  }, []);

  async function toggleAutostart() {
    const next = !autostart;
    try {
      if (next) await enable();
      else await disable();
      setAutostart(next);
    } catch {
      /* ignore */
    }
  }

  async function testNotify() {
    await ensureNotifyPermission();
    notify("FlowTask 测试通知", "系统通知工作正常 🍅");
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="设置">
          <Settings2 className="size-[18px]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-64 p-2">
        <div className="px-2 py-1.5 text-xs font-medium text-text-tertiary">外观</div>
        <div className="grid grid-cols-3 gap-1 px-1">
          {THEMES.map(({ v, label, Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => setTheme(v)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md py-2 text-[11px] transition-colors",
                theme === v
                  ? "bg-accent text-accent-foreground"
                  : "text-text-secondary hover:bg-bg-hover"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <Separator className="my-2" />

        <button
          type="button"
          onClick={toggleAutostart}
          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm text-text-primary hover:bg-bg-hover"
        >
          <span className="flex items-center gap-2">
            <Rocket className="size-4 text-text-tertiary" /> 开机自启
          </span>
          <span
            className={cn(
              "h-5 w-9 rounded-full p-0.5 transition-colors",
              autostart ? "bg-primary" : "bg-input"
            )}
          >
            <span
              className={cn(
                "block size-4 rounded-full bg-white transition-transform",
                autostart && "translate-x-4"
              )}
            />
          </span>
        </button>

        <button
          type="button"
          onClick={testNotify}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-text-primary hover:bg-bg-hover"
        >
          <Bell className="size-4 text-text-tertiary" /> 测试系统通知
        </button>

        <Separator className="my-2" />
        <div className="px-2 py-1 text-xs font-medium text-text-tertiary">通知分级</div>
        {(
          [
            ["urgentEnabled", "紧急（P0 到期）"],
            ["normalEnabled", "普通（到期 / 番茄）"],
            ["silentEnabled", "静默（微提示）"],
            ["soundEnabled", "提示音"],
          ] as const
        ).map(([key, label]) => (
          <label
            key={key}
            className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm text-text-primary hover:bg-bg-hover"
          >
            {label}
            <Switch
              checked={notif[key]}
              onCheckedChange={(v) => notif.setPrefs({ [key]: v })}
            />
          </label>
        ))}

        <Separator className="my-2" />
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("flowtask:show-help"));
          }}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-text-primary hover:bg-bg-hover"
        >
          <Keyboard className="size-4 text-text-tertiary" /> 键盘快捷键
        </button>
      </PopoverContent>
    </Popover>
  );
}
