"use client";

import { use } from "react";
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
import { eventsApi } from "@/lib/api/events";
import { formatPatientSlotLabel } from "@/lib/events-format";
import { publicEventErrorCopy } from "@/lib/public-event-error";

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

  if (isLoading) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="text-muted-foreground">Memuat...</p>
      </main>
    );
  }

  if (error || !data) {
    const copy = error
      ? publicEventErrorCopy(error)
      : { title: "Acara tidak ditemukan", message: "Acara tidak ditemukan" };
    return (
      <main className="mx-auto max-w-5xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>{copy.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{copy.message}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
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

  const patients = data.patients ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{data.eventName}</h1>
          <p className="text-sm text-muted-foreground">Jadwal pasien terjadwal</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          <RefreshCw className={`mr-2 size-4 ${isFetching ? "animate-spin" : ""}`} />
          Muat ulang
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pasien ({patients.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
          {patients.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground sm:px-0 sm:pb-0">
              Belum ada pasien terjadwal.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pasien</TableHead>
                  <TableHead>Terapi</TableHead>
                  <TableHead>Jadwal</TableHead>
                  <TableHead>Jam preferensi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p, index) => (
                  <TableRow key={`${p.fullName}-${p.slotLabel}-${index}`}>
                    <TableCell className="font-medium">{p.fullName}</TableCell>
                    <TableCell>{p.therapyName?.trim() || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatPatientSlotLabel(p.slotLabel) || "—"}
                    </TableCell>
                    <TableCell>{p.preferredTime?.trim().slice(0, 5) || "—"}</TableCell>
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
