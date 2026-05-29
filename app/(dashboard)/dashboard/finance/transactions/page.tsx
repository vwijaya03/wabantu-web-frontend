"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, ImageUp, Pencil, PlusCircle, Search, Trash2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FinanceSubPageHeader } from "@/components/finance/finance-sub-page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  financeApi,
  formatIDR,
  formatIDRPrice,
  txnTypeColor,
  txnTypeFlow,
  txnTypeLabel,
  statusLabel,
  type Transaction,
  type TransactionType,
} from "@/lib/api/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import {
  currentFinancePeriod,
  financeMonthOptions,
  formatFinanceDate,
  invalidateFinanceCaches,
} from "@/lib/finance/utils";
import { AddTransactionSheet } from "@/components/finance/add-transaction-sheet";
import { useReportingTimezone } from "@/hooks/use-reporting-timezone";

const FILTER_ALL = "__all__";
const pageSize = 30;

function isInvestmentTxn(type: string) {
  return type === "investment_buy" || type === "investment_sell" || type === "dividend";
}

function txnTitle(txn: Transaction, txnTypes: TransactionType[]) {
  if (txn.description) return txn.description;
  if (txn.assetName) {
    const t = txn.assetTicker ? `${txn.assetName} (${txn.assetTicker})` : txn.assetName;
    return `${txnTypeLabel(txn.type, txnTypes)} · ${t}`;
  }
  return txnTypeLabel(txn.type, txnTypes);
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const isOwner = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const reportingTimezone = useReportingTimezone();
  const currentPeriod = currentFinancePeriod(reportingTimezone);
  const monthOptions = financeMonthOptions(reportingTimezone);
  const [openAdd, setOpenAdd] = useState(false);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [deleteTxnId, setDeleteTxnId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    description: "",
    notes: "",
    referenceNo: "",
    transactionDate: "",
    amount: "",
    categoryId: "",
  });

  const [filters, setFilters] = useState({
    type: "",
    status: searchParams.get("status") ?? "",
    period: "",
    page: 1,
  });
  const effectivePeriod = filters.period || currentPeriod;

  const { data: txnTypesData } = useQuery({
    queryKey: ["finance-transaction-types", "filter"],
    queryFn: () => financeApi.listTransactionTypes({ pageSize: 100 }),
  });
  const txnTypes = txnTypesData?.items ?? [];

  const { data: categories } = useQuery({
    queryKey: ["finance-categories"],
    queryFn: () => financeApi.listCategories(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["finance-transactions", filters, effectivePeriod, search],
    queryFn: () =>
      financeApi.listTransactions({
        type: filters.type || undefined,
        status: filters.status || undefined,
        period: effectivePeriod,
        search: search || undefined,
        page: filters.page,
        pageSize,
      }),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      financeApi.approveTransaction(id, action),
    onSuccess: (_, vars) => {
      toast.success(vars.action === "approve" ? "Transaksi disetujui" : "Transaksi ditolak");
      invalidateFinanceCaches(qc);
    },
    onError: () => toast.error("Gagal memproses"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => financeApi.deleteTransaction(id),
    onSuccess: () => {
      toast.success("Transaksi dihapus");
      invalidateFinanceCaches(qc);
      setDeleteTxnId(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Gagal menghapus"),
  });

  const updateMut = useMutation({
    mutationFn: () => {
      if (!editTxn) throw new Error("no txn");
      const payload: Record<string, string | number> = {
        description: editForm.description,
        notes: editForm.notes,
        referenceNo: editForm.referenceNo,
        transactionDate: editForm.transactionDate,
      };
      if (isOwner && !isInvestmentTxn(editTxn.type) && editForm.amount) {
        payload.amount = parseFloat(editForm.amount);
      }
      if (!isInvestmentTxn(editTxn.type) && editForm.categoryId) {
        payload.categoryId = editForm.categoryId;
      }
      return financeApi.updateTransaction(editTxn.id, payload);
    },
    onSuccess: () => {
      toast.success("Transaksi diperbarui");
      invalidateFinanceCaches(qc);
      setEditTxn(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Gagal memperbarui"),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setFilter = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v, page: 1 }));

  const openEdit = (txn: Transaction) => {
    setEditTxn(txn);
    setEditForm({
      description: txn.description ?? "",
      notes: txn.notes ?? "",
      referenceNo: txn.referenceNo ?? "",
      transactionDate: txn.transactionDate,
      amount: txn.amount,
      categoryId: txn.categoryId ?? "",
    });
  };

  const isIncome = (type: string) => txnTypeFlow(type, txnTypes) === "income";

  return (
    <>
      <FinanceSubPageHeader
        title="Transaksi"
        description={`${total} transaksi ditemukan`}
        actions={
          isOwner ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard/finance/transactions/import-image">
                  <ImageUp className="mr-2 h-4 w-4" />
                  Import dari gambar
                </Link>
              </Button>
              <Button onClick={() => setOpenAdd(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Catat Transaksi
              </Button>
            </div>
          ) : (
            <Button onClick={() => setOpenAdd(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Catat Transaksi
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Cari deskripsi, dompet, kategori, aset, jumlah..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(q.trim());
                setFilters((f) => ({ ...f, page: 1 }));
              }
            }}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearch(q.trim());
            setFilters((f) => ({ ...f, page: 1 }));
          }}
        >
          Cari
        </Button>
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setSearch("");
              setFilters((f) => ({ ...f, page: 1 }));
            }}
          >
            Reset pencarian
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={effectivePeriod} onValueChange={(v) => setFilter("period", v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Periode" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.type || FILTER_ALL}
          onValueChange={(v) => setFilter("type", v === FILTER_ALL ? "" : v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua jenis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Semua Jenis</SelectItem>
            {txnTypes.filter((t) => t.isActive).map((t) => (
              <SelectItem key={t.code} value={t.code}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isOwner && (
          <Select
            value={filters.status || FILTER_ALL}
            onValueChange={(v) => setFilter("status", v === FILTER_ALL ? "" : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Semua Status</SelectItem>
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

      <p className="text-xs text-muted-foreground">
        Termasuk transaksi dari <strong>Investasi & Aset</strong> (Beli/Jual Aset). Filter periode default: bulan berjalan.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Tidak ada transaksi untuk filter ini. Coba ubah periode atau reset pencarian.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((txn) => (
            <TransactionRow
              key={txn.id}
              txn={txn}
              txnTypes={txnTypes}
              isOwner={isOwner}
              isIncome={isIncome(txn.type)}
              reportingTimezone={reportingTimezone}
              onEdit={() => openEdit(txn)}
              onDelete={() => setDeleteTxnId(txn.id)}
              onApprove={() => approveMut.mutate({ id: txn.id, action: "approve" })}
              onReject={() => approveMut.mutate({ id: txn.id, action: "reject" })}
            />
          ))}
        </div>
      )}

      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Halaman {filters.page} / {totalPages} · {total} transaksi
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
              disabled={filters.page >= totalPages}
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
        onCreated={() => invalidateFinanceCaches(qc)}
      />

      <Dialog open={!!editTxn} onOpenChange={(open) => !open && setEditTxn(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Transaksi</DialogTitle>
            <DialogDescription>
              {editTxn && isInvestmentTxn(editTxn.type) ? (
                <>
                  Transaksi investasi: ubah catatan/deskripsi/tanggal di sini. Untuk jumlah lot/harga/biaya, hapus lalu
                  catat ulang di menu <strong>Investasi & Aset → Riwayat</strong>.
                </>
              ) : (
                "Perbarui detail transaksi."
              )}
            </DialogDescription>
          </DialogHeader>
          {editTxn && (
            <div className="space-y-3">
              {isInvestmentTxn(editTxn.type) && editTxn.assetQty && (
                <p className="text-sm rounded-md bg-muted px-3 py-2">
                  {parseFloat(editTxn.assetQty).toLocaleString("id-ID")} lot
                  {editTxn.assetPricePerUnit && (
                    <> × {formatIDRPrice(editTxn.assetPricePerUnit)}</>
                  )}{" "}
                  · {formatIDR(editTxn.amount)}
                </p>
              )}
              <div>
                <Label>Deskripsi</Label>
                <Input
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              {!isInvestmentTxn(editTxn.type) && isOwner && (
                <div>
                  <Label>Jumlah (Rp)</Label>
                  <Input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
              )}
              {!isInvestmentTxn(editTxn.type) && categories?.categories && (
                <div>
                  <Label>Kategori</Label>
                  <Select
                    value={editForm.categoryId || FILTER_ALL}
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, categoryId: v === FILTER_ALL ? "" : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FILTER_ALL}>—</SelectItem>
                      {categories.categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Tanggal</Label>
                <Input
                  type="date"
                  value={editForm.transactionDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, transactionDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Catatan</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                />
              </div>
              <div>
                <Label>No. Referensi</Label>
                <Input
                  value={editForm.referenceNo}
                  onChange={(e) => setEditForm((f) => ({ ...f, referenceNo: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTxn(null)}>
              Batal
            </Button>
            <Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTxnId} onOpenChange={(open) => !open && setDeleteTxnId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Transaksi akan dihapus dan saldo dompet disesuaikan. Untuk transaksi investasi, kepemilikan aset ikut
              berubah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={() => deleteTxnId && deleteMut.mutate(deleteTxnId)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TransactionRow({
  txn,
  txnTypes,
  isOwner,
  isIncome,
  reportingTimezone,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: {
  txn: Transaction;
  txnTypes: TransactionType[];
  isOwner: boolean;
  isIncome: boolean;
  reportingTimezone: string;
  onEdit: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const flow = txnTypeFlow(txn.type, txnTypes);
  const amountPrefix = flow === "income" ? "+" : flow === "transfer" ? "" : "-";
  const investment = isInvestmentTxn(txn.type);

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold",
            isIncome ? "bg-green-600" : txn.type === "transfer" ? "bg-blue-600" : investment ? "bg-cyan-700" : "bg-red-600",
          )}
        >
          {isIncome ? "+" : txn.type === "transfer" ? "⇄" : investment ? "◎" : "−"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{txnTitle(txn, txnTypes)}</p>
          <p className="text-xs text-muted-foreground">
            {txnTypeLabel(txn.type, txnTypes)}
            {txn.categoryName ? ` · ${txn.categoryName}` : ""}
            {" · "}
            {txn.walletName}
            {txn.toWalletName ? ` → ${txn.toWalletName}` : ""}
          </p>
          {investment && txn.assetQty && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {parseFloat(txn.assetQty).toLocaleString("id-ID")} lot
              {txn.assetPricePerUnit && <> @ {formatIDRPrice(txn.assetPricePerUnit)}</>}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{formatFinanceDate(txn.transactionDate, reportingTimezone)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("font-semibold tabular-nums", txnTypeColor(txn.type, txnTypes))}>
            {amountPrefix}
            {formatIDR(txn.amount)}
          </p>
          <div className="mt-1 flex items-center justify-end gap-1 flex-wrap">
            {investment && (
              <Badge variant="secondary" className="text-[10px]">
                Investasi
              </Badge>
            )}
            {txn.status === "pending_approval" && (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400">
                <Clock className="mr-1 h-3 w-3" /> {statusLabel(txn.status)}
              </Badge>
            )}
            {txn.status === "rejected" && (
              <Badge variant="destructive" className="text-[10px]">
                Ditolak
              </Badge>
            )}
          </div>
          {isOwner && txn.status === "pending_approval" && (
            <div className="mt-2 flex gap-1.5 justify-end">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onReject}>
                Tolak
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={onApprove}>
                <CheckCircle2 className="mr-1 h-3 w-3" /> Setujui
              </Button>
            </div>
          )}
          {isOwner && (txn.status === "approved" || txn.status === "rejected") && (
            <div className="mt-2 flex gap-1 justify-end">
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Ubah" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                title="Hapus"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
