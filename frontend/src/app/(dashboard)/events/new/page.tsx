"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Users, CheckSquare, Eye, ArrowRight, ArrowLeft, Sparkles, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { apiRequest } from "@/lib/api";

export default function CreateEventWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Form State
  const [basics, setBasics] = useState({
    name: "National Science Day Symposium 2026",
    description: "Annual university technical paper presentation and project showcase.",
    type: "Symposium",
    start_datetime: "2026-11-20T09:00",
    end_datetime: "2026-11-21T18:00",
    venue: "Main University Auditorium & Exhibition Hall",
    expected_attendance: 800,
    budget_estimate: 200000,
  });

  const [departments, setDepartments] = useState(["Technical", "Logistics", "Marketing", "Finance"]);
  
  const [starterTasks, setStarterTasks] = useState<Array<{
    title: string;
    department: string;
    priority: string;
    evidence_name?: string;
  }>>([
    { title: "Auditorium & Acoustic Verification", department: "Technical", priority: "critical", evidence_name: "Acoustic Sign-off Sheet" },
    { title: "Brochure Printing & Mailers", department: "Marketing", priority: "high", evidence_name: "Sample Brochure" },
    { title: "Chief Guest Hospitality & Booking", department: "Logistics", priority: "high", evidence_name: "Flight Tickets" },
  ]);

  const handleGenerateWithAI = async () => {
    setAiLoading(true);
    const res = await apiRequest("/ai/suggest-tasks", {
      method: "POST",
      body: JSON.stringify({
        event_name: basics.name,
        event_description: basics.description,
        event_type: basics.type,
      }),
    });
    setAiLoading(false);
    if (res.success && res.data?.tasks) {
      setStarterTasks(res.data.tasks);
    }
  };

  const handleCreateEvent = async () => {
    setLoading(true);
    const res = await apiRequest("/events", {
      method: "POST",
      body: JSON.stringify({
        ...basics,
        start_datetime: new Date(basics.start_datetime).toISOString(),
        end_datetime: new Date(basics.end_datetime).toISOString(),
        status: "planning",
      }),
    });

    if (res.success && res.data?.id) {
      const eventId = res.data.id;
      // Create starter tasks
      for (const t of starterTasks) {
        await apiRequest("/tasks", {
          method: "POST",
          body: JSON.stringify({
            event_id: eventId,
            title: t.title,
            deadline: new Date(basics.start_datetime).toISOString(),
            priority: t.priority.toLowerCase(),
            status: "not_started",
            evidence_required: Boolean(t.evidence_name),
            evidence_requirements: t.evidence_name ? [{ name: t.evidence_name, mandatory: true }] : [],
          }),
        });
      }
      router.push(`/events/${eventId}`);
    } else {
      alert("Failed to create event: " + (res.error?.message || "Unknown error"));
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: "Basics", icon: Calendar },
    { number: 2, title: "Team & Depts", icon: Users },
    { number: 3, title: "Starter Tasks", icon: CheckSquare },
    { number: 4, title: "Review", icon: Eye },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageHeader
        title="Create Event Wizard"
        description="Launch a new college event with mapped departments, starter tasks, and verification rules."
        breadcrumb="Events / New"
      />

      {/* Wizard Step Indicator (§6.1) */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        {steps.map((s) => {
          const Icon = s.icon;
          const isDone = step > s.number;
          const isCurrent = step === s.number;
          return (
            <div key={s.number} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isDone
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                    ? "bg-primary text-white ring-4 ring-primary/20"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {isDone ? "✓" : s.number}
              </div>
              <span
                className={`text-xs font-semibold hidden sm:inline ${
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-foreground">Step 1: Event Details & Schedule</h2>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Event Name</label>
            <input
              type="text"
              value={basics.name}
              onChange={(e) => setBasics({ ...basics, name: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Event Type</label>
              <select
                value={basics.type}
                onChange={(e) => setBasics({ ...basics, type: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary"
              >
                <option value="Symposium">Technical Symposium</option>
                <option value="Hackathon">Hackathon</option>
                <option value="Cultural Fest">Cultural Fest</option>
                <option value="Conference">Conference / Seminar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Venue Complex</label>
              <input
                type="text"
                value={basics.venue}
                onChange={(e) => setBasics({ ...basics, venue: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Start Date & Time</label>
              <input
                type="datetime-local"
                value={basics.start_datetime}
                onChange={(e) => setBasics({ ...basics, start_datetime: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">End Date & Time</label>
              <input
                type="datetime-local"
                value={basics.end_datetime}
                onChange={(e) => setBasics({ ...basics, end_datetime: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Scope & Description</label>
            <textarea
              rows={3}
              value={basics.description}
              onChange={(e) => setBasics({ ...basics, description: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      )}

      {/* Step 2: Team & Departments */}
      {step === 2 && (
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-foreground">Step 2: Department Participation</h2>
          <p className="text-xs text-muted-foreground">Select participating college departments for task ownership.</p>
          <div className="grid grid-cols-2 gap-3">
            {["Technical", "Logistics", "Marketing", "Finance"].map((dept) => (
              <label
                key={dept}
                className="p-3 rounded-xl border border-border flex items-center gap-3 cursor-pointer hover:bg-secondary/50"
              >
                <input
                  type="checkbox"
                  checked={departments.includes(dept)}
                  onChange={(e) => {
                    if (e.target.checked) setDepartments([...departments, dept]);
                    else setDepartments(departments.filter((d) => d !== dept));
                  }}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs font-semibold text-foreground">{dept} Department</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Starter Tasks & AI Builder */}
      {step === 3 && (
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Step 3: Starter Tasks & Evidence Requirements</h2>
              <p className="text-xs text-muted-foreground">Use AI to automatically synthesize milestones or add custom tasks.</p>
            </div>
            <button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold shadow hover:bg-purple-700 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{aiLoading ? "Generating with AI..." : "Smart AI Task Builder"}</span>
            </button>
          </div>

          <div className="space-y-2">
            {starterTasks.map((t, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-border bg-secondary/30 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground">{t.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Dept: {t.department} • Priority: {t.priority}
                    {t.evidence_name && ` • Evidence: ${t.evidence_name}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStarterTasks(starterTasks.filter((_, i) => i !== idx))}
                  className="p-1 text-muted-foreground hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Review & Create */}
      {step === 4 && (
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-foreground">Step 4: Final Review</h2>
          <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Event:</span>
              <span className="font-semibold text-foreground">{basics.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type & Venue:</span>
              <span className="font-semibold text-foreground">{basics.type} — {basics.venue}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Departments:</span>
              <span className="font-semibold text-foreground">{departments.join(", ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Starter Tasks:</span>
              <span className="font-semibold text-foreground">{starterTasks.length} tasks queued</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4 border-t border-border">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border hover:bg-secondary text-xs font-medium text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold shadow hover:bg-primary/90"
          >
            <span>Next</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreateEvent}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow hover:bg-emerald-700 disabled:opacity-50"
          >
            <span>{loading ? "Creating..." : "Confirm & Launch Event"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

