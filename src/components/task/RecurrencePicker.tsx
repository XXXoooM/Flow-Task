import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Repeat } from "lucide-react";
import type { Recurrence, RecurrenceFreq } from "@/types/task";

const NONE = "none";

export function RecurrencePicker({
  value,
  onChange,
}: {
  value: Recurrence | null;
  onChange: (rec: Recurrence | null) => void;
}) {
  const freq = value?.freq ?? NONE;
  const interval = value?.interval ?? 1;

  function setFreq(next: string) {
    if (next === NONE) {
      onChange(null);
      return;
    }
    onChange({
      freq: next as RecurrenceFreq,
      interval,
      end_date: value?.end_date ?? null,
    });
  }

  function setInterval(n: number) {
    if (!value) return;
    onChange({ ...value, interval: Math.max(1, Math.min(365, n || 1)) });
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={freq} onValueChange={setFreq}>
        <SelectTrigger size="sm" className="w-[120px]">
          <span className="flex items-center gap-2">
            <Repeat className="size-3.5 text-muted-foreground" />
            <SelectValue>
              {freq === NONE
                ? "不重复"
                : freq === "daily"
                  ? "每天"
                  : freq === "weekly"
                    ? "每周"
                    : "每月"}
            </SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>不重复</SelectItem>
          <SelectItem value="daily">每天</SelectItem>
          <SelectItem value="weekly">每周</SelectItem>
          <SelectItem value="monthly">每月</SelectItem>
        </SelectContent>
      </Select>

      {value && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>每</span>
          <Input
            type="number"
            min={1}
            max={365}
            value={String(interval)}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="h-8 w-14 text-center"
          />
          <span>{freq === "daily" ? "天" : freq === "weekly" ? "周" : "个月"}</span>
        </div>
      )}
    </div>
  );
}
