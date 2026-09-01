"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Textarea } from "@/components/ui/textarea";
import { CatalogImportDraftTable } from "@/components/catalog/catalog-import-draft-table";
import { catalogTextApi } from "@/lib/api/catalogText";
import type { CatalogImageDraftItem, CatalogImagePreview } from "@/lib/api/catalogImage";
import { usageApi } from "@/lib/api/usage";
import { toApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MIN_TEXT_LEN = 10;
const MAX_TEXT_LEN = 12000;

export default function CatalogImportTextPage() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
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

  const quotaBanner =
    preview?.quotaNotice ??
    (tokenQuota
      ? `Setiap penggunaan fitur AI (termasuk import dari teks) akan mengurangi kuota token AI bulanan toko Anda. Sisa kuota token bulan ini: ${tokenQuota.remaining} dari ${tokenQuota.limit}.`
      : "Setiap penggunaan fitur AI (termasuk import dari teks) akan mengurangi kuota token AI bulanan toko Anda.");

  const previewMut = useMutation({
    mutationFn: () => catalogTextApi.preview(text.trim()),
    onSuccess: (d) => {
      setPreview(d);
      setItems(d.items.map((it) => ({ ...it })));
      toast.success(`Terdeteksi ${d.items.length} baris produk (pakai ${d.tokensUsed} token)`);
      if (d.warnings?.length) {
        d.warnings.forEach((w) => toast.warning(w));
      }
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const commitMut = useMutation({
    mutationFn: () => catalogTextApi.commit(preview!.jobId, items),
    onSuccess: (res) => {
      toast.success(res.message);
      void qc.invalidateQueries({ queryKey: ["catalog"] });
      setPreview(null);
      setItems([]);
      setText("");
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const updateItem = (idx: number, patch: Partial<CatalogImageDraftItem>) => {
    setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const trimmedLen = text.trim().length;
  const quotaExhausted = tokenQuota != null && tokenQuota.remaining <= 0;
  const canProcessAI =
    trimmedLen >= MIN_TEXT_LEN &&
    trimmedLen <= MAX_TEXT_LEN &&
    !previewMut.isPending &&
    !quotaExhausted;
  const includedCount = items.filter((i) => i.include).length;
  const canSave = !!preview && includedCount > 0 && !commitMut.isPending;

  return (
    <>
      <PageHeader
        title="Import katalog dari teks"
        description="Tempel deskripsi produk dari WhatsApp atau caption marketplace. AI memecah jadi baris produk; Anda konfirmasi sebelum disimpan."
      />
      <p className="mb-4 text-sm">
        <Link href="/dashboard/catalog" className="text-primary underline-offset-4 hover:underline">
          ← Kembali ke katalog
        </Link>
      </p>

      <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-medium">Peringatan kuota AI</p>
        <p className="mt-1">{quotaBanner}</p>
        {quotaExhausted ? (
          <p className="mt-2 font-medium text-red-700 dark:text-red-300">
            Kuota token habis — proses teks dengan AI tidak dapat dilanjutkan sampai periode berikutnya atau upgrade paket.
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Tempel teks produk</CardTitle>
            <CardDescription>
              Satu atau beberapa produk/varian. Pisahkan blok produk berbeda dengan baris kosong atau tanda &quot;-&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setPreview(null);
                setItems([]);
              }}
              rows={14}
              placeholder={`Contoh:\nsusu oat instan yg enak bgt...\n• 30% lower sugar\n• dairy free\n-\nIsi 12`}
              maxLength={MAX_TEXT_LEN}
            />
            <p className="text-xs text-muted-foreground">
              {trimmedLen} / {MAX_TEXT_LEN} karakter
              {trimmedLen > 0 && trimmedLen < MIN_TEXT_LEN ? " — minimal 10 karakter" : ""}
            </p>

            <div
              className={cn(
                "rounded-lg border p-4",
                canProcessAI ? "border-primary/40 bg-primary/5" : "border-dashed bg-muted/30",
              )}
            >
              <Button
                type="button"
                size="lg"
                className={cn("w-full", canProcessAI && "ring-2 ring-primary/30 ring-offset-2")}
                variant={canProcessAI ? "default" : "secondary"}
                disabled={!canProcessAI}
                onClick={() => previewMut.mutate()}
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {previewMut.isPending ? "Memproses AI…" : "Proses dengan AI"}
              </Button>
            </div>

            {preview ? (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  Token dipakai: {preview.tokensUsed} (in {preview.inputTokens} / out {preview.outputTokens}). Sisa
                  kuota: {preview.tokenQuotaRemaining} / {preview.tokenQuotaLimit}
                </p>
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
                Tempel teks dan tekan <span className="font-medium">Proses dengan AI</span> di langkah 1 terlebih dahulu.
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
            )}
          </CardContent>
        </Card>
      </div>

      {items.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pratinjau produk</CardTitle>
          </CardHeader>
          <CardContent>
            <CatalogImportDraftTable items={items} onUpdateItem={updateItem} />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
