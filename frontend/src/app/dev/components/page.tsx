"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge, TaskStatus } from "@/components/common/StatusBadge";
import { PriorityBadge, Priority } from "@/components/common/PriorityBadge";
import { AIBadge } from "@/components/common/AIBadge";
import { ConfidenceMeter } from "@/components/common/ConfidenceMeter";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { CheckSquare, AlertOctagon, TrendingUp, Sparkles, FolderPlus } from "lucide-react";

export default function ComponentShowcasePage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const statuses: TaskStatus[] = [
    "not_started",
    "in_progress",
    "blocked",
    "completed_pending_evidence",
    "verified_complete",
    "cancelled",
  ];

  const priorities: Priority[] = ["low", "medium", "high", "critical"];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      <PageHeader
        title="ORDO Component Design System Showcase"
        description="Comprehensive developer gallery of all shared UI primitives, state badges, and interactive controls."
        breadcrumb="Developer Tools / Components"
        actions={<ThemeToggle />}
      />

      {/* 1. Status Badges (§9.2) */}
      <section className="p-6 rounded-2xl border border-border bg-card space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">1. StatusBadges (Workflow States)</h2>
          <p className="text-xs text-muted-foreground">Pairing distinct semantic colors with icons and clear labels.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {statuses.map((st) => (
            <StatusBadge key={st} status={st} />
          ))}
        </div>
      </section>

      {/* 2. Priority Badges */}
      <section className="p-6 rounded-2xl border border-border bg-card space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">2. PriorityBadges</h2>
          <p className="text-xs text-muted-foreground">Hierarchy indicators for task sorting and risk escalation.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {priorities.map((pr) => (
            <PriorityBadge key={pr} priority={pr} />
          ))}
        </div>
      </section>

      {/* 3. AI Elements */}
      <section className="p-6 rounded-2xl border border-border bg-card space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">3. AI Elements (Sparkle Accent & Rationale)</h2>
          <p className="text-xs text-muted-foreground">Distinct violet theme ensuring transparency for machine-assisted suggestions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <AIBadge
            confidence={0.96}
            rationale="Grounded in rule engine facts: Task prerequisite 'Auditorium Clearance' is not marked Verified Complete."
          />
          <ConfidenceMeter score={0.94} label="Extraction Match" />
          <ConfidenceMeter score={0.78} label="Heuristic Score" />
          <ConfidenceMeter score={0.52} label="Low Certainty" />
        </div>
      </section>

      {/* 4. StatCards */}
      <section className="p-6 rounded-2xl border border-border bg-card space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">4. StatCards</h2>
          <p className="text-xs text-muted-foreground">Executive metric highlights with optional trends and semantic accents.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Readiness"
            value="82.4%"
            subtitle="Multi-factor score"
            trend={{ value: "+4.2%", isPositive: true }}
            highlightColor="green"
          />
          <StatCard
            title="Blocked Tasks"
            value={2}
            subtitle="Dependencies held"
            trend={{ value: "+1", isPositive: false }}
            highlightColor="red"
          />
          <StatCard
            title="Pending Evidence"
            value={3}
            subtitle="Uploads in review"
            highlightColor="amber"
          />
          <StatCard
            title="AI Invocations"
            value={42}
            subtitle="Deterministic runs"
            highlightColor="purple"
          />
        </div>
      </section>

      {/* 5. Empty State */}
      <section className="p-6 rounded-2xl border border-border bg-card space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">5. EmptyState</h2>
          <p className="text-xs text-muted-foreground">Contextual guidance with clear next-action prompt.</p>
        </div>
        <EmptyState
          title="No Tasks Found in Department"
          description="Create your first task or use the Smart Task Builder to automatically generate a schedule."
          icon={<FolderPlus className="w-8 h-8 text-primary" />}
          action={{
            label: "Create Starter Task",
            onClick: () => alert("Triggered creation action"),
          }}
        />
      </section>

      {/* 6. Interactive Confirm Dialog */}
      <section className="p-6 rounded-2xl border border-border bg-card space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">6. ConfirmDialog (Modal Primitive)</h2>
          <p className="text-xs text-muted-foreground">Accessible action confirmation before sensitive mutations.</p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90"
        >
          Open Test Dialog
        </button>

        <ConfirmDialog
          isOpen={dialogOpen}
          title="Engage Global Kill-Switch?"
          message="This will immediately suspend all automated background jobs and outbound dispatches across all active college events."
          confirmLabel="Engage Emergency Pause"
          isDestructive={true}
          onConfirm={() => {
            setDialogOpen(false);
            alert("Kill switch engaged!");
          }}
          onCancel={() => setDialogOpen(false)}
        />
      </section>
    </div>
  );
}

