import {
  format,
  isToday,
  isTomorrow,
  isBefore,
  startOfDay,
  parseISO,
  addDays,
  addWeeks,
  addMonths,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import type { RecurrenceFreq } from "@/types/task";

export interface DueMeta {
  label: string;
  overdue: boolean;
  soon: boolean;
}

/** 解析 ISO 或 "YYYY-MM-DD"，非法/空返回 null。 */
export function parseDue(due: string | null): Date | null {
  if (!due) return null;
  const d = parseISO(due);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dueMeta(due: string | null): DueMeta | null {
  const d = parseDue(due);
  if (!d) return null;
  const now = new Date();
  if (isBefore(d, startOfDay(now)) && !isToday(d)) {
    return { label: `${format(d, "M月d日", { locale: zhCN })} 已逾期`, overdue: true, soon: false };
  }
  if (isToday(d)) return { label: "今天", overdue: false, soon: true };
  if (isTomorrow(d)) return { label: "明天", overdue: false, soon: false };
  return { label: format(d, "M月d日", { locale: zhCN }), overdue: false, soon: false };
}

/** 输入框 <input type=date> 的 value（"YYYY-MM-DD"）。 */
export function toInputDate(due: string | null): string {
  const d = parseDue(due);
  return d ? format(d, "yyyy-MM-dd") : "";
}

/** 计算下一次到期日（基于 from）。 */
export function nextDueDate(freq: RecurrenceFreq, interval: number, from: Date): Date {
  const n = Math.max(1, Math.floor(interval) || 1);
  if (freq === "daily") return addDays(from, n);
  if (freq === "weekly") return addWeeks(from, n);
  return addMonths(from, n);
}

/** 重复规则中文摘要。 */
export function recurrenceLabel(
  freq: RecurrenceFreq | undefined,
  interval: number
): string {
  if (!freq) return "不重复";
  const n = interval > 1 ? interval : null;
  const unit = freq === "daily" ? "天" : freq === "weekly" ? "周" : "个月";
  return n ? `每 ${n} ${unit}` : `每${unit === "天" ? "日" : unit === "周" ? "周" : "月"}`;
}
