"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, User, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { setAuthSession } from "@/lib/auth";

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Invitation token missing from URL.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await apiRequest("/auth/accept-invite", {
      method: "POST",
      body: JSON.stringify({
        token,
        full_name: fullName,
        password,
      }),
    });

    setLoading(false);

    if (res.success && res.data) {
      setAuthSession(res.data.access_token, res.data.user);
      router.push("/dashboard");
    } else {
      setError(res.error?.message || "Could not accept invitation. Token may be invalid or expired.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-4">
      {error && (
        <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Full Name</label>
        <div className="relative">
          <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="Dr. Rajesh Gupta"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Create Password</label>
        <div className="relative">
          <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="••••••••••••"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <span>Joining...</span> : <span>Join Workspace</span>}
      </button>
    </form>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 text-center border-b border-border bg-gradient-to-b from-indigo-50/50 to-transparent dark:from-indigo-950/20">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Accept ORDO Invitation</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete your profile to join your college event team
          </p>
        </div>

        <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading invitation...</div>}>
          <AcceptInviteForm />
        </Suspense>
      </div>
    </div>
  );
}
