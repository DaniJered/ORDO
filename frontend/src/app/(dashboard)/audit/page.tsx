"use client";

import React, { useEffect, useState } from "react";
import { FileText, Shield, User, Filter, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { apiRequest } from "@/lib/api";

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [entityFilter, setEntityFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    const url = entityFilter ? `/audit?entity_type=${entityFilter}` : "/audit";
    const res = await apiRequest(url);
    if (res.success && res.data) {
      setLogs(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Immutable Audit Trail"
        description="Comprehensive audit history of state changes, rule evaluations, evidence verifications, and system actions."
      />

      {/* Filter Bar */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">Filter by Entity:</span>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background"
        >
          <option value="">All Entities</option>
          <option value="task">Tasks</option>
          <option value="evidence_requirement">Evidence</option>
          <option value="approval">Approvals</option>
          <option value="user">Users / Auth</option>
          <option value="system">System / Kill-switch</option>
        </select>
      </div>

      {/* Audit Table */}
      {loading ? (
        <div className="h-64 rounded-2xl bg-secondary animate-pulse" />
      ) : logs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <h3 className="text-sm font-bold text-foreground">No Audit Records</h3>
          <p className="text-xs text-muted-foreground mt-1">Activity logs will appear here as workflows proceed.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-semibold">
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Entity</th>
                <th className="p-3.5">Old Value → New Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="p-3.5">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <User className="w-3 h-3 text-primary" />
                      <span>{log.actor_name}</span>
                    </span>
                  </td>
                  <td className="p-3.5">
                    <code className="text-[11px] font-mono font-bold text-foreground px-1.5 py-0.5 rounded bg-secondary">
                      {log.action}
                    </code>
                  </td>
                  <td className="p-3.5">
                    <span className="capitalize font-semibold text-muted-foreground">
                      {log.entity_type}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2 max-w-md truncate">
                      {log.old_value && (
                        <span className="line-through text-muted-foreground truncate max-w-[120px]">
                          {log.old_value}
                        </span>
                      )}
                      {log.old_value && <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />}
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate max-w-[200px]">
                        {log.new_value || "—"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

