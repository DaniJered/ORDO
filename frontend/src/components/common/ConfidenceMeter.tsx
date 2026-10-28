import React from "react";
import { cn } from "@/lib/utils";

export function ConfidenceMeter({
  score,
  label = "Confidence",
  className,
  size = "md",
  showNumeric = true,
}: {
  score: number;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  showNumeric?: boolean;
}) {
  const percent = Math.min(100, Math.max(0, Math.round(score * 100)));

  let color = "bg-emerald-500";
  if (percent < 70) color = "bg-rose-500";
  else if (percent < 85) color = "bg-amber-500";

  const heightClass = size === "sm" ? "h-1" : size === "lg" ? "h-2.5" : "h-1.5";

  return (
    <div className={cn("space-y-1 w-full max-w-[120px]", className)}>
      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium">
        <span>{label}</span>
        {showNumeric && <span className="font-semibold text-foreground">{percent}%</span>}
      </div>
      <div className={cn("w-full rounded-full bg-secondary overflow-hidden", heightClass)}>
        <div
          className={cn("h-full transition-all duration-300 rounded-full", color)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

