"use client";

import React, { useEffect, useState } from "react";
import { BadgeCheck, CheckCircle2, XCircle, AlertCircle, Clock, Filter, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { apiRequest } from "@/lib/api";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  const fetchApprovals = async () => {
    const url = filterStatus ? `/approvals?status=${filterStatus}` : "/approvals";
    const res = await apiRequest(url);
    if (res.success && res.data) {
      setApprovals(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApprovals();
  }, [filterStatus]);

  const handleDecide = async (id: string, action: "approve" | "reject") => {
    if (action === "reject" && (!rejectComment || !rejectComment.trim())) {
      alert("Rejection requires a mandatory explanation comment (§8 Rule 6).");
      return;
    }

    const res = await apiRequest(`/approvals/${id}/decide`, {
      method: "POST",
      body: JSON.stringify({
        action,
        comments: action === "reject" ? rejectComment : "Approved by faculty coordinator",
      }),
    });

    if (res.success) {
      setRejectId(null);
      setRejectComment("");
      fetchApprovals();
    } else {
      alert("Failed to record approval: " + (res.error?.message || "Unknown error"));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals & Sign-off Queue"
        description="Authorize critical requirements, budget disbursements, and final readiness milestones."
      />

      {/* Filter Tabs */}
      <div className="flex border-b border-border gap-4">
        {["pending", "approved", "rejected", ""].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilterStatus(st)}
            className={`pb-3 text-xs font-bold capitalize border-b-2 transition-colors ${
              filterStatus === st
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {st || "All Approvals"}
          </button>
        ))}
      </div>

      {/* Approvals Table */}
      {loading ? (
        <div className="h-64 rounded-2xl bg-secondary animate-pulse" />
      ) : approvals.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card">
          <BadgeCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <h3 className="text-sm font-bold text-foreground">No Approvals in Queue</h3>
          <p className="text-xs text-muted-foreground mt-1">All verification items have been processed.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-semibold">
                <th className="p-3.5">Type & Entity</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Comments</th>
                <th className="p-3.5">Requested At</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {approvals.map((a) => (
                <tr key={a.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="p-3.5">
                    <span className="font-bold text-foreground capitalize block">{a.entity_type}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{a.entity_id}</span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        a.status === "approved"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60"
                          : a.status === "rejected"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/60"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-muted-foreground max-w-xs truncate">
                    {a.comments || "No comments attached"}
                  </td>
                  <td className="p-3.5 text-muted-foreground">
                    {new Date(a.requested_at).toLocaleDateString()}
                  </td>
                  <td className="p-3.5 text-right">
                    {a.status === "pending" ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecide(a.id, "approve")}
                          className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectId(a.id)}
                          className="px-3 py-1 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 font-bold text-[11px] hover:bg-rose-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-semibold text-muted-foreground">Decided</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-card border border-border rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Reject Approval Request</h3>
            <p className="text-xs text-muted-foreground">
              Provide a clear reason for rejection. This will reopen the requirement or task for remediation (§8 Rule 6).
            </p>
            <textarea
              rows={3}
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="e.g. Budget quotation missing vendor GST verification..."
              className="w-full p-2.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectId(null);
                  setRejectComment("");
                }}
                className="px-3 py-1.5 rounded-lg border border-border text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDecide(rejectId, "reject")}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

