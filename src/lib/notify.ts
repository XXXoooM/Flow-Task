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

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new Ctor();
    }
    if (sharedAudioCtx.state === "suspended") {
      void sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/** 完成提示音（WebAudio 合成音效，清脆和弦）。 */
export function playChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().then(() => playChime()).catch(() => undefined);
      return;
    }

    // 优雅双音和弦 (C6 -> E6: 1046.5Hz, 1318.5Hz)
    const tones = [
      { freq: 1046.5, delay: 0 },
      { freq: 1318.5, delay: 0.12 },
    ];

    const now = ctx.currentTime;
    for (const { freq, delay } of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.linearRampToValueAtTime(0.25, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.4);
    }
  } catch {
    /* ignore */
  }
}
