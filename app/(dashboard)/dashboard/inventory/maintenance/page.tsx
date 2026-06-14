"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { inventoryApi, formatIDR } from "@/lib/api/inventory";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

export default function InventoryMaintenancePage() {
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);

  if (!canManage) {
    return (
      <RequireTenantDashboard title="Pemeliharaan">
        <PageHeader title="Pemeliharaan Persediaan" description="Hanya owner yang dapat menjalankan pemeliharaan." />
      </RequireTenantDashboard>
    );
  }

  return (
    <RequireTenantDashboard title="Pemeliharaan">
      <PageHeader title="Pemeliharaan Persediaan" description="Recalculate HPP, backfill pesanan lama, dan ringkasan nilai." />
      <div className="grid gap-6 lg:grid-cols-2">
        <RecalcCard />
        <BackfillCard />
      </div>
      <div className="mt-6">
        <ValuationCard />
      </div>
    </RequireTenantDashboard>
  );
}

function RecalcCard() {
  const [confirm, setConfirm] = useState(false);
  const mut = useMutation({
    mutationFn: () => inventoryApi.recalculate(),
    onSuccess: (r) => { toast.success(`HPP dihitung ulang untuk ${r.recomputed} item/gudang`); setConfirm(false); },
    onError: (e) => { toast.error(toApiError(e).message); setConfirm(false); },
  });
  return (
    <Card>
      <CardHeader><CardTitle>Recalculate HPP</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Hitung ulang lapisan biaya, saldo, dan HPP dari riwayat pergerakan. Gunakan bila HPP terlihat tidak wajar.
        </p>
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Catatan: revaluasi manual <strong>tidak dipertahankan</strong> (dibangun ulang dari riwayat penerimaan/penjualan).
        </p>
        <Button onClick={() => setConfirm(true)} disabled={mut.isPending}>
          {mut.isPending ? "Menghitung..." : "Recalculate HPP"}
        </Button>
      </CardContent>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hitung ulang HPP semua item?</AlertDialogTitle>
            <AlertDialogDescription>
              Lapisan biaya & saldo dibangun ulang dari riwayat pergerakan. Revaluasi manual tidak dipertahankan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => mut.mutate()} disabled={mut.isPending}>Ya, hitung ulang</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function BackfillCard() {
  const [confirm, setConfirm] = useState(false);
  const [preview, setPreview] = useState<{ pendingOrders: number; insufficient: string[] } | null>(null);

  const previewMut = useMutation({
    mutationFn: () => inventoryApi.backfillOrders(false),
    onSuccess: (r) => setPreview({ pendingOrders: r.pendingOrders, insufficient: r.insufficient }),
    onError: (e) => toast.error(toApiError(e).message),
  });
  const execMut = useMutation({
    mutationFn: () => inventoryApi.backfillOrders(true),
    onSuccess: (r) => {
      toast.success(`Backfill selesai: ${r.processed} berhasil, ${r.failed} gagal`);
      setConfirm(false);
      setPreview(null);
    },
    onError: (e) => { toast.error(toApiError(e).message); setConfirm(false); },
  });

  return (
    <Card>
      <CardHeader><CardTitle>Backfill Pesanan Lama</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Potong stok untuk pesanan committed yang dibuat sebelum modul persediaan aktif.
        </p>
        <Button variant="outline" onClick={() => previewMut.mutate()} disabled={previewMut.isPending}>
          {previewMut.isPending ? "Memindai..." : "Preview"}
        </Button>

        {preview ? (
          <div className="rounded-md border p-3 text-sm">
            <p>Pesanan akan diproses: <span className="font-semibold">{preview.pendingOrders}</span></p>
            {preview.insufficient.length > 0 ? (
              <p className="mt-1 text-amber-800">
                {preview.insufficient.length} pesanan stoknya tidak cukup (akan gagal jika blokir stok minus aktif).
              </p>
            ) : (
              <p className="mt-1 text-emerald-700">Semua pesanan punya stok cukup.</p>
            )}
            {preview.pendingOrders > 0 ? (
              <Button className="mt-3" size="sm" onClick={() => setConfirm(true)}>Jalankan Backfill</Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Jalankan backfill {preview?.pendingOrders ?? 0} pesanan?</AlertDialogTitle>
            <AlertDialogDescription>
              Stok akan dipotong retroaktif + COGS dicatat untuk pesanan lama yang committed. Tidak bisa dibatalkan otomatis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => execMut.mutate()} disabled={execMut.isPending}>
              {execMut.isPending ? "Memproses..." : "Jalankan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function ValuationCard() {
  const { data } = useQuery({
    queryKey: ["inventory", "stock", "valuation"],
    queryFn: () => inventoryApi.listStock({ pageSize: 200 }),
  });
  const rows = data?.stock ?? [];
  const byWarehouse = new Map<string, number>();
  for (const r of rows) byWarehouse.set(r.warehouseName, (byWarehouse.get(r.warehouseName) ?? 0) + r.totalValue);
  const total = rows.reduce((s, r) => s + r.totalValue, 0);

  return (
    <Card>
      <CardHeader><CardTitle>Nilai Persediaan per Gudang</CardTitle></CardHeader>
      <CardContent>
        {byWarehouse.size === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada nilai persediaan.</p>
        ) : (
          <div className="space-y-2">
            {[...byWarehouse.entries()].map(([name, value]) => (
              <div key={name} className="flex items-center justify-between rounded border p-3 text-sm">
                <span>{name}</span>
                <span className="font-medium">{formatIDR(value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-2 text-sm">
              <span className="font-semibold">Total</span>
              <span className="font-semibold">{formatIDR(total)}</span>
              <Badge variant="secondary">{rows.length} baris</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
