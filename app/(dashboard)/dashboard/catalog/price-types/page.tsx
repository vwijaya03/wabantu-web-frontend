"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, PlusCircle, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/dashboard/page-header";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { toApiError } from "@/lib/api/client";
import { priceTypesApi, type PriceType } from "@/lib/api/price-types";
import { toast } from "sonner";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { useTenantQueryEnabled } from "@/hooks/use-tenant-query-enabled";
import { tenantQueryKey } from "@/lib/query/tenant-query-key";
import { useLocale } from "@/lib/i18n/locale";

const pageSize = 20;

const emptyForm = {
  code: "",
  label: "",
  displayOrder: 0,
  isDefault: false,
};

export default function PriceTypesPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const tenantKey = useTenantKey();
  const tenantReady = useTenantQueryEnabled();
  const canManage = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openCreate, setOpenCreate] = useState(false);
  const [editItem, setEditItem] = useState<PriceType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deletePriceTypeId, setDeletePriceTypeId] = useState<string | null>(null);
  const [deletePriceTypeLabel, setDeletePriceTypeLabel] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "price-types", search, page),
    queryFn: ({ signal }) => priceTypesApi.list({ q: search || undefined, page, pageSize }, signal),
    enabled: canManage && tenantReady,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["price-types"] });
  };

  const createMut = useMutation({
    mutationFn: () => priceTypesApi.create(form),
    onSuccess: () => {
      toast.success(t("Tipe harga ditambahkan"));
      invalidate();
      setOpenCreate(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(t(toApiError(e).message)),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      priceTypesApi.update(editItem!.id, {
        label: form.label,
        displayOrder: form.displayOrder,
        isDefault: form.isDefault,
      }),
    onSuccess: () => {
      toast.success(t("Tipe harga diperbarui"));
      invalidate();
      setEditItem(null);
    },
    onError: (e) => toast.error(t(toApiError(e).message)),
  });

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      priceTypesApi.update(id, { isActive }),
    onSuccess: () => {
      toast.success(t("Status diperbarui"));
      invalidate();
    },
    onError: (e) => toast.error(t(toApiError(e).message)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => priceTypesApi.remove(id),
    onSuccess: () => {
      toast.success(t("Tipe harga dihapus"));
      invalidate();
    },
    onError: (e) => toast.error(t(toApiError(e).message)),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openEdit = (item: PriceType) => {
    setEditItem(item);
    setForm({
      code: item.code,
      label: item.label,
      displayOrder: item.displayOrder,
      isDefault: item.isDefault,
    });
  };

  if (!canManage) {
    return (
      <>
        <PageHeader title={t("Tipe Harga")} description={t("Kelola label harga umum, reseller, dan tipe kustom.")} />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("Hanya owner atau super admin yang sedang Pantau tenant yang dapat mengelola tipe harga.")}
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/catalog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("Kembali ke Katalog")}
          </Link>
        </Button>
      </div>
      <PageHeader
        title={t("Tipe Harga")}
        description={t("Definisikan harga umum, reseller, atau tipe lain. Kontak dan pesanan memakai tipe ini.")}
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setOpenCreate(true);
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> {t("Tambah Tipe")}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("Cari label atau kode…")}
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
          {t("Cari")}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("Memuat…")}</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t('Belum ada tipe harga. Sistem biasanya sudah menyiapkan "umum" dan "reseller".')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    <code>{item.code}</code>
                    {t(" · urutan ")}
                    {item.displayOrder}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.isDefault && <Badge variant="secondary">{t("Default")}</Badge>}
                    {item.isSystem && <Badge variant="outline">{t("Sistem")}</Badge>}
                    {!item.isActive && <Badge variant="destructive">{t("Nonaktif")}</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActiveMut.mutate({ id: item.id, isActive: !item.isActive })}
                  >
                    {item.isActive ? t("Nonaktifkan") : t("Aktifkan")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {!item.isSystem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        setDeletePriceTypeId(item.id);
                        setDeletePriceTypeLabel(item.label);
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
            {t("{total} tipe · halaman {page} / {totalPages}", { total, page, totalPages })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {t("Sebelumnya")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("Berikutnya")}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Tambah Tipe Harga")}</DialogTitle>
            <DialogDescription>{t("Contoh: grosir, member, distributor.")}</DialogDescription>
          </DialogHeader>
          <PriceTypeForm form={form} setForm={setForm} isCreate />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              {t("Batal")}
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!form.code.trim() || !form.label.trim() || createMut.isPending}
            >
              {t("Simpan")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Edit Tipe Harga")}</DialogTitle>
            <DialogDescription>{t("Ubah label, urutan, atau tipe default tenant.")}</DialogDescription>
          </DialogHeader>
          <PriceTypeForm form={form} setForm={setForm} isCreate={false} isSystem={editItem?.isSystem} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              {t("Batal")}
            </Button>
            <Button onClick={() => updateMut.mutate()} disabled={!form.label.trim() || updateMut.isPending}>
              {t("Simpan")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletePriceTypeId}
        onOpenChange={(open) => {
          if (!open) {
            setDeletePriceTypeId(null);
            setDeletePriceTypeLabel("");
          }
        }}
        title={t("Hapus tipe harga?")}
        description={deletePriceTypeLabel ? t('Tipe "{label}" akan dihapus permanen.', { label: deletePriceTypeLabel }) : undefined}
        confirmLabel={t("Hapus")}
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (deletePriceTypeId) deleteMut.mutate(deletePriceTypeId);
          setDeletePriceTypeId(null);
          setDeletePriceTypeLabel("");
        }}
      />
    </>
  );
}

function PriceTypeForm({
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
  const { t } = useLocale();
  return (
    <div className="space-y-3">
      {isCreate && (
        <div>
          <Label>{t("Kode (unik, huruf kecil)")}</Label>
          <Input
            value={form.code}
            onChange={(e) =>
              setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s/g, "_") })
            }
            placeholder={t("mis. grosir")}
          />
        </div>
      )}
      <div>
        <Label>{t("Label tampilan")}</Label>
        <Input
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          placeholder={t("mis. Harga grosir")}
          disabled={isSystem}
        />
      </div>
      <div>
        <Label>{t("Urutan tampil")}</Label>
        <Input
          type="number"
          value={form.displayOrder}
          onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value, 10) || 0 })}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="isDefault"
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
        />
        <Label htmlFor="isDefault">{t("Jadikan tipe default (fallback jika kontak tanpa tipe)")}</Label>
      </div>
    </div>
  );
}
