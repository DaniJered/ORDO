"use client";

import React, { useState } from "react";
import { Sparkles, X, Send, Link as LinkIcon, CheckCircle2, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/api";

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citedTasks?: Array<{ id: string; title: string; status: string }>;
  citedEvidence?: Array<{ id: string; name: string }>;
  suggestedActions?: string[];
}

export function CopilotDrawer({ isOpen, onClose, eventId = "default-event" }: CopilotDrawerProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your ORDO Copilot. Ask me anything about Tech Fest 2026: blocked tasks, overdue deliverables, evidence verification status, or department readiness.",
    },
  ]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const promptText = textToSend || query;
    if (!promptText.trim()) return;

    const newMessages: Message[] = [...messages, { role: "user", content: promptText }];
    setMessages(newMessages);
    setQuery("");
    setLoading(true);

    const res = await apiRequest("/ai/copilot", {
      method: "POST",
      body: JSON.stringify({
        event_id: eventId,
        query: promptText,
      }),
    });

    if (res.success && res.data) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: res.data.answer,
          citedTasks: res.data.cited_tasks,
          citedEvidence: res.data.cited_evidence,
          suggestedActions: res.data.suggested_actions,
        },
      ]);
    } else {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, I could not analyze the event state. " + (res.error?.message || ""),
        },
      ]);
    }
    setLoading(false);
  };

  const sampleQuestions = [
    "What's blocking the sound system?",
    "Which departments have overdue tasks?",
    "Summarize event readiness risks",
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right">
      {/* Header */}
      <div className="h-16 px-5 border-b border-border flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-600 text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">ORDO Copilot</h3>
            <p className="text-[10px] text-muted-foreground">Read-only event intelligence</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[90%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-secondary/70 border border-border text-foreground rounded-bl-none"
              }`}
            >
              {m.content}

              {/* Cited Tasks */}
              {m.citedTasks && m.citedTasks.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-border/50">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <LinkIcon className="w-2.5 h-2.5" />
                    <span>Cited Tasks:</span>
                  </div>
                  <div className="space-y-1">
                    {m.citedTasks.map((t) => (
                      <div
                        key={t.id}
                        className="px-2 py-1 rounded bg-card/70 border border-border flex items-center justify-between text-[11px]"
                      >
                        <span className="font-medium text-foreground truncate max-w-[200px]">{t.title}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-secondary uppercase font-semibold">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Actions (§5.5 item 1) */}
              {m.suggestedActions && m.suggestedActions.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-border/50">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                    Confirmable Actions:
                  </div>
                  <div className="space-y-1">
                    {m.suggestedActions.map((act, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => alert(`Proposed action queued: ${act}`)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-medium flex items-center justify-between hover:bg-purple-200"
                      >
                        <span>{act}</span>
                        <ArrowRight className="w-3 h-3 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground italic p-2">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-purple-600" />
            <span>ORDO Copilot is analyzing event state...</span>
          </div>
        )}
      </div>

      {/* Sample Quick Questions */}
      <div className="p-3 border-t border-border bg-card/50">
        <div className="text-[10px] font-semibold text-muted-foreground mb-1.5">Quick Prompts:</div>
        <div className="flex flex-wrap gap-1.5">
          {sampleQuestions.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(q)}
              className="text-[10px] px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-foreground border border-border"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Query Input */}
      <div className="p-3 border-t border-border bg-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about tasks, evidence, blockers..."
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

