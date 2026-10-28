"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CopilotDrawer } from "@/components/layout/CopilotDrawer";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { apiRequest } from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string>("default-event");

  useEffect(() => {
    // Check kill-switch status and fetch active event
    apiRequest("/automation/kill-switch").then((res) => {
      if (res.success && res.data) {
        setKillSwitchActive(Boolean(res.data.kill_switch_active));
      }
    });

    apiRequest("/events").then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setActiveEventId(res.data[0].id);
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setCopilotOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Body */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onOpenCommandPalette={() => setCmdPaletteOpen(true)}
          onToggleCopilot={() => setCopilotOpen((prev) => !prev)}
          killSwitchActive={killSwitchActive}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Modals & Drawers */}
      <CopilotDrawer isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} eventId={activeEventId} />
      <CommandPalette
        isOpen={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        onOpenCopilot={() => setCopilotOpen(true)}
      />
    </div>
  );
}
