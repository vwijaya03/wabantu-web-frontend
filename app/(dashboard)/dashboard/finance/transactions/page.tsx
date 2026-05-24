"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Filter, PlusCircle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  financeApi, formatIDR, txnTypeColor, txnTypeLabel, statusLabel, TXN_TYPES, type Transaction,
} from "@/lib/api/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { AddTransactionSheet } from "@/components/finance/add-transaction-sheet";

export default function TransactionsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const [openAdd, setOpenAdd] = useState(false);

  const [filters, setFilters] = useState({
    type: "",
    status: searchParams.get("status") ?? "",
    period: new Date().toISOString().slice(0, 7),
    page: 1,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["finance-transactions", filters],
    queryFn: () =>
      financeApi.listTransactions({
        type: filters.type || undefined,
        status: filters.status || undefined,
        period: filters.period || undefined,
        page: filters.page,
        pageSize: 30,
      } as any),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject"; reason?: string }) =>
      financeApi.approveTransaction(id, action),
    onSuccess: (_, vars) => {
      toast.success(vars.action === "approve" ? "Transaksi disetujui" : "Transaksi ditolak");
      qc.invalidateQueries({ queryKey: ["finance-transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
    },
    onError: () => toast.error("Gagal memproses"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => financeApi.deleteTransaction(id),
    onSuccess: () => {
      toast.success("Transaksi dihapus");
      qc.invalidateQueries({ queryKey: ["finance-transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Gagal menghapus"),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const setFilter = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v, page: 1 }));

  const isIncome = (type: string) =>
    ["income", "dividend", "interest", "cashback", "investment_sell"].includes(type);

  return (
    <>
      <PageHeader
        title="Transaksi"
        description={`${total} transaksi ditemukan`}
        actions={
          <Button onClick={() => setOpenAdd(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Catat Transaksi
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filters.period} onValueChange={(v) => setFilter("period", v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Periode" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const v = d.toISOString().slice(0, 7);
              return (
                <SelectItem key={v} value={v}>
                  {d.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Select value={filters.type} onValueChange={(v) => setFilter("type", v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua jenis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Jenis</SelectItem>
            {TXN_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isOwner && (
          <Select value={filters.status} onValueChange={(v) => setFilter("status", v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua Status</SelectItem>
              <SelectItem value="approved">Disetujui</SelectItem>
              <SelectItem value="pending_approval">Menunggu Persetujuan</SelectItem>
              <SelectItem value="rejected">Ditolak</SelectItem>
            </SelectContent>
          </Select>
        )}

        {(filters.type || filters.status) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters((f) => ({ ...f, type: "", status: "", page: 1 }))}
          >
            <X className="mr-1 h-3.5 w-3.5" /> Reset filter
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Tidak ada transaksi. Tap "+ Catat Transaksi" untuk mulai.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((txn) => (
            <TransactionRow
              key={txn.id}
              txn={txn}
              isOwner={isOwner}
              isIncome={isIncome(txn.type)}
              onApprove={() => approveMut.mutate({ id: txn.id, action: "approve" })}
              onReject={() => approveMut.mutate({ id: txn.id, action: "reject" })}
              onDelete={() => {
                if (confirm("Hapus transaksi ini?")) deleteMut.mutate(txn.id);
              }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 30 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Menampilkan {Math.min(filters.page * 30, total)} dari {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page * 30 >= total}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}

      <AddTransactionSheet
        open={openAdd}
        onOpenChange={setOpenAdd}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["finance-transactions"] });
          qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
        }}
      />
    </>
  );
}

function TransactionRow({
  txn, isOwner, isIncome, onApprove, onReject, onDelete,
}: {
  txn: Transaction;
  isOwner: boolean;
  isIncome: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold",
            isIncome ? "bg-green-600" : txn.type === "transfer" ? "bg-blue-600" : "bg-red-600",
          )}
        >
          {isIncome ? "+" : txn.type === "transfer" ? "⇄" : "−"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{txn.description ?? txnTypeLabel(txn.type)}</p>
          <p className="text-xs text-muted-foreground">
            {txn.categoryName ?? "—"} · {txn.walletName}
            {txn.toWalletName ? ` → ${txn.toWalletName}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">{txn.transactionDate}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("font-semibold tabular-nums", txnTypeColor(txn.type))}>
            {isIncome ? "+" : "-"}{formatIDR(txn.amount)}
          </p>
          <div className="mt-1 flex items-center justify-end gap-1">
            {txn.status === "pending_approval" && (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400">
                <Clock className="mr-1 h-3 w-3" /> Menunggu
              </Badge>
            )}
            {txn.status === "rejected" && (
              <Badge variant="destructive" className="text-[10px]">Ditolak</Badge>
            )}
          </div>
          {isOwner && txn.status === "pending_approval" && (
            <div className="mt-2 flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onReject}>
                Tolak
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={onApprove}>
                <CheckCircle2 className="mr-1 h-3 w-3" /> Setujui
              </Button>
            </div>
          )}
          {isOwner && txn.status === "approved" && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-6 text-[10px] text-muted-foreground"
              onClick={onDelete}
            >
              Hapus
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
