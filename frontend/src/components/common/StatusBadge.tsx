import React from "react";
import { CircleDot, PlayCircle, AlertOctagon, Clock, CheckCircle2, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "completed_pending_evidence"
  | "verified_complete"
  | "cancelled";

const statusConfig: Record<
  TaskStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  not_started: {
    label: "Not Started",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
    icon: <CircleDot className="w-3.5 h-3.5" />,
  },
  in_progress: {
    label: "In Progress",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    icon: <PlayCircle className="w-3.5 h-3.5" />,
  },
  blocked: {
    label: "Blocked",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    icon: <AlertOctagon className="w-3.5 h-3.5" />,
  },
  completed_pending_evidence: {
    label: "Pending Evidence",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  verified_complete: {
    label: "Verified Complete",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-500 dark:text-zinc-400",
    border: "border-zinc-200 dark:border-zinc-700",
    icon: <Ban className="w-3.5 h-3.5" />,
  },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const normStatus = (status.toLowerCase().replace(/\s+/g, "_") as TaskStatus) || "not_started";
  const config = statusConfig[normStatus] || statusConfig.not_started;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
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

