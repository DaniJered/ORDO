"use client";

import React, { useEffect, useState } from "react";
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  Send,
  Sparkles,
  ShieldAlert,
  Mail,
  MessageSquare,
  Lock,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { apiRequest } from "@/lib/api";

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/integrations").then((res) => {
      if (res.success && res.data) {
        setIntegrations(res.data);
      }
      setLoading(false);
    });
  }, []);

  const handleTestConnection = async (key: string) => {
    setTestingKey(key);
    const res = await apiRequest(`/integrations/${key}/test`, { method: "POST" });
    setTestingKey(null);
    if (res.success && res.data) {
      setTestResults((prev) => ({ ...prev, [key]: res.data }));
    } else {
      alert(`Connection failed: ${res.error?.message || "Unknown error"}`);
    }
  };

  const handleSendTestMessage = async (key: string, category: string) => {
    setSendingKey(key);
    const channel = category === "messaging" ? "whatsapp" : "email";
    const res = await apiRequest(`/integrations/${key}/send-test`, {
      method: "POST",
      body: JSON.stringify({
        channel,
        to: "test@user.self",
        subject: "ORDO Verification Notification",
        body: `Test notification sent via ${key} adapter.`,
      }),
    });
    setSendingKey(null);
    if (res.success) {
      alert(`Success! Test message dispatched via ${key}. Output logged to automation_logs.`);
    } else {
      alert(`Dispatch prevented: ${res.error?.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations Hub"
        description="Adapter-driven communication and third-party integrations with strict mock-mode safety."
      />

      {/* Mock Mode Banner (§11) */}
      <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
        <div className="text-xs text-amber-900 dark:text-amber-200">
          <span className="font-bold">MOCK MODE ACTIVE:</span> Email is routed to local SMTP/Mailpit and WhatsApp is running in mock mode. No external outbound cellular or cloud charges are incurred.
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((item) => {
          const isComingSoon = item.status === "coming_soon";
          const result = testResults[item.key];

          return (
            <div
              key={item.key}
              className={`p-6 rounded-2xl border bg-card flex flex-col justify-between space-y-4 shadow-sm ${
                isComingSoon ? "opacity-60 border-dashed border-border" : "border-border hover:shadow-md"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-foreground">
                    {item.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      isComingSoon
                        ? "bg-slate-100 text-slate-500"
                        : item.mock_mode
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    }`}
                  >
                    {isComingSoon ? "Coming Soon" : item.mock_mode ? "Mock Mode" : "Connected"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground">{item.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Health Result Box */}
              {result && (
                <div className="p-3 rounded-xl bg-secondary/50 border border-border text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Status: {result.status}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {result.latency_ms}ms
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{result.message}</p>
                </div>
              )}

              {/* Action Buttons */}
              {!isComingSoon ? (
                <div className="pt-3 border-t border-border flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection(item.key)}
                    disabled={testingKey === item.key}
                    className="flex-1 py-1.5 px-3 rounded-lg border border-border hover:bg-secondary text-xs font-semibold text-foreground flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3 h-3 text-primary" />
                    <span>{testingKey === item.key ? "Pinging..." : "Test Ping"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendTestMessage(item.key, item.category)}
                    disabled={sendingKey === item.key}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    <span>{sendingKey === item.key ? "Sending..." : "Send Test"}</span>
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-border text-[11px] font-semibold text-muted-foreground text-center">
                  Scaffolded Plugin Interface (Phase 4)
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

