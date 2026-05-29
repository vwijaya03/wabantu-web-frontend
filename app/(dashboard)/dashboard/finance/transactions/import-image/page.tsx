"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  financeApi,
  formatIDR,
  txnTypeColor,
  txnTypeLabel,
} from "@/lib/api/finance";
import {
  matchCategoryId,
  matchWalletId,
  transactionImageApi,
  TYPE_SIGNAL_LABELS,
  type TransactionImageDraftItem,
  type TransactionImagePreview,
} from "@/lib/api/transactionImage";
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
import { invalidateFinanceCaches } from "@/lib/finance/utils";
import { cn } from "@/lib/utils";
import { ImageUp, MinusCircle, PlusCircle, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";

function applyWalletCategoryHints(
  rows: TransactionImageDraftItem[],
  wallets: { id: string; name: string }[],
  categories: { id: string; name: string; type: string }[],
): TransactionImageDraftItem[] {
  return rows.map((row) => ({
    ...row,
    walletId: matchWalletId(wallets, row.walletNameHint, row.walletId) || row.walletId,
    categoryId:
      matchCategoryId(categories, row.type, row.categoryNameHint, row.categoryId) || row.categoryId,
  }));
}

export default function TransactionImportImagePage() {
  const qc = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TransactionImagePreview | null>(null);
  const [items, setItems] = useState<TransactionImageDraftItem[]>([]);

  const { data: usage } = useQuery({
    queryKey: ["usage-summary"],
    queryFn: () => usageApi.summary(),
  });
  const { data: walletsData } = useQuery({
    queryKey: ["finance-wallets"],
    queryFn: () => financeApi.listWallets(),
  });
  const { data: categoriesData } = useQuery({
    queryKey: ["finance-categories"],
    queryFn: () => financeApi.listCategories(),
  });
  const { data: txnTypesData } = useQuery({
    queryKey: ["finance-transaction-types", "import"],
    queryFn: () => financeApi.listTransactionTypes({ pageSize: 100 }),
  });

  const wallets = walletsData?.wallets ?? [];
  const categories = categoriesData?.categories ?? [];
  const txnTypes = txnTypesData?.items ?? [];

  const tokenQuota = useMemo(
    () => usage?.quotas.find((q) => q.eventType === "ai_token"),
    [usage],
  );

  const totalBytes = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files]);

  const quotaBanner =
    preview?.quotaNotice ??
    (tokenQuota
      ? `Setiap penggunaan fitur AI (termasuk import transaksi dari gambar) akan mengurangi kuota token AI bulanan toko Anda. Sisa kuota token bulan ini: ${tokenQuota.remaining} dari ${tokenQuota.limit}.`
      : "Setiap penggunaan fitur AI (termasuk import transaksi dari gambar) akan mengurangi kuota token AI bulanan toko Anda.");

  const previewMut = useMutation({
    mutationFn: () => transactionImageApi.preview(files),
    onSuccess: (d) => {
      setPreview(d);
      const enriched = applyWalletCategoryHints(d.items, wallets, categories);
      setItems(enriched.map((it) => ({ ...it })));
      const imgPart =
        d.imagesProcessed && d.imagesProcessed > 1 ? ` dari ${d.imagesProcessed} gambar` : "";
      toast.success(`Terdeteksi ${d.items.length} transaksi${imgPart} (pakai ${d.tokensUsed} token)`);
      d.warnings?.forEach((w) => toast.warning(w));
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const commitMut = useMutation({
    mutationFn: () => transactionImageApi.commit(preview!.jobId, items),
    onSuccess: (res) => {
      toast.success(res.message);
      invalidateFinanceCaches(qc);
      setPreview(null);
      setItems([]);
      setFiles([]);
      setFileError(null);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const updateItem = (idx: number, patch: Partial<TransactionImageDraftItem>) => {
    setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setFileError(next.length ? validateCatalogImageFiles(next) : null);
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
  const canSave =
    !!preview &&
    includedCount > 0 &&
    !commitMut.isPending &&
    items.filter((i) => i.include).every((i) => i.amount > 0 && i.walletId);

  return (
    <>
      <PageHeader
        title="Import transaksi dari gambar"
        description="Upload screenshot daftar transaksi (mis. halaman Transaksi WABantu). AI membaca baris, jenis masuk/keluar, dan nominal — Anda konfirmasi sebelum disimpan."
      />
      <p className="mb-4 text-sm">
        <Link
          href="/dashboard/finance/transactions"
          className="text-primary underline-offset-4 hover:underline"
        >
          ← Kembali ke transaksi
        </Link>
      </p>

      <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-medium">Peringatan kuota AI</p>
        <p className="mt-1">{quotaBanner}</p>
        {quotaExhausted ? (
          <p className="mt-2 font-medium text-red-700 dark:text-red-300">
            Kuota token habis — proses gambar dengan AI tidak dapat dilanjutkan.
          </p>
        ) : null}
      </div>

      <Card className="mb-6 border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cara AI membedakan uang masuk vs keluar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-green-700 dark:text-green-400">Pemasukan</span>: ikon
            hijau / tanda <strong>+</strong> / nominal hijau / label &quot;Pemasukan&quot;.
          </p>
          <p>
            <span className="font-medium text-red-700 dark:text-red-400">Pengeluaran</span>: ikon
            merah / tanda <strong>−</strong> / nominal merah / label &quot;Pengeluaran&quot;.
          </p>
          <p>Screenshot mutasi bank: CR/kredit biasanya masuk, DB/debit biasanya keluar (sudut pandang Anda).</p>
          <p className="text-xs">Periksa kolom jenis di pratinjau — Anda bisa mengubah sebelum simpan.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Upload screenshot</CardTitle>
            <CardDescription>
              JPG/PNG/WEBP · maks. {CATALOG_IMAGE_MAX_MB} MB per file · hingga {CATALOG_IMAGE_MAX_FILES}{" "}
              gambar · total maks. {CATALOG_IMAGE_MAX_BATCH_MB} MB.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label
              htmlFor="txn-image-file"
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
                files.length > 0 && !fileError
                  ? "border-primary bg-primary/5 hover:bg-primary/10"
                  : "border-muted-foreground/35 bg-muted/40 hover:border-primary/50",
                previewMut.isPending && "pointer-events-none opacity-60",
              )}
            >
              <input
                id="txn-image-file"
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
              <span className="text-sm font-medium">Pilih screenshot daftar transaksi</span>
            </label>

            {files.length > 0 && !fileError ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {f.name} · {formatCatalogImageSize(f.size)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeFile(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}

            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={!canProcessAI}
              onClick={() => previewMut.mutate()}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {previewMut.isPending ? "Memproses AI…" : "Proses dengan AI"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Konfirmasi & simpan</CardTitle>
            <CardDescription>
              Centang baris yang benar, perbaiki dompet/kategori/tanggal, lalu simpan ke Catat
              Transaksi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!preview ? (
              <p className="text-sm text-muted-foreground">Proses gambar di langkah 1 terlebih dahulu.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {includedCount} dari {items.length} transaksi akan disimpan
                </p>
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  disabled={!canSave}
                  onClick={() => commitMut.mutate()}
                >
                  {commitMut.isPending ? "Menyimpan…" : "Simpan transaksi terpilih"}
                </Button>
                {includedCount > 0 && items.some((i) => i.include && !i.walletId) ? (
                  <p className="text-xs text-destructive">Setiap baris tercentang perlu dompet.</p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {items.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pratinjau transaksi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((row, idx) => {
              const isIncome = row.type === "income";
              return (
                <div
                  key={row.draftKey}
                  className={cn(
                    "grid gap-3 rounded-lg border p-3 md:grid-cols-12 md:items-end",
                    row.include ? "border-primary/30" : "opacity-60",
                  )}
                >
                  <div className="flex items-center gap-2 md:col-span-1">
                    <input
                      type="checkbox"
                      checked={row.include}
                      onChange={(e) => updateItem(idx, { include: e.target.checked })}
                      aria-label="Sertakan"
                    />
                    {isIncome ? (
                      <PlusCircle className="h-5 w-5 text-green-600" aria-hidden />
                    ) : (
                      <MinusCircle className="h-5 w-5 text-red-600" aria-hidden />
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Jenis</Label>
                    <Select
                      value={row.type}
                      onValueChange={(v) =>
                        updateItem(idx, {
                          type: v as "income" | "expense",
                          categoryId: matchCategoryId(categories, v as "income" | "expense"),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Pemasukan</SelectItem>
                        <SelectItem value="expense">Pengeluaran</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-xs">Deskripsi</Label>
                    <Input
                      value={row.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Jumlah (IDR)</Label>
                    <Input
                      type="number"
                      value={row.amount || ""}
                      onChange={(e) =>
                        updateItem(idx, { amount: e.target.value === "" ? 0 : Number(e.target.value) })
                      }
                      className={txnTypeColor(row.type, txnTypes)}
                    />
                    <p className={cn("mt-1 text-xs font-medium", txnTypeColor(row.type, txnTypes))}>
                      {isIncome ? "+" : "−"}
                      {formatIDR(row.amount)}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Tanggal</Label>
                    <Input
                      type="date"
                      value={row.transactionDate}
                      onChange={(e) => updateItem(idx, { transactionDate: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Dompet</Label>
                    <Select
                      value={row.walletId || ""}
                      onValueChange={(v) => updateItem(idx, { walletId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={row.walletNameHint || "Pilih dompet"} />
                      </SelectTrigger>
                      <SelectContent>
                        {wallets.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-12 md:col-start-2">
                    <Label className="text-xs">Kategori</Label>
                    <Select
                      value={row.categoryId || ""}
                      onValueChange={(v) => updateItem(idx, { categoryId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={row.categoryNameHint || "Opsional"} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          .filter((c) => c.type === row.type || c.type === "any")
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {row.typeSignals && row.typeSignals.length > 0 ? (
                      <p className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                        Petunjuk AI:{" "}
                        {row.typeSignals.map((s) => (
                          <span key={s} className="rounded bg-muted px-1">
                            {TYPE_SIGNAL_LABELS[s] ?? s}
                          </span>
                        ))}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {txnTypeLabel(row.type, txnTypes)}
                      {row.walletNameHint ? ` · petunjuk dompet: ${row.walletNameHint}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
