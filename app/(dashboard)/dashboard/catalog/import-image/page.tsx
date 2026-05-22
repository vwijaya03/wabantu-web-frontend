"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  catalogImageApi,
  type CatalogImageDraftItem,
  type CatalogImagePreview,
} from "@/lib/api/catalogImage";
import { usageApi } from "@/lib/api/usage";
import { toApiError } from "@/lib/api/client";
import {
  CATALOG_IMAGE_ACCEPT,
  CATALOG_IMAGE_MAX_BATCH_MB,
  CATALOG_IMAGE_MAX_FILES,
  CATALOG_IMAGE_MAX_MB,
  formatCatalogImageSize,
  validateCatalogImageFiles,
} from "@/lib/catalog-image-limits";
import { cn } from "@/lib/utils";
import { ImageUp, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";

export default function CatalogImportImagePage() {
  const qc = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CatalogImagePreview | null>(null);
  const [items, setItems] = useState<CatalogImageDraftItem[]>([]);

  const { data: usage } = useQuery({
    queryKey: ["usage-summary"],
    queryFn: () => usageApi.summary(),
  });

  const tokenQuota = useMemo(
    () => usage?.quotas.find((q) => q.eventType === "ai_token"),
    [usage],
  );

  const totalBytes = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files]);

  const quotaBanner =
    preview?.quotaNotice ??
    (tokenQuota
      ? `Setiap penggunaan fitur AI (termasuk import dari gambar) akan mengurangi kuota token AI bulanan toko Anda. Sisa kuota token bulan ini: ${tokenQuota.remaining} dari ${tokenQuota.limit}.`
      : "Setiap penggunaan fitur AI (termasuk import dari gambar) akan mengurangi kuota token AI bulanan toko Anda.");

  const previewMut = useMutation({
    mutationFn: () => catalogImageApi.preview(files),
    onSuccess: (d) => {
      setPreview(d);
      setItems(d.items.map((it) => ({ ...it })));
      const imgPart =
        d.imagesProcessed && d.imagesProcessed > 1
          ? ` dari ${d.imagesProcessed} gambar`
          : "";
      toast.success(`Terdeteksi ${d.items.length} baris produk${imgPart} (pakai ${d.tokensUsed} token)`);
      if (d.warnings?.length) {
        d.warnings.forEach((w) => toast.warning(w));
      }
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const commitMut = useMutation({
    mutationFn: () => catalogImageApi.commit(preview!.jobId, items),
    onSuccess: (res) => {
      toast.success(res.message);
      void qc.invalidateQueries({ queryKey: ["catalog"] });
      setPreview(null);
      setItems([]);
      setFiles([]);
      setFileError(null);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const updateItem = (idx: number, patch: Partial<CatalogImageDraftItem>) => {
    setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const err = next.length ? validateCatalogImageFiles(next) : null;
      setFileError(err);
      return next;
    });
    setPreview(null);
    setItems([]);
  };

  const applyPickedFiles = (picked: FileList | null) => {
    if (!picked?.length) return;
    const merged = [...files, ...Array.from(picked)];
    const err = validateCatalogImageFiles(merged);
    setFileError(err);
    if (err) {
      toast.error(err);
      return;
    }
    setFiles(merged);
    setPreview(null);
    setItems([]);
  };

  const includedCount = items.filter((i) => i.include).length;

  const quotaExhausted = tokenQuota != null && tokenQuota.remaining <= 0;
  const canProcessAI = files.length > 0 && !fileError && !previewMut.isPending && !quotaExhausted;
  const canSave = !!preview && includedCount > 0 && !commitMut.isPending;

  return (
    <>
      <PageHeader
        title="Import katalog dari gambar"
        description="Upload screenshot daftar produk (mis. Shopee). AI membaca gambar; Anda konfirmasi sebelum disimpan."
      />
      <p className="mb-4 text-sm">
        <Link href="/dashboard/catalog" className="text-primary underline-offset-4 hover:underline">
          ← Kembali ke katalog
        </Link>
      </p>

      <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-medium">Peringatan kuota AI</p>
        <p className="mt-1">{quotaBanner}</p>
        {tokenQuota && tokenQuota.remaining <= 0 ? (
          <p className="mt-2 font-medium text-red-700 dark:text-red-300">
            Kuota token habis — proses gambar dengan AI tidak dapat dilanjutkan sampai periode berikutnya atau upgrade paket.
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Upload screenshot</CardTitle>
            <CardDescription>
              JPG/PNG/WEBP · maks. {CATALOG_IMAGE_MAX_MB} MB per file · hingga {CATALOG_IMAGE_MAX_FILES}{" "}
              gambar · total maks. {CATALOG_IMAGE_MAX_BATCH_MB} MB per proses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label
              htmlFor="catalog-image-file"
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
                files.length > 0 && !fileError
                  ? "border-primary bg-primary/5 hover:bg-primary/10"
                  : "border-muted-foreground/35 bg-muted/40 hover:border-primary/50 hover:bg-muted/60",
                previewMut.isPending && "pointer-events-none opacity-60",
              )}
            >
              <input
                id="catalog-image-file"
                type="file"
                accept={CATALOG_IMAGE_ACCEPT}
                multiple
                className="sr-only"
                disabled={previewMut.isPending || files.length >= CATALOG_IMAGE_MAX_FILES}
                onChange={(e) => {
                  applyPickedFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              {files.length > 0 && !fileError ? (
                <ImageUp className="h-9 w-9 text-primary" aria-hidden />
              ) : (
                <Upload className="h-9 w-9 text-muted-foreground" aria-hidden />
              )}
              <span className="text-sm font-medium">
                {files.length > 0 && !fileError ? "Tambah atau ganti gambar" : "Pilih satu atau beberapa screenshot"}
              </span>
              <span className="text-xs text-muted-foreground">
                JPG, PNG, atau WEBP · hingga {CATALOG_IMAGE_MAX_FILES} file
              </span>
            </label>

            {files.length > 0 && !fileError ? (
              <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                <p className="font-medium text-primary">
                  {files.length} file siap diproses · total {formatCatalogImageSize(totalBytes)}
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {f.name} · {formatCatalogImageSize(f.size)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        aria-label={`Hapus ${f.name}`}
                        disabled={previewMut.isPending}
                        onClick={() => removeFile(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}

            <div
              className={cn(
                "rounded-lg border p-4",
                canProcessAI ? "border-primary/40 bg-primary/5" : "border-dashed bg-muted/30",
              )}
            >
              {!canProcessAI && !previewMut.isPending ? (
                <p className="mb-3 text-sm text-muted-foreground">
                  {quotaExhausted
                    ? "Kuota token AI habis — tombol proses nonaktif."
                    : files.length === 0
                      ? "Pilih minimal satu screenshot di atas untuk mengaktifkan tombol di bawah."
                      : "Perbaiki file yang dipilih agar tombol bisa ditekan."}
                </p>
              ) : (
                <p className="mb-3 text-sm font-medium text-primary">
                  Langkah berikutnya: baca {files.length > 1 ? `${files.length} gambar` : "gambar"} dengan AI (memakai
                  kuota token).
                </p>
              )}
              <Button
                type="button"
                size="lg"
                className={cn(
                  "w-full shadow-sm",
                  canProcessAI && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
                )}
                variant={canProcessAI ? "default" : "secondary"}
                disabled={!canProcessAI}
                aria-disabled={!canProcessAI}
                onClick={() => {
                  const err = validateCatalogImageFiles(files);
                  if (err) {
                    toast.error(err);
                    return;
                  }
                  previewMut.mutate();
                }}
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {previewMut.isPending ? "Memproses AI…" : "Proses dengan AI"}
              </Button>
            </div>

            {preview ? (
              <div className="space-y-1 text-xs text-muted-foreground">
                {preview.sourceFilenames?.length ? (
                  <p>Sumber: {preview.sourceFilenames.join(", ")}</p>
                ) : null}
                {preview.imagesProcessed && preview.imagesProcessed > 1 ? (
                  <p>Gambar diproses: {preview.imagesProcessed}</p>
                ) : null}
                <p>
                  Token dipakai: {preview.tokensUsed} (in {preview.inputTokens} / out {preview.outputTokens}). Sisa
                  kuota: {preview.tokenQuotaRemaining} / {preview.tokenQuotaLimit}
                </p>
                {preview.warnings?.map((w) => (
                  <p key={w} className="text-amber-700 dark:text-amber-300">
                    {w}
                  </p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Konfirmasi & simpan</CardTitle>
            <CardDescription>
              Periksa SKU, nama, dan harga. Hanya baris yang dicentang yang disimpan ke katalog WABantu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!preview ? (
              <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                Upload dan tekan <span className="font-medium">Proses dengan AI</span> di langkah 1 terlebih
                dahulu.
              </div>
            ) : (
              <div className="space-y-3">
                {preview.parentTitle ? (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Judul induk: </span>
                    {preview.parentTitle}
                  </p>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  {includedCount} dari {items.length} baris akan disimpan
                </p>
                <div
                  className={cn(
                    "rounded-lg border p-4",
                    canSave ? "border-primary/40 bg-primary/5" : "border-dashed bg-muted/30",
                  )}
                >
                  {!canSave && !commitMut.isPending ? (
                    <p className="mb-3 text-sm text-muted-foreground">
                      Centang minimal satu produk di pratinjau bawah untuk mengaktifkan simpan.
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    size="lg"
                    className={cn("w-full", canSave && "ring-2 ring-primary/30 ring-offset-2")}
                    variant={canSave ? "default" : "secondary"}
                    disabled={!canSave}
                    onClick={() => commitMut.mutate()}
                  >
                    {commitMut.isPending ? "Menyimpan…" : "Simpan ke katalog"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {items.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pratinjau produk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((row, idx) => (
              <div key={`${row.externalCode}-${idx}`} className="grid gap-2 rounded border p-3 md:grid-cols-12 md:items-end">
                <div className="flex items-center gap-2 md:col-span-1">
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) => updateItem(idx, { include: e.target.checked })}
                    aria-label="Sertakan"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">SKU / Kode</Label>
                  <Input
                    value={row.externalCode}
                    onChange={(e) => updateItem(idx, { externalCode: e.target.value })}
                  />
                </div>
                <div className="md:col-span-5">
                  <Label className="text-xs">Nama</Label>
                  <Input value={row.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Harga (IDR)</Label>
                  <Input
                    type="number"
                    value={row.sellPrice ?? ""}
                    onChange={(e) =>
                      updateItem(idx, {
                        sellPrice: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Satuan</Label>
                  <Input
                    value={row.sellUnit ?? "pcs"}
                    onChange={(e) => updateItem(idx, { sellUnit: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
