import React from "react";
import { ArrowDown, Minus, ArrowUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type Priority = "low" | "medium" | "high" | "critical";

const priorityConfig: Record<
  Priority,
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  low: {
    label: "Low",
    bg: "bg-slate-50 dark:bg-slate-900",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-800",
    icon: <ArrowDown className="w-3 h-3 text-slate-500" />,
  },
  medium: {
    label: "Medium",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-200 dark:border-sky-800",
    icon: <Minus className="w-3 h-3 text-sky-500" />,
  },
  high: {
    label: "High",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    icon: <ArrowUp className="w-3 h-3 text-amber-500" />,
  },
  critical: {
    label: "Critical",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400 font-semibold",
    border: "border-rose-200 dark:border-rose-800",
    icon: <AlertTriangle className="w-3 h-3 text-rose-500" />,
  },
};

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  const norm = (priority?.toLowerCase() as Priority) || "medium";
  const config = priorityConfig[norm] || priorityConfig.medium;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border font-medium",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}

