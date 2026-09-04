import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Bell, BellRing, CheckCheck, Trash2, Inbox } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  useCenterStore,
  unreadCount,
} from "@/stores/notificationCenterStore";
import { cn } from "@/lib/utils";

function fmtAt(iso: string) {
  const d = parseISO(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "M月d日 HH:mm", { locale: zhCN });
}

export function NotificationCenter() {
  const items = useCenterStore((s) => s.items);
  const markRead = useCenterStore((s) => s.markRead);
  const markAllRead = useCenterStore((s) => s.markAllRead);
  const remove = useCenterStore((s) => s.remove);
  const clear = useCenterStore((s) => s.clear);
  const unread = unreadCount(items);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative grid size-9 place-items-center rounded text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
          aria-label={`提醒中心${unread ? `，${unread} 条未读` : ""}`}
        >
          {unread > 0 ? (
            <BellRing className="size-[15px]" strokeWidth={1.9} />
          ) : (
            <Bell className="size-[15px]" strokeWidth={1.75} />
          )}
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold text-text-primary">提醒中心</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              disabled={unread === 0}
              onClick={markAllRead}
            >
              <CheckCheck className="size-3.5" /> 全部已读
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              disabled={items.length === 0}
              onClick={clear}
            >
              <Trash2 className="size-3.5" /> 清空
            </Button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto ft-scroll">
          {items.length === 0 ? (
            <div className="grid place-items-center gap-2 px-4 py-10 text-center">
              <Inbox className="size-7 text-text-tertiary" />
              <p className="text-sm text-text-tertiary">暂无提醒记录</p>
            </div>
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                className={cn(
                  "group flex items-start gap-2 border-b border-border/60 px-3 py-2 last:border-0 hover:bg-bg-hover",
                  !it.read && "bg-accent/30"
                )}
              >
                <button
                  type="button"
                  className="mt-1.5 flex-1 text-left"
                  onClick={() => {
                    markRead(it.id);
                    window.dispatchEvent(
                      new CustomEvent("flowtask:detail", { detail: it.taskId })
                    );
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    {!it.read && (
                      <span className="size-1.5 shrink-0 rounded-full bg-danger" />
                    )}
                    <span
                      className={cn(
                        "line-clamp-1 text-sm",
                        it.read ? "text-text-secondary" : "font-medium text-text-primary"
                      )}
                    >
                      {it.title}
                    </span>
                  </div>
                  <div className="pl-3 text-[11px] text-text-tertiary">
                    {fmtAt(it.at)}
                    {it.body ? ` · ${it.body}` : ""}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  className="mt-1 shrink-0 text-text-tertiary opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  aria-label="移除"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
