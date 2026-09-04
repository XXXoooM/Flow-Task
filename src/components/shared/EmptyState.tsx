import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex h-full flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <div className="grid size-16 place-items-center rounded-2xl bg-bg-elevated text-text-tertiary">
        <Icon className="size-7" strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        {description && (
          <p className="max-w-sm text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {action}
    </motion.div>
  );
}
