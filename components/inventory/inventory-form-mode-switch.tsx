"use client";

import { cn } from "@/lib/utils";

export type InventoryFormMode = "single" | "bulk";

export function InventoryFormModeSwitch({
  mode,
  onChange,
  singleLabel = "Satu per satu",
  bulkLabel = "Massal",
}: {
  mode: InventoryFormMode;
  onChange: (mode: InventoryFormMode) => void;
  singleLabel?: string;
  bulkLabel?: string;
}) {
  return (
    <div className="inline-flex gap-1 rounded-lg border bg-muted/40 p-1">
      {([
        ["single", singleLabel],
        ["bulk", bulkLabel],
      ] as const).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            mode === value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
