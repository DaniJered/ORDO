"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  Calendar,
  Layers,
  Database,
  Sliders,
  AlertOctagon,
  CheckCircle,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { apiRequest } from "@/lib/api";

interface JobInfo {
  name: string;
  title: string;
  description: string;
  schedule: string;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
}

interface AutomationLogEntry {
  id: string;
  job_name: string;
  trigger_time?: string;
  status: "success" | "failure" | "paused";
  result?: string;
  error_message?: string;
  actor: string;
  created_at: string;
}

export default function AutomationPage() {
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [logs, setLogs] = useState<AutomationLogEntry[]>([]);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [actionAlert, setActionAlert] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchAutomationData();
  }, []);

  async function fetchAutomationData() {
    setLoading(true);
    const [jobsRes, logsRes] = await Promise.all([
      apiRequest<{ jobs: JobInfo[]; kill_switch_active: boolean }>("/automation/jobs"),
      apiRequest<AutomationLogEntry[]>("/automation/logs?limit=30"),
    ]);
    setLoading(false);

    if (jobsRes.success && jobsRes.data) {
      setJobs(jobsRes.data.jobs);
      setKillSwitchActive(jobsRes.data.kill_switch_active);
    }
    if (logsRes.success && logsRes.data) {
      setLogs(logsRes.data);
    }
  }

  async function handleToggleKillSwitch() {
    const newState = !killSwitchActive;
    const res = await apiRequest("/automation/kill-switch", {
      method: "POST",
      body: JSON.stringify({ enabled: newState }),
    });

    if (res.success && res.data) {
      setKillSwitchActive(res.data.kill_switch_active);
      setActionAlert({
        type: newState ? "warning" : "success",
        text: res.data.message || (newState ? "Kill-switch enabled." : "Kill-switch disabled."),
      });
      await fetchAutomationData();
    } else {
      setActionAlert({
        type: "error",
        text: res.error?.message || "Failed to update kill-switch.",
      });
    }
  }

  async function handleRunNow(jobName: string) {
    setRunningJob(jobName);
    setActionAlert(null);

    const res = await apiRequest(`/automation/jobs/${jobName}/run`, {
      method: "POST",
    });

    setRunningJob(null);

    if (res.success && res.data) {
      setActionAlert({
        type: res.data.status === "success" ? "success" : "error",
        text: `Job '${jobName}' completed in ${res.data.duration_ms}ms with status: ${res.data.status.toUpperCase()}.`,
      });
      await fetchAutomationData();
    } else {
      setActionAlert({
        type: "error",
        text: res.error?.message || `Execution of ${jobName} failed.`,
      });
    }
  }

  const filteredLogs = logs.filter((log) => {
    if (statusFilter === "all") return true;
    return log.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automation Control Room"
        description="Monitor automated background workers, proactive deadline monitors, SLA escalation alerts, and emergency override switches."
        actions={
          <button
            onClick={fetchAutomationData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh State</span>
          </button>
        }
      />

      {/* Action Notification Alert */}
      {actionAlert && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between border ${
            actionAlert.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : actionAlert.type === "warning"
              ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
              : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionAlert.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span>{actionAlert.text}</span>
          </div>
          <button onClick={() => setActionAlert(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Prominent Global Kill-Switch Card (§10 Rule 9) */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          killSwitchActive
            ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
            : "bg-card border-border text-foreground"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-xl ${
                killSwitchActive
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {killSwitchActive ? (
                <AlertOctagon className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Global Automation Kill-Switch</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    killSwitchActive
                      ? "bg-rose-600 text-white"
                      : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  {killSwitchActive ? "ENGAGED / SUSPENDED" : "NORMAL / OPERATIONAL"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                {killSwitchActive
                  ? "Emergency stop active: Outbound communication dispatch, WhatsApp messages, and automated escalations are paused across the entire system."
                  : "When engaged, the kill-switch pauses all scheduled outbound alerts, automated emails, and WhatsApp dispatches with zero data loss."}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleKillSwitch}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors shrink-0 shadow-sm ${
              killSwitchActive
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-rose-600 hover:bg-rose-700 text-white"
            }`}
          >
            {killSwitchActive ? "Resume All Automation" : "Engage Emergency Kill-Switch"}
          </button>
        </div>
      </div>

      {/* Registered Background Jobs Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span>Registered Scheduled Background Jobs</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary font-mono">{jobs.length}</span>
          </h2>
          <span className="text-[11px] text-muted-foreground">Deterministic RPA Engine</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <div
              key={job.name}
              className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-bold text-sm text-foreground">{job.title}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                    {job.schedule}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {job.description}
                </p>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Last: {job.last_run_at ? new Date(job.last_run_at).toLocaleTimeString() : "Never"}
                  </span>
                </div>

                <button
                  onClick={() => handleRunNow(job.name)}
                  disabled={runningJob === job.name}
                  className="px-2.5 py-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[11px] transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50"
                >
                  {runningJob === job.name ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Run Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Execution History Log Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">Execution History & Audit Log</h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-secondary/50 border border-border rounded-lg px-2.5 py-1 text-foreground focus:outline-none"
            >
              <option value="all">All Logs</option>
              <option value="success">Success Only</option>
              <option value="failure">Failure Only</option>
              <option value="paused">Paused Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-muted-foreground font-semibold">
              <tr>
                <th className="p-2.5">Job Name</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Triggered By</th>
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">Execution Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No execution logs recorded yet. Use &quot;Run Now&quot; on any job above to trigger execution.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-2.5 font-semibold text-foreground font-mono">
                      {log.job_name}
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          log.status === "success"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : log.status === "paused"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-muted-foreground truncate max-w-[120px]">
                      {log.actor}
                    </td>
                    <td className="p-2.5 text-muted-foreground font-mono text-[11px]">
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString() : "—"}
                    </td>
                    <td className="p-2.5 text-muted-foreground font-mono text-[11px] truncate max-w-xs">
                      {log.error_message || log.result || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

