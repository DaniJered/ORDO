"use client";

import React, { useState } from "react";
import { Search, Bell, Sparkles, LogOut, User as UserIcon, Calendar, ShieldAlert } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { getCurrentUser, clearAuthSession } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface TopbarProps {
  onOpenCommandPalette: () => void;
  onToggleCopilot: () => void;
  killSwitchActive?: boolean;
}

export function Topbar({
  onOpenCommandPalette,
  onToggleCopilot,
  killSwitchActive = false,
}: TopbarProps) {
  const router = useRouter();
  const currentUser = getCurrentUser();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    clearAuthSession();
    router.push("/login");
  };

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md px-6 flex items-center justify-between z-20">
      {/* Search / Command Palette Trigger */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center justify-between w-full px-3.5 py-1.5 text-xs text-muted-foreground bg-secondary/80 hover:bg-secondary rounded-lg border border-border transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span>Search events, tasks, people...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-card border border-border rounded shadow-sm">
            Ctrl+K
          </kbd>
        </button>

        {/* Event Quick Switcher */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
          <Calendar className="w-3.5 h-3.5" />
          <span>Tech Fest 2026</span>
        </div>
      </div>

      {/* Kill Switch Prominent Banner if active (§10 & §11) */}
      {killSwitchActive && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 text-white rounded-full text-xs font-bold animate-pulse shadow">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>KILL-SWITCH ACTIVE</span>
        </div>
      )}

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Copilot Button (§5.5) */}
        <button
          type="button"
          onClick={onToggleCopilot}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ORDO Copilot</span>
          <kbd className="hidden md:inline px-1 py-0.5 text-[9px] bg-purple-800 rounded">Ctrl+J</kbd>
        </button>

        {/* Notifications Bell */}
        <button
          type="button"
          className="relative p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-card" />
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-xs">
              {currentUser?.full_name?.charAt(0) || "A"}
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 p-1.5 bg-card border border-border rounded-xl shadow-xl z-50 text-xs">
              <div className="px-3 py-2 border-b border-border mb-1">
                <div className="font-semibold text-foreground">{currentUser?.full_name || "Admin"}</div>
                <div className="text-muted-foreground truncate">{currentUser?.email}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  router.push("/profile");
                }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-secondary text-foreground text-left"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Profile & Notifications</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

