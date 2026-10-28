"use client";

import React, { useState } from "react";
import { UploadCloud, FileCheck2, CheckCircle2, XCircle, AlertCircle, X, Download, Sparkles, RefreshCw } from "lucide-react";
import { AIBadge } from "@/components/common/AIBadge";
import { ConfidenceMeter } from "@/components/common/ConfidenceMeter";
import { apiRequest } from "@/lib/api";

interface EvidenceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: {
    id: string;
    task_id: string;
    name: string;
    file_types_allowed: string;
    verification_status: string;
    rejection_reason?: string;
  };
  onSuccess: () => void;
  canReview?: boolean;
}

interface AIClassification {
  likely_match: boolean;
  document_type: string;
  confidence_score: number;
  extracted_details: Record<string, any>;
  recommended_action: string;
  rationale: string;
}

export function EvidenceUploadModal({
  isOpen,
  onClose,
  requirement,
  onSuccess,
  canReview = true,
}: EvidenceUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionComment, setRejectionComment] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [aiClassification, setAiClassification] = useState<AIClassification | null>(null);

  if (!isOpen) return null;

  const runAiClassification = async (selectedFile: File) => {
    setClassifying(true);
    setAiClassification(null);

    const res = await apiRequest("/ai/classify-evidence", {
      method: "POST",
      body: JSON.stringify({
        filename: selectedFile.name,
        extracted_text: `Evidence upload for requirement: ${requirement.name}. File: ${selectedFile.name}`,
        requirement_name: requirement.name,
        allowed_types: requirement.file_types_allowed,
      }),
    });

    setClassifying(false);
    if (res.success && res.data) {
      setAiClassification(res.data);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    if (selected) {
      runAiClassification(selected);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("requirement_id", requirement.id);
    formData.append("task_id", requirement.task_id);
    formData.append("file", file);

    const token = typeof window !== "undefined" ? localStorage.getItem("ordo_token") : null;

    try {
      const res = await fetch("http://localhost:8000/api/v1/evidence/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      setUploading(false);

      if (res.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error?.message || data.detail || "Upload failed. Check file type and size.");
      }
    } catch (err: any) {
      setUploading(false);
      setError(err.message || "Failed to connect to backend server.");
    }
  };

  const handleReviewAction = async (action: "verify" | "reject") => {
    if (action === "reject" && (!rejectionComment || !rejectionComment.trim())) {
      setError("Rejection requires a mandatory explanation reason (§8 Rule 6).");
      return;
    }

    const formData = new FormData();
    formData.append("requirement_id", requirement.id);
    formData.append("action", action);
    if (rejectionComment) {
      formData.append("comment", rejectionComment);
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("ordo_token") : null;
    try {
      const res = await fetch("http://localhost:8000/api/v1/evidence/reviews", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error?.message || data.detail || "Review action failed.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit review.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg p-6 bg-card rounded-2xl border border-border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{requirement.name}</h3>
              <p className="text-[10px] text-muted-foreground">
                Permitted types: {requirement.file_types_allowed} • Max size: 25MB
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
            {error}
          </div>
        )}

        {requirement.rejection_reason && (
          <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-300">
            <span className="font-bold block mb-0.5">Previous Rejection Note:</span>
            {requirement.rejection_reason}
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-xl p-5 text-center hover:bg-secondary/40 transition-colors cursor-pointer relative">
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <UploadCloud className="w-8 h-8 text-primary mx-auto mb-2" />
            {file ? (
              <div className="text-xs font-semibold text-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            ) : (
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-primary hover:underline">Choose file</span>
                <span className="text-muted-foreground block text-[11px]">or drag & drop here</span>
              </div>
            )}
          </div>

          {/* AI Evidence Classification Assist */}
          {classifying && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center gap-2 text-xs text-primary">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing document validity with AI...</span>
            </div>
          )}

          {aiClassification && (
            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AIBadge label="AI Document Match" showSparkles />
                  <span className="font-bold text-foreground">{aiClassification.document_type}</span>
                </div>
                <ConfidenceMeter score={aiClassification.confidence_score} showNumeric size="sm" />
              </div>

              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {aiClassification.rationale}
              </p>

              <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground border-t border-border/60">
                <span>Recommendation: <strong className="text-foreground capitalize">{aiClassification.recommended_action}</strong></span>
                <span className={aiClassification.likely_match ? "text-emerald-500 font-semibold" : "text-amber-500 font-semibold"}>
                  {aiClassification.likely_match ? "✓ Matches requirement specification" : "⚠ Potential mismatch"}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full py-2 px-4 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {uploading ? "Uploading & Hashing..." : "Upload Evidence Document"}
          </button>
        </form>

        {/* Verification Controls (§8 Rules 5 & 6) */}
        {canReview && (
          <div className="pt-3 border-t border-border space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Approver Verification Actions
            </div>

            {rejectMode ? (
              <div className="space-y-2 p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20">
                <label className="block text-[11px] font-bold text-rose-700 dark:text-rose-400">
                  Mandatory Rejection Explanation (§8 Rule 6):
                </label>
                <textarea
                  rows={2}
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
                  placeholder="e.g. Letter missing campus seal or budget figure mismatch..."
                  className="w-full p-2 text-xs rounded border border-border bg-background focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectMode(false)}
                    className="px-3 py-1 text-xs rounded border border-border"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReviewAction("reject")}
                    className="px-3 py-1 text-xs rounded bg-rose-600 text-white font-bold"
                  >
                    Confirm Rejection & Reopen
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleReviewAction("verify")}
                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Verified Complete</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRejectMode(true)}
                  className="py-2 px-3 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

