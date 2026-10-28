"use client";

import React, { useEffect, useState } from "react";
import { Settings, ShieldAlert, Sparkles, Flag, Activity, CheckCircle2, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { apiRequest } from "@/lib/api";

export default function SettingsPage() {
  const [system, setSystem] = useState<any>(null);
  const [flags, setFlags] = useState<any[]>([]);
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [sysRes, flagsRes, aiRes] = await Promise.all([
      apiRequest("/settings/system"),
      apiRequest("/settings/feature-flags"),
      apiRequest("/ai/usage"),
    ]);
    if (sysRes.success) setSystem(sysRes.data);
    if (flagsRes.success) setFlags(flagsRes.data || []);
    if (aiRes.success) setAiUsage(aiRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleKillSwitch = async () => {
    const current = Boolean(system?.kill_switch_active);
    const res = await apiRequest("/settings/system/kill-switch", {
      method: "POST",
      body: JSON.stringify({ active: !current, reason: "Coordinator manual trigger" }),
    });
    if (res.success) {
      fetchData();
    }
  };

  const handleToggleFlag = async (key: string, current: boolean) => {
    const res = await apiRequest(`/settings/feature-flags/${key}`, {
      method: "PATCH",
      body: JSON.stringify({ is_enabled: !current }),
    });
    if (res.success) {
      fetchData();
    }
  };

  if (loading) {
    return <div className="p-8 text-xs text-muted-foreground">Loading system settings...</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Settings & System Controls"
        description="System policies, automation kill-switch, feature flags, and AI usage telemetry."
      />

      {/* Kill Switch Card (§10 item 9 & §11) */}
      <div className={`p-6 rounded-2xl border ${system?.kill_switch_active ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40' : 'border-border bg-card'} shadow-sm space-y-4`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${system?.kill_switch_active ? 'bg-rose-600 text-white' : 'bg-secondary text-muted-foreground'}`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Global Automation Kill-Switch</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Immediately pause all scheduled background tasks, escalation jobs, and outbound email/WhatsApp dispatches.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleKillSwitch}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              system?.kill_switch_active
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-rose-600 text-white hover:bg-rose-700"
            }`}
          >
            {system?.kill_switch_active ? "Deactivate Kill-Switch" : "Engage Kill-Switch"}
          </button>
        </div>
      </div>

      {/* AI Usage & Cost Panel (§5.5 item 8) */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold text-foreground">AI Runs, Latency & Cost Tracking</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total AI Invocations"
            value={aiUsage?.metrics?.total_runs || 0}
            subtitle="Copilot & Task Builder"
          />
          <StatCard
            title="Avg Latency"
            value={`${aiUsage?.metrics?.avg_latency_ms || 0}ms`}
            subtitle="Execution duration"
          />
          <StatCard
            title="Tokens Processed"
            value={aiUsage?.metrics?.total_tokens?.toLocaleString() || 0}
            subtitle="Estimated LLM usage"
          />
          <StatCard
            title="Estimated Cost"
            value={`$${aiUsage?.metrics?.total_cost || 0}`}
            subtitle="Provider cost metrics"
            icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
          />
        </div>
      </div>

      {/* Feature Flags (§4 & §12) */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-foreground">Feature Flags & Gradual Rollouts</h3>
        </div>

        <div className="divide-y divide-border">
          {flags.map((flag) => (
            <div key={flag.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{flag.name}</span>
                  <code className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                    {flag.key}
                  </code>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{flag.description}</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFlag(flag.key, flag.is_enabled)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  flag.is_enabled ? "bg-primary" : "bg-secondary"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                    flag.is_enabled ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

