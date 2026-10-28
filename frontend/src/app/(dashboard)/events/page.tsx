"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Calendar, MapPin, Users, DollarSign, ArrowRight, Search, Filter } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { apiRequest } from "@/lib/api";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiRequest("/events").then((res) => {
      if (res.success && res.data) {
        setEvents(res.data);
      }
      setLoading(false);
    });
  }, []);

  const filtered = events.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="College Events"
        description="Oversee event lifecycles, readiness metrics, and department task distribution."
        actions={
          <Link
            href="/events/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Event</span>
          </Link>
        }
      />

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events by title..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card">
          <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <h3 className="text-sm font-bold text-foreground">No Events Found</h3>
          <p className="text-xs text-muted-foreground mt-1">Get started by creating your first event.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((e) => (
            <div
              key={e.id}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-foreground">
                    {e.type}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      e.status === "active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {e.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground hover:text-primary transition-colors">
                  <Link href={`/events/${e.id}`}>{e.name}</Link>
                </h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {e.description}
                </p>
              </div>

              {/* Event Metadata */}
              <div className="space-y-2 text-xs text-muted-foreground pt-3 border-t border-border/60">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {new Date(e.start_datetime).toLocaleDateString()} –{" "}
                    {new Date(e.end_datetime).toLocaleDateString()}
                  </span>
                </div>
                {e.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span className="truncate">{e.venue}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>{e.expected_attendance} expected attendees</span>
                </div>
              </div>

              {/* Readiness Progress Bar */}
              <div className="pt-3 border-t border-border/60 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Readiness Score</span>
                  <span className="font-bold text-foreground">{e.readiness_score}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      e.readiness_score >= 70 ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${e.readiness_score}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{e.completed_count} verified tasks</span>
                  <span>{e.task_count} total tasks</span>
                </div>
              </div>

              <Link
                href={`/events/${e.id}`}
                className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-border hover:bg-secondary text-foreground text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <span>View Event Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

