import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_ITEMS, SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED } from "@/lib/constants";
import { useUiStore } from "@/stores/uiStore";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SettingsPopover } from "@/components/layout/SettingsPopover";
import { TodaySummaryCard } from "@/components/layout/TodaySummaryCard";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const collapsed = useUiStore((s) => s.collapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const activeView = useUiStore((s) => s.activeView);
  const setActiveView = useUiStore((s) => s.setActiveView);

  return (
    <motion.aside
      animate={{ width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH }}
      initial={false}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="flex h-full shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground"
    >
      {/* 今日概览聚合卡片 */}
      <div className="pt-3">
        <TodaySummaryCard collapsed={collapsed} />
      </div>

      {/* 导航 */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 ft-scroll">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const button = (
            <button
              type="button"
              onClick={() => setActiveView(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium outline-none transition-colors",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute left-0 h-5 w-1 rounded-r-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                />
              )}
              <Icon
                className="size-[18px] shrink-0"
                strokeWidth={isActive ? 2.2 : 1.75}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );

          return collapsed ? (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ) : (
            <div key={item.id}>{button}</div>
          );
        })}
      </nav>

      {/* 底部：设置 + 折叠 */}
      <div className={cn("space-y-0.5 border-t border-border p-2", collapsed && "flex flex-col items-center")}>
        <SettingsPopover />
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-[18px]" strokeWidth={1.75} />
          ) : (
            <>
              <PanelLeftClose className="size-[18px]" strokeWidth={1.75} />
              <span>折叠侧边栏</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
