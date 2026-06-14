"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import {
  inventoryApi,
  COSTING_METHOD_LABELS,
  type CostingMethod,
  type WizardAnswers,
  type WizardRecommendation,
} from "@/lib/api/inventory";
import { COSTING_METHOD_GUIDES } from "@/lib/inventory/costing-guide";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const WIZARD_CHECKBOXES: Array<{ key: keyof WizardAnswers; label: string }> = [
  { key: "perishable", label: "Produk mudah basi / perishable (mis. frozen food)" },
  { key: "usesExpiryDates", label: "Operasional pakai tanggal kedaluwarsa (expiry)" },
  { key: "needBatchTracking", label: "Perlu telusur batch / lot / nomor seri" },
  { key: "highVolumeUniform", label: "Volume tinggi & barang seragam (banyak SKU mirip)" },
  { key: "priceVolatile", label: "Harga beli sering berubah-ubah" },
  { key: "seasonalStock", label: "Stok musiman (ramadan, natal, musim hujan, dll.)" },
];

const EMPTY_ANSWERS: WizardAnswers = {
  perishable: false,
  needBatchTracking: false,
  highVolumeUniform: false,
  priceVolatile: false,
  usesExpiryDates: false,
  seasonalStock: false,
  businessType: "",
  productDescription: "",
  stockTurnover: "",
  priceTrend: "",
  ownerNotes: "",
};

export default function InventorySetupPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [answers, setAnswers] = useState<WizardAnswers>(EMPTY_ANSWERS);
  const [rec, setRec] = useState<WizardRecommendation | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{ used?: number; remaining?: number }>({});

  const { data: setting } = useQuery({
    queryKey: ["inventory", "setting"],
    queryFn: () => inventoryApi.getSetting(),
  });

  const recommendMut = useMutation({
    mutationFn: () => inventoryApi.wizardRecommend(answers),
    onSuccess: (res) => {
      setRec(res.recommendation);
      setTokenInfo({ used: res.tokensUsed, remaining: res.tokenQuotaRemaining });
      setStep(3);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const applyMethodMut = useMutation({
    mutationFn: (method: CostingMethod) => inventoryApi.updateSetting({ defaultCostingMethod: method }),
    onSuccess: () => {
      toast.success("Metode HPP diterapkan");
      void qc.invalidateQueries({ queryKey: ["inventory", "setting"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const toggleMut = useMutation({
    mutationFn: (input: { blockNegativeStock?: boolean; purchasePostsExpense?: boolean }) =>
      inventoryApi.updateSetting(input),
    onSuccess: () => {
      toast.success("Pengaturan disimpan");
      void qc.invalidateQueries({ queryKey: ["inventory", "setting"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const completeMut = useMutation({
    mutationFn: () => inventoryApi.completeSetup(),
    onSuccess: () => {
      toast.success("Setup persediaan selesai! Fitur stok aktif.");
      void qc.invalidateQueries({ queryKey: ["inventory", "setting"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  if (!canManage) {
    return (
      <RequireTenantDashboard title="Setup Persediaan">
        <PageHeader title="Setup Persediaan" description="Hanya owner yang dapat mengatur persediaan." />
      </RequireTenantDashboard>
    );
  }

  const interviewValid =
    answers.businessType.trim() !== "" &&
    answers.productDescription.trim().length >= 20;

  return (
    <RequireTenantDashboard title="Setup Persediaan">
      <PageHeader
        title="Setup Persediaan & HPP"
        description="Pelajari metode HPP, ceritakan pola bisnis & stok, lalu dapatkan rekomendasi AI."
      />

      <div className="mb-4">
        {setting?.setupCompleted ? (
          <Badge variant="success">Setup selesai · metode {setting.defaultCostingMethod.toUpperCase()}</Badge>
        ) : (
          <Badge variant="warning">Setup belum selesai</Badge>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => n < 3 && setStep(n)}
            className={cn(
              "rounded-full border px-3 py-1",
              step === n ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground",
            )}
          >
            {n === 1 ? "① Pelajari metode" : n === 2 ? "② Wawancara bisnis" : "③ Rekomendasi"}
          </button>
        ))}
      </div>

      {step === 1 ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {(["fifo", "lifo", "average"] as CostingMethod[]).map((m) => {
            const g = COSTING_METHOD_GUIDES[m];
            return (
              <Card key={m}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{g.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{g.short}</p>
                  <p>{g.example}</p>
                  <p>
                    <span className="font-medium text-foreground">Cocok untuk: </span>
                    {g.bestFor}
                  </p>
                </CardContent>
              </Card>
            );
          })}
          <div className="lg:col-span-3 flex justify-end">
            <Button onClick={() => setStep(2)}>Lanjut — ceritakan bisnis Anda</Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Wawancara singkat (owner)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ceritakan bisnis dan pola stok Anda. AI akan membaca jawaban ini bersama profil toko untuk
                merekomendasikan FIFO, LIFO, atau Average.
              </p>
              <div>
                <Label>Jenis bisnis</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={answers.businessType}
                  onChange={(e) => setAnswers((a) => ({ ...a, businessType: e.target.value }))}
                >
                  <option value="">Pilih jenis...</option>
                  <option value="retail">Retail / toko umum</option>
                  <option value="food">Makanan / minuman / frozen</option>
                  <option value="fashion">Fashion / apparel</option>
                  <option value="manufacturing">Produksi / manufaktur ringan</option>
                  <option value="services">Jasa dengan material</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              <div>
                <Label>Produk & pola stok (wajib, min. 20 karakter)</Label>
                <textarea
                  className="mt-1 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Contoh: jual salmon frozen by kg. Stok masuk per batch supplier, yang lama harus keluar dulu. Harga beli naik turun tiap minggu..."
                  value={answers.productDescription}
                  onChange={(e) => setAnswers((a) => ({ ...a, productDescription: e.target.value }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Kecepatan stok keluar</Label>
                  <select
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={answers.stockTurnover}
                    onChange={(e) => setAnswers((a) => ({ ...a, stockTurnover: e.target.value }))}
                  >
                    <option value="">Pilih...</option>
                    <option value="fast">Cepat (harian/mingguan)</option>
                    <option value="medium">Sedang (2–4 minggu)</option>
                    <option value="slow">Lambat (bulanan+)</option>
                  </select>
                </div>
                <div>
                  <Label>Tren harga beli</Label>
                  <select
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={answers.priceTrend}
                    onChange={(e) => setAnswers((a) => ({ ...a, priceTrend: e.target.value }))}
                  >
                    <option value="">Pilih...</option>
                    <option value="stable">Stabil</option>
                    <option value="rising">Cenderung naik</option>
                    <option value="volatile">Naik-turun sering</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Catatan tambahan (opsional)</Label>
                <Input
                  className="mt-1"
                  placeholder="Mis. ada bundle, multi gudang, barang titipan..."
                  value={answers.ownerNotes}
                  onChange={(e) => setAnswers((a) => ({ ...a, ownerNotes: e.target.value }))}
                />
              </div>
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ciri operasional</p>
                {WIZARD_CHECKBOXES.map((q) => (
                  <label key={q.key} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={Boolean(answers[q.key])}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.checked }))}
                    />
                    <span>{q.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Kembali</Button>
                <Button
                  onClick={() => recommendMut.mutate()}
                  disabled={!interviewValid || recommendMut.isPending}
                >
                  {recommendMut.isPending ? "AI menganalisa..." : "Dapatkan rekomendasi AI"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>2. Kebijakan & metode manual</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Anda tetap bisa memilih metode secara manual tanpa menunggu rekomendasi AI.
              </p>
              <div>
                <Label>Metode HPP default</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(["fifo", "lifo", "average"] as CostingMethod[]).map((m) => (
                    <Button
                      key={m}
                      size="sm"
                      variant={setting?.defaultCostingMethod === m ? "default" : "outline"}
                      onClick={() => applyMethodMut.mutate(m)}
                      disabled={applyMethodMut.isPending}
                    >
                      {m.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={setting?.blockNegativeStock ?? true}
                  onChange={(e) => toggleMut.mutate({ blockNegativeStock: e.target.checked })}
                />
                <span>
                  <span className="font-medium">Blokir stok minus</span>
                  <br />
                  <span className="text-muted-foreground">Pesanan tidak bisa diproses jika stok tidak cukup.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={setting?.purchasePostsExpense ?? false}
                  onChange={(e) => toggleMut.mutate({ purchasePostsExpense: e.target.checked })}
                />
                <span>
                  <span className="font-medium">Mode cashflow (beli = biaya langsung)</span>
                  <br />
                  <span className="text-muted-foreground">
                    Nonaktif (disarankan): nilai persediaan naik saat beli, HPP muncul saat terjual.
                  </span>
                </span>
              </label>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {step === 3 && rec ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Rekomendasi metode HPP
              <Badge variant={rec.source === "ai" ? "default" : "secondary"}>
                {rec.source === "ai" ? "AI" : "Aturan sistem"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <p className="text-lg font-semibold">{COSTING_METHOD_LABELS[rec.method]}</p>
              <p className="mt-2">{rec.reason}</p>
              {rec.summary ? (
                <p className="mt-2 text-muted-foreground">{rec.summary}</p>
              ) : null}
            </div>
            <div className="rounded-lg border p-4 text-sm">
              <p className="font-medium">{COSTING_METHOD_GUIDES[rec.method].title}</p>
              <p className="mt-1 text-muted-foreground">{COSTING_METHOD_GUIDES[rec.method].example}</p>
            </div>
            {tokenInfo.used ? (
              <p className="text-xs text-muted-foreground">
                Token AI dipakai: {tokenInfo.used}
                {tokenInfo.remaining !== undefined ? ` · sisa kuota: ${tokenInfo.remaining}` : ""}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Ubah jawaban</Button>
              <Button onClick={() => applyMethodMut.mutate(rec.method)} disabled={applyMethodMut.isPending}>
                Terapkan {rec.method.toUpperCase()}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader><CardTitle>3. Aktifkan modul</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Setelah gudang & saldo awal siap, tandai setup selesai agar pesanan mulai memotong stok otomatis.
          </p>
          <Button onClick={() => completeMut.mutate()} disabled={completeMut.isPending || setting?.setupCompleted}>
            {setting?.setupCompleted ? "Sudah aktif" : "Tandai setup selesai"}
          </Button>
        </CardContent>
      </Card>
    </RequireTenantDashboard>
  );
}
