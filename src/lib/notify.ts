import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

let ready = false;

/** 请求（或复用）系统通知权限。 */
export async function ensureNotifyPermission(): Promise<boolean> {
  try {
    if (await isPermissionGranted()) {
      ready = true;
      return true;
    }
    const granted = (await requestPermission()) === "granted";
    ready = granted;
    return granted;
  } catch {
    return false;
  }
}

export function notify(title: string, body?: string) {
  if (!ready) return;
  try {
    sendNotification({ title, body });
  } catch {
    /* ignore */
  }
}

/** 完成提示音（WebAudio 合成，无需资源文件）。 */
export function playChime() {
  try {
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    [880, 1174].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.32);
    });
    window.setTimeout(() => ctx.close().catch(() => undefined), 1000);
  } catch {
    /* ignore */
  }
}
