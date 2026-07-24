"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { InventoryPageHeader } from "@/components/inventory/inventory-help";
import { InventoryDataTablePagination } from "@/components/inventory/data-table-pagination";
import { StockTransactionEditDialog } from "@/components/inventory/stock-transaction-edit-dialog";
import { TransactionDocLink } from "@/components/inventory/transaction-doc-link";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { inventoryApi, formatIDR, formatStockQty, type StockTransaction } from "@/lib/api/inventory";
import type { InventoryHelpTopic } from "@/lib/inventory/help-content";
import {
  InventoryTable,
  InventoryTableBody,
  InventoryTableCell,
  InventoryTableEmpty,
  InventoryTableHead,
  InventoryTableHeader,
  InventoryTableRow,
} from "@/components/inventory/inventory-table";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { invalidateTenantQueries, tenantQueryKey } from "@/lib/query/tenant-query-key";

export type StockTxnKind = StockTransaction["kind"];

export type StockTransactionKindPageConfig = {
  kind: StockTxnKind;
  title: string;
  description: string;
  helpTopic: InventoryHelpTopic;
  createTitle: string;
  CreatePanel: React.ComponentType<{ warehouses: import("@/lib/api/inventory").Warehouse[]; onSuccess: () => void }>;
  renderDetail: (t: StockTransaction) => ReactNode;
};

export function StockTransactionKindPage({ config }: { config: StockTransactionKindPageConfig }) {
  const qc = useQueryClient();
  const tenantKey = useTenantKey();
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const { kind, title, description, helpTopic, createTitle, CreatePanel, renderDetail } = config;

  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const { data: whData } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "inventory", "warehouses", "all"),
    queryFn: ({ signal }) => inventoryApi.listWarehouses({ all: true }, signal),
  });
  const warehouses = whData?.warehouses ?? [];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "inventory", "stock-transactions", kind, searchQ, page, pageSize),
    queryFn: ({ signal }) =>
      inventoryApi.listStockTransactions({ kind, q: searchQ || undefined, page, pageSize }, signal),
    retry: 1,
  });

  const rows = useMemo(() => data?.transactions ?? [], [data?.transactions]);
  const visibleIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const selectedCount = selected.size;

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const refresh = () => {
    invalidateTenantQueries(qc, tenantKey, "inventory", "stock-transactions", kind);
    setSelected(new Set());
  };

  const delMut = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteStockTransaction(id),
    onSuccess: () => {
      toast.success("Transaksi dihapus — stok disesuaikan");
      setDeleteId(null);
      refresh();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const batchDelMut = useMutation({
    mutationFn: () => inventoryApi.batchDeleteStockTransactions([...selected]),
    onSuccess: (res) => {
      if (res.failed > 0) {
        toast.warning(`${res.deleted} dihapus, ${res.failed} gagal`);
      } else {
        toast.success(`${res.deleted} transaksi dihapus`);
      }
      setBatchDeleteOpen(false);
      refresh();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const colSpan = canManage ? 6 : 5;

  return (
    <RequireTenantDashboard title={title}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <InventoryPageHeader title={title} description={description} helpTopic={helpTopic} />
        {canManage ? (
          <Button onClick={() => setCreating((v) => !v)} className="shrink-0">
            {creating ? "Tutup Form" : `Buat ${createTitle}`}
          </Button>
        ) : null}
      </div>

      {creating && canManage ? (
        <Card className="border-primary/30">
          <CardHeader><CardTitle>Buat {createTitle}</CardTitle></CardHeader>
          <CardContent>
            <CreatePanel
              warehouses={warehouses}
              onSuccess={() => {
                setCreating(false);
                setPage(1);
                refresh();
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      {canManage && selectedCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-4 py-2 text-sm">
          <span>{selectedCount} baris terpilih</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>Batal pilih</Button>
            <Button variant="destructive" size="sm" onClick={() => setBatchDeleteOpen(true)}>Hapus terpilih</Button>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Daftar {createTitle}</CardTitle>
          <Input
            placeholder="Cari no transaksi..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearchQ(q); setPage(1); } }}
            className="w-48"
          />
        </CardHeader>
        <CardContent>
          <InventoryTable>
            <InventoryTableHeader>
              <InventoryTableRow>
                {canManage ? (
                  <InventoryTableHead align="center" className="w-10">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Pilih semua" />
                  </InventoryTableHead>
                ) : null}
                <InventoryTableHead>No Transaksi</InventoryTableHead>
                <InventoryTableHead>Tanggal</InventoryTableHead>
                <InventoryTableHead>Ringkasan</InventoryTableHead>
                <InventoryTableHead>Catatan</InventoryTableHead>
                {canManage ? <InventoryTableHead /> : null}
              </InventoryTableRow>
            </InventoryTableHeader>
            <InventoryTableBody>
              {isLoading ? (
                <InventoryTableEmpty colSpan={colSpan}>Memuat...</InventoryTableEmpty>
              ) : isError ? (
                <InventoryTableEmpty colSpan={colSpan}>
                  Gagal memuat: {toApiError(error).message}
                </InventoryTableEmpty>
              ) : rows.length === 0 ? (
                <InventoryTableEmpty colSpan={colSpan}>Belum ada transaksi.</InventoryTableEmpty>
              ) : (
                rows.map((t) => (
                  <InventoryTableRow key={t.id}>
                    {canManage ? (
                      <InventoryTableCell align="center">
                        <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleOne(t.id)} aria-label={`Pilih ${t.docNo}`} />
                      </InventoryTableCell>
                    ) : null}
                    <InventoryTableCell>
                      <TransactionDocLink docNo={t.docNo} onClick={() => setEditId(t.id)} />
                    </InventoryTableCell>
                    <InventoryTableCell className="text-sm">{t.transactionDate}</InventoryTableCell>
                    <InventoryTableCell className="max-w-xs text-sm">{renderDetail(t)}</InventoryTableCell>
                    <InventoryTableCell className="max-w-[140px] truncate text-xs text-muted-foreground">{t.note || "—"}</InventoryTableCell>
                    {canManage ? (
                      <InventoryTableCell align="right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditId(t.id)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(t.id)}>Hapus</Button>
                        </div>
                      </InventoryTableCell>
                    ) : null}
                  </InventoryTableRow>
                ))
              )}
            </InventoryTableBody>
          </InventoryTable>
          <InventoryDataTablePagination
            page={page}
            pageSize={pageSize}
            total={data?.total ?? 0}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </CardContent>
      </Card>

      <StockTransactionEditDialog id={editId} onClose={() => setEditId(null)} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus transaksi?</AlertDialogTitle>
            <AlertDialogDescription>Stok dikembalikan seperti sebelum transaksi ini.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && delMut.mutate(deleteId)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selectedCount} transaksi?</AlertDialogTitle>
            <AlertDialogDescription>Stok akan disesuaikan untuk setiap transaksi yang dihapus.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => batchDelMut.mutate()} disabled={batchDelMut.isPending}>
              {batchDelMut.isPending ? "Menghapus..." : "Hapus semua"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RequireTenantDashboard>
  );
}

export function adjustmentDetail(t: StockTransaction) {
  const qty = t.signedQty ?? 0;
  const sign = qty >= 0 ? "+" : "";
  return (
    <span>
      {t.itemName || "Produk"} · {t.warehouseName || "Gudang"} · <strong>{sign}{formatStockQty(qty)}</strong>
    </span>
  );
}

export function transferDetail(t: StockTransaction) {
  return (
    <span>
      {t.itemName || "Produk"} · {t.fromWarehouseName || "?"} → {t.toWarehouseName || "?"} · {formatStockQty(t.signedQty ?? 0)}
    </span>
  );
}

export function openingDetail(t: StockTransaction) {
  return <span>{t.lineCount ?? 0} baris SKU</span>;
}

export function revaluationDetail(t: StockTransaction) {
  return (
    <span>
      {t.itemName || "Produk"} · {t.warehouseName || "Gudang"} · HPP → {formatIDR(t.newUnitCost ?? 0)}
    </span>
  );
}
