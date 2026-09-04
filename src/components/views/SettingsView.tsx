import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  enable as enableAutostart,
  disable as disableAutostart,
  isEnabled,
} from "@tauri-apps/plugin-autostart";
import {
  SunMedium,
  Moon,
  MonitorSmartphone,
  Download,
  Upload,
  FileJson,
  Bell,
  Rocket,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/hooks/useTheme";
import { useFocusSettings } from "@/stores/focusStore";
import { useTaskStore } from "@/stores/taskStore";
import { useUiStore } from "@/stores/uiStore";
import { useNotifStore } from "@/stores/notificationStore";
import { ensureNotifyPermission, notify } from "@/lib/notify";
import { exportJson, exportCsv, importJsonText } from "@/lib/dataIo";
import { APP_VERSION } from "@/lib/constants";
import { REMINDER_OFFSETS, reminderOffsetLabel } from "@/types/task";
import type { Theme } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

function hhmm(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function toMin(v: string): number {
  const [h, m] = v.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[10px] bg-bg-surface p-5 ring-1 ring-border/50">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {desc && <p className="mt-0.5 text-xs text-text-tertiary">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-text-secondary">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))
        }
        className="h-9 w-28 rounded-md border border-input bg-transparent px-3 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      />
    </label>
  );
}

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const settings = useFocusSettings((s) => s.settings);
  const setSettings = useFocusSettings((s) => s.setSettings);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const [autostart, setAutostart] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    isEnabled().then(setAutostart).catch(() => undefined);
  }, []);

  async function toggleAutostart() {
    const next = !autostart;
    try {
      if (next) await enableAutostart();
      else await disableAutostart();
      setAutostart(next);
      toast.success(next ? "已开启开机自启" : "已关闭开机自启");
    } catch {
      toast.error("操作失败");
    }
  }

  async function testNotify() {
    await ensureNotifyPermission();
    notify("FlowTask 测试通知", "系统通知工作正常 🍅");
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const n = await importJsonText(text);
      await fetchTasks();
      toast.success(`已导入 ${n} 个任务`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "导入失败");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const themes: { v: Theme; label: string; Icon: typeof SunMedium }[] = [
    { v: "light", label: "亮色", Icon: SunMedium },
    { v: "dark", label: "暗色", Icon: Moon },
    { v: "system", label: "跟随系统", Icon: MonitorSmartphone },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pt-1">
      <Section title="外观" desc="选择应用主题">
        <div className="grid grid-cols-3 gap-2">
          {themes.map(({ v, label, Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => setTheme(v)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border py-3 text-sm transition-colors",
                theme === v
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border text-text-secondary hover:bg-bg-hover"
              )}
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
        <ColorblindRow />
      </Section>

      <Section title="专注 · 番茄钟" desc="自定义专注与休息时长（分钟）">
        <div className="flex flex-wrap gap-5">
          <NumberField
            label="专注"
            value={settings.workMin}
            min={1}
            max={120}
            onChange={(v) => setSettings({ workMin: v })}
          />
          <NumberField
            label="短休息"
            value={settings.breakMin}
            min={1}
            max={60}
            onChange={(v) => setSettings({ breakMin: v })}
          />
          <NumberField
            label="长休息"
            value={settings.longBreakMin}
            min={5}
            max={60}
            onChange={(v) => setSettings({ longBreakMin: v })}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-text-secondary">自动开始休息</span>
            <button
              type="button"
              onClick={() =>
                setSettings({ autoStartBreaks: !settings.autoStartBreaks })
              }
              className={cn(
                "h-9 w-14 rounded-full p-1 transition-colors",
                settings.autoStartBreaks ? "bg-primary" : "bg-input"
              )}
            >
              <span
                className={cn(
                  "block h-7 w-7 rounded-full bg-white transition-transform",
                  settings.autoStartBreaks && "translate-x-5"
                )}
              />
            </button>
          </label>
        </div>
      </Section>

      <Section title="系统" desc="开机自启与通知">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={toggleAutostart} className="gap-2">
            <Rocket className="size-4" />
            开机自启：{autostart ? "已开启" : "已关闭"}
          </Button>
          <Button variant="outline" onClick={testNotify} className="gap-2">
            <Bell className="size-4" /> 测试系统通知
          </Button>
        </div>
        <ReminderEngineSettings />
        <Separator className="my-4" />
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-text-secondary sm:grid-cols-3">
          <span className="text-text-tertiary">快捷键</span>
          <kbd className="font-mono">Ctrl + Shift + T</kbd>
          <span>快速新建</span>
          <span className="text-text-tertiary">命令面板</span>
          <kbd className="font-mono">Ctrl + K</kbd>
          <span>搜索与跳转</span>
        </div>
      </Section>

      <Section title="数据" desc="导出为 JSON 备份 / CSV 表格，或从备份导入">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void exportJson()} className="gap-2">
            <FileJson className="size-4" /> 导出 JSON
          </Button>
          <Button variant="outline" onClick={() => void exportCsv()} className="gap-2">
            <Download className="size-4" /> 导出 CSV
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
            <Upload className="size-4" /> 导入 JSON（覆盖）
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onPickFile}
          />
        </div>
        <p className="mt-3 text-xs text-text-tertiary">
          导入会清空现有数据并用备份替换，请谨慎操作。文件会下载到系统「下载」文件夹。
        </p>
      </Section>

      <p className="pt-1 text-center text-xs text-text-tertiary">
        FlowTask v{APP_VERSION} · 本地优先的个人任务管理
      </p>
    </div>
  );
}

function ColorblindRow() {
  const colorblind = useUiStore((s) => s.colorblind);
  const setColorblind = useUiStore((s) => s.setColorblind);
  return (
    <div className="mt-4 flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Eye className="size-4 text-text-tertiary" />
        <div>
          <div className="text-sm text-text-primary">色盲友好模式</div>
          <div className="text-xs text-text-tertiary">
            优先级等信息额外用文字标注，不只靠颜色
          </div>
        </div>
      </div>
      <Switch checked={colorblind} onCheckedChange={setColorblind} />
    </div>
  );
}

function ReminderEngineSettings() {
  const n = useNotifStore();
  const cooldowns = [1, 3, 5, 10, 15];
  return (
    <div className="mt-4 space-y-3 rounded-lg border border-border p-3">
      <div className="text-xs font-semibold text-text-tertiary">日程提醒引擎</div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-text-primary">启用提醒（全局）</span>
        <Switch
          checked={n.remindersEnabled}
          onCheckedChange={(v) => n.setPrefs({ remindersEnabled: v })}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-text-primary">
          默认提前量
          <div className="text-[11px] text-text-tertiary">新建日程任务的预设</div>
        </div>
        <Select
          value={String(n.defaultOffset)}
          onValueChange={(v) => n.setPrefs({ defaultOffset: Number(v) })}
        >
          <SelectTrigger size="sm" className="w-[130px]">
            <SelectValue>{reminderOffsetLabel(n.defaultOffset)}</SelectValue>
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

      <div className="flex items-center justify-between">
        <div className="text-sm text-text-primary">
          重复提醒间隔
          <div className="text-[11px] text-text-tertiary">同一未完成日程的最小提醒间隔</div>
        </div>
        <Select
          value={String(n.cooldownMin)}
          onValueChange={(v) => n.setPrefs({ cooldownMin: Number(v) })}
        >
          <SelectTrigger size="sm" className="w-[130px]">
            <SelectValue>{n.cooldownMin} 分钟</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {cooldowns.map((c) => (
              <SelectItem key={c} value={String(c)}>
                {c} 分钟
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-text-primary">免打扰时段</span>
        <Switch
          checked={n.dndEnabled}
          onCheckedChange={(v) => n.setPrefs({ dndEnabled: v })}
        />
      </div>
      {n.dndEnabled && (
        <div className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="time"
            value={hhmm(n.dndStart)}
            onChange={(e) => n.setPrefs({ dndStart: toMin(e.target.value) })}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
          <span className="text-text-tertiary">至</span>
          <input
            type="time"
            value={hhmm(n.dndEnd)}
            onChange={(e) => n.setPrefs({ dndEnd: toMin(e.target.value) })}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
          <span className="text-[11px] text-text-tertiary">（该时段内提醒排队，结束后补发）</span>
        </div>
      )}
    </div>
  );
}
