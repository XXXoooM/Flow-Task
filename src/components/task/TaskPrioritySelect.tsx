import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function TaskPrioritySelect({
  value,
  onChange,
  size = "default",
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "default";
  className?: string;
}) {
  const meta = PRIORITY_META[value] ?? PRIORITY_META[3];
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger size={size} className={cn("w-[132px]", className)}>
        <SelectValue>
          <span className="flex items-center gap-2">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: meta.color }}
            />
            {meta.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PRIORITY_META.map((p) => (
          <SelectItem key={p.level} value={String(p.level)}>
            <span className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              {p.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
