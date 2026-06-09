"use client";

import { cn } from "@/lib/utils";
import {
  PATIENT_EXPORT_OPTIONAL_COLUMNS,
  type PatientExportColumnKey,
} from "@/lib/events-export";

export function PatientExportColumnPicker({
  hidden,
  onChange,
  className,
}: {
  hidden: Set<PatientExportColumnKey>;
  onChange: (hidden: Set<PatientExportColumnKey>) => void;
  className?: string;
}) {
  const toggle = (key: PatientExportColumnKey) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium text-muted-foreground">Kolom export (centang = tampil)</p>
      <div className="flex flex-wrap gap-2">
        {PATIENT_EXPORT_OPTIONAL_COLUMNS.map((col) => {
          const visible = !hidden.has(col.key);
          return (
            <button
              key={col.key}
              type="button"
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                visible
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-muted bg-muted/40 text-muted-foreground",
              )}
              onClick={() => toggle(col.key)}
            >
              {col.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">No dan Nama selalu disertakan.</p>
    </div>
  );
}

export function hiddenPatientExportColumns(hidden: Set<PatientExportColumnKey>): string[] {
  return PATIENT_EXPORT_OPTIONAL_COLUMNS.filter((c) => hidden.has(c.key)).map((c) => c.key);
}
