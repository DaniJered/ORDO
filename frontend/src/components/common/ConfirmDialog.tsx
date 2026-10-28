"use client";

import React from "react";
import { AlertCircle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md p-6 bg-card rounded-2xl border border-border shadow-2xl">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`p-3 rounded-full ${
              isDestructive
                ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                : "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
            }`}
          >
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-secondary text-foreground transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors ${
              isDestructive ? "bg-rose-600 hover:bg-rose-700" : "bg-primary hover:bg-primary/90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

