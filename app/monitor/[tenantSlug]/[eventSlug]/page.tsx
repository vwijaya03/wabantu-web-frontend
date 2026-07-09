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
import { toApiError } from "@/lib/api/client";

function therapyLabel(names: string[], isPencatat: boolean) {
  const base = names.length > 0 ? names.join(", ") : "—";
  return isPencatat ? `${base} · Pencatat` : base;
}

export default function PublicStaffMonitorPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; eventSlug: string }>;
}) {
  const { tenantSlug, eventSlug } = use(params);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["public-staff-monitor", tenantSlug, eventSlug],
    queryFn: () => eventsApi.getPublicStaffMonitor(tenantSlug, eventSlug),
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
    const message = error ? toApiError(error).message : "Acara tidak tersedia";
    return (
      <main className="mx-auto max-w-5xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Tidak tersedia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{message}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{data.eventName}</h1>
          <p className="text-sm text-muted-foreground">
            Pantau daftar staf · {data.startDate} — {data.endDate}
            {data.location ? ` · ${data.location}` : ""}
          </p>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unik (konsumsi)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data.mealConsumptionCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Kapasitas terapi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.therapyCapacity.length === 0 ? (
              <p className="text-muted-foreground">Belum ada terapi.</p>
            ) : (
              data.therapyCapacity.map((row) => (
                <div key={row.therapyId} className="flex justify-between gap-2">
                  <span>{row.therapyName}</span>
                  <span className="font-medium tabular-nums">
                    {row.current} / {row.max}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daftar staf ({data.staff.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Terapi</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    Belum ada staf terdaftar.
                  </TableCell>
                </TableRow>
              ) : (
                data.staff.map((person) => (
                  <TableRow key={`${person.fullName}-${person.roleLabel}-${person.therapyNames.join(",")}`}>
                    <TableCell className="font-medium">{person.fullName}</TableCell>
                    <TableCell>{person.roleLabel}</TableCell>
                    <TableCell>{therapyLabel(person.therapyNames, person.isPencatat)}</TableCell>
                    <TableCell className="max-w-xs whitespace-pre-wrap text-muted-foreground">
                      {person.notes?.trim() || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
