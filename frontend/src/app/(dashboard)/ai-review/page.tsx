"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  UploadCloud,
  FileText,
  CheckCircle2,
  XCircle,
  Edit3,
  ArrowRight,
  AlertTriangle,
  Clock,
  Building,
  UserCheck,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { AIBadge } from "@/components/common/AIBadge";
import { ConfidenceMeter } from "@/components/common/ConfidenceMeter";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { apiRequest } from "@/lib/api";

interface Commitment {
  id: string;
  source_document_name: string;
  source_document_text?: string;
  source_document_reference?: string;
  commitment_text: string;
  task_title: string;
  task_description?: string;
  responsible_department?: string;
  responsible_person?: string;
  deadline?: string;
  priority: string;
  evidence_required?: string;
  dependencies?: string;
  confidence_score: number;
  extraction_rationale?: string;
  status: "pending_review" | "accepted" | "rejected" | "edited";
  created_at: string;
}

export default function AIReviewPage() {
  const [activeTab, setActiveTab] = useState<"paste" | "upload">("paste");
  const [docName, setDocName] = useState("Meeting_Minutes_Symposium_Planning.txt");
  const [rawText, setRawText] = useState(
    `Minutes of Symposium Core Committee Meeting - Oct 24, 2026\n\n` +
    `1. Logistics & Venue: Prof. Sharma confirmed auditorium booking approval is pending Principal sign-off, expected by Friday Oct 31.\n` +
    `2. Technical: Rahul Verma committed to finalizing stage sound and AV system requirements by Nov 2, dependent on auditorium confirmation.\n` +
    `3. Marketing & Finance: Priya Nair will submit the final symposium banner design to Finance by Nov 4 for quotation clearance (INR 35,000 budget cap).`
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [selectedCommitment, setSelectedCommitment] = useState<Commitment | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchCommitments();
  }, []);

  async function fetchCommitments() {
    const res = await apiRequest<Commitment[]>("/ai/commitments");
    if (res.success && res.data) {
      setCommitments(res.data);
      if (res.data.length > 0 && !selectedCommitment) {
        setSelectedCommitment(res.data[0]);
      }
    }
  }

  async function handleExtract() {
    setExtracting(true);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);

    try {
      let res;
      if (activeTab === "upload" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("document_name", selectedFile.name);

        const token = typeof window !== "undefined" ? localStorage.getItem("ordo_token") : null;
        const uploadRes = await fetch("http://localhost:8000/api/v1/ai/extract-document", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        res = await uploadRes.json();
      } else {
        const formData = new FormData();
        const blob = new Blob([rawText], { type: "text/plain" });
        formData.append("file", blob, docName);
        formData.append("document_name", docName);

        const token = typeof window !== "undefined" ? localStorage.getItem("ordo_token") : null;
        const uploadRes = await fetch("http://localhost:8000/api/v1/ai/extract-document", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        res = await uploadRes.json();
      }

      if (res && (res.success || Array.isArray(res.commitments) || res.data)) {
        setActionSuccessMessage("Extracted commitments with high confidence! Review each suggestion below.");
        await fetchCommitments();
      } else {
        setActionErrorMessage(res?.detail || res?.error?.message || "Failed to extract commitments.");
      }
    } catch (err: any) {
      setActionErrorMessage(err.message || "Extraction failed.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleConvert(c: Commitment) {
    setConvertingId(c.id);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);

    const res = await apiRequest(`/ai/commitments/${c.id}/convert-task`, {
      method: "POST",
      body: JSON.stringify({
        title: c.task_title,
        description: c.task_description,
        department_name: c.responsible_department,
        priority: c.priority,
        deadline: c.deadline,
        evidence_required_name: c.evidence_required,
      }),
    });

    setConvertingId(null);

    if (res.success) {
      setActionSuccessMessage(`Successfully converted "${c.task_title}" into an active task!`);
      // Update local status
      setCommitments((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, status: "accepted" } : item))
      );
      if (selectedCommitment?.id === c.id) {
        setSelectedCommitment({ ...c, status: "accepted" });
      }
    } else {
      setActionErrorMessage(res.error?.message || "Failed to convert commitment to task.");
    }
  }

  const filteredCommitments = commitments.filter((c) => {
    if (statusFilter === "all") return true;
    return c.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Commitment Review Studio"
        description="Extract verifiable tasks, dependencies, and evidence requirements directly from meeting minutes, contracts, and permission letters with human oversight."
        actions={
          <div className="flex items-center gap-2">
            <AIBadge label="Strict Human-in-the-Loop" showSparkles />
          </div>
        }
      />

      {/* Alert Notices */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {actionErrorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{actionErrorMessage}</span>
          </div>
          <button onClick={() => setActionErrorMessage(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Document Input Card */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Document Source Intake</span>
            <span className="text-xs text-muted-foreground">(PDF, TXT, Markdown accepted)</span>
          </div>
          <div className="flex items-center bg-secondary/50 p-1 rounded-lg border border-border text-xs">
            <button
              onClick={() => setActiveTab("paste")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === "paste" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Paste Minutes / Notes
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === "upload" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Upload Document File
            </button>
          </div>
        </div>

        {activeTab === "paste" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-3">
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Document Reference Name (e.g. Oct24_Core_Minutes.txt)"
                  className="w-full text-xs px-3 py-2 rounded-lg bg-secondary/30 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>
              <div className="text-right flex items-center justify-end text-xs text-muted-foreground">
                {rawText.length} characters ({rawText.split("\n").length} lines)
              </div>
            </div>
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw meeting notes, minutes of meeting, or email commitments here..."
              className="w-full p-3 rounded-lg bg-secondary/30 border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
            />
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed border-border rounded-xl text-center bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.txt,.md"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
              <div className="text-sm font-semibold text-foreground">
                {selectedFile ? selectedFile.name : "Click to select or drag and drop document"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB — Ready to extract`
                  : "PDF, TXT, or MD up to 25MB"}
              </div>
            </label>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Deterministic SHA-256 text fingerprinting applied to all extractions</span>
          </div>
          <button
            onClick={handleExtract}
            disabled={extracting}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            {extracting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Extracting Commitments...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Extract Commitments with AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Two-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Extracted List & Filter (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              <span>Extracted Suggestions</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary font-mono">
                {filteredCommitments.length}
              </span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-secondary/50 border border-border rounded-md px-2 py-1 text-foreground"
            >
              <option value="all">All Statuses</option>
              <option value="pending_review">Pending Review</option>
              <option value="accepted">Accepted / Converted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredCommitments.length === 0 ? (
              <div className="p-8 text-center bg-card border border-border rounded-xl text-muted-foreground text-xs">
                No commitments found matching this filter. Click &quot;Extract Commitments with AI&quot; above to process notes.
              </div>
            ) : (
              filteredCommitments.map((c) => {
                const isSelected = selectedCommitment?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCommitment(c)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20"
                        : "bg-card border-border hover:border-primary/40 hover:bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-sm text-foreground leading-snug line-clamp-1">
                        {c.task_title}
                      </span>
                      <PriorityBadge priority={c.priority as any} />
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      &quot;{c.commitment_text}&quot;
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-2">
                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5" />
                        <span>{c.responsible_department || "General"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ConfidenceMeter score={c.confidence_score} showNumeric size="sm" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Commitment Detail & Action Workbench (7 cols) */}
        <div className="lg:col-span-7 bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          {selectedCommitment ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={selectedCommitment.status as any} />
                    <span className="text-xs text-muted-foreground font-mono">
                      Ref: {selectedCommitment.source_document_name}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    {selectedCommitment.task_title}
                  </h3>
                </div>
                <ConfidenceMeter score={selectedCommitment.confidence_score} showNumeric />
              </div>

              {/* Original Quote Callout */}
              <div className="p-3.5 rounded-lg bg-secondary/40 border-l-4 border-primary text-xs italic text-foreground leading-relaxed">
                <span className="font-semibold not-italic block text-[10px] text-primary uppercase tracking-wider mb-1">
                  Extracted Verbatim Commitment
                </span>
                &quot;{selectedCommitment.commitment_text}&quot;
              </div>

              {/* Task Details Specification Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-1">
                  <div className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" /> Responsible Department
                  </div>
                  <div className="font-semibold text-foreground">
                    {selectedCommitment.responsible_department || "Not specified"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-1">
                  <div className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" /> Responsible Owner
                  </div>
                  <div className="font-semibold text-foreground">
                    {selectedCommitment.responsible_person || "Unassigned"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-1">
                  <div className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Suggested Deadline
                  </div>
                  <div className="font-semibold text-foreground">
                    {selectedCommitment.deadline
                      ? new Date(selectedCommitment.deadline).toLocaleDateString()
                      : "Within event timeline"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-1">
                  <div className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Evidence Required
                  </div>
                  <div className="font-semibold text-foreground">
                    {selectedCommitment.evidence_required || "Signed proof / document"}
                  </div>
                </div>
              </div>

              {/* Dependency & Rationale */}
              {selectedCommitment.dependencies && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                  <span className="font-bold text-amber-700 dark:text-amber-400 block mb-0.5">
                    Suggested Workflow Dependency:
                  </span>
                  <span className="text-foreground">
                    Must wait for: <strong>{selectedCommitment.dependencies}</strong>
                  </span>
                </div>
              )}

              {selectedCommitment.extraction_rationale && (
                <div className="p-3 rounded-lg bg-secondary/20 border border-border text-xs space-y-1">
                  <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Rationale
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedCommitment.extraction_rationale}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCommitments((prev) =>
                        prev.map((c) =>
                          c.id === selectedCommitment.id ? { ...c, status: "rejected" } : c
                        )
                      );
                      setSelectedCommitment({ ...selectedCommitment, status: "rejected" });
                    }}
                    className="px-3 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Reject Suggestion
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={selectedCommitment.status === "accepted" || convertingId === selectedCommitment.id}
                    onClick={() => handleConvert(selectedCommitment)}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {convertingId === selectedCommitment.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Converting...</span>
                      </>
                    ) : selectedCommitment.status === "accepted" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Already Converted to Task</span>
                      </>
                    ) : (
                      <>
                        <span>Accept & Convert to Task</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground text-xs">
              Select an extracted commitment from the list to review details and convert into a task.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
