import { Pause, Play, RotateCcw, SkipForward, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePomodoro } from "@/hooks/usePomodoro";
import { useFocusSettings } from "@/stores/focusStore";
import { PomodoroRing } from "@/components/focus/PomodoroRing";
import { FocusStats } from "@/components/focus/FocusStats";
import { cn } from "@/lib/utils";

function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 120,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => onChange(Math.max(min, value - (label === "长休息" ? 5 : 1)))}
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="w-12 text-center text-sm font-medium tabular-nums text-text-primary">
          {value}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => onChange(Math.min(max, value + (label === "长休息" ? 5 : 1)))}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function FocusView() {
  const p = usePomodoro();
  const settings = useFocusSettings((s) => s.settings);
  const setSettings = useFocusSettings((s) => s.setSettings);

  return (
    <div className="mx-auto grid h-full max-w-4xl gap-4 overflow-y-auto ft-scroll pt-2 lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col items-center justify-center gap-6 rounded-[10px] bg-bg-surface p-6 ring-1 ring-border/50">
        <PomodoroRing
          progress={p.progress}
          phase={p.phase}
          color={p.phase === "work" ? "var(--primary)" : "var(--color-success)"}
        >
          <div className="text-center">
            <div className="font-mono text-4xl font-semibold tabular-nums text-text-primary">
              {p.label}
            </div>
            <div className="mt-1 text-xs text-text-tertiary">
              {p.phase === "work" ? "专注中" : "休息中"}
            </div>
          </div>
        </PomodoroRing>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={p.reset} aria-label="重置">
            <RotateCcw className="size-5" />
          </Button>
          <Button
            size="lg"
            className={cn(
              "w-28 gap-2 text-base",
              p.phase === "break" && "bg-success hover:bg-success/90"
            )}
            onClick={p.toggle}
          >
            {p.running ? <Pause className="size-5" /> : <Play className="size-5" />}
            {p.running ? "暂停" : "开始"}
          </Button>
          <Button variant="ghost" size="icon" onClick={p.skip} aria-label="跳过">
            <SkipForward className="size-5" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "size-2 rounded-full transition-colors",
                i < p.cycles % 4 || (p.cycles > 0 && p.cycles % 4 === 0)
                  ? "bg-primary"
                  : "bg-border"
              )}
            />
          ))}
          <span className="ml-2 text-xs text-text-tertiary">已完成 {p.cycles} 个番茄</span>
        </div>
      </div>

      <div className="space-y-4">
        <FocusStats />
        <div className="rounded-[10px] bg-bg-surface p-4 ring-1 ring-border/50">
          <h3 className="mb-1 text-sm font-semibold text-text-primary">时长设置（分钟）</h3>
          <Stepper
            label="专注"
            value={settings.workMin}
            onChange={(v) => setSettings({ workMin: v })}
          />
          <Stepper
            label="短休息"
            value={settings.breakMin}
            onChange={(v) => setSettings({ breakMin: v })}
          />
          <Stepper
            label="长休息"
            value={settings.longBreakMin}
            onChange={(v) => setSettings({ longBreakMin: v })}
          />
        </div>
      </div>
    </div>
  );
}
