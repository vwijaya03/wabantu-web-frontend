"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { InventoryPageHeader } from "@/components/inventory/inventory-help";
import { InventoryDataTablePagination } from "@/components/inventory/data-table-pagination";
import { StockTransactionEditDialog } from "@/components/inventory/stock-transaction-edit-dialog";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { inventoryApi, type StockTransaction } from "@/lib/api/inventory";
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

const KIND_LABELS: Record<StockTransaction["kind"], string> = {
  adjustment: "Penyesuaian",
  transfer: "Transfer",
  opening_balance: "Saldo Awal",
  revaluation: "Revaluasi HPP",
};

export default function StockTransactionsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "stock-transactions", kind, searchQ, page, pageSize],
    queryFn: () => inventoryApi.listStockTransactions({ kind: kind || undefined, q: searchQ || undefined, page, pageSize }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteStockTransaction(id),
    onSuccess: () => {
      toast.success("Transaksi dihapus — stok disesuaikan");
      setDeleteId(null);
      void qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const rows = data?.transactions ?? [];

  return (
    <RequireTenantDashboard title="Transaksi Stok">
      <InventoryPageHeader
        title="Transaksi Operasi Stok"
        description="Penyesuaian, transfer, saldo awal, dan revaluasi dengan nomor transaksi."
        helpTopic="operations"
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/inventory/operations">Buat Transaksi</Link>
          </Button>
        }
      />

      <Card className="mt-4">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Daftar Transaksi</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Cari no transaksi..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setSearchQ(q); setPage(1); } }}
              className="w-44"
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={kind}
              onChange={(e) => { setKind(e.target.value); setPage(1); }}
            >
              <option value="">Semua jenis</option>
              <option value="adjustment">Penyesuaian</option>
              <option value="transfer">Transfer</option>
              <option value="opening_balance">Saldo Awal</option>
              <option value="revaluation">Revaluasi</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <InventoryTable>
            <InventoryTableHeader>
              <InventoryTableRow>
                <InventoryTableHead>No</InventoryTableHead>
                <InventoryTableHead>Jenis</InventoryTableHead>
                <InventoryTableHead>Tanggal</InventoryTableHead>
                <InventoryTableHead>Catatan</InventoryTableHead>
                {canManage ? <InventoryTableHead /> : null}
              </InventoryTableRow>
            </InventoryTableHeader>
            <InventoryTableBody>
              {isLoading ? (
                <InventoryTableEmpty colSpan={canManage ? 5 : 4}>Memuat...</InventoryTableEmpty>
              ) : rows.length === 0 ? (
                <InventoryTableEmpty colSpan={canManage ? 5 : 4}>Belum ada transaksi.</InventoryTableEmpty>
              ) : (
                rows.map((t) => (
                  <InventoryTableRow key={t.id}>
                    <InventoryTableCell className="font-mono font-medium">{t.docNo}</InventoryTableCell>
                    <InventoryTableCell><Badge variant="secondary">{KIND_LABELS[t.kind]}</Badge></InventoryTableCell>
                    <InventoryTableCell>{t.transactionDate}</InventoryTableCell>
                    <InventoryTableCell className="max-w-xs truncate text-muted-foreground">{t.note || "—"}</InventoryTableCell>
                    {canManage ? (
                      <InventoryTableCell align="right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditId(t.id)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(t.id)}>
                            Hapus
                          </Button>
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
            <AlertDialogDescription>
              Stok akan dikembalikan seperti sebelum transaksi ini. Tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && delMut.mutate(deleteId)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RequireTenantDashboard>
  );
}
