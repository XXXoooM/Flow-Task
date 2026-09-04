import { toast } from "sonner";
import { CloudOff, Loader2, CircleCheck, CircleAlert } from "lucide-react";
import { useStatusStore } from "@/stores/statusStore";
import { cn } from "@/lib/utils";

export function SaveIndicator() {
  const status = useStatusStore((s) => s.status);
  const retry = useStatusStore((s) => s.retry);

  if (status === "idle" || status === "saved") {
    // saved：短暂绿点后隐藏；idle：不显示
    if (status === "idle") return null;
    return (
      <span
        className={cn(
          "flex items-center gap-1 text-[11px] text-success"
        )}
        aria-label="已保存"
      >
        <CircleCheck className="size-3.5" />
        已保存
      </span>
    );
  }

  if (status === "saving") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
        <Loader2 className="size-3.5 animate-spin" />
        保存中
      </span>
    );
  }

  const offline = status === "offline";
  return (
    <button
      type="button"
      onClick={() => {
        retry();
        toast.info("正在重试保存…");
      }}
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors hover:bg-bg-hover",
        offline ? "text-warning" : "text-danger"
      )}
      title="点击重试"
    >
      {offline ? (
        <CloudOff className="size-3.5" />
      ) : (
        <CircleAlert className="size-3.5" />
      )}
      {offline ? "数据库离线 · 重试" : "保存失败 · 重试"}
    </button>
  );
}
