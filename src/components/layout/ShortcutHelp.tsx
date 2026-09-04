import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "全局",
    items: [
      ["Ctrl + K", "命令面板"],
      ["Ctrl + Shift + T", "快速新建（全局）"],
      ["Ctrl + N", "新建任务"],
      ["Ctrl + Z", "撤销"],
      ["Ctrl + Shift + Z", "重做"],
      ["Ctrl + 1 / 2 / 3", "列表 / 日历 / 看板"],
      ["?", "打开本帮助"],
    ],
  },
  {
    title: "任务列表",
    items: [
      ["↑ / ↓", "在任务间移动焦点"],
      ["Enter", "编辑聚焦任务标题"],
      ["Space", "切换完成状态"],
      ["Delete", "删除聚焦任务（可撤销）"],
      ["Esc", "退出编辑 / 关闭弹窗"],
    ],
  },
  {
    title: "任务卡片",
    items: [
      ["单击标题", "内联编辑"],
      ["点击色条", "循环优先级"],
      ["点击日期", "内联改期"],
      ["拖动手柄", "排序（长按 200ms 触发）"],
    ],
  },
];

export function ShortcutHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4" /> 键盘快捷键
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <h4 className="mb-1.5 text-xs font-semibold text-text-tertiary">
                {g.title}
              </h4>
              <div className="space-y-1">
                {g.items.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-text-secondary">{v}</span>
                    <kbd className="rounded border border-border bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-text-primary">
                      {k}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
