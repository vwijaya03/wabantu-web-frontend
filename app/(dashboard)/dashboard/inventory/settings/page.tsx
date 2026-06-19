"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InventoryHelpButton, InventoryPageHeader } from "@/components/inventory/inventory-help";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { inventoryApi, COSTING_METHOD_LABELS, type CostingMethod } from "@/lib/api/inventory";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

export default function InventorySettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);

  const { data: setting } = useQuery({
    queryKey: ["inventory", "setting"],
    queryFn: () => inventoryApi.getSetting(),
  });

  const update = useMutation({
    mutationFn: (input: Parameters<typeof inventoryApi.updateSetting>[0]) => inventoryApi.updateSetting(input),
    onSuccess: () => { toast.success("Pengaturan disimpan"); void qc.invalidateQueries({ queryKey: ["inventory", "setting"] }); },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <RequireTenantDashboard title="Pengaturan Persediaan">
      <InventoryPageHeader title="Pengaturan & Akses" description="Metode HPP, kebijakan stok, dan hak akses modul persediaan." helpTopic="settings" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Metode HPP & Kebijakan</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="flex items-center gap-1 text-sm font-medium">
                Metode HPP default
                <InventoryHelpButton topic="settings-costing" />
              </p>
              <p className="mb-2 text-xs text-muted-foreground">
                Berlaku untuk item baru yang mengikuti default. Mengganti metode <strong>tidak otomatis</strong> menghitung ulang HPP riwayat — jalankan Pemeliharaan → Recalculate HPP jika perlu.
              </p>
              <div className="flex flex-wrap gap-2">
                {(["fifo", "lifo", "average"] as CostingMethod[]).map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={setting?.defaultCostingMethod === m ? "default" : "outline"}
                    disabled={!canManage || update.isPending}
                    onClick={() => update.mutate({ defaultCostingMethod: m })}
                  >
                    {m.toUpperCase()}
                  </Button>
                ))}
              </div>
              {setting ? <p className="mt-1 text-xs text-muted-foreground">{COSTING_METHOD_LABELS[setting.defaultCostingMethod]}</p> : null}
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                disabled={!canManage}
                checked={setting?.blockNegativeStock ?? true}
                onChange={(e) => update.mutate({ blockNegativeStock: e.target.checked })}
              />
              <span>
                <span className="inline-flex items-center gap-1 font-medium">
                  Blokir stok minus
                  <InventoryHelpButton topic="settings-block-negative" />
                </span><br />
                <span className="text-muted-foreground">Pesanan ditolak bila stok tidak cukup saat diproses.</span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                disabled={!canManage}
                checked={setting?.purchasePostsExpense ?? false}
                onChange={(e) => update.mutate({ purchasePostsExpense: e.target.checked })}
              />
              <span>
                <span className="inline-flex items-center gap-1 font-medium">
                  Mode cashflow (beli = biaya langsung)
                  <InventoryHelpButton topic="settings-cashflow" />
                </span><br />
                <span className="text-muted-foreground">
                  Aktif: pembelian jadi biaya saat Bill (tanpa COGS saat jual). Nonaktif (disarankan):
                  biaya muncul sebagai HPP saat terjual — laba-rugi lebih akurat.
                </span>
              </span>
            </label>

            {!canManage ? <p className="text-xs text-amber-700">Hanya owner yang dapat mengubah pengaturan.</p> : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1">
                Hak Akses (ACL)
                <InventoryHelpButton topic="settings-acl" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-medium">Owner / Super Admin</p>
                  <p className="text-xs text-muted-foreground">Kelola penuh: stok, PO/Bill, faktur/retur, setting, pemeliharaan.</p>
                </div>
                <Badge variant="success">Kelola</Badge>
              </div>
              <div className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-medium">Staff</p>
                  <p className="text-xs text-muted-foreground">Lihat stok, kartu stok, daftar PO/Bill/faktur. Tidak bisa mengubah.</p>
                </div>
                <Badge variant="secondary">Lihat</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Status kamu: <span className="font-medium">{canManage ? "Kelola (owner)" : "Lihat (staff)"}</span>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Status Modul</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Setup:{" "}
                {setting?.setupCompleted ? <Badge variant="success">Aktif</Badge> : <Badge variant="warning">Belum selesai</Badge>}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild><Link href="/dashboard/inventory/setup">Wizard Setup</Link></Button>
                <Button variant="outline" size="sm" asChild><Link href="/dashboard/inventory/maintenance">Pemeliharaan</Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RequireTenantDashboard>
  );
}
