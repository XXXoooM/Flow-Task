import { useMemo } from "react";
import { useFocusStore } from "@/stores/focusStore";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * 番茄钟 Hook：直接消费全局 useFocusStore，
 * 切换页面甚至多处展示时完全保持状态同步且绝不丢失倒计时。
 */
export function usePomodoro() {
  const phase = useFocusStore((s) => s.phase);
  const running = useFocusStore((s) => s.running);
  const remaining = useFocusStore((s) => s.remaining);
  const cycles = useFocusStore((s) => s.cycles);
  const settings = useFocusStore((s) => s.settings);

  const toggle = useFocusStore((s) => s.toggleTimer);
  const reset = useFocusStore((s) => s.resetTimer);
  const skip = useFocusStore((s) => s.skipPhase);

  const workS = Math.max(1, settings.workMin) * 60;
  const breakS = Math.max(1, settings.breakMin) * 60;
  const total = phase === "work" ? workS : breakS;
  const progress = useMemo(() => (total > 0 ? 1 - remaining / total : 0), [total, remaining]);
  const label = useMemo(() => fmt(remaining), [remaining]);

  return {
    phase,
    running,
    remaining,
    cycles,
    progress,
    label,
    settings,
    toggle,
    reset,
    skip,
  };
}
