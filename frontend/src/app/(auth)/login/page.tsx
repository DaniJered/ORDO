"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Lock, Mail, Sparkles, UserCheck } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { setAuthSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@ordo.college");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (res.success && res.data) {
      setAuthSession(res.data.access_token, res.data.user);
      router.push("/dashboard");
    } else {
      setError(res.error?.message || "Invalid credentials. Please verify your email & password.");
    }
  };

  const demoAccounts = [
    { role: "Super Admin", email: "admin@ordo.college" },
    { role: "Event Coordinator", email: "rahul.coord@ordo.college" },
    { role: "Department Member", email: "priya.mkt@ordo.college" },
    { role: "Approver (Faculty)", email: "prof.mehta@ordo.college" },
    { role: "Auditor (Read-Only)", email: "auditor@ordo.college" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-8 text-center border-b border-border bg-gradient-to-b from-indigo-50/50 to-transparent dark:from-indigo-950/20">
          <div className="w-12 h-12 rounded-xl bg-primary text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md mb-3">
            O
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome to ORDO</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            AI-Powered Workflow Dependency & Evidence Verification
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder="name@ordo.college"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Password</label>
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
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login Pills */}
        <div className="px-8 pb-6 pt-2 border-t border-border bg-secondary/30">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <UserCheck className="w-3 h-3" />
            <span>Quick Demo Role Logins (Password: Password123!)</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {demoAccounts.map((acc, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword("Password123!");
                }}
                className="text-left px-2 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-[11px] font-medium text-foreground transition-colors truncate"
              >
                <span className="block font-semibold text-primary truncate">{acc.role}</span>
                <span className="text-[9px] text-muted-foreground truncate">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 text-center border-t border-border text-xs text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Register team
          </Link>
        </div>
      </div>
    </div>
  );
}

