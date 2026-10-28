"use client";

import React, { useState, useRef } from "react";
import { ZoomIn, ZoomOut, RotateCcw, AlertOctagon, CheckCircle2, PlayCircle, Clock } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";

interface TaskNode {
  id: string;
  title: string;
  department_name?: string;
  status: string;
  priority: string;
  progress_percentage: number;
  blocked_reason?: string;
  dependencies: Array<{ depends_on_task_id: string; is_satisfied: boolean }>;
}

interface DependencyGraphProps {
  tasks: TaskNode[];
  onSelectTask?: (task: TaskNode) => void;
}

export function DependencyGraph({ tasks, onSelectTask }: DependencyGraphProps) {
  const [scale, setScale] = useState(1);
  const [selectedNode, setSelectedNode] = useState<TaskNode | null>(null);

  // Layout tasks into columns by dependency depth
  const depthMap: Record<string, number> = {};
  
  const getDepth = (id: string, visited = new Set<string>()): number => {
    if (visited.has(id)) return 0;
    visited.add(id);
    const task = tasks.find((t) => t.id === id);
    if (!task || !task.dependencies || task.dependencies.length === 0) return 0;
    const maxDep = Math.max(
      ...task.dependencies.map((d) => getDepth(d.depends_on_task_id, new Set(visited)) + 1)
    );
    return maxDep;
  };

  tasks.forEach((t) => {
    depthMap[t.id] = getDepth(t.id);
  });

  const columns: TaskNode[][] = [];
  tasks.forEach((t) => {
    const depth = depthMap[t.id] || 0;
    if (!columns[depth]) columns[depth] = [];
    columns[depth].push(t);
  });

  // Calculate coordinates
  const nodePositions: Record<string, { x: number; y: number }> = {};
  const colWidth = 280;
  const rowHeight = 120;

  columns.forEach((col, colIdx) => {
    col.forEach((task, rowIdx) => {
      nodePositions[task.id] = {
        x: 60 + colIdx * colWidth,
        y: 60 + rowIdx * rowHeight,
      };
    });
  });

  const handleZoom = (delta: number) => {
    setScale((prev) => Math.min(1.8, Math.max(0.6, prev + delta)));
  };

  return (
    <div className="relative w-full rounded-2xl border border-border bg-card/60 backdrop-blur overflow-hidden">
      {/* Graph Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 p-1.5 rounded-xl border border-border bg-card/90 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={() => handleZoom(0.15)}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(-0.15)}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setScale(1)}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          title="Reset Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-bold text-muted-foreground px-2 tabular-nums">
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3 p-2 rounded-xl border border-border bg-card/90 text-[10px] font-semibold text-muted-foreground shadow-sm">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" /> Blocked Path
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Satisfied
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> In Progress
        </span>
      </div>

      {/* Interactive SVG Canvas */}
      <div className="overflow-auto min-h-[520px] p-8">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            minWidth: `${(columns.length + 1) * colWidth}px`,
            minHeight: "500px",
          }}
          className="relative transition-transform duration-150 ease-out"
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <marker id="arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
              </marker>
              <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
              </marker>
              <marker id="arrow-slate" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </marker>
            </defs>

            {/* Connecting Edges */}
            {tasks.map((task) =>
              task.dependencies?.map((dep) => {
                const from = nodePositions[dep.depends_on_task_id];
                const to = nodePositions[task.id];
                if (!from || !to) return null;

                const isBlocked = task.status === "blocked";
                const isSatisfied = dep.is_satisfied;

                const strokeColor = isBlocked ? "#ef4444" : isSatisfied ? "#10b981" : "#94a3b8";
                const markerId = isBlocked ? "url(#arrow-red)" : isSatisfied ? "url(#arrow-green)" : "url(#arrow-slate)";

                const startX = from.x + 220;
                const startY = from.y + 45;
                const endX = to.x;
                const endY = to.y + 45;
                const controlX = (startX + endX) / 2;

                return (
                  <path
                    key={`${task.id}-${dep.depends_on_task_id}`}
                    d={`M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isBlocked ? 2.5 : 1.75}
                    strokeDasharray={isBlocked ? "4 4" : undefined}
                    markerEnd={markerId}
                    className={isBlocked ? "animate-pulse" : ""}
                  />
                );
              })
            )}
          </svg>

          {/* Task Nodes */}
          {tasks.map((task) => {
            const pos = nodePositions[task.id];
            if (!pos) return null;

            const isBlocked = task.status === "blocked";
            const isVerified = task.status === "verified_complete";
            const isPendingEvidence = task.status === "completed_pending_evidence";

            let borderColor = "border-border";
            let shadowColor = "";
            if (isBlocked) {
              borderColor = "border-rose-400 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/40";
              shadowColor = "shadow-rose-500/20";
            } else if (isVerified) {
              borderColor = "border-emerald-400 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/40";
            } else if (isPendingEvidence) {
              borderColor = "border-amber-400 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40";
            }

            return (
              <div
                key={task.id}
                onClick={() => {
                  setSelectedNode(task);
                  if (onSelectTask) onSelectTask(task);
                }}
                style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                className={`absolute w-56 p-3 rounded-xl border ${borderColor} bg-card text-foreground shadow-sm hover:shadow-lg cursor-pointer transition-all z-10 space-y-1.5`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase truncate">
                    {task.department_name || "General"}
                  </span>
                  <PriorityBadge priority={task.priority} />
                </div>
                <h4 className="text-xs font-bold leading-tight line-clamp-2 text-foreground">
                  {task.title}
                </h4>
                {isBlocked && (
                  <div className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3 shrink-0" />
                    <span className="truncate">Blocked prerequisite</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                  <StatusBadge status={task.status} />
                  <span className="tabular-nums font-semibold">{task.progress_percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

