"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  hiddenPatientExportColumns,
  PatientExportColumnPicker,
} from "@/components/events/patient-export-column-picker";
import {
  DEFAULT_HIDDEN_PATIENT_EXPORT_COLUMNS,
  type PatientExportColumnKey,
} from "@/lib/events-export";

const ALL_THERAPIES = "__all__";

export type PatientExportFilters = {
  therapyId?: string;
  hiddenColumns: string[];
};

export function PatientExportFiltersPanel({
  therapies,
  therapyId,
  onTherapyIdChange,
  hiddenCols,
  onHiddenColsChange,
  showTherapyHint,
  className,
}: {
  therapies: { id: string; therapyName: string }[];
  therapyId: string;
  onTherapyIdChange: (id: string) => void;
  hiddenCols: Set<PatientExportColumnKey>;
  onHiddenColsChange: (hidden: Set<PatientExportColumnKey>) => void;
  /** Tampilkan catatan bahwa filter tabel ikut dipakai */
  showTherapyHint?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Filter terapi (export pasien)</Label>
          <Select value={therapyId} onValueChange={onTherapyIdChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Semua terapi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_THERAPIES}>Semua terapi</SelectItem>
              {therapies.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.therapyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showTherapyHint ? (
            <p className="text-[11px] text-muted-foreground">
              Export mengikuti filter tabel pasien di atas (termasuk pencarian & status).
            </p>
          ) : null}
        </div>
      </div>
      <PatientExportColumnPicker
        hidden={hiddenCols}
        onChange={onHiddenColsChange}
        className="mt-3"
      />
    </div>
  );
}

export function buildPatientExportFilters(
  therapyId: string,
  hiddenCols: Set<PatientExportColumnKey>,
  extra?: {
    q?: string;
    status?: string;
    slotDate?: string;
    hasSlot?: string;
  },
): PatientExportFilters & typeof extra {
  return {
    ...extra,
    therapyId: therapyId !== ALL_THERAPIES ? therapyId : undefined,
    hiddenColumns: hiddenPatientExportColumns(hiddenCols),
  };
}

export { ALL_THERAPIES as PATIENT_EXPORT_ALL_THERAPIES, DEFAULT_HIDDEN_PATIENT_EXPORT_COLUMNS };
