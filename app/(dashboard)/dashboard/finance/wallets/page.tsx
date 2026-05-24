"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { financeApi, formatIDR, WALLET_TYPES } from "@/lib/api/finance";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { invalidateFinanceCaches } from "@/lib/finance/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WALLET_COLORS: Record<string, string> = {
  cash: "#16A34A",
  bank: "#2563EB",
  ewallet: "#7C3AED",
  crypto: "#F59E0B",
  investment: "#0891B2",
  other: "#6B7280",
};

export default function WalletsPage() {
  const { user } = useAuth();
  const isOwner = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [deleteWalletId, setDeleteWalletId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "cash", institution: "", currency: "IDR", initialBalance: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["finance-wallets"],
    queryFn: () => financeApi.listWallets(),
  });

  const createMut = useMutation({
    mutationFn: () =>
      financeApi.createWallet({
        ...form,
        initialBalance: parseFloat(form.initialBalance) || 0,
      }),
    onSuccess: () => {
      toast.success("Dompet berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["finance-wallets"] });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
      setOpenCreate(false);
      setForm({ name: "", type: "cash", institution: "", currency: "IDR", initialBalance: "" });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Gagal membuat dompet"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => financeApi.deleteWallet(id),
    onSuccess: () => {
      toast.success("Dompet dihapus");
      invalidateFinanceCaches(qc);
      setDeleteWalletId(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Gagal menghapus dompet"),
  });

  const wallets = data?.wallets ?? [];
  const deleteTarget = deleteWalletId ? wallets.find((w) => w.id === deleteWalletId) : undefined;
  const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance || "0"), 0);

  return (
    <>
      <PageHeader
        title="Dompet & Rekening"
        description="Kelola semua sumber dana bisnis Anda."
        actions={
          isOwner ? (
            <Button onClick={() => setOpenCreate(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Dompet
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Total Saldo Semua Dompet</p>
          <p className="mt-1 text-3xl font-bold">{formatIDR(totalBalance)}</p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Dompet hanya bisa dihapus jika tidak ada transaksi, aset investasi, atau transaksi berulang yang masih terhubung.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : wallets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada dompet. {isOwner ? "Tambahkan dompet pertama Anda." : ""}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((w) => (
            <Card
              key={w.id}
              style={{ borderLeftColor: w.color ?? WALLET_COLORS[w.type] ?? "#6B7280", borderLeftWidth: 4 }}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{w.name}</CardTitle>
                  <CardDescription>
                    {WALLET_TYPES.find((t) => t.value === w.type)?.label ?? w.type}
                    {w.institution ? ` · ${w.institution}` : ""}
                    {w.accountNoMask ? ` · ${w.accountNoMask}` : ""}
                  </CardDescription>
                </div>
                {w.visibility === "owner" && (
                  <Badge variant="outline" className="text-[10px]">
                    <Eye className="mr-1 h-3 w-3" /> Owner
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatIDR(w.balance)}</p>
                <p className="text-xs text-muted-foreground">Saldo awal {formatIDR(w.initialBalance)}</p>
                {isOwner && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      title="Hapus dompet"
                      onClick={() => setDeleteWalletId(w.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteWalletId} onOpenChange={(open) => !open && setDeleteWalletId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus dompet?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Dompet "${deleteTarget.name}" akan dihapus dari daftar.`
                : "Dompet akan dihapus dari daftar."}
              <span className="block mt-2">
                Jika masih ada transaksi terkait dompet ini, hapus transaksi di menu Transaksi (atau ubah dompet aset
                investasi) terlebih dahulu.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={() => deleteWalletId && deleteMut.mutate(deleteWalletId)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Dompet Baru</DialogTitle>
            <DialogDescription>Tambahkan sumber dana seperti kas, bank, atau e-wallet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama Dompet</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="mis. Kas Harian, BCA Bisnis"
              />
            </div>
            <div>
              <Label>Tipe</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WALLET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {["bank", "ewallet"].includes(form.type) && (
              <div>
                <Label>Nama Bank / E-Wallet</Label>
                <Input
                  value={form.institution}
                  onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
                  placeholder="mis. BCA, GoPay, OVO"
                />
              </div>
            )}
            <div>
              <Label>Saldo Awal (Rp)</Label>
              <Input
                type="number"
                value={form.initialBalance}
                onChange={(e) => setForm((f) => ({ ...f, initialBalance: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Batal
            </Button>
            <Button onClick={() => createMut.mutate()} disabled={!form.name || createMut.isPending}>
              {createMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
