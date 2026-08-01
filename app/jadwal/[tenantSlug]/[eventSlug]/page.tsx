"use client";

import { use, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { eventsApi, type PublicPatientScheduleRow } from "@/lib/api/events";
import { formatPatientSlotLabel } from "@/lib/events-format";
import { publicEventErrorCopy } from "@/lib/public-event-error";

/** Normalize HH:MM for ASC sort; empty → null (sorted last). */
function preferredTimeSortKey(value: string | undefined): string | null {
  const raw = (value ?? "").trim().replace(/\./g, ":");
  if (!raw) return null;
  const parts = raw.split(":");
  if (parts.length < 2) return raw;
  const h = parts[0].padStart(2, "0");
  const m = parts[1].slice(0, 2).padStart(2, "0");
  return `${h}:${m}`;
}

/** Client-side fallback: preferredTime ASC, empty last. Source of truth is API. */
function sortPatientsByPreferredTimeASC(
  patients: PublicPatientScheduleRow[],
): PublicPatientScheduleRow[] {
  return [...patients].sort((a, b) => {
    const ta = preferredTimeSortKey(a.preferredTime);
    const tb = preferredTimeSortKey(b.preferredTime);
    if (ta === null && tb === null) {
      return (a.fullName || "").localeCompare(b.fullName || "", "id");
    }
    if (ta === null) return 1;
    if (tb === null) return -1;
    if (ta !== tb) return ta < tb ? -1 : 1;
    return (a.fullName || "").localeCompare(b.fullName || "", "id");
  });
}

export default function PublicPatientSchedulePage({
  params,
}: {
  params: Promise<{ tenantSlug: string; eventSlug: string }>;
}) {
  const { tenantSlug, eventSlug } = use(params);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["public-patient-schedule", tenantSlug, eventSlug],
    queryFn: () => eventsApi.getPublicPatientSchedule(tenantSlug, eventSlug),
    staleTime: Infinity,
    retry: false,
  });

  const patients = useMemo(
    () => sortPatientsByPreferredTimeASC(data?.patients ?? []),
    [data?.patients],
  );

  if (isLoading) {
    return (
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <p className="text-lg text-foreground">Memuat jadwal...</p>
      </main>
    );
  }

  if (error || !data) {
    const copy = error
      ? publicEventErrorCopy(error)
      : { title: "Acara tidak ditemukan", message: "Acara tidak ditemukan" };
    return (
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">{copy.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base text-foreground/80 sm:text-lg">{copy.message}</p>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 text-base"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCw className={`mr-2 size-4 ${isFetching ? "animate-spin" : ""}`} />
              Muat ulang
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {data.eventName}
          </h1>
          <p className="text-base text-foreground/80 sm:text-lg">Jadwal pasien terjadwal</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 text-base"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          <RefreshCw className={`mr-2 size-4 ${isFetching ? "animate-spin" : ""}`} />
          Muat ulang
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl">Pasien ({patients.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
          {patients.length === 0 ? (
            <p className="px-6 pb-6 text-base text-foreground/80 sm:px-0 sm:pb-0 sm:text-lg">
              Belum ada pasien terjadwal.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-12 px-4 text-base font-semibold text-foreground">
                    Pasien
                  </TableHead>
                  <TableHead className="h-12 px-4 text-base font-semibold text-foreground">
                    Terapi
                  </TableHead>
                  <TableHead className="h-12 px-4 text-base font-semibold text-foreground">
                    Jadwal
                  </TableHead>
                  <TableHead className="h-12 px-4 text-base font-semibold text-foreground">
                    Jam preferensi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p, index) => (
                  <TableRow key={`${p.fullName}-${p.slotLabel}-${index}`}>
                    <TableCell className="px-4 py-4 text-lg font-semibold text-foreground">
                      {p.fullName}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-lg text-foreground">
                      {p.therapyName?.trim() || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-base text-foreground sm:text-lg">
                      {formatPatientSlotLabel(p.slotLabel) || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-lg font-medium tabular-nums text-foreground">
                      {p.preferredTime?.trim().slice(0, 5) || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
