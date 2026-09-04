import { Pause, Play, RotateCcw, FastForward } from "lucide-react";
import { usePomodoro } from "@/hooks/usePomodoro";
import { useFocusSettings } from "@/stores/focusStore";
import { PomodoroRing } from "@/components/focus/PomodoroRing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function DurationStepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-text-secondary">
      <span>{label}</span>
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          onClick={() => onChange(Math.max(min, value - step))}
        >
          −
        </Button>
        <span className="w-8 text-center font-mono tabular-nums text-text-primary">
          {value}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          onClick={() => onChange(Math.min(max, value + step))}
        >
          +
        </Button>
      </div>
    </div>
  );
}

export function PomodoroTimer() {
  const p = usePomodoro();
  const settings = useFocusSettings((s) => s.settings);
  const setSettings = useFocusSettings((s) => s.setSettings);

  const color = p.phase === "work" ? "var(--primary)" : "var(--color-success)";

  return (
    <div className="rounded-[14px] bg-bg-surface p-6 shadow-sm ring-1 ring-border/50">
      <div className="flex flex-col items-center gap-5">
        <PomodoroRing progress={p.progress} color={color} phase={p.phase}>
          <div className="text-center">
            <div className="font-mono text-4xl font-semibold tabular-nums text-text-primary">
              {p.label}
            </div>
            <div className="mt-1 text-xs text-text-tertiary">
              {p.phase === "work" ? "专注中" : "休息中"} · 已完成 {p.cycles} 轮
            </div>
          </div>
        </PomodoroRing>

        <div className="flex items-center gap-2">
          <Button
            size="lg"
            className="min-w-28 gap-2"
            onClick={p.toggle}
            style={{ backgroundColor: color, color: "var(--primary-foreground)" }}
          >
            {p.running ? <Pause className="size-4" /> : <Play className="size-4" />}
            {p.running ? "暂停" : "开始"}
          </Button>
          <Button variant="ghost" size="icon" onClick={p.skip} title="跳过">
            <FastForward className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={p.reset} title="重置">
            <RotateCcw className="size-4" />
          </Button>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-2 border-t border-border pt-4">
          <DurationStepper
            label="专注（分钟）"
            value={settings.workMin}
            min={1}
            max={90}
            step={1}
            onChange={(v) => setSettings({ workMin: v })}
          />
          <DurationStepper
            label="休息（分钟）"
            value={settings.breakMin}
            min={1}
            max={60}
            step={1}
            onChange={(v) => setSettings({ breakMin: v })}
          />
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>自动开始休息</span>
            <button
              type="button"
              onClick={() => setSettings({ autoStartBreaks: !settings.autoStartBreaks })}
              className={cn(
                "h-5 w-9 rounded-full p-0.5 transition-colors",
                settings.autoStartBreaks ? "bg-primary" : "bg-input"
              )}
            >
              <span
                className={cn(
                  "block size-4 rounded-full bg-white transition-transform",
                  settings.autoStartBreaks && "translate-x-4"
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
