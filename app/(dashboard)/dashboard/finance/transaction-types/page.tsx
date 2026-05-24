"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Pencil, Trash2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { financeApi, type TransactionType } from "@/lib/api/finance";
import { invalidateFinanceCaches } from "@/lib/finance/utils";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";

const FLOWS: { value: TransactionType["flow"]; label: string }[] = [
  { value: "income", label: "Pemasukan (saldo +)" },
  { value: "expense", label: "Pengeluaran (saldo −)" },
  { value: "transfer", label: "Transfer antar dompet" },
  { value: "adjustment", label: "Penyesuaian saldo" },
];

const CATEGORY_KINDS: { value: TransactionType["categoryKind"]; label: string }[] = [
  { value: "income", label: "Kategori pemasukan" },
  { value: "expense", label: "Kategori pengeluaran" },
  { value: "investment", label: "Kategori investasi" },
  { value: "any", label: "Semua / opsional" },
];

const emptyForm = {
  code: "",
  label: "",
  flow: "expense" as TransactionType["flow"],
  categoryKind: "expense" as TransactionType["categoryKind"],
  showInQuick: false,
  displayOrder: 0,
};

export default function TransactionTypesPage() {
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [openCreate, setOpenCreate] = useState(false);
  const [editItem, setEditItem] = useState<TransactionType | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ["finance-transaction-types", search, page],
    queryFn: () =>
      financeApi.listTransactionTypes({ q: search || undefined, page, pageSize }),
    enabled: canManage,
  });

  const invalidate = () => {
    invalidateFinanceCaches(qc);
  };

  const createMut = useMutation({
    mutationFn: () => financeApi.createTransactionType(form),
    onSuccess: () => {
      toast.success("Jenis transaksi ditambahkan");
      invalidate();
      setOpenCreate(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Gagal menyimpan"),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      financeApi.updateTransactionType(editItem!.id, {
        label: form.label,
        flow: form.flow,
        categoryKind: form.categoryKind,
        showInQuick: form.showInQuick,
        displayOrder: form.displayOrder,
      }),
    onSuccess: () => {
      toast.success("Jenis transaksi diperbarui");
      invalidate();
      setEditItem(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Gagal memperbarui"),
  });

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      financeApi.updateTransactionType(id, { isActive }),
    onSuccess: () => {
      toast.success("Status diperbarui");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Gagal memperbarui"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => financeApi.deleteTransactionType(id),
    onSuccess: () => {
      toast.success("Jenis transaksi dihapus");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Gagal menghapus"),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openEdit = (t: TransactionType) => {
    setEditItem(t);
    setForm({
      code: t.code,
      label: t.label,
      flow: t.flow,
      categoryKind: t.categoryKind,
      showInQuick: t.showInQuick,
      displayOrder: t.displayOrder,
    });
  };

  if (!canManage) {
    const description =
      user?.role === "super_admin"
        ? "Pilih tenant lewat Pantau di konsol admin untuk mengelola jenis transaksi."
        : "Hanya owner yang dapat mengelola jenis transaksi.";
    return (
      <>
        <PageHeader title="Jenis Transaksi" description={description} />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Anda tidak memiliki akses ke halaman ini.
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Jenis Transaksi"
        description="Label tombol Pemasukan, Pengeluaran, dan lainnya di form Catat Transaksi."
        actions={
          <Button onClick={() => { setForm(emptyForm); setOpenCreate(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Jenis
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari label atau kode…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(q.trim());
                setPage(1);
              }
            }}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setSearch(q.trim());
            setPage(1);
          }}
        >
          Cari
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Tidak ada jenis transaksi.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">
                    <code>{t.code}</code>
                    {" · "}
                    {FLOWS.find((f) => f.value === t.flow)?.label ?? t.flow}
                    {" · urutan "}
                    {t.displayOrder}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.showInQuick && <Badge variant="secondary">Tombol cepat</Badge>}
                    {t.isSystem && <Badge variant="outline">Sistem</Badge>}
                    {t.ownerOnly && <Badge variant="outline">Owner</Badge>}
                    {!t.isActive && <Badge variant="destructive">Nonaktif</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toggleActiveMut.mutate({ id: t.id, isActive: !t.isActive })
                    }
                  >
                    {t.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {!t.isSystem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`Hapus jenis "${t.label}"?`)) deleteMut.mutate(t.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} jenis · halaman {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Jenis Transaksi</DialogTitle>
            <DialogDescription>Definisikan jenis transaksi kustom untuk form Catat Transaksi.</DialogDescription>
          </DialogHeader>
          <TypeForm form={form} setForm={setForm} isCreate />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Jenis Transaksi</DialogTitle>
            <DialogDescription>Ubah label, urutan, atau visibilitas tombol cepat.</DialogDescription>
          </DialogHeader>
          <TypeForm form={form} setForm={setForm} isCreate={false} isSystem={editItem?.isSystem} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Batal</Button>
            <Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TypeForm({
  form,
  setForm,
  isCreate,
  isSystem,
}: {
  form: typeof emptyForm;
  setForm: (f: typeof emptyForm) => void;
  isCreate: boolean;
  isSystem?: boolean;
}) {
  return (
    <div className="space-y-3">
      {isCreate && (
        <div>
          <Label>Kode (unik, huruf kecil)</Label>
          <Input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s/g, "_") })}
            placeholder="mis. biaya_kirim"
          />
        </div>
      )}
      <div>
        <Label>Label tampilan</Label>
        <Input
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          placeholder="mis. Biaya Kirim"
        />
      </div>
      <div>
        <Label>Alur saldo (flow)</Label>
        <Select
          value={form.flow}
          onValueChange={(v) => setForm({ ...form, flow: v as TransactionType["flow"] })}
          disabled={isSystem}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FLOWS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Filter kategori</Label>
        <Select
          value={form.categoryKind}
          onValueChange={(v) => setForm({ ...form, categoryKind: v as TransactionType["categoryKind"] })}
          disabled={isSystem}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="showInQuick"
          type="checkbox"
          checked={form.showInQuick}
          onChange={(e) => setForm({ ...form, showInQuick: e.target.checked })}
        />
        <Label htmlFor="showInQuick">Tampilkan sebagai tombol cepat di Catat Transaksi</Label>
      </div>
      <div>
        <Label>Urutan tampil</Label>
        <Input
          type="number"
          value={form.displayOrder}
          onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value, 10) || 0 })}
        />
      </div>
    </div>
  );
}
