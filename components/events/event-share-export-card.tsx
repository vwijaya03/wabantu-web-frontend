"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EventExportJobsPanel } from "@/components/events/event-export-jobs-panel";
import {
  buildPatientExportFilters,
  DEFAULT_HIDDEN_PATIENT_EXPORT_COLUMNS,
  PATIENT_EXPORT_ALL_THERAPIES,
  PatientExportFiltersPanel,
} from "@/components/events/patient-export-filters-panel";
import type { PatientExportColumnKey } from "@/lib/events-export";
import { eventsApi, type EventExportKind } from "@/lib/api/events";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

type ShareExportKind = Extract<
  EventExportKind,
  "patients_pdf" | "patients_xlsx" | "staff_sheet" | "staff_list"
>;

const EXPORT_ACTIONS: {
  kind: ShareExportKind;
  label: string;
  description: string;
  patient?: boolean;
}[] = [
  {
    kind: "patients_pdf",
    label: "Daftar pasien (PDF)",
    description: "Untuk dibagikan ke grup WA atau dicetak",
    patient: true,
  },
  {
    kind: "patients_xlsx",
    label: "Daftar pasien (Excel)",
    description: "Tabel pasien lengkap dengan jadwal",
    patient: true,
  },
  {
    kind: "staff_sheet",
    label: "Staf & penugasan (Excel)",
    description: "Terapis, relawan, jadwal medang, tugas sesi",
  },
  {
    kind: "staff_list",
    label: "Daftar staf (Excel)",
    description: "Nama, peran, terapi, ketersediaan",
  },
];

export function EventShareExportCard({
  eventId,
  therapies,
}: {
  eventId: string;
  therapies: { id: string; therapyName: string }[];
}) {
  const qc = useQueryClient();
  const [exportTherapyId, setExportTherapyId] = useState(PATIENT_EXPORT_ALL_THERAPIES);
  const [exportHiddenCols, setExportHiddenCols] = useState<Set<PatientExportColumnKey>>(
    () => new Set(DEFAULT_HIDDEN_PATIENT_EXPORT_COLUMNS),
  );

  const startExport = (kind: ShareExportKind) => {
    const format = kind === "patients_pdf" ? "pdf" : "xlsx";
    const isPatient = kind === "patients_pdf" || kind === "patients_xlsx";
    void eventsApi
      .createExportJob(eventId, {
        kind,
        format,
        filters: isPatient
          ? buildPatientExportFilters(exportTherapyId, exportHiddenCols)
          : undefined,
      })
      .then(() => {
        toast.success("Export masuk antrian — unduh dari riwayat di bawah");
        void qc.invalidateQueries({ queryKey: ["event-export-jobs", eventId] });
      })
      .catch((e) => toast.error(toApiError(e).message));
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Bagikan / export pengumuman</CardTitle>
        <CardDescription>
          Generate daftar pasien atau staf beserta tugas untuk dibagikan ke tim (PDF/Excel).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PatientExportFiltersPanel
          therapies={therapies}
          therapyId={exportTherapyId}
          onTherapyIdChange={setExportTherapyId}
          hiddenCols={exportHiddenCols}
          onHiddenColsChange={setExportHiddenCols}
          className="rounded-lg border bg-muted/20 p-3"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {EXPORT_ACTIONS.map((action) => (
            <div
              key={action.kind}
              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => startExport(action.kind)}
              >
                <Download className="mr-1 h-4 w-4" />
                Generate
              </Button>
            </div>
          ))}
        </div>
        <EventExportJobsPanel
          eventId={eventId}
          kinds={["patients_pdf", "patients_xlsx", "staff_sheet", "staff_list"]}
        />
      </CardContent>
    </Card>
  );
}
