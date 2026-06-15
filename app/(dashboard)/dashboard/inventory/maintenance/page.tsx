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
import { InventoryCardTitleWithHelp, InventoryPageHeader } from "@/components/inventory/inventory-help";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { inventoryApi, formatIDR, type BackfillOrdersResult } from "@/lib/api/inventory";
import { BackfillResultPanel, insufficientCount } from "@/components/inventory/backfill-result-panel";
import {
  InventoryTable,
  InventoryTableBody,
  InventoryTableCell,
  InventoryTableHead,
  InventoryTableHeader,
  InventoryTableRow,
} from "@/components/inventory/inventory-table";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

export default function InventoryMaintenancePage() {
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);

  if (!canManage) {
    return (
      <RequireTenantDashboard title="Pemeliharaan">
        <InventoryPageHeader title="Pemeliharaan Persediaan" description="Hanya owner yang dapat menjalankan pemeliharaan." helpTopic="maintenance" />
      </RequireTenantDashboard>
    );
  }

  return (
    <RequireTenantDashboard title="Pemeliharaan">
      <InventoryPageHeader title="Pemeliharaan Persediaan" description="Recalculate HPP, backfill pesanan lama, dan ringkasan nilai." helpTopic="maintenance" />
      <BackfillMaintenanceSection />
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
      <CardHeader><CardTitle><InventoryCardTitleWithHelp title="Recalculate HPP" helpTopic="maintenance-recalc" /></CardTitle></CardHeader>
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

function BackfillMaintenanceSection() {
  const [confirm, setConfirm] = useState(false);
  const [preview, setPreview] = useState<BackfillOrdersResult | null>(null);
  const [lastResult, setLastResult] = useState<BackfillOrdersResult | null>(null);

  const previewMut = useMutation({
    mutationFn: () => inventoryApi.backfillOrders(false),
    onSuccess: (r) => {
      setPreview(r);
      setLastResult(null);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });
  const execMut = useMutation({
    mutationFn: () => inventoryApi.backfillOrders(true),
    onSuccess: (r) => {
      setLastResult(r);
      setConfirm(false);
      setPreview(null);
      if (r.failed > 0) {
        toast.warning(`Backfill selesai: ${r.processed} berhasil, ${r.failed} gagal — lihat detail di bawah`);
      } else {
        toast.success(`Backfill selesai: ${r.processed} pesanan berhasil diproses`);
      }
    },
    onError: (e) => { toast.error(toApiError(e).message); setConfirm(false); },
  });

  const issues = preview?.issues?.length ? preview.issues : lastResult?.issues ?? [];
  const hasDetail =
    issues.length > 0 ||
    (preview?.suggestedOpening?.length ?? 0) > 0 ||
    (lastResult?.suggestedOpening?.length ?? 0) > 0 ||
    insufficientCount(preview ?? lastResult ?? { preview: true, pendingOrders: 0, processed: 0, failed: 0 }) > 0;
  const detailResult = preview ?? lastResult;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <RecalcCard />
        <Card>
          <CardHeader><CardTitle><InventoryCardTitleWithHelp title="Backfill Pesanan Lama" helpTopic="maintenance-backfill" /></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Potong stok untuk pesanan committed (Sedang diproses, Dalam pengiriman, Selesai) yang belum sinkron dengan persediaan.
            </p>
            <Button variant="outline" onClick={() => previewMut.mutate()} disabled={previewMut.isPending}>
              {previewMut.isPending ? "Memindai..." : "Preview"}
            </Button>

            {preview ? (
              <div className="rounded-md border p-3 text-sm space-y-2">
                <p>Pesanan akan diproses: <span className="font-semibold">{preview.pendingOrders.toLocaleString("id-ID")}</span></p>
                {insufficientCount(preview) > 0 ? (
                  <p className="text-amber-800">
                    {insufficientCount(preview).toLocaleString("id-ID")} pesanan stoknya tidak cukup dan akan gagal jika blokir stok minus aktif.
                  </p>
                ) : preview.pendingOrders > 0 ? (
                  <p className="text-emerald-700">Semua pesanan punya stok cukup.</p>
                ) : null}
                {preview.pendingOrders > 0 ? (
                  <Button className="mt-1" size="sm" onClick={() => setConfirm(true)}>Jalankan Backfill</Button>
                ) : null}
              </div>
            ) : null}

            {lastResult && lastResult.processed > 0 && lastResult.failed === 0 ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {lastResult.processed.toLocaleString("id-ID")} pesanan berhasil diproses.
              </p>
            ) : null}
          </CardContent>

          <AlertDialog open={confirm} onOpenChange={setConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Jalankan backfill {preview?.pendingOrders ?? 0} pesanan?</AlertDialogTitle>
                <AlertDialogDescription>
                  Stok akan dipotong retroaktif + COGS dicatat untuk pesanan lama yang committed. Tidak bisa dibatalkan otomatis.
                  {preview && insufficientCount(preview) > 0 ? (
                    <> {insufficientCount(preview).toLocaleString("id-ID")} pesanan kemungkinan gagal karena stok tidak cukup.</>
                  ) : null}
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
      </div>

      {hasDetail && detailResult ? (
        <div className="mt-6">
          <BackfillResultPanel
            result={detailResult}
            mode={detailResult.preview ? "preview" : "execute"}
          />
        </div>
      ) : null}
    </>
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
      <CardHeader><CardTitle><InventoryCardTitleWithHelp title="Nilai Persediaan per Gudang" helpTopic="maintenance-valuation" /></CardTitle></CardHeader>
      <CardContent>
        {byWarehouse.size === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada nilai persediaan.</p>
        ) : (
          <div className="space-y-3">
            <InventoryTable>
              <InventoryTableHeader>
                <InventoryTableRow>
                  <InventoryTableHead>Gudang</InventoryTableHead>
                  <InventoryTableHead align="right">Nilai</InventoryTableHead>
                </InventoryTableRow>
              </InventoryTableHeader>
              <InventoryTableBody>
                {[...byWarehouse.entries()].map(([name, value]) => (
                  <InventoryTableRow key={name}>
                    <InventoryTableCell>{name}</InventoryTableCell>
                    <InventoryTableCell align="right" className="font-medium">{formatIDR(value)}</InventoryTableCell>
                  </InventoryTableRow>
                ))}
              </InventoryTableBody>
            </InventoryTable>
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
