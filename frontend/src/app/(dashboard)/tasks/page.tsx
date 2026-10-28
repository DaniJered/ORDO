"use client";

import React, { useEffect, useState } from "react";
import {
  Kanban,
  Table as TableIcon,
  Filter,
  Plus,
  AlertOctagon,
  Clock,
  CheckCircle2,
  FileCheck2,
  ChevronRight,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge, TaskStatus } from "@/components/common/StatusBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { apiRequest } from "@/lib/api";

const KANBAN_COLUMNS: Array<{ id: TaskStatus; label: string }> = [
  { id: "not_started", label: "Not Started" },
  { id: "in_progress", label: "In Progress" },
  { id: "blocked", label: "Blocked" },
  { id: "completed_pending_evidence", label: "Pending Evidence" },
  { id: "verified_complete", label: "Verified Complete" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    let url = "/tasks?";
    if (departmentFilter) url += `&department_id=${departmentFilter}`;
    if (priorityFilter) url += `&priority=${priorityFilter}`;

    const res = await apiRequest(url);
    if (res.success && res.data) {
      setTasks(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [departmentFilter, priorityFilter]);

  const handleVerifyComplete = async (taskId: string) => {
    const res = await apiRequest(`/tasks/${taskId}/verify-complete`, { method: "POST" });
    if (res.success) {
      fetchTasks();
      if (selectedTask?.id === taskId) {
        setSelectedTask({ ...selectedTask, status: "verified_complete", progress_percentage: 100 });
      }
    } else {
      alert(`Cannot mark Verified Complete: ${res.error?.message || "Check prerequisites and evidence requirements."}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks & Dependency Workflow Board"
        description="Monitor task states governed by deterministic rules. Pre-requisites and mandatory evidence control completion."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-lg border border-border bg-card">
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1.5 ${
                  viewMode === "kanban" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1.5 ${
                  viewMode === "table" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background focus:outline-none"
        >
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {(departmentFilter || priorityFilter) && (
          <button
            type="button"
            onClick={() => {
              setDepartmentFilter("");
              setPriorityFilter("");
            }}
            className="text-xs text-rose-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="rounded-2xl border border-border bg-secondary/30 p-3.5 flex flex-col min-h-[450px]"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
                  <span className="text-xs font-bold text-foreground">{col.label}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-card text-muted-foreground">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className="p-3.5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md cursor-pointer transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <PriorityBadge priority={t.priority} />
                        <span className="text-[10px] text-muted-foreground tabular-nums font-semibold">
                          {t.progress_percentage}%
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-foreground leading-snug">{t.title}</h4>
                      {t.blocked_reason && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded border border-rose-200 dark:border-rose-900">
                          {t.blocked_reason}
                        </p>
                      )}
                      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{t.department_name || "General"}</span>
                        <span>{new Date(t.deadline).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-semibold">
                <th className="p-3.5">Task Title</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Owner</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Deadline</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tasks.map((t) => (
                <tr key={t.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="p-3.5 font-bold text-foreground">
                    <button
                      type="button"
                      onClick={() => setSelectedTask(t)}
                      className="text-left hover:text-primary transition-colors"
                    >
                      {t.title}
                    </button>
                    {t.blocked_reason && (
                      <div className="text-[10px] text-rose-600 font-medium mt-0.5">{t.blocked_reason}</div>
                    )}
                  </td>
                  <td className="p-3.5 text-muted-foreground">{t.department_name || "—"}</td>
                  <td className="p-3.5 text-muted-foreground">{t.owner_name || "Unassigned"}</td>
                  <td className="p-3.5">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="p-3.5">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="p-3.5 text-muted-foreground">
                    {new Date(t.deadline).toLocaleDateString()}
                  </td>
                  <td className="p-3.5 text-right">
                    {t.status !== "verified_complete" && (
                      <button
                        type="button"
                        onClick={() => handleVerifyComplete(t.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      >
                        Verify Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Detail Drawer (§6.3) */}
      {selectedTask && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-card border-l border-border shadow-2xl p-6 flex flex-col overflow-y-auto animate-in slide-in-from-right">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase">Task Specification</span>
            <button
              onClick={() => setSelectedTask(null)}
              className="p-1 rounded text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-5 py-4 flex-1">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <PriorityBadge priority={selectedTask.priority} />
                <StatusBadge status={selectedTask.status} />
              </div>
              <h3 className="text-base font-bold text-foreground">{selectedTask.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {selectedTask.description || "No extended description provided."}
              </p>
            </div>

            {selectedTask.blocked_reason && (
              <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
                <span className="font-bold block mb-0.5">Blocking Rule Violation:</span>
                {selectedTask.blocked_reason}
              </div>
            )}

            {/* Evidence Requirements */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Mandatory Evidence Requirements</span>
              </h4>
              {selectedTask.evidence_requirements?.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">No evidence required.</div>
              ) : (
                <div className="space-y-1.5">
                  {selectedTask.evidence_requirements?.map((ev: any) => (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-lg border border-border bg-secondary/30 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-foreground">{ev.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ev.verification_status === "verified"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/60"
                        }`}
                      >
                        {ev.verification_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dependencies */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prerequisites</h4>
              {selectedTask.dependencies?.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">No preceding prerequisites.</div>
              ) : (
                <div className="space-y-1.5">
                  {selectedTask.dependencies?.map((dep: any) => (
                    <div
                      key={dep.id}
                      className="p-2.5 rounded-lg border border-border bg-secondary/30 text-xs flex items-center justify-between"
                    >
                      <span className="font-medium text-foreground">{dep.depends_on_title || dep.depends_on_task_id}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {dep.is_satisfied ? "Satisfied ✓" : "Unsatisfied"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="pt-4 border-t border-border flex justify-end gap-2">
            {selectedTask.status !== "verified_complete" && (
              <button
                type="button"
                onClick={() => handleVerifyComplete(selectedTask.id)}
                className="w-full py-2 px-4 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors"
              >
                Mark Verified Complete (§8 Rules)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

