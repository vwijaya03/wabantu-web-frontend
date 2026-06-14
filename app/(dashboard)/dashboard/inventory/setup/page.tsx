"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

const WIZARD_QUESTIONS: Array<{ key: keyof WizardAnswers; label: string }> = [
  { key: "perishable", label: "Produk mudah basi / ada tanggal kedaluwarsa (mis. frozen food)" },
  { key: "needBatchTracking", label: "Perlu telusur batch / lot / nomor seri" },
  { key: "highVolumeUniform", label: "Volume tinggi & barang seragam (banyak SKU mirip)" },
  { key: "priceVolatile", label: "Harga beli sering berubah-ubah" },
];

export default function InventorySetupPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);

  const { data: setting } = useQuery({
    queryKey: ["inventory", "setting"],
    queryFn: () => inventoryApi.getSetting(),
  });

  const [answers, setAnswers] = useState<WizardAnswers>({
    perishable: false,
    needBatchTracking: false,
    highVolumeUniform: false,
    priceVolatile: false,
  });
  const [rec, setRec] = useState<WizardRecommendation | null>(null);

  const recommendMut = useMutation({
    mutationFn: () => inventoryApi.wizardRecommend(answers),
    onSuccess: (res) => setRec(res.recommendation),
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

  return (
    <RequireTenantDashboard title="Setup Persediaan">
      <PageHeader
        title="Setup Persediaan & HPP"
        description="Tentukan metode harga pokok, kebijakan stok, lalu aktifkan modul persediaan."
      />

      <div className="mb-4">
        {setting?.setupCompleted ? (
          <Badge variant="success">Setup selesai · metode {setting.defaultCostingMethod.toUpperCase()}</Badge>
        ) : (
          <Badge variant="warning">Setup belum selesai</Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>1. Wizard Metode HPP</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Jawab beberapa pertanyaan, sistem akan merekomendasikan metode (FIFO / LIFO / Average).
            </p>
            {WIZARD_QUESTIONS.map((q) => (
              <label key={q.key} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={answers[q.key]}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.checked }))}
                />
                <span>{q.label}</span>
              </label>
            ))}
            <Button onClick={() => recommendMut.mutate()} disabled={recommendMut.isPending}>
              {recommendMut.isPending ? "Menganalisa..." : "Dapatkan Rekomendasi"}
            </Button>

            {rec ? (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Rekomendasi: {COSTING_METHOD_LABELS[rec.method]}</p>
                <p className="mt-1 text-muted-foreground">{rec.reason}</p>
                <Button
                  className="mt-3"
                  size="sm"
                  onClick={() => applyMethodMut.mutate(rec.method)}
                  disabled={applyMethodMut.isPending}
                >
                  Terapkan metode ini
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2. Kebijakan & Metode</CardTitle></CardHeader>
          <CardContent className="space-y-4">
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
                  Aktif: pembelian dicatat sebagai biaya saat Bill (tanpa COGS saat jual). Nonaktif (disarankan):
                  nilai persediaan naik saat beli, biaya muncul sebagai HPP saat terjual.
                </span>
              </span>
            </label>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>3. Aktifkan Modul</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Setelah gudang & saldo awal siap, tandai setup selesai agar pesanan mulai memotong stok otomatis.
          </p>
          <Button onClick={() => completeMut.mutate()} disabled={completeMut.isPending || setting?.setupCompleted}>
            {setting?.setupCompleted ? "Sudah aktif" : "Tandai Setup Selesai"}
          </Button>
        </CardContent>
      </Card>
    </RequireTenantDashboard>
  );
}
