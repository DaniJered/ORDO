"use client";

import React, { useEffect, useState } from "react";
import { User, Bell, Clock, Shield, Save } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { getCurrentUser, setAuthSession } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const current = getCurrentUser();
    if (current) {
      setUser(current);
      setFullName(current.full_name);
      setPhone(current.phone || "");
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const res = await apiRequest(`/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        full_name: fullName,
        phone,
        quiet_hours_start: quietStart,
        quiet_hours_end: quietEnd,
      }),
    });
    if (res.success) {
      setAuthSession(localStorage.getItem("ordo_token") || "", {
        ...user,
        full_name: fullName,
        phone,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="My Profile & Preferences"
        description="Manage personal contact channels, quiet hours, and event notification preferences."
      />

      <form onSubmit={handleSave} className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
        {saved && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            Profile changes saved successfully!
          </div>
        )}

        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className="w-14 h-14 rounded-full bg-primary/20 text-primary font-bold text-xl flex items-center justify-center">
            {fullName.charAt(0) || "U"}
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">{fullName || "User"}</h3>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary mt-1 inline-block">
              Role: {user?.role?.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Mobile / WhatsApp Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Quiet Hours (§6.2) */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-foreground">Quiet Hours (Mute WhatsApp/SMS Notifications)</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Quiet Hours Start</label>
                <input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Quiet Hours End</label>
                <input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold shadow hover:bg-primary/90"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}

