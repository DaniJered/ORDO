"use client";

import React, { useEffect, useState } from "react";
import { Users, Building2, UserPlus, Mail, Phone, Shield, CheckCircle2, XCircle, Send } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { apiRequest } from "@/lib/api";

export default function PeoplePage() {
  const [activeTab, setActiveTab] = useState<"users" | "departments" | "contacts">("users");
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteSuccessUrl, setInviteSuccessUrl] = useState<string | null>(null);

  const fetchData = async () => {
    const [uRes, dRes, cRes] = await Promise.all([
      apiRequest("/users"),
      apiRequest("/departments"),
      apiRequest("/contacts"),
    ]);
    if (uRes.success) setUsers(uRes.data || []);
    if (dRes.success) setDepartments(dRes.data || []);
    if (cRes.success) setContacts(cRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiRequest("/auth/invite", {
      method: "POST",
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    if (res.success && res.data) {
      setInviteSuccessUrl(window.location.origin + res.data.invite_url);
    } else {
      alert("Failed to send invite: " + (res.error?.message || "Check permissions."));
    }
  };

  const handleToggleOptIn = async (contactId: string, channel: string, currentStatus: boolean) => {
    const res = await apiRequest(`/contacts/${contactId}/channels/${channel}/opt-in?opt_in=${!currentStatus}`, {
      method: "POST",
    });
    if (res.success) {
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="People, Teams & Access Management"
        description="Administer college event teams, department heads, external contacts, and channel opt-in records."
        actions={
          <button
            type="button"
            onClick={() => {
              setInviteSuccessUrl(null);
              setInviteModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite by Email</span>
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-border gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          }`}
        >
          Internal Users ({users.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("departments")}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "departments" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          }`}
        >
          Departments ({departments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("contacts")}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "contacts" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          }`}
        >
          External Contacts & Channel Opt-in ({contacts.length})
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-semibold">
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-secondary/20">
                  <td className="p-3.5 font-bold text-foreground flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                      {u.full_name?.charAt(0)}
                    </div>
                    <span>{u.full_name}</span>
                  </td>
                  <td className="p-3.5 text-muted-foreground">{u.email}</td>
                  <td className="p-3.5">
                    <span className="capitalize font-semibold text-primary">{u.role?.replace("_", " ")}</span>
                  </td>
                  <td className="p-3.5 text-muted-foreground">{u.department_name || "—"}</td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.is_active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === "departments" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {departments.map((d) => (
            <div key={d.id} className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-xs font-bold text-muted-foreground">{d.member_count} Members</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">{d.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {d.description}
                </p>
              </div>
              <div className="pt-3 border-t border-border text-[11px] text-muted-foreground">
                Assigned Tasks: <span className="font-bold text-foreground">{d.task_count}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* External Contacts Tab (§6.2 & §7 Opt-in Demonstration) */}
      {activeTab === "contacts" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 text-xs text-blue-800 dark:text-blue-300">
            <span className="font-bold block mb-0.5">Section 7 & 11 Opt-In Policy Enforcement:</span>
            WhatsApp notifications require verified opt-in records before any automated messages can be drafted or dispatched.
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-semibold">
                  <th className="p-3.5">Contact Name & Org</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Phone</th>
                  <th className="p-3.5">WhatsApp Opt-in Status</th>
                  <th className="p-3.5 text-right">Toggle Consent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contacts.map((c) => {
                  const waChannel = c.channels?.find((ch: any) => ch.channel === "whatsapp");
                  const isOptedIn = Boolean(waChannel?.is_opted_in);
                  return (
                    <tr key={c.id} className="hover:bg-secondary/20">
                      <td className="p-3.5">
                        <div className="font-bold text-foreground">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground">{c.organization}</div>
                      </td>
                      <td className="p-3.5 text-muted-foreground">{c.email || "—"}</td>
                      <td className="p-3.5 text-muted-foreground">{c.phone || "—"}</td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isOptedIn
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/60"
                          }`}
                        >
                          {isOptedIn ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{isOptedIn ? "Opted In" : "Not Opted In (Blocked)"}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleOptIn(c.id, "whatsapp", isOptedIn)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-border hover:bg-secondary text-foreground transition-colors"
                        >
                          {isOptedIn ? "Revoke Opt-in" : "Grant Opt-in"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-card border border-border rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Invite New User</h3>
            {inviteSuccessUrl ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 text-xs">
                  Invitation generated successfully!
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    Acceptance Token Link:
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={inviteSuccessUrl}
                    className="w-full px-3 py-1.5 text-xs rounded border border-border bg-secondary font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="w-full py-2 rounded-lg bg-primary text-white text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@ordo.college"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Assigned Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background"
                  >
                    <option value="coordinator">Event Coordinator</option>
                    <option value="member">Department Member</option>
                    <option value="approver">Approver / Faculty</option>
                    <option value="auditor">Auditor (Read-Only)</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold"
                  >
                    Generate Invite Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

