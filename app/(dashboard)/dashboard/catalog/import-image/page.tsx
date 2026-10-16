"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogImportDraftTable } from "@/components/catalog/catalog-import-draft-table";
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
import { useLocale } from "@/lib/i18n/locale";
import { translateCatalogImageValidationError } from "@/lib/catalog/translate-catalog-image-validation-error";

export default function CatalogImportImagePage() {
  const { t } = useLocale();
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
      ? t(
          "Setiap penggunaan fitur AI (termasuk import dari gambar) akan mengurangi kuota token AI bulanan toko Anda. Sisa kuota token bulan ini: {remaining} dari {limit}.",
          { remaining: tokenQuota.remaining, limit: tokenQuota.limit },
        )
      : t(
          "Setiap penggunaan fitur AI (termasuk import dari gambar) akan mengurangi kuota token AI bulanan toko Anda.",
        ));

  const previewMut = useMutation({
    mutationFn: () => catalogImageApi.preview(files),
    onSuccess: (d) => {
      setPreview(d);
      setItems(d.items.map((it) => ({ ...it })));
      toast.success(
        d.imagesProcessed && d.imagesProcessed > 1
          ? t("Terdeteksi {count} baris produk dari {images} gambar (pakai {tokens} token)", {
              count: d.items.length,
              images: d.imagesProcessed,
              tokens: d.tokensUsed,
            })
          : t("Terdeteksi {count} baris produk (pakai {tokens} token) dari gambar", {
              count: d.items.length,
              tokens: d.tokensUsed,
            }),
      );
      if (d.warnings?.length) {
        d.warnings.forEach((w) => toast.warning(t(w)));
      }
    },
    onError: (e) => toast.error(t(toApiError(e).message)),
  });

  const commitMut = useMutation({
    mutationFn: () => catalogImageApi.commit(preview!.jobId, items),
    onSuccess: (res) => {
      toast.success(t(res.message));
      void qc.invalidateQueries({ queryKey: ["catalog"] });
      setPreview(null);
      setItems([]);
      setFiles([]);
      setFileError(null);
    },
    onError: (e) => toast.error(t(toApiError(e).message)),
  });

  const showFileError = (err: string) => translateCatalogImageValidationError(t, err) ?? t(err);

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
      toast.error(showFileError(err));
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
        title={t("Import katalog dari gambar")}
        description={t("Upload screenshot daftar produk (mis. Shopee). AI membaca gambar; Anda konfirmasi sebelum disimpan.")}
      />
      <p className="mb-4 text-sm">
        <Link href="/dashboard/catalog" className="text-primary underline-offset-4 hover:underline">
          {t("← Kembali ke katalog")}
        </Link>
      </p>

      <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-medium">{t("Peringatan kuota AI")}</p>
        <p className="mt-1">{quotaBanner}</p>
        {tokenQuota && tokenQuota.remaining <= 0 ? (
          <p className="mt-2 font-medium text-red-700 dark:text-red-300">
            {t("Kuota token habis — proses gambar dengan AI tidak dapat dilanjutkan sampai periode berikutnya atau upgrade paket.")}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("1. Upload screenshot")}</CardTitle>
            <CardDescription>
              {t("JPG/PNG/WEBP · maks. {maxMb} MB per file · hingga {maxFiles} gambar · total maks. {maxBatchMb} MB per proses.", { maxMb: CATALOG_IMAGE_MAX_MB, maxFiles: CATALOG_IMAGE_MAX_FILES, maxBatchMb: CATALOG_IMAGE_MAX_BATCH_MB })}
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
                {files.length > 0 && !fileError ? t("Tambah atau ganti gambar") : t("Pilih satu atau beberapa screenshot")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("JPG, PNG, atau WEBP · hingga {maxFiles} file", { maxFiles: CATALOG_IMAGE_MAX_FILES })}
              </span>
            </label>

            {files.length > 0 && !fileError ? (
              <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                <p className="font-medium text-primary">
                  {t("{count} file siap diproses · total {size}", { count: files.length, size: formatCatalogImageSize(totalBytes) })}
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
                        aria-label={t("Hapus {name}", { name: f.name })}
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
            {fileError ? <p className="text-sm text-destructive">{showFileError(fileError)}</p> : null}

            <div
              className={cn(
                "rounded-lg border p-4",
                canProcessAI ? "border-primary/40 bg-primary/5" : "border-dashed bg-muted/30",
              )}
            >
              {!canProcessAI && !previewMut.isPending ? (
                <p className="mb-3 text-sm text-muted-foreground">
                  {quotaExhausted
                    ? t("Kuota token AI habis — tombol proses nonaktif.")
                    : files.length === 0
                      ? t("Pilih minimal satu screenshot di atas untuk mengaktifkan tombol di bawah.")
                      : t("Perbaiki file yang dipilih agar tombol bisa ditekan.")}
                </p>
              ) : (
                <p className="mb-3 text-sm font-medium text-primary">
                  {t("Langkah berikutnya: baca {images} dengan AI (memakai kuota token).", { images: files.length > 1 ? t("{count} gambar", { count: files.length }) : t("gambar") })}
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
                    toast.error(showFileError(err));
                    return;
                  }
                  previewMut.mutate();
                }}
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {previewMut.isPending ? t("Memproses AI…") : t("Proses dengan AI")}
              </Button>
            </div>

            {preview ? (
              <div className="space-y-1 text-xs text-muted-foreground">
                {preview.sourceFilenames?.length ? (
                  <p>{t("Sumber: {names}", { names: preview.sourceFilenames.join(", ") })}</p>
                ) : null}
                {preview.imagesProcessed && preview.imagesProcessed > 1 ? (
                  <p>{t("Gambar diproses: {count}", { count: preview.imagesProcessed })}</p>
                ) : null}
                <p>
                  {t("Token dipakai: {used} (in {input} / out {output}). Sisa kuota: {remaining} / {limit}", { used: preview.tokensUsed, input: preview.inputTokens, output: preview.outputTokens, remaining: preview.tokenQuotaRemaining, limit: preview.tokenQuotaLimit })}
                </p>
                {preview.warnings?.map((w) => (
                  <p key={w} className="text-amber-700 dark:text-amber-300">
                    {t(w)}
                  </p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("2. Konfirmasi & simpan")}</CardTitle>
            <CardDescription>
              {t("Periksa SKU, nama, dan harga. Hanya baris yang dicentang yang disimpan ke katalog WABantu.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!preview ? (
              <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                {t("Upload dan tekan Proses dengan AI di langkah 1 terlebih dahulu.")}
              </div>
            ) : (
              <div className="space-y-3">
                {preview.parentTitle ? (
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t("Judul induk: ")}</span>
                    {preview.parentTitle}
                  </p>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  {t("{included} dari {total} baris akan disimpan", { included: includedCount, total: items.length })}
                </p>
                <div
                  className={cn(
                    "rounded-lg border p-4",
                    canSave ? "border-primary/40 bg-primary/5" : "border-dashed bg-muted/30",
                  )}
                >
                  {!canSave && !commitMut.isPending ? (
                    <p className="mb-3 text-sm text-muted-foreground">
                      {t("Centang minimal satu produk di pratinjau bawah untuk mengaktifkan simpan.")}
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
                    {commitMut.isPending ? t("Menyimpan…") : t("Simpan ke katalog")}
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
            <CardTitle>{t("Pratinjau produk")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CatalogImportDraftTable items={items} onUpdateItem={updateItem} />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
