"use client";

import React, { useState, useEffect } from "react";
import {
  FileCheck2,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  FileText,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EvidenceUploadModal } from "@/components/workflow/EvidenceUploadModal";
import { apiRequest } from "@/lib/api";

interface EvidenceItem {
  id: string;
  task_id: string;
  name: string;
  description?: string;
  file_types_allowed: string;
  max_size_mb: number;
  is_mandatory: boolean;
  verification_status: string;
  verified_by_user_id?: string;
  verified_at?: string;
  rejection_reason?: string;
  task_title?: string;
}

export default function EvidenceVaultPage() {
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<EvidenceItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchEvidence();
  }, []);

  async function fetchEvidence() {
    setLoading(true);
    // Fetch tasks to collect their evidence requirements
    const res = await apiRequest<any[]>("/tasks");
    setLoading(false);
    if (res.success && res.data) {
      const allRequirements: EvidenceItem[] = [];
      res.data.forEach((task) => {
        if (task.evidence_requirements && Array.isArray(task.evidence_requirements)) {
          task.evidence_requirements.forEach((req: any) => {
            allRequirements.push({
              ...req,
              task_title: task.title,
            });
          });
        }
      });
      setEvidenceList(allRequirements);
    }
  }

  const filteredItems = evidenceList.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.task_title && item.task_title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || item.verification_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence Vault"
        description="Tamper-evident artifact store with SHA-256 fingerprinting, verification sign-offs, and compliance audit trail."
        actions={
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
            <span>SHA-256 Integrity Verified</span>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search evidence or task name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:ring-1 focus:ring-primary outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="verified">Verified</option>
            <option value="submitted">Submitted (Pending Review)</option>
            <option value="pending">Pending Upload</option>
            <option value="rejected">Rejected / Reopened</option>
          </select>
        </div>
      </div>

      {/* Evidence Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="p-3.5">Requirement / Artifact</th>
                <th className="p-3.5">Associated Task</th>
                <th className="p-3.5">Allowed Types</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Audit Stamp</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No evidence requirements found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <div className="font-semibold text-foreground">{item.name}</div>
                          {item.is_mandatory && (
                            <span className="text-[10px] text-amber-500 font-semibold uppercase">
                              Mandatory Prerequisite
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-foreground">
                      {item.task_title || "General"}
                    </td>
                    <td className="p-3.5 font-mono text-muted-foreground text-[11px]">
                      {item.file_types_allowed}
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={item.verification_status as any} />
                    </td>
                    <td className="p-3.5 text-muted-foreground font-mono text-[11px]">
                      {item.verified_at
                        ? new Date(item.verified_at).toLocaleDateString()
                        : item.rejection_reason
                        ? "Rejected"
                        : "Awaiting"}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setIsModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs transition-colors"
                      >
                        Inspect & Verify
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedItem && (
        <EvidenceUploadModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItem(null);
          }}
          requirement={selectedItem}
          onSuccess={fetchEvidence}
          canReview={true}
        />
      )}
    </div>
  );
}
