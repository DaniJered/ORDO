"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Users,
  CheckSquare,
  Network,
  FileCheck2,
  MessageSquare,
  BarChart3,
  Settings,
  Plus,
  Clock,
  AlertOctagon,
  TrendingUp,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { StatCard } from "@/components/common/StatCard";
import { DependencyGraph } from "@/components/workflow/DependencyGraph";
import { EvidenceUploadModal } from "@/components/workflow/EvidenceUploadModal";
import { apiRequest } from "@/lib/api";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // Evidence Modal state
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);

  const fetchData = async () => {
    const [eventRes, tasksRes] = await Promise.all([
      apiRequest(`/events/${eventId}`),
      apiRequest(`/tasks?event_id=${eventId}`),
    ]);
    if (eventRes.success) setEvent(eventRes.data);
    if (tasksRes.success) setTasks(tasksRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [eventId]);

  if (loading || !event) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Loading event details...</div>;
  }

  // Flatten evidence requirements across all tasks
  const allEvidenceRequirements: any[] = [];
  tasks.forEach((t) => {
    if (t.evidence_requirements) {
      t.evidence_requirements.forEach((req: any) => {
        allEvidenceRequirements.push({
          ...req,
          task_id: t.id,
          task_title: t.title,
          department_name: t.department_name,
        });
      });
    }
  });

  const tabs = [
    { key: "overview", label: "Overview", icon: Calendar },
    { key: "tasks", label: "Tasks", count: tasks.length, icon: CheckSquare },
    { key: "dependency_map", label: "Dependency Map", icon: Network },
    { key: "evidence", label: "Evidence", count: allEvidenceRequirements.length, icon: FileCheck2 },
    { key: "people", label: "Event Team", count: event.team?.length || 0, icon: Users },
    { key: "communications", label: "Communications", icon: MessageSquare, comingSoon: true },
    { key: "reports", label: "Reports", icon: BarChart3, comingSoon: true },
    { key: "settings", label: "Settings", icon: Settings, comingSoon: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.name}
        description={event.description}
        breadcrumb="Events / Detail"
        actions={
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                event.status === "active"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {event.status}
            </span>
          </div>
        }
      />

      {/* Tabs Header */}
      <div className="flex border-b border-border overflow-x-auto gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary">
                  {tab.count}
                </span>
              )}
              {tab.comingSoon && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground">
                  Phase 3
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Readiness Score"
              value={`${event.readiness_score}%`}
              subtitle="Deterministic score"
              highlightColor="green"
            />
            <StatCard
              title="Total Tasks"
              value={event.metrics?.total_tasks || 0}
              subtitle="Planned deliverables"
              highlightColor="blue"
            />
            <StatCard
              title="Blocked Tasks"
              value={event.metrics?.blocked || 0}
              subtitle="Prerequisites incomplete"
              highlightColor="red"
            />
            <StatCard
              title="Overdue Tasks"
              value={event.metrics?.overdue || 0}
              subtitle="Behind schedule"
              highlightColor="amber"
            />
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
            <h3 className="text-sm font-bold text-foreground">Event Logistics Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block mb-0.5">Venue</span>
                <span className="font-semibold text-foreground">{event.venue || "TBD"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Start Time</span>
                <span className="font-semibold text-foreground">
                  {new Date(event.start_datetime).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Expected Footfall</span>
                <span className="font-semibold text-foreground">{event.expected_attendance} people</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Budget Allocation</span>
                <span className="font-semibold text-foreground">₹{event.budget_estimate?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-card divide-y divide-border">
            {tasks.map((task) => (
              <div key={task.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{task.title}</span>
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
                  </div>
                  {task.blocked_reason && (
                    <p className="text-xs text-rose-600 font-medium">{task.blocked_reason}</p>
                  )}
                  <div className="text-[10px] text-muted-foreground">
                    Dept: {task.department_name || "General"} • Owner: {task.owner_name || "Unassigned"} • Due:{" "}
                    {new Date(task.deadline).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-xs font-bold tabular-nums text-muted-foreground">
                  {task.progress_percentage}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependency Map Tab (Activated in Phase 2!) */}
      {activeTab === "dependency_map" && (
        <div className="space-y-4">
          <DependencyGraph tasks={tasks} />
        </div>
      )}

      {/* Evidence Requirements Tab (Activated in Phase 2!) */}
      {activeTab === "evidence" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-semibold">
                  <th className="p-3.5">Requirement Name</th>
                  <th className="p-3.5">Linked Task</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Mandatory</th>
                  <th className="p-3.5">Verification Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allEvidenceRequirements.map((req) => (
                  <tr key={req.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-3.5 font-bold text-foreground">
                      {req.name}
                      {req.rejection_reason && (
                        <div className="text-[10px] text-rose-600 font-normal mt-0.5">
                          Rejected: {req.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-muted-foreground">{req.task_title}</td>
                    <td className="p-3.5 text-muted-foreground">{req.department_name || "General"}</td>
                    <td className="p-3.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-secondary">
                        {req.mandatory ? "Mandatory" : "Optional"}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          req.verification_status === "verified"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60"
                            : req.verification_status === "rejected"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/60"
                        }`}
                      >
                        {req.verification_status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReq(req);
                          setEvidenceModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 flex items-center gap-1.5 ml-auto"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload / Review</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "people" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {event.team?.map((member: any) => (
            <div key={member.participant_id} className="p-4 rounded-xl border border-border bg-card flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-sm">
                {member.full_name?.charAt(0)}
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">{member.full_name}</h4>
                <p className="text-[11px] text-muted-foreground">{member.email}</p>
                <span className="text-[10px] font-semibold uppercase text-primary mt-1 inline-block">
                  {member.role_in_event?.replace("_", " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Coming Soon Placeholders */}
      {["communications", "reports", "settings"].includes(activeTab) && (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card space-y-2">
          <div className="text-sm font-bold text-foreground capitalize">
            {activeTab.replace("_", " ")} Module
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            This module interface is scaffolded and will be activated in Phase 3 / Phase 4 per the ORDO Roadmap.
          </p>
          <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary text-primary">
            Feature Flag Gated
          </span>
        </div>
      )}

      {/* Evidence Upload & Review Modal */}
      {selectedReq && (
        <EvidenceUploadModal
          isOpen={evidenceModalOpen}
          onClose={() => setEvidenceModalOpen(false)}
          requirement={selectedReq}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
