import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useFocusStore } from "@/stores/focusStore";
import { useNotifStore } from "@/stores/notificationStore";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * 全局番茄钟驱动器：
 * 保证番茄钟在切换页面、最小化到后台甚至任何操作时，都持续运行倒计时、更新托盘与同步排队状态。
 */
export function PomodoroScheduler() {
  const running = useFocusStore((s) => s.running);
  const remaining = useFocusStore((s) => s.remaining);
  const phase = useFocusStore((s) => s.phase);
  const tickSecond = useFocusStore((s) => s.tickSecond);

  // 1. 全局秒级定时驱动
  useEffect(() => {
    if (!running) return;
    const timerId = window.setInterval(() => {
      tickSecond();
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [running, tickSecond]);

  // 2. 专注运行期间：到期提醒排队，结束后汇总（不打扰）
  useEffect(() => {
    useNotifStore.getState().setFocusing(running);
  }, [running]);

  // 3. 托盘倒计时与标题同步
  useEffect(() => {
    const title = running
      ? `FlowTask · ${fmt(remaining)} · ${phase === "work" ? "专注" : "休息"}`
      : "FlowTask";
    void invoke("set_tray_title", { title }).catch(() => undefined);
  }, [running, remaining, phase]);

  return null;
}
