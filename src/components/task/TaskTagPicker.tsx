import { useEffect, useState } from "react";
import { Tag as TagIcon, Plus, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { TagBadge } from "@/components/shared/TagBadge";
import { TAG_COLORS, useTagStore } from "@/stores/tagStore";
import { cn } from "@/lib/utils";

export function TaskTagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);

  const tags = useTagStore((s) => s.tags);
  const loaded = useTagStore((s) => s.loaded);
  const loadTags = useTagStore((s) => s.loadTags);
  const createTag = useTagStore((s) => s.createTag);

  useEffect(() => {
    if (open && !loaded) void loadTags();
  }, [open, loaded, loadTags]);

  const selected = tags.filter((t) => value.includes(t.id));
  const query = q.trim().toLowerCase();
  const matches = tags.filter(
    (t) => !value.includes(t.id) && t.name.toLowerCase().includes(query)
  );
  const exact = tags.some((t) => t.name.toLowerCase() === query);

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  async function create() {
    if (!query) return;
    const tag = await createTag(q, newColor);
    if (!value.includes(tag.id)) onChange([...value, tag.id]);
    setQ("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-h-9 w-full items-center gap-1.5 rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs transition-colors hover:bg-accent/40",
            selected.length === 0 && "text-muted-foreground"
          )}
        >
          <TagIcon className="size-3.5 shrink-0" />
          {selected.length === 0 ? (
            "添加标签"
          ) : (
            <span className="flex flex-wrap gap-1">
              {selected.map((t) => (
                <TagBadge key={t.id} tag={t} onRemove={() => toggle(t.id)} />
              ))}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void create();
            }
          }}
          placeholder="搜索或新建标签…"
          className="h-8 mb-2"
        />

        {query && !exact && (
          <button
            type="button"
            onClick={() => void create()}
            className="mb-1 flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
          >
            <Plus className="size-3.5 text-primary" />
            创建“{q.trim()}”
            <span
              className="ml-auto size-3 rounded-full"
              style={{ backgroundColor: newColor }}
            />
          </button>
        )}

        {matches.length > 0 && (
          <div className="mb-1 max-h-40 overflow-y-auto ft-scroll">
            {matches.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                <span className="truncate">{t.name}</span>
              </button>
            ))}
          </div>
        )}

        {query && !exact && (
          <div className="mt-1 border-t border-border pt-2">
            <p className="mb-1 px-1 text-[11px] text-muted-foreground">新标签颜色</p>
            <div className="flex flex-wrap gap-1.5 px-1">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className="grid size-5 place-items-center rounded-full"
                  style={{ backgroundColor: c }}
                  aria-label={c}
                >
                  {newColor === c && <Check className="size-3 text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
