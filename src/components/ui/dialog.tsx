"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Minimal, dependency-free modal built on the native <dialog> element.
 * Handles focus-trapping and Escape-to-close for free via the platform.
 */
export function Dialog({ open, onClose, title, description, className, children }: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-full max-w-2xl rounded-xl border border-border bg-surface p-0 shadow-xl backdrop:bg-black/50",
        className,
      )}
    >
      <div className="flex items-start justify-between border-b border-border p-5">
        <div>
          {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-muted-foreground hover:bg-surface-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
    </dialog>
  );
}
