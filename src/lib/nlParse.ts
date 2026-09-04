import {
  addDays,
  startOfWeek,
  setDay,
  parseISO,
  format,
  isBefore,
} from "date-fns";

export interface ParsedQuickAdd {
  title: string;
  priority: 0 | 1 | 2 | 3 | null;
  tagNames: string[];
  due: string | null; // "YYYY-MM-DD"
  scheduledAt: string | null; // "YYYY-MM-DDTHH:mm"（出现时间词即视为日程）
  reminderEnabled: boolean;
  reminderOffset: number; // 秒
}

const WEEKDAY: Record<string, number> = {
  "1": 1, 一: 1,
  "2": 2, 二: 2,
  "3": 3, 三: 3,
  "4": 4, 四: 4,
  "5": 5, 五: 5,
  "6": 6, 六: 6,
  "7": 0, 日: 0, 天: 0,
};

function iso(d: Date): string {
  return format(d, "yyyy-MM-dd");
}
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 相对/绝对中文日期解析；无法识别返回 null。 */
export function parseDateToken(token: string, base = new Date()): string | null {
  const t = token.trim();
  if (t === "今天" || t === "today") return iso(base);
  if (t === "明天" || t === "tomorrow") return iso(addDays(base, 1));
  if (t === "后天") return iso(addDays(base, 2));
  if (t === "大后天") return iso(addDays(base, 3));
  if (t === "昨天") return iso(addDays(base, -1));

  const weekMatch = t.match(/^(下{0,2})(?:周|星期|礼拜)([一二三四五六日天1-7])$/);
  if (weekMatch) {
    const wd = WEEKDAY[weekMatch[2]];
    const nextWeeks = weekMatch[1].length;
    const ws = startOfWeek(base, { weekStartsOn: 1 });
    let d = setDay(ws, wd, { weekStartsOn: 1 });
    d = addDays(d, nextWeeks * 7);
    if (nextWeeks === 0 && isBefore(d, base)) d = addDays(d, 7);
    return iso(d);
  }

  const mdy = t.match(/^(\d{1,2})[月/\-.](\d{1,2})[日号]?$/);
  if (mdy) {
    const month = Number(mdy[1]) - 1;
    const day = Number(mdy[2]);
    let d = new Date(base.getFullYear(), month, day);
    if (isBefore(d, startOfWeek(base))) d = new Date(base.getFullYear() + 1, month, day);
    return iso(d);
  }

  const isoMatch = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d = parseISO(t);
    return Number.isNaN(d.getTime()) ? null : t;
  }
  return null;
}

/** 从文本中提取时间，返回 {hh, mm, clean}；无时间返回 null。 */
function extractTime(
  text: string
): { hh: number; mm: number; clean: string } | null {
  // 24h 冒号：15:00 / 9:30
  const colon = text.match(/(?:^|\s)(\d{1,2})[:：](\d{2})(?=\s|$)/);
  if (colon) {
    const hh = Number(colon[1]);
    const mm = Number(colon[2]);
    if (hh < 24 && mm < 60) {
      return { hh, mm, clean: text.replace(colon[0], " ") };
    }
  }
  // 中文 / am-pm：下午3点 / 3点半 / 8am / 晚上7点15分
  const cn = text.match(
    /(上午|下午|晚上|早上|中午)?\s*(\d{1,2})\s*(点|时|am|pm)(半|(\d{1,2})分)?/i
  );
  if (cn) {
    const ap = (cn[1] ?? "").toLowerCase();
    const unit = (cn[3] ?? "").toLowerCase();
    let hh = Number(cn[2]);
    let mm = 0;
    if (cn[4] === "半") mm = 30;
    else if (cn[5]) mm = Number(cn[5]);
    const pm = unit === "pm" || ap.includes("下午") || ap.includes("晚上");
    const noon = ap.includes("中午");
    const am = unit === "am" || ap.includes("早上") || ap.includes("上午");
    if ((pm || noon) && hh < 12) hh += 12;
    if (am && hh === 12) hh = 0;
    if (hh < 24 && mm < 60) {
      return { hh, mm, clean: text.replace(cn[0], " ") };
    }
  }
  return null;
}

/** 解析快速添加的自然语言语法：!p0-3 / #标签 / 日期 / 时间 / !remind15。 */
export function parseQuickAdd(raw: string): ParsedQuickAdd {
  let text = ` ${raw} `;
  const tagNames: string[] = [];
  let priority: 0 | 1 | 2 | 3 | null = null;
  let due: string | null = null;

  // 优先级
  text = text.replace(/!p\s*([0-3])/gi, (_m, n) => {
    priority = Number(n) as 0 | 1 | 2 | 3;
    return " ";
  });
  if (priority === null) {
    text = text.replace(/!(urgent|high|mid|low)/gi, (_m, w) => {
      const map: Record<string, 0 | 1 | 2 | 3> = {
        urgent: 0,
        high: 1,
        mid: 2,
        low: 3,
      };
      priority = map[w.toLowerCase()] ?? null;
      return " ";
    });
  }

  // 提醒：!remind15 / !r15（分钟）
  let reminderEnabled = false;
  let reminderOffset = 900;
  text = text.replace(/!(?:remind|r)(\d{1,4})/i, (_m, n) => {
    reminderEnabled = true;
    reminderOffset = Number(n) * 60;
    return " ";
  });

  // 标签
  text = text.replace(/#([^\s#!]+)/g, (_m, tag) => {
    tagNames.push(tag);
    return " ";
  });

  // 日期
  const dateCandidates = [
    ...Array.from(text.matchAll(/(下{0,2}(?:周|星期|礼拜)[一二三四五六日天1-7])/g)).map(
      (m) => m[1]
    ),
    ...Array.from(text.matchAll(/(今天|明天|后天|大后天|昨天)/g)).map((m) => m[1]),
    ...Array.from(text.matchAll(/(\d{1,2}[月/\-.]\d{1,2}[日号]?)/g)).map((m) => m[1]),
  ];
  for (const cand of dateCandidates) {
    const parsed = parseDateToken(cand);
    if (parsed) {
      due = parsed;
      text = text.replace(cand, " ");
      break;
    }
  }

  // 时间 → 日程（scheduled_at）
  let scheduledAt: string | null = null;
  const t = extractTime(text);
  if (t) {
    text = t.clean;
    const baseDate = due ?? iso(new Date());
    scheduledAt = `${baseDate}T${pad(t.hh)}:${pad(t.mm)}`;
  }

  const title = text.replace(/\s+/g, " ").replace(/[，,]\s*$/, "").trim();
  return {
    title,
    priority,
    tagNames,
    due,
    scheduledAt,
    reminderEnabled: scheduledAt ? reminderEnabled : false,
    reminderOffset: scheduledAt ? reminderOffset : 900,
  };
}
