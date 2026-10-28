"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  FileCheck2,
  Sparkles,
  MessageSquare,
  BadgeCheck,
  Users,
  BarChart3,
  Sliders,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const currentUser = getCurrentUser();

  const groups = [
    {
      title: "Core",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Events", href: "/events", icon: Calendar },
        { label: "Tasks", href: "/tasks", icon: CheckSquare },
        { label: "Evidence", href: "/evidence", icon: FileCheck2 },
      ],
    },
    {
      title: "AI & Workflows",
      items: [
        { label: "AI Review", href: "/ai-review", icon: Sparkles },
        { label: "Communications", href: "/communications", icon: MessageSquare },
        { label: "Approvals", href: "/approvals", icon: BadgeCheck },
      ],
    },
    {
      title: "Coordination",
      items: [
        { label: "People & Teams", href: "/people", icon: Users },
        { label: "Reports", href: "/reports", icon: BarChart3 },
      ],
    },
    {
      title: "System",
      items: [
        { label: "Integrations", href: "/integrations", icon: Sliders },
        { label: "Automation", href: "/automation", icon: ShieldAlert },
        { label: "Audit Trail", href: "/audit", icon: FileText },
        { label: "Settings", href: "/settings", icon: Settings },
        { label: "UI Showcase", href: "/dev/components", icon: Boxes },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-card transition-all duration-300 z-30",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-black text-lg shadow-sm">
              O
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-foreground">ORDO</span>
              <span className="text-[10px] block font-mono text-muted-foreground uppercase -mt-1">
                Workflow Verification
              </span>
            </div>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground mx-auto"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {groups.map((group, idx) => (
          <div key={idx}>
            {!collapsed && (
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Status Footer */}
      {!collapsed && currentUser && (
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">
              {currentUser.full_name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">{currentUser.full_name}</div>
              <div className="text-[10px] text-muted-foreground capitalize">{currentUser.role?.replace("_", " ")}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

