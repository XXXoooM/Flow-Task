import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function PomodoroRing({
  progress,
  color,
  phase,
  children,
  size = 200,
}: {
  progress: number;
  color: string;
  phase: "work" | "break";
  children?: ReactNode;
  size?: number;
}) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={false}
          animate={{ strokeDashoffset: circ * (1 - clamped) }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
      <span className="sr-only">{phase}</span>
    </div>
  );
}
