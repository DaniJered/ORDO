"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Mail,
  Smartphone,
  RefreshCw,
  Plus,
  ThumbsUp,
  SlidersHorizontal,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { AIBadge } from "@/components/common/AIBadge";
import { apiRequest } from "@/lib/api";

interface CommunicationDraft {
  id: string;
  event_id: string;
  task_id?: string;
  recipient_name?: string;
  recipient_email?: string;
  recipient_phone?: string;
  channel: "email" | "whatsapp";
  subject: string;
  body: string;
  tone: string;
  approval_status: "draft" | "approved" | "rejected";
  approved_by_user_id?: string;
  dispatch_status: "pending" | "sent" | "failed";
  dispatched_at?: string;
  created_at: string;
}

export default function CommunicationsPage() {
  const [drafts, setDrafts] = useState<CommunicationDraft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<CommunicationDraft | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [adjustingTone, setAdjustingTone] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Draft Dialog State
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState("Dean of Student Affairs");
  const [newRecipientEmail, setNewRecipientEmail] = useState("dean.affairs@college.edu");
  const [newRecipientPhone, setNewRecipientPhone] = useState("+919876543210");
  const [newChannel, setNewChannel] = useState<"email" | "whatsapp">("email");
  const [newTone, setNewTone] = useState("polite");
  const [newReason, setNewReason] = useState("Requesting expedited sign-off for Main Auditorium stage electrical clearance.");
  const [creatingDraft, setCreatingDraft] = useState(false);

  useEffect(() => {
    fetchDrafts();
  }, []);

  async function fetchDrafts() {
    setLoading(true);
    const res = await apiRequest<CommunicationDraft[]>("/communications");
    setLoading(false);
    if (res.success && res.data) {
      setDrafts(res.data);
      if (res.data.length > 0 && !selectedDraft) {
        setSelectedDraft(res.data[0]);
      }
    }
  }

  async function handleAdjustTone(targetTone: "shorter" | "firmer" | "friendlier") {
    if (!selectedDraft) return;
    setAdjustingTone(true);
    setActionMessage(null);

    const res = await apiRequest("/ai/adjust-tone", {
      method: "POST",
      body: JSON.stringify({
        current_subject: selectedDraft.subject,
        current_body: selectedDraft.body,
        target_tone: targetTone,
        channel: selectedDraft.channel,
      }),
    });

    setAdjustingTone(false);

    if (res.success && res.data) {
      const updated = {
        ...selectedDraft,
        subject: res.data.subject,
        body: res.data.body,
        tone: targetTone,
        approval_status: "draft" as const, // Must re-approve if tone was rewritten
      };
      setSelectedDraft(updated);
      setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setActionMessage({
        type: "success",
        text: `Tone adjusted to "${targetTone}". Requires approval before dispatch.`,
      });
    } else {
      setActionMessage({
        type: "error",
        text: res.error?.message || "Failed to adjust tone.",
      });
    }
  }

  async function handleApprove(draftId: string) {
    setActionMessage(null);
    const res = await apiRequest(`/communications/${draftId}/approve`, {
      method: "POST",
    });

    if (res.success) {
      setActionMessage({ type: "success", text: "Communication draft approved! Ready to dispatch." });
      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, approval_status: "approved" } : d))
      );
      if (selectedDraft?.id === draftId) {
        setSelectedDraft({ ...selectedDraft, approval_status: "approved" });
      }
    } else {
      setActionMessage({ type: "error", text: res.error?.message || "Approval failed." });
    }
  }

  async function handleDispatch(draftId: string) {
    setActionMessage(null);
    const res = await apiRequest(`/communications/${draftId}/send`, {
      method: "POST",
    });

    if (res.success) {
      setActionMessage({
        type: "success",
        text: `Message dispatched successfully via ${selectedDraft?.channel.toUpperCase()}! Logged in audit trail.`,
      });
      const now = new Date().toISOString();
      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, dispatch_status: "sent", dispatched_at: now } : d))
      );
      if (selectedDraft?.id === draftId) {
        setSelectedDraft({ ...selectedDraft, dispatch_status: "sent", dispatched_at: now });
      }
    } else {
      setActionMessage({ type: "error", text: res.error?.message || "Dispatch failed." });
    }
  }

  async function handleCreateNewDraft() {
    setCreatingDraft(true);
    setActionMessage(null);

    // Call AI drafting endpoint to compose draft
    const aiDraftRes = await apiRequest("/ai/draft-communication", {
      method: "POST",
      body: JSON.stringify({
        recipient_name: newRecipientName,
        recipient_role: "College Official",
        task_title: "Auditorium Electrical Clearance",
        channel: newChannel,
        tone: newTone,
        additional_instructions: newReason,
      }),
    });

    if (aiDraftRes.success && aiDraftRes.data) {
      // Save created draft to database
      const saveRes = await apiRequest("/communications", {
        method: "POST",
        body: JSON.stringify({
          recipient_name: newRecipientName,
          recipient_email: newRecipientEmail,
          recipient_phone: newRecipientPhone,
          channel: newChannel,
          subject: aiDraftRes.data.subject,
          body: aiDraftRes.data.body,
          tone: newTone,
        }),
      });

      setCreatingDraft(false);

      if (saveRes.success && saveRes.data) {
        setIsNewOpen(false);
        setActionMessage({
          type: "success",
          text: "AI generated new draft successfully! Please review and approve.",
        });
        await fetchDrafts();
        setSelectedDraft(saveRes.data);
      } else {
        setActionMessage({ type: "error", text: saveRes.error?.message || "Failed to save draft." });
      }
    } else {
      setCreatingDraft(false);
      setActionMessage({
        type: "error",
        text: aiDraftRes.error?.message || "AI drafting failed.",
      });
    }
  }

  const filteredDrafts = drafts.filter((d) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return d.dispatch_status === "pending";
    if (statusFilter === "sent") return d.dispatch_status === "sent";
    if (statusFilter === "approved") return d.approval_status === "approved";
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communications Studio"
        description="Draft, polish tone, and verify outgoing emails and WhatsApp alerts to college authorities and vendors with strict human sign-off."
        actions={
          <button
            onClick={() => setIsNewOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg text-sm shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New AI Draft</span>
          </button>
        }
      />

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between border ${
            actionMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Kill Switch & Safety Status Banner */}
      <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-emerald-500" />
          <div>
            <div className="text-xs font-bold text-foreground">Communications Safety Gate Active</div>
            <div className="text-[11px] text-muted-foreground">
              All messages require human approval. WhatsApp requires verified recipient opt-in before dispatch.
            </div>
          </div>
        </div>
        <AIBadge label="Zero Hallucination Tone Rewriter" />
      </div>

      {/* Main 2-Pane Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Drafts Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              <span>Outgoing Queue</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary font-mono">
                {filteredDrafts.length}
              </span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-secondary/50 border border-border rounded-md px-2 py-1 text-foreground"
            >
              <option value="all">All Items</option>
              <option value="pending">Pending Dispatch</option>
              <option value="approved">Approved</option>
              <option value="sent">Sent</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredDrafts.length === 0 ? (
              <div className="p-8 text-center bg-card border border-border rounded-xl text-muted-foreground text-xs">
                No communication drafts in this queue.
              </div>
            ) : (
              filteredDrafts.map((d) => {
                const isSelected = selectedDraft?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDraft(d)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20"
                        : "bg-card border-border hover:border-primary/40 hover:bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {d.channel === "whatsapp" ? (
                          <Smartphone className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Mail className="w-4 h-4 text-blue-500" />
                        )}
                        <span className="font-semibold text-xs text-foreground truncate max-w-[150px]">
                          {d.recipient_name || d.recipient_email || d.recipient_phone}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          d.dispatch_status === "sent"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : d.approval_status === "approved"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {d.dispatch_status === "sent" ? "Sent" : d.approval_status === "approved" ? "Approved" : "Draft"}
                      </span>
                    </div>

                    <div className="font-semibold text-xs text-foreground line-clamp-1 mb-1">
                      {d.subject || "(No Subject)"}
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2 font-mono">
                      {d.body}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/60 pt-2">
                      <span className="capitalize">Tone: {d.tone}</span>
                      <span>{new Date(d.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Draft Editor & Tone Studio (7 cols) */}
        <div className="lg:col-span-7 bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          {selectedDraft ? (
            <div className="space-y-6">
              {/* Draft Meta & Channel Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        selectedDraft.channel === "whatsapp"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {selectedDraft.channel.toUpperCase()} CHANNEL
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Recipient: <strong>{selectedDraft.recipient_name || "Official"}</strong> (
                      {selectedDraft.channel === "whatsapp"
                        ? selectedDraft.recipient_phone
                        : selectedDraft.recipient_email}
                      )
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {selectedDraft.subject}
                  </h3>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      selectedDraft.dispatch_status === "sent"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : selectedDraft.approval_status === "approved"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {selectedDraft.dispatch_status === "sent"
                      ? "Dispatched"
                      : selectedDraft.approval_status === "approved"
                      ? "Approved for Dispatch"
                      : "Pending Approval"}
                  </span>
                </div>
              </div>

              {/* Tone Adjustment Toolbar */}
              <div className="p-3 rounded-lg bg-secondary/30 border border-border flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                  <span>AI Tone Transformation:</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={adjustingTone || selectedDraft.dispatch_status === "sent"}
                    onClick={() => handleAdjustTone("shorter")}
                    className="px-2.5 py-1 rounded-md bg-card border border-border hover:bg-secondary text-xs font-medium text-foreground transition-colors disabled:opacity-50"
                  >
                    Shorter
                  </button>
                  <button
                    disabled={adjustingTone || selectedDraft.dispatch_status === "sent"}
                    onClick={() => handleAdjustTone("firmer")}
                    className="px-2.5 py-1 rounded-md bg-card border border-border hover:bg-secondary text-xs font-medium text-foreground transition-colors disabled:opacity-50"
                  >
                    Firmer (Urgent)
                  </button>
                  <button
                    disabled={adjustingTone || selectedDraft.dispatch_status === "sent"}
                    onClick={() => handleAdjustTone("friendlier")}
                    className="px-2.5 py-1 rounded-md bg-card border border-border hover:bg-secondary text-xs font-medium text-foreground transition-colors disabled:opacity-50"
                  >
                    Friendlier
                  </button>
                  {adjustingTone && <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary ml-1" />}
                </div>
              </div>

              {/* Body Content Preview & Edit */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">
                  Message Body Content
                </label>
                <div className="p-4 rounded-xl bg-secondary/20 border border-border text-xs font-mono leading-relaxed text-foreground whitespace-pre-wrap min-h-[140px]">
                  {selectedDraft.body}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  {selectedDraft.approval_status !== "approved" && selectedDraft.dispatch_status !== "sent" && (
                    <button
                      onClick={() => handleApprove(selectedDraft.id)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>Approve Draft</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={selectedDraft.approval_status !== "approved" || selectedDraft.dispatch_status === "sent"}
                    onClick={() => handleDispatch(selectedDraft.id)}
                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {selectedDraft.dispatch_status === "sent" ? "Dispatched" : "Send Out Notification"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground text-xs">
              Select a communication draft to review message content, modify tone, and dispatch.
            </div>
          )}
        </div>
      </div>

      {/* New AI Draft Modal */}
      {isNewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Compose AI Communication Draft</span>
              </div>
              <button
                onClick={() => setIsNewOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-mono"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Recipient Channel</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewChannel("email")}
                    className={`p-2 rounded-lg border font-medium flex items-center justify-center gap-2 ${
                      newChannel === "email" ? "border-primary bg-primary/10 text-primary font-bold" : "border-border text-muted-foreground"
                    }`}
                  >
                    <Mail className="w-4 h-4" /> Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChannel("whatsapp")}
                    className={`p-2 rounded-lg border font-medium flex items-center justify-center gap-2 ${
                      newChannel === "whatsapp" ? "border-primary bg-primary/10 text-primary font-bold" : "border-border text-muted-foreground"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" /> WhatsApp
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={newRecipientName}
                  onChange={(e) => setNewRecipientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/30 border border-border text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              {newChannel === "email" ? (
                <div>
                  <label className="font-semibold text-foreground block mb-1">Recipient Email</label>
                  <input
                    type="email"
                    value={newRecipientEmail}
                    onChange={(e) => setNewRecipientEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/30 border border-border text-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="font-semibold text-foreground block mb-1">Recipient Phone Number (E.164)</label>
                  <input
                    type="text"
                    value={newRecipientPhone}
                    onChange={(e) => setNewRecipientPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/30 border border-border text-foreground focus:ring-1 focus:ring-primary outline-none font-mono"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-foreground block mb-1">Initial Tone Preference</label>
                <select
                  value={newTone}
                  onChange={(e) => setNewTone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/30 border border-border text-foreground focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="polite">Polite & Professional</option>
                  <option value="firmer">Firm (Escalation / Urgent)</option>
                  <option value="shorter">Short & Direct</option>
                  <option value="friendlier">Friendly / Collaborative</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Drafting Context & Request</label>
                <textarea
                  rows={3}
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Explain what needs to be communicated, requested, or escalated..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/30 border border-border text-foreground focus:ring-1 focus:ring-primary outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border bg-secondary/20 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsNewOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                disabled={creatingDraft}
                onClick={handleCreateNewDraft}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50"
              >
                {creatingDraft ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Composing with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Draft</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
