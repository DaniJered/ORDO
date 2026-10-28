"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { AIBadge } from "@/components/common/AIBadge";
import { apiRequest } from "@/lib/api";

interface EventItem {
  id: string;
  name: string;
}

interface ReadinessData {
  event_id: string;
  event_name: string;
  readiness_score: number;
  risk_level: "Low" | "Medium" | "High";
  components: {
    task_score: number;
    evidence_score: number;
    dependency_score: number;
    overdue_penalty: number;
  };
  summary: {
    total_tasks: number;
    completed_tasks: number;
    blocked_tasks: number;
    overdue_tasks: number;
    total_evidence: number;
    verified_evidence: number;
  };
  top_risks: Array<{
    task_id: string;
    title: string;
    status: string;
    priority: string;
    is_overdue: boolean;
    is_blocked: boolean;
    blocked_reason?: string;
  }>;
  ai_recommendation: string;
}

interface DepartmentRisk {
  department_id: string;
  department_name: string;
  total_tasks: number;
  completed_tasks: number;
  blocked_tasks: number;
  overdue_tasks: number;
  risk_level: "Low" | "Medium" | "High";
  completion_percentage: number;
}

export default function ReportsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [deptRisks, setDeptRisks] = useState<DepartmentRisk[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchReportData(selectedEventId);
    }
  }, [selectedEventId]);

  async function fetchEvents() {
    const res = await apiRequest<EventItem[]>("/events");
    if (res.success && res.data && res.data.length > 0) {
      setEvents(res.data);
      setSelectedEventId(res.data[0].id);
    }
  }

  async function fetchReportData(eventId: string) {
    setLoading(true);
    const [readinessRes, deptRes] = await Promise.all([
      apiRequest<ReadinessData>(`/reports/readiness/${eventId}`),
      apiRequest<DepartmentRisk[]>(`/reports/department-risks/${eventId}`),
    ]);
    setLoading(false);

    if (readinessRes.success && readinessRes.data) {
      setReadiness(readinessRes.data);
    }
    if (deptRes.success && deptRes.data) {
      setDeptRisks(deptRes.data);
    }
  }

  const handleExportCSV = () => {
    if (!selectedEventId) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("ordo_token") : null;
    const url = `http://localhost:8000/api/v1/reports/export/csv/${selectedEventId}`;
    window.open(url, "_blank");
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-500 border-emerald-500";
    if (score >= 50) return "text-amber-500 border-amber-500";
    return "text-rose-500 border-rose-500";
  };

  const getRiskBadge = (level: "Low" | "Medium" | "High") => {
    if (level === "Low") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          LOW RISK
        </span>
      );
    }
    if (level === "Medium") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          MODERATE RISK
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
        CRITICAL RISK
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Reports & Readiness Intelligence"
        description="Comprehensive algorithmic event delivery scoring, cross-department risk modeling, and compliance export."
        actions={
          <div className="flex items-center gap-3">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold focus:outline-none"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Workflow CSV</span>
            </button>
          </div>
        }
      />

      {loading && (
        <div className="p-8 text-center bg-card border border-border rounded-xl text-muted-foreground text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          <span>Calculating event readiness and departmental risk metrics...</span>
        </div>
      )}

      {readiness && !loading && (
        <>
          {/* Main Readiness Gauge and Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Big Circular Gauge Card (5 cols) */}
            <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Overall Event Readiness Score
              </div>

              {/* Big Score Ring */}
              <div className="relative w-44 h-44 rounded-full border-8 border-secondary flex items-center justify-center mb-4">
                <div
                  className={`absolute inset-0 rounded-full border-8 border-t-transparent ${getScoreColor(
                    readiness.readiness_score
                  )} transition-all duration-700`}
                />
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-black text-foreground tracking-tight">
                    {readiness.readiness_score}%
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    ALGORITHMIC RATING
                  </span>
                </div>
              </div>

              <div className="mb-2">{getRiskBadge(readiness.risk_level)}</div>
              <p className="text-xs text-muted-foreground max-w-xs">
                Score based on verified tasks, evidence completeness, and unblocked milestone chains.
              </p>
            </div>

            {/* Right Weighted Sub-components Card (7 cols) */}
            <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-bold text-sm text-foreground mb-1">
                  Readiness Score Mathematical Breakdown (§14 & DEC-003)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Formula: 40% Verified Tasks + 35% Evidence Verified + 25% Unblocked Paths - Overdue Penalties
                </p>
              </div>

              <div className="space-y-4">
                {/* 1. Tasks Component (40%) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> Task Verification (40% Max)
                    </span>
                    <span className="font-bold text-foreground font-mono">
                      {readiness.components.task_score} / 40.0 pts ({readiness.summary.completed_tasks}/
                      {readiness.summary.total_tasks} tasks)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${(readiness.components.task_score / 40) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 2. Evidence Component (35%) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Evidence Completeness (35% Max)
                    </span>
                    <span className="font-bold text-foreground font-mono">
                      {readiness.components.evidence_score} / 35.0 pts ({readiness.summary.verified_evidence}/
                      {readiness.summary.total_evidence} artifacts)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${(readiness.components.evidence_score / 35) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 3. Dependency Graph Health (25%) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-500" /> Dependency Graph Health (25% Max)
                    </span>
                    <span className="font-bold text-foreground font-mono">
                      {readiness.components.dependency_score} / 25.0 pts (
                      {readiness.summary.total_tasks - readiness.summary.blocked_tasks} unblocked)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${(readiness.components.dependency_score / 25) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Overdue Penalty */}
                {readiness.components.overdue_penalty > 0 && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-400 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="w-4 h-4" /> Overdue Milestones Penalty Applied:
                    </div>
                    <span className="font-bold font-mono">-{readiness.components.overdue_penalty} pts</span>
                  </div>
                )}
              </div>

              {/* AI Strategic Recommendation Box */}
              <div className="p-3.5 rounded-xl bg-secondary/30 border border-border text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-foreground block mb-0.5">ORDO AI Strategic Radar</span>
                  <p className="text-muted-foreground leading-relaxed">
                    {readiness.ai_recommendation}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Department Risk Distribution Grid */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" />
              <span>Departmental Risk Modeling</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {deptRisks.map((d) => (
                <div
                  key={d.department_id}
                  className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-foreground">{d.department_name}</div>
                      <div className="text-[11px] text-muted-foreground">{d.total_tasks} Total Milestones</div>
                    </div>
                    {getRiskBadge(d.risk_level)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Completion</span>
                      <span className="font-bold text-foreground">{d.completion_percentage}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${d.completion_percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border text-muted-foreground">
                    <span className={d.blocked_tasks > 0 ? "text-amber-500 font-semibold" : ""}>
                      {d.blocked_tasks} Blocked
                    </span>
                    <span className={d.overdue_tasks > 0 ? "text-rose-500 font-semibold" : ""}>
                      {d.overdue_tasks} Overdue
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 Critical Path Bottlenecks Table */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden space-y-3 p-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="font-bold text-sm text-foreground">Top Critical Bottlenecks & Overdue Tasks</h3>
              </div>
              <Link
                href="/tasks"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>View Full Task Board</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/40 text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-2.5">Task Title</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Risk Flag</th>
                    <th className="p-2.5">Bottleneck / Dependency Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {readiness.top_risks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        No critical bottlenecks or overdue milestones detected! Event delivery is healthy.
                      </td>
                    </tr>
                  ) : (
                    readiness.top_risks.map((t) => (
                      <tr key={t.task_id} className="hover:bg-secondary/20 transition-colors">
                        <td className="p-2.5 font-semibold text-foreground">{t.title}</td>
                        <td className="p-2.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              t.status === "blocked"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {t.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {t.is_overdue && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 mr-1.5">
                              OVERDUE
                            </span>
                          )}
                          {t.is_blocked && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                              BLOCKED
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-muted-foreground italic text-[11px]">
                          {t.blocked_reason || "Milestone deadline has elapsed without sign-off."}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

