"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, PlusCircle, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FinanceSubPageHeader } from "@/components/finance/finance-sub-page-header";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { financeApi, formatIDR, type Recurring } from "@/lib/api/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { toApiError } from "@/lib/api/client";
import { formatFinanceDate, NO_WALLET, todayISOInTimezone } from "@/lib/finance/utils";
import { useReportingTimezone } from "@/hooks/use-reporting-timezone";

type RecurringFrequency = Recurring["frequency"];
type RecurringMode = Recurring["mode"];

/** Monthly expense entries can be cloned to tagihan bulanan checklist. */
function canCloneToBilling(r: Recurring): boolean {
  return r.isActive && r.frequency === "monthly" && r.type === "expense";
}

export default function RecurringPage() {
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const reportingTimezone = useReportingTimezone();
  const todayISO = () => todayISOInTimezone(reportingTimezone);
  const [openCreate, setOpenCreate] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [stopRecurringId, setStopRecurringId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    type: "expense",
    amount: "",
    walletId: "",
    frequency: "monthly" as RecurringFrequency,
    mode: "auto" as RecurringMode,
    startDate: todayISO(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["finance-recurring"],
    queryFn: () => financeApi.listRecurring(),
  });

  const { data: wallets } = useQuery({
    queryKey: ["finance-wallets"],
    queryFn: () => financeApi.listWallets(),
  });

  const { data: txnTypesData } = useQuery({
    queryKey: ["finance-transaction-types", "recurring"],
    queryFn: () => financeApi.listTransactionTypes({ activeOnly: true, pageSize: 100 }),
  });
  const txnTypes = (txnTypesData?.items ?? []).filter(
    (t) => t.isActive && (!t.ownerOnly || canManage),
  );

  const createMut = useMutation({
    mutationFn: () => financeApi.createRecurring({ ...form, amount: parseFloat(form.amount) }),
    onSuccess: () => {
      toast.success("Transaksi berulang berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["finance-recurring"] });
      setOpenCreate(false);
      setForm({
        title: "",
        type: "expense",
        amount: "",
        walletId: "",
        frequency: "monthly",
        mode: "auto",
        startDate: todayISO(),
      });
    },
    onError: (e: unknown) => toast.error(toApiError(e).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => financeApi.deleteRecurring(id),
    onSuccess: () => {
      toast.success("Transaksi berulang dihentikan");
      qc.invalidateQueries({ queryKey: ["finance-recurring"] });
    },
  });

  const cloneMut = useMutation({
    mutationFn: (ids: string[]) => financeApi.cloneRecurringToBilling(ids),
    onSuccess: (res) => {
      const n = res.created.length;
      const s = res.skipped.length;
      if (n > 0) {
        toast.success(
          `${n} tagihan bulanan ditambahkan${s > 0 ? ` · ${s} dilewati` : ""}`,
        );
        qc.invalidateQueries({ queryKey: ["finance-checklist-templates-manage"] });
        qc.invalidateQueries({ queryKey: ["finance-monthly-billing"] });
      } else if (s > 0) {
        toast.warning(`Tidak ada yang di-clone — ${res.skipped[0]?.reason ?? "cek pilihan"}`);
      }
      setSelected(new Set());
    },
    onError: (e: unknown) => toast.error(toApiError(e).message),
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const cloneableItems = useMemo(() => items.filter(canCloneToBilling), [items]);

  const allCloneableSelected =
    cloneableItems.length > 0 && cloneableItems.every((r) => selected.has(r.id));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allCloneableSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(cloneableItems.map((r) => r.id)));
  };

  const freqLabel = (r: Recurring) => {
    const map: Record<string, string> = {
      daily: "Setiap hari",
      weekly: "Setiap minggu",
      monthly: "Setiap bulan",
      yearly: "Setiap tahun",
    };
    return map[r.frequency] ?? r.frequency;
  };

  return (
    <>
      <FinanceSubPageHeader
        title="Transaksi Otomatis"
        description="Kelola tagihan dan transaksi berulang."
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage && cloneableItems.length > 0 && (
              <Button
                variant="outline"
                disabled={selected.size === 0 || cloneMut.isPending}
                onClick={() => cloneMut.mutate(Array.from(selected))}
              >
                <Copy className="mr-2 h-4 w-4" />
                Clone ke Tagihan Bulanan
                {selected.size > 0 ? ` (${selected.size})` : ""}
              </Button>
            )}
            <Button
              onClick={() => {
                setForm((f) => ({ ...f, startDate: todayISO() }));
                setOpenCreate(true);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Berulang
            </Button>
          </div>
        }
      />

      {canManage && items.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={allCloneableSelected}
              onChange={toggleSelectAll}
              disabled={cloneableItems.length === 0}
            />
            <span>Pilih semua yang bisa di-clone</span>
          </label>
          <span className="text-muted-foreground text-xs">
            Hanya <strong>bulanan</strong> + <strong>pengeluaran</strong> aktif. Hasilnya di{" "}
            <Link href="/dashboard/finance/checklist" className="text-primary underline-offset-4 hover:underline">
              Tagihan Bulanan
            </Link>
            .
          </span>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada transaksi berulang. Contoh: gaji karyawan, sewa tempat, langganan bulanan.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((r) => {
            const cloneable = canCloneToBilling(r);
            const checked = selected.has(r.id);
            return (
              <Card
                key={r.id}
                className={cn(checked && "ring-2 ring-primary/40")}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  {canManage && (
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-input disabled:opacity-40"
                      checked={checked}
                      disabled={!cloneable}
                      title={
                        cloneable
                          ? "Pilih untuk clone ke tagihan bulanan"
                          : "Hanya transaksi bulanan pengeluaran yang aktif"
                      }
                      onChange={() => toggleSelect(r.id)}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {freqLabel(r)} · Berikutnya:{" "}
                      {formatFinanceDate(r.nextRunDate, reportingTimezone)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.mode === "auto" ? "Otomatis dicatat" : "Hanya pengingat"} ·{" "}
                      {r.occurrencesDone}× sudah berjalan
                      {!cloneable && r.isActive && (
                        <span className="text-amber-700 dark:text-amber-400">
                          {" "}
                          · Tidak bisa di-clone
                          {r.frequency !== "monthly"
                            ? " (bukan bulanan)"
                            : r.type !== "expense"
                              ? " (bukan pengeluaran)"
                              : ""}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="font-semibold text-red-600">{formatIDR(r.amount)}</p>
                      <Badge variant={r.isActive ? "default" : "secondary"} className="text-[10px]">
                        {r.isActive ? "Aktif" : "Berhenti"}
                      </Badge>
                    </div>
                    {r.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setStopRecurringId(r.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Transaksi Berulang</DialogTitle>
            <DialogDescription>Jadwalkan transaksi otomatis atau pengingat berkala.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Judul</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="mis. Gaji karyawan, Bayar sewa"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jenis</Label>
                <Select
                  value={
                    txnTypes.some((t) => t.code === form.type)
                      ? form.type
                      : txnTypes[0]?.code ?? "expense"
                  }
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {txnTypes.map((t) => (
                      <SelectItem key={t.code} value={t.code}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jumlah (Rp)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label>Dompet</Label>
              <Select
                value={form.walletId || NO_WALLET}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, walletId: v === NO_WALLET ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih dompet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets?.wallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Frekuensi</Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, frequency: v as RecurringFrequency }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Harian</SelectItem>
                    <SelectItem value="weekly">Mingguan</SelectItem>
                    <SelectItem value="monthly">Bulanan</SelectItem>
                    <SelectItem value="yearly">Tahunan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mode</Label>
                <Select
                  value={form.mode}
                  onValueChange={(v) => setForm((f) => ({ ...f, mode: v as RecurringMode }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Otomatis dicatat</SelectItem>
                    <SelectItem value="reminder">Hanya pengingat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Mulai dari</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Batal
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={
                !form.title || !form.amount || !form.walletId || createMut.isPending
              }
            >
              {createMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!stopRecurringId}
        onOpenChange={(open) => {
          if (!open) setStopRecurringId(null);
        }}
        title="Hentikan transaksi berulang?"
        description="Transaksi berulang ini akan dinonaktifkan dan tidak lagi dijadwalkan."
        confirmLabel="Hentikan"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (stopRecurringId) deleteMut.mutate(stopRecurringId);
          setStopRecurringId(null);
        }}
      />
    </>
  );
}
