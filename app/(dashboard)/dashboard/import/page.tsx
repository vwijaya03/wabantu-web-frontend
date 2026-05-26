"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/dashboard/page-header";
import { importApi, type ImportTargetTable } from "@/lib/api/import";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

const PRODUCT_TARGET: ImportTargetTable = "business_catalog_item";

const PRODUCT_COLUMNS = [
  { name: "external_code", required: true, description: "SKU/kode produk unik, contoh SKU-001" },
  { name: "name", required: true, description: "Nama produk yang tampil di katalog" },
  { name: "description", required: false, description: "Deskripsi singkat produk" },
  { name: "sell_price", required: false, description: "Harga jual angka, contoh 89000" },
  { name: "sell_unit", required: false, description: "Satuan jual, contoh pcs" },
  { name: "is_active", required: false, description: "true/false, 1/0, ya/tidak" },
  { name: "barcode", required: false, description: "Barcode bila ada" },
];

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [targetTable] = useState<ImportTargetTable>(PRODUCT_TARGET);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof importApi.preview>> | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const previewMut = useMutation({
    mutationFn: () => importApi.preview(file!, targetTable),
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
        targetTable,
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
      <PageHeader
        title="Import CSV/XLSX"
        description="Upload data produk/katalog dalam jumlah besar memakai template CSV atau XLSX."
      />

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>1. Download template produk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Jenis import</span>
                <Badge>Produk / Katalog</Badge>
              </div>
              <p className="mt-2 text-muted-foreground">
                Sistem tahu ini import produk karena target import dikirim sebagai{" "}
                <code className="rounded bg-muted px-1">business_catalog_item</code>.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
              <Button asChild variant="secondary">
                <a href="/api/import/templates/product?format=csv">
                  Download sample CSV
                </a>
              </Button>
              <Button asChild variant="secondary">
                <a href="/api/import/templates/product?format=xlsx">
                  Download sample XLSX
                </a>
              </Button>
            </div>
            <div>
              <p className="font-medium">Kolom yang didukung</p>
              <div className="mt-2 space-y-2">
                {PRODUCT_COLUMNS.map((column) => (
                  <div key={column.name} className="rounded-md border p-2">
                    <div className="flex items-center gap-2">
                      <code className="text-xs">{column.name}</code>
                      {column.required ? <Badge variant="destructive">Wajib</Badge> : <Badge variant="secondary">Opsional</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{column.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
        <CardHeader>
          <CardTitle>2. Upload dan preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">Target import: Produk / Katalog</p>
            <p className="mt-1 text-muted-foreground">
              File akan masuk ke Katalog Produk. Kolom minimal yang wajib ada:{" "}
              <code className="rounded bg-muted px-1">external_code</code> dan{" "}
              <code className="rounded bg-muted px-1">name</code>.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-file">File CSV/XLSX</Label>
            <input
              id="import-file"
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPreview(null);
                setJobId(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Gunakan template di sebelah kiri agar mapping kolom otomatis cocok.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button disabled={!file || previewMut.isPending} onClick={() => previewMut.mutate()}>
              Preview
            </Button>
            <Button
              variant="outline"
              disabled={!preview?.jobId || execMut.isPending}
              onClick={() => execMut.mutate()}
            >
              Jalankan import produk
            </Button>
          </div>
          {jobId ? <p className="text-sm text-muted-foreground">Job ID: {jobId}</p> : null}

          {preview ? (
            <div className="space-y-3">
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">Preview file</p>
                <p className="text-muted-foreground">
                  {preview.totalRows} baris terdeteksi. Mapping otomatis memakai target{" "}
                  <code className="rounded bg-muted px-1">{preview.targetTable ?? targetTable}</code>.
                </p>
              </div>

              <div className="overflow-auto rounded-lg border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      {preview.headers.map((header) => (
                        <th key={header} className="px-3 py-2 text-left font-medium">
                          <div>{header}</div>
                          <div className="mt-1 text-xs font-normal text-muted-foreground">
                            → {preview.suggestions[header] || "diabaikan"}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sampleRows.map((row, index) => (
                      <tr key={`${index}-${row.join("-")}`} className="border-t">
                        {preview.headers.map((header, colIndex) => (
                          <td key={`${header}-${colIndex}`} className="px-3 py-2">
                            {row[colIndex] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      </div>
    </>
  );
}
