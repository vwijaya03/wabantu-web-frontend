"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { importApi } from "@/lib/api/import";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof importApi.preview>> | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const previewMut = useMutation({
    mutationFn: () => importApi.preview(file!),
    onSuccess: (d) => {
      setPreview(d);
      setJobId(d.jobId);
      toast.success(`Preview: ${d.totalRows} baris (job ${d.jobId})`);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const execMut = useMutation({
    mutationFn: async () => {
      if (!preview?.jobId) throw new Error("preview dulu");
      return importApi.execute({
        jobId: preview.jobId,
        targetTable: "business_catalog_item",
        columnMapping: preview.suggestions,
      });
    },
    onSuccess: (res) => {
      setJobId(res.jobId);
      toast.success("Import masuk antrian");
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <>
      <PageHeader title="Import CSV/XLSX" description="Bulk update katalog atau FAQ." />
      <Card>
        <CardHeader>
          <CardTitle>Upload file</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
              setJobId(null);
            }}
          />
          <Button disabled={!file || previewMut.isPending} onClick={() => previewMut.mutate()}>
            Preview
          </Button>
          <Button
            variant="outline"
            disabled={!preview?.jobId || execMut.isPending}
            onClick={() => execMut.mutate()}
          >
            Jalankan import
          </Button>
          {jobId ? <p className="text-sm text-muted-foreground">Job ID: {jobId}</p> : null}
          {preview ? (
            <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
              {JSON.stringify(preview.suggestions, null, 2)}
            </pre>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
