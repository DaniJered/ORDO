"use client";

import React, { useState } from "react";
import { Sparkles, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIBadgeProps {
  label?: string;
  confidence?: number;
  rationale?: string;
  className?: string;
  showSparkles?: boolean;
}

export function AIBadge({ label = "AI Generated", confidence, rationale, className, showSparkles = true }: AIBadgeProps) {
  const [showPopover, setShowPopover] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowPopover(!showPopover)}
        onMouseEnter={() => setShowPopover(true)}
        onMouseLeave={() => setShowPopover(false)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold",
          "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
          "transition-colors hover:bg-purple-200 dark:hover:bg-purple-900",
          className
        )}
      >
        {showSparkles && <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400 animate-pulse" />}
        <span>{label}</span>
        {confidence !== undefined && (
          <span className="text-[10px] opacity-80">({Math.round(confidence * 100)}%)</span>
        )}
      </button>

      {showPopover && rationale && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 p-2.5 text-xs rounded-lg shadow-xl bg-card border border-border text-foreground">
          <div className="flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Reasoning & Grounding</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">{rationale}</p>
        </div>
      )}
    </div>
  );
}

