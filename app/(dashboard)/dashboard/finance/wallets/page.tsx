"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlusCircle,
  Trash2,
  Pencil,
  Eye,
  Search,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  financeApi,
  formatIDR,
  WALLET_TYPES,
  WALLET_ICON_OPTIONS,
  WALLET_COLOR_PRESETS,
  type Wallet as WalletType,
} from "@/lib/api/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { invalidateFinanceCaches } from "@/lib/finance/utils";
import {
  WALLET_TYPE_COLORS,
  WALLET_ICON_MAP,
  defaultWalletIconKey,
  resolveWalletAccent,
  WalletIconBadge,
} from "@/lib/finance/wallet-icons";
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

function emptyForm() {
  return {
    name: "",
    type: "cash",
    institution: "",
    currency: "IDR",
    initialBalance: "",
    color: WALLET_TYPE_COLORS.cash,
    icon: "wallet",
    visibility: "all" as "all" | "owner",
  };
}

function WalletFormFields({
  form,
  setForm,
  isEdit,
}: {
  form: ReturnType<typeof emptyForm>;
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyForm>>>;
  isEdit: boolean;
}) {
  const IconPreview = WALLET_ICON_MAP[form.icon] ?? Wallet;

  return (
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
        <Select
          value={form.type}
          onValueChange={(v) =>
            setForm((f) => ({
              ...f,
              type: v,
              icon: f.icon === defaultWalletIconKey(f.type) ? defaultWalletIconKey(v) : f.icon,
              color:
                f.color === WALLET_TYPE_COLORS[f.type]
                  ? WALLET_TYPE_COLORS[v] ?? WALLET_TYPE_COLORS.other
                  : f.color,
            }))
          }
        >
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
      {!isEdit && (
        <div>
          <Label>Saldo Awal (Rp)</Label>
          <Input
            type="number"
            value={form.initialBalance}
            onChange={(e) => setForm((f) => ({ ...f, initialBalance: e.target.value }))}
            placeholder="0"
          />
        </div>
      )}
      {isEdit && (
        <p className="text-xs text-muted-foreground rounded-md bg-muted px-2 py-1.5">
          Saldo berjalan dihitung dari transaksi. Ubah saldo awal tidak tersedia setelah dompet dibuat.
        </p>
      )}
      <div>
        <Label>Ikon</Label>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {WALLET_ICON_OPTIONS.map((opt) => {
            const Ico = WALLET_ICON_MAP[opt.value] ?? Wallet;
            const selected = form.icon === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                title={opt.label}
                className={cn(
                  "flex h-10 w-full items-center justify-center rounded-md border transition-colors",
                  selected ? "border-primary bg-primary/10 ring-2 ring-primary" : "hover:bg-muted",
                )}
                onClick={() => setForm((f) => ({ ...f, icon: opt.value }))}
              >
                <Ico className="h-5 w-5" style={{ color: form.color }} />
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
          Pratinjau: <IconPreview className="h-4 w-4" style={{ color: form.color }} /> {form.icon}
        </p>
      </div>
      <div>
        <Label>Warna aksen</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {WALLET_COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-transform",
                form.color === c ? "scale-110 border-foreground" : "border-transparent",
              )}
              style={{ backgroundColor: c }}
              onClick={() => setForm((f) => ({ ...f, color: c }))}
            />
          ))}
        </div>
        <Input
          className="mt-2 font-mono text-sm"
          value={form.color}
          onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
          placeholder="#16A34A"
        />
      </div>
      <div>
        <Label>Visibilitas</Label>
        <Select
          value={form.visibility}
          onValueChange={(v) => setForm((f) => ({ ...f, visibility: v as "all" | "owner" }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua anggota tim</SelectItem>
            <SelectItem value="owner">Hanya owner</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function WalletsPage() {
  const { user } = useAuth();
  const isOwner = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [editWalletId, setEditWalletId] = useState<string | null>(null);
  const [deleteWalletId, setDeleteWalletId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const { data, isLoading } = useQuery({
    queryKey: ["finance-wallets"],
    queryFn: () => financeApi.listWallets(),
  });

  const createMut = useMutation({
    mutationFn: () =>
      financeApi.createWallet({
        name: form.name.trim(),
        type: form.type,
        institution: form.institution.trim() || undefined,
        currency: form.currency,
        initialBalance: parseFloat(form.initialBalance) || 0,
        color: form.color,
        icon: form.icon,
        visibility: form.visibility,
      }),
    onSuccess: () => {
      toast.success("Dompet berhasil dibuat");
      invalidateFinanceCaches(qc);
      setOpenCreate(false);
      setForm(emptyForm());
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Gagal membuat dompet"),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      financeApi.updateWallet(editWalletId!, {
        name: form.name.trim(),
        type: form.type,
        institution: form.institution.trim(),
        color: form.color,
        icon: form.icon,
        visibility: form.visibility,
      }),
    onSuccess: () => {
      toast.success("Dompet diperbarui");
      invalidateFinanceCaches(qc);
      setEditWalletId(null);
      setForm(emptyForm());
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Gagal memperbarui dompet"),
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

  const wallets = useMemo(() => data?.wallets ?? [], [data?.wallets]);
  const filteredWallets = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return wallets;
    return wallets.filter((w) => {
      const hay = [
        w.name,
        w.type,
        w.institution,
        w.accountNoMask,
        WALLET_TYPES.find((t) => t.value === w.type)?.label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [wallets, search]);

  const deleteTarget = deleteWalletId ? wallets.find((w) => w.id === deleteWalletId) : undefined;
  const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance || "0"), 0);
  const walletDialogOpen = openCreate || !!editWalletId;

  const openEdit = (w: WalletType) => {
    setEditWalletId(w.id);
    setForm({
      name: w.name,
      type: w.type,
      institution: w.institution ?? "",
      currency: w.currency,
      initialBalance: w.initialBalance,
      color: w.color ?? WALLET_TYPE_COLORS[w.type] ?? WALLET_TYPE_COLORS.other,
      icon: w.icon ?? defaultWalletIconKey(w.type),
      visibility: w.visibility as "all" | "owner",
    });
  };

  const closeWalletDialog = () => {
    setOpenCreate(false);
    setEditWalletId(null);
    setForm(emptyForm());
  };

  return (
    <>
      <PageHeader
        title="Dompet & Rekening"
        description="Kelola semua sumber dana bisnis Anda."
        actions={
          isOwner ? (
            <Button
              onClick={() => {
                setForm(emptyForm());
                setOpenCreate(true);
              }}
            >
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Cari nama, bank, tipe..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearch(q.trim());
            }}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setSearch(q.trim())}>
          Cari
        </Button>
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setSearch("");
            }}
          >
            Reset
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Dompet hanya bisa dihapus jika tidak ada transaksi, aset investasi, atau transaksi berulang yang masih
        terhubung.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : wallets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada dompet. {isOwner ? "Tambahkan dompet pertama Anda." : ""}
          </CardContent>
        </Card>
      ) : filteredWallets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Tidak ada dompet yang cocok dengan pencarian.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWallets.map((w) => {
            const accent = resolveWalletAccent(w.color, w.type);
            return (
              <Card key={w.id} style={{ borderLeftColor: accent, borderLeftWidth: 4 }}>
                <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
                  <div className="flex gap-3 min-w-0">
                    <WalletIconBadge icon={w.icon} type={w.type} color={w.color} />
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{w.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {WALLET_TYPES.find((t) => t.value === w.type)?.label ?? w.type}
                        {w.institution ? ` · ${w.institution}` : ""}
                        {w.accountNoMask ? ` · ${w.accountNoMask}` : ""}
                      </CardDescription>
                    </div>
                  </div>
                  {w.visibility === "owner" && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      <Eye className="mr-1 h-3 w-3" /> Owner
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatIDR(w.balance)}</p>
                  <p className="text-xs text-muted-foreground">Saldo awal {formatIDR(w.initialBalance)}</p>
                  {isOwner && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(w)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Ubah
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteWalletId(w.id)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
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

      <Dialog open={walletDialogOpen} onOpenChange={(open) => !open && closeWalletDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editWalletId ? "Ubah Dompet" : "Tambah Dompet Baru"}</DialogTitle>
            <DialogDescription>
              {editWalletId
                ? "Perbarui nama, ikon, warna, dan visibilitas dompet."
                : "Tambahkan sumber dana seperti kas, bank, atau e-wallet."}
            </DialogDescription>
          </DialogHeader>
          <WalletFormFields form={form} setForm={setForm} isEdit={!!editWalletId} />
          <DialogFooter>
            <Button variant="outline" onClick={closeWalletDialog}>
              Batal
            </Button>
            <Button
              onClick={() => (editWalletId ? updateMut.mutate() : createMut.mutate())}
              disabled={!form.name.trim() || createMut.isPending || updateMut.isPending}
            >
              {createMut.isPending || updateMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
