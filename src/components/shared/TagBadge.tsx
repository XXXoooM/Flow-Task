import { X } from "lucide-react";
import type { Tag } from "@/types/task";
import { cn } from "@/lib/utils";

export function TagBadge({
  tag,
  className,
  onRemove,
}: {
  tag: Tag;
  className?: string;
  onRemove?: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-[140px] items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
        className
      )}
      style={{ backgroundColor: `${tag.color}1f`, color: tag.color }}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      <span className="truncate">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-0.5 shrink-0 rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
          aria-label={`移除标签 ${tag.name}`}
        >
          <X className="size-2.5" strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
}
