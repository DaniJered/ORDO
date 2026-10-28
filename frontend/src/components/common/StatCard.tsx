import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  highlightColor?: "blue" | "green" | "red" | "amber" | "purple";
  className?: string;
}

const highlightStyles = {
  blue: "border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20",
  green: "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20",
  red: "border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20",
  amber: "border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20",
  purple: "border-purple-200 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-950/20",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  highlightColor,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "p-5 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow transition-all",
        highlightColor ? highlightStyles[highlightColor] : "border-border",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {icon && <div className="p-2 rounded-lg bg-secondary text-foreground">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">{value}</span>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              trend.isPositive ? "text-emerald-600" : "text-rose-600"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

