import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useFocusStore, useFocusSettings } from "@/stores/focusStore";
import { playChime } from "@/lib/notify";
import { useNotifStore } from "@/stores/notificationStore";

export type Phase = "work" | "break";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** 番茄钟核心：工作/休息阶段、暂停/跳过、记录会话、托盘倒计时与通知。 */
export function usePomodoro() {
  const settings = useFocusSettings((s) => s.settings);
  const record = useFocusStore((s) => s.record);
  const loadStats = useFocusStore((s) => s.loadStats);

  const workS = Math.max(1, settings.workMin) * 60;
  const breakS = Math.max(1, settings.breakMin) * 60;

  const [phase, setPhase] = useState<Phase>("work");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(workS);
  const [cycles, setCycles] = useState(0);
  const workStartRef = useRef<number>(Date.now());

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // 空闲时随设置变化对齐时长。
  useEffect(() => {
    if (!running) setRemaining(phase === "work" ? workS : breakS);
  }, [running, phase, workS, breakS]);

  // 每秒倒数。
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(
      () => setRemaining((r) => (r <= 1 ? 0 : r - 1)),
      1000
    );
    return () => window.clearInterval(id);
  }, [running]);

  const advance = useCallback(() => {
    const now = Date.now();
    if (phase === "work") {
      void record({
        taskId: null,
        startedAt: new Date(workStartRef.current).toISOString(),
        endedAt: new Date(now).toISOString(),
        durationS: workS,
        completed: true,
      });
      if (settings.sound) playChime();
      toast.success("🍅 番茄完成", {
        description: `专注了 ${settings.workMin} 分钟，休息 ${settings.breakMin} 分钟吧`,
      });
      setCycles((c) => c + 1);
      setPhase("break");
      setRemaining(breakS);
      if (!settings.autoStartBreaks) setRunning(false);
    } else {
      if (settings.sound) playChime();
      toast("☕ 休息结束", { description: "开始下一个番茄吧" });
      setPhase("work");
      setRemaining(workS);
      workStartRef.current = now;
    }
  }, [phase, workS, breakS, settings, record]);

  useEffect(() => {
    if (running && remaining === 0) advance();
  }, [running, remaining, advance]);

  // 专注运行期间：到期提醒排队，结束后汇总（不打断）。
  useEffect(() => {
    useNotifStore.getState().setFocusing(running);
  }, [running]);

  // 托盘倒计时
  useEffect(() => {
    const title = running
      ? `FlowTask · ${fmt(remaining)} · ${phase === "work" ? "专注" : "休息"}`
      : "FlowTask";
    void invoke("set_tray_title", { title }).catch(() => undefined);
  }, [running, remaining, phase]);

  const toggle = useCallback(() => setRunning((r) => !r), []);
  const reset = useCallback(() => {
    setRunning(false);
    setPhase("work");
    setRemaining(workS);
    workStartRef.current = Date.now();
  }, [workS]);
  const skip = useCallback(() => {
    // 跳过当前阶段（工作阶段跳过不计入完成统计）
    if (phase === "work") {
      setPhase("break");
      setRemaining(breakS);
    } else {
      setPhase("work");
      setRemaining(workS);
      workStartRef.current = Date.now();
    }
  }, [phase, workS, breakS]);

  const total = phase === "work" ? workS : breakS;
  const progress = total > 0 ? 1 - remaining / total : 0;

  return {
    phase,
    running,
    remaining,
    cycles,
    progress,
    label: fmt(remaining),
    settings,
    toggle,
    reset,
    skip,
  };
}
