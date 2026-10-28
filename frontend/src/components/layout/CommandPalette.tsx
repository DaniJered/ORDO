"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Calendar, CheckSquare, Users, Sparkles, Moon, Sun, Plus, X } from "lucide-react";
import { useTheme } from "next-themes";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCopilot: () => void;
}

export function CommandPalette({ isOpen, onClose, onOpenCopilot }: CommandPaletteProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        isOpen ? onClose() : undefined;
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      category: "Navigation",
      items: [
        { label: "Go to Dashboard", icon: Calendar, run: () => router.push("/dashboard") },
        { label: "View All Tasks", icon: CheckSquare, run: () => router.push("/tasks") },
        { label: "View People & Contacts", icon: Users, run: () => router.push("/people") },
        { label: "Integrations Hub", icon: Search, run: () => router.push("/integrations") },
      ],
    },
    {
      category: "Actions",
      items: [
        { label: "Create New Event (Wizard)", icon: Plus, run: () => router.push("/events/new") },
        {
          label: "Open ORDO Copilot",
          icon: Sparkles,
          run: () => {
            onClose();
            onOpenCopilot();
          },
        },
        {
          label: `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`,
          icon: theme === "dark" ? Sun : Moon,
          run: () => setTheme(theme === "dark" ? "light" : "dark"),
        },
      ],
    },
  ];

  const filtered = actions
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search..."
            className="w-full py-3.5 text-sm bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground"
          />
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No results found for "{search}".
            </div>
          ) : (
            filtered.map((group, idx) => (
              <div key={idx}>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {group.category}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item, itemIdx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={itemIdx}
                        type="button"
                        onClick={() => {
                          item.run();
                          onClose();
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium rounded-lg hover:bg-secondary text-foreground text-left transition-colors"
                      >
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

