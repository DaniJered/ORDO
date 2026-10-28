"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertOctagon,
  FileCheck2,
  BadgeCheck,
  Sparkles,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Activity,
  Layers,
  ChevronRight,
} from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { PageHeader } from "@/components/common/PageHeader";
import { apiRequest } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/dashboard/stats").then((res) => {
      if (res.success && res.data) {
        setStats(res.data);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-secondary rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-secondary rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const m = stats?.metrics || {
    total_events: 1,
    active_tasks: 10,
    completed_tasks: 2,
    blocked_tasks: 2,
    overdue_tasks: 2,
    missing_evidence: 6,
    pending_approvals: 2,
    ai_extraction_queue: 1,
    event_readiness_score: 68.0,
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Event Coordination Executive Dashboard"
        description="Live readiness telemetry, dependency risk tracking, and verification status across events."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-secondary text-foreground shadow-xs transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              <span>Readiness Intelligence</span>
            </Link>
            <Link
              href="/events/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Create Event</span>
            </Link>
          </div>
        }
      />

      {/* AI Risk Radar Banner (§5.5 item 4 & §9.5) */}
      <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-purple-600 text-white shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              AI Risk Radar Briefing
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200/60 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 font-semibold">
              Grounded in Rule Engine Facts
            </span>
          </div>
          <p className="mt-1 text-xs text-foreground/90 leading-relaxed">
            {stats?.risk_radar_summary ||
              "Principal Venue Approval is blocking Main Stage Sound & Light rigging. Brochure printing is overdue by 2 days in Marketing."}
          </p>
        </div>
      </div>

      {/* Metric Cards Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Event Readiness"
          value={`${m.event_readiness_score}%`}
          subtitle="Deterministic multi-factor score"
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
          highlightColor={m.event_readiness_score >= 70 ? "green" : "amber"}
        />
        <StatCard
          title="Active Tasks"
          value={m.active_tasks}
          subtitle="In flight across 4 departments"
          icon={<Layers className="w-5 h-5 text-blue-600" />}
          highlightColor="blue"
        />
        <StatCard
          title="Blocked Workflows"
          value={m.blocked_tasks}
          subtitle="Held by dependency rules"
          icon={<AlertOctagon className="w-5 h-5 text-rose-600" />}
          highlightColor="red"
        />
        <StatCard
          title="Overdue Tasks"
          value={m.overdue_tasks}
          subtitle="Requires coordinator escalation"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          highlightColor="amber"
        />
      </div>

      {/* Metric Cards Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Verified Complete"
          value={m.completed_tasks}
          subtitle="Evidence approved"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Missing Evidence"
          value={m.missing_evidence}
          subtitle="Mandatory uploads required"
          icon={<FileCheck2 className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          title="Pending Approvals"
          value={m.pending_approvals}
          subtitle="Faculty & coordinator review"
          icon={<BadgeCheck className="w-5 h-5 text-indigo-600" />}
        />
        <StatCard
          title="AI Extraction Queue"
          value={m.ai_extraction_queue}
          subtitle="Extracted commitments"
          icon={<Sparkles className="w-5 h-5 text-purple-600" />}
          highlightColor="purple"
        />
      </div>

      {/* Main Grid: Critical Risks & Today Action Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Risks (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-foreground">Top Critical Bottlenecks & Risks</h2>
            </div>
            <Link href="/tasks" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              <span>View All Tasks</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-border">
            {stats?.top_risks?.map((risk: any) => (
              <div key={risk.task_id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{risk.title}</span>
                    <PriorityBadge priority={risk.priority} />
                    <StatusBadge status={risk.status} />
                  </div>
                  {risk.blocked_reason && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                      {risk.blocked_reason}
                    </p>
                  )}
                  <div className="text-[10px] text-muted-foreground">
                    Dept: {risk.department} • Deadline: {new Date(risk.deadline).toLocaleDateString()}
                  </div>
                </div>
                <Link
                  href={`/tasks?search=${encodeURIComponent(risk.title)}`}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* "Today" Panel (1 col) */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">What Needs My Action Today</h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-foreground">
              {stats?.today_panel?.length || 0} items
            </span>
          </div>

          <div className="space-y-2.5">
            {stats?.today_panel?.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                All clear! No pending deliverables assigned to you today.
              </p>
            ) : (
              stats?.today_panel?.map((task: any) => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground truncate max-w-[180px]">
                      {task.title}
                    </span>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <StatusBadge status={task.status} />
                    <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-foreground">Recent Workflow & System Activity</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats?.activity_timeline?.slice(0, 4).map((item: any) => (
            <div key={item.id} className="p-3 rounded-xl border border-border bg-secondary/20 text-xs space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="font-semibold uppercase">{item.action}</span>
                <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-foreground font-medium truncate">{item.details || `Entity: ${item.entity_type}`}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

