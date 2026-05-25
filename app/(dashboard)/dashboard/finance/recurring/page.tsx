"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { financeApi, formatIDR, type Recurring } from "@/lib/api/finance";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { toApiError } from "@/lib/api/client";
import { NO_WALLET } from "@/lib/finance/utils";

type RecurringFrequency = Recurring["frequency"];
type RecurringMode = Recurring["mode"];

export default function RecurringPage() {
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    title: "", type: "expense", amount: "", walletId: "",
    frequency: "monthly" as RecurringFrequency,
    mode: "auto" as RecurringMode,
    startDate: new Date().toISOString().slice(0, 10),
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
      setForm({ title: "", type: "expense", amount: "", walletId: "", frequency: "monthly", mode: "auto", startDate: new Date().toISOString().slice(0, 10) });
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

  const items = data?.items ?? [];

  const freqLabel = (r: Recurring) => {
    const map: Record<string, string> = { daily: "Setiap hari", weekly: "Setiap minggu", monthly: "Setiap bulan", yearly: "Setiap tahun" };
    return map[r.frequency] ?? r.frequency;
  };

  return (
    <>
      <PageHeader
        title="Transaksi Otomatis"
        description="Kelola tagihan dan transaksi berulang."
        actions={
          <Button onClick={() => setOpenCreate(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Berulang
          </Button>
        }
      />

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
          {items.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {freqLabel(r)} · Berikutnya: {r.nextRunDate}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.mode === "auto" ? "Otomatis dicatat" : "Hanya pengingat"} · {r.occurrencesDone}× sudah berjalan
                  </p>
                </div>
                <div className="flex items-center gap-3">
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
                      onClick={() => { if (confirm("Hentikan transaksi berulang ini?")) deleteMut.mutate(r.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
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
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="mis. Gaji karyawan, Bayar sewa" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jenis</Label>
                <Select
                  value={txnTypes.some((t) => t.code === form.type) ? form.type : txnTypes[0]?.code ?? "expense"}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {txnTypes.map((t) => (
                      <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jumlah (Rp)</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div>
              <Label>Dompet</Label>
              <Select
                value={form.walletId || NO_WALLET}
                onValueChange={(v) => setForm((f) => ({ ...f, walletId: v === NO_WALLET ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Pilih dompet" /></SelectTrigger>
                <SelectContent>
                  {wallets?.wallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Otomatis dicatat</SelectItem>
                    <SelectItem value="reminder">Hanya pengingat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Mulai dari</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
            <Button onClick={() => createMut.mutate()} disabled={!form.title || !form.amount || !form.walletId || createMut.isPending}>
              {createMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
