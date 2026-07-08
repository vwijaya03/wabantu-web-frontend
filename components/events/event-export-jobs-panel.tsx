"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { eventsApi, type EventExportJob, type EventExportKind } from "@/lib/api/events";
import { useAuth } from "@/components/providers/auth-provider";
import { tenantContextKey } from "@/lib/auth/tenant-context";
import { eventExportJobsKey } from "@/lib/query/events-query-keys";
import { downloadDataUrl } from "@/lib/download";
import { cn } from "@/lib/utils";

function exportKindLabel(kind: EventExportKind) {
  switch (kind) {
    case "staff_sheet":
      return "Lembar operasional staf (Excel)";
    case "staff_list":
      return "Daftar staf & relawan (Excel)";
    case "patients_xlsx":
      return "Daftar pasien (Excel)";
    default:
      return "Daftar pasien (PDF)";
  }
}

function exportFormatLabel(job: EventExportJob) {
  const fmt = job.format?.toLowerCase();
  if (fmt === "xlsx") return "XLSX";
  if (fmt === "pdf") return "PDF";
  if (job.downloadUrl?.includes("spreadsheetml")) return "XLSX";
  return "PDF";
}

function exportStatusLabel(status: string) {
  switch (status) {
    case "done":
      return "Selesai";
    case "failed":
      return "Gagal";
    case "processing":
      return "Memproses";
    case "queued":
      return "Antrian";
    default:
      return status;
  }
}

function exportFileName(job: EventExportJob) {
  if (job.fileName) return job.fileName;
  const ext = exportFormatLabel(job).toLowerCase();
  const date = job.createdAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  return `wabantu-${job.kind}-${date}-${job.id.slice(0, 8)}.${ext}`;
}

export function EventExportJobsPanel({
  eventId,
  kinds,
  className,
}: {
  eventId: string;
  kinds?: EventExportKind[];
  className?: string;
}) {
  const { user } = useAuth();
  const tenantKey = tenantContextKey(user);
  const { data, refetch, isFetching } = useQuery({
    queryKey: eventExportJobsKey(tenantKey, eventId),
    queryFn: () => eventsApi.listExportJobs(eventId),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const hasProcessing = items.some((j) => j.status === "processing" || j.status === "queued");
      return hasProcessing ? 3000 : false;
    },
  });

  const items = (data?.items ?? []).filter((j) => !kinds?.length || kinds.includes(j.kind));

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-base">Riwayat export</CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada export. Generate dari tab Pasien atau Staf — file siap unduh akan muncul di sini.
          </p>
        ) : null}
        {items.map((j) => (
          <div key={j.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
            <div className="flex items-center gap-2">
              {j.kind === "staff_sheet" || j.kind === "staff_list" || j.kind === "patients_xlsx" ? (
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">{exportKindLabel(j.kind)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(j.createdAt).toLocaleString("id-ID")}
                  {j.rowCount != null && j.status === "done" ? ` · ${j.rowCount} baris` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="uppercase">
                {exportFormatLabel(j)}
              </Badge>
              <Badge
                variant={j.status === "done" ? "default" : j.status === "failed" ? "destructive" : "secondary"}
              >
                {exportStatusLabel(j.status)}
              </Badge>
              {j.errorMsg && j.status !== "done" ? (
                <p
                  className={cn(
                    "max-w-[280px] truncate text-xs",
                    j.status === "failed" ? "text-destructive" : "text-muted-foreground",
                  )}
                  title={j.errorMsg}
                >
                  {j.errorMsg}
                </p>
              ) : null}
              {j.status === "done" && j.downloadUrl ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadDataUrl(j.downloadUrl!, exportFileName(j))}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
