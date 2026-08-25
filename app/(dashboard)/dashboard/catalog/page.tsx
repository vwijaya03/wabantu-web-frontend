"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { catalogApi, type CatalogItem, type CatalogItemPrice } from "@/lib/api/catalog";
import { priceTypesApi, type PriceType } from "@/lib/api/price-types";
import { toApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { useTenantQueryEnabled } from "@/hooks/use-tenant-query-enabled";
import { tenantQueryKey } from "@/lib/query/tenant-query-key";

const pageSize = 25;

type CatalogForm = {
  externalCode: string;
  name: string;
  description: string;
  sellPrice: string;
  priceByType: Record<string, string>;
  sellUnit: string;
  barcode: string;
  isActive: boolean;
};

const emptyForm: CatalogForm = {
  externalCode: "",
  name: "",
  description: "",
  sellPrice: "",
  priceByType: {},
  sellUnit: "",
  barcode: "",
  isActive: true,
};

export default function CatalogPage() {
  const { user } = useAuth();
  const tenantKey = useTenantKey();
  const tenantReady = useTenantQueryEnabled();
  const canManage = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createForm, setCreateForm] = useState<CatalogForm>(emptyForm);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [editForm, setEditForm] = useState<CatalogForm>(emptyForm);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteProductName, setDeleteProductName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "catalog", search, page, pageSize),
    queryFn: ({ signal }) => catalogApi.list({ q: search || undefined, page, pageSize }, signal),
    enabled: tenantReady,
  });
  const { data: priceTypesData } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "price-types", "catalog-form"),
    queryFn: ({ signal }) => priceTypesApi.list({ pageSize: 50 }, signal),
    enabled: tenantReady,
  });
  const priceTypes = (priceTypesData?.items ?? []).filter((pt) => pt.isActive);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  const invalidateCatalog = () => {
    void qc.invalidateQueries({ queryKey: ["catalog"] });
  };

  const createMut = useMutation({
    mutationFn: () =>
      catalogApi.create(toCreatePayload(createForm, priceTypes)),
    onSuccess: () => {
      toast.success("Produk ditambahkan");
      setCreateForm(emptyForm);
      setPage(1);
      invalidateCatalog();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const updateMut = useMutation({
    mutationFn: () => catalogApi.update(editItem!.id, toUpdatePayload(editForm, priceTypes)),
    onSuccess: () => {
      toast.success("Produk diperbarui");
      setEditItem(null);
      invalidateCatalog();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => catalogApi.remove(id),
    onSuccess: () => {
      toast.success("Produk dihapus");
      invalidateCatalog();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const toggleActiveMut = useMutation({
    mutationFn: (item: CatalogItem) => catalogApi.update(item.id, { isActive: !item.isActive }),
    onSuccess: () => {
      toast.success("Status produk diperbarui");
      invalidateCatalog();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const runSearch = () => {
    setSearch(q.trim());
    setPage(1);
  };

  const openEdit = (item: CatalogItem) => {
    const priceByType: Record<string, string> = {};
    for (const row of item.prices ?? []) {
      priceByType[row.priceTypeId] = String(row.price);
    }
    const defaultType = priceTypes.find((pt) => pt.isDefault) ?? priceTypes[0];
    if (defaultType && priceByType[defaultType.id] == null && item.sellPrice != null) {
      priceByType[defaultType.id] = String(item.sellPrice);
    }
    setEditItem(item);
    setEditForm({
      externalCode: item.externalCode,
      name: item.name,
      description: item.description ?? "",
      sellPrice: item.sellPrice == null ? "" : String(item.sellPrice),
      priceByType,
      sellUnit: item.sellUnit ?? "",
      barcode: item.barcode ?? "",
      isActive: item.isActive,
    });
  };

  return (
    <>
      <PageHeader title="Katalog Produk" description="Kelola produk untuk AI dan pesanan." />
      <p className="mb-4 text-sm">
        <Link
          href="/dashboard/catalog/import-image"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Import dari screenshot (AI)
        </Link>
        <span className="text-muted-foreground"> — untuk seller tanpa export CSV; memakai kuota token AI.</span>
        {" · "}
        <Link
          href="/dashboard/catalog/price-types"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Kelola tipe harga
        </Link>
      </p>
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Tambah produk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CatalogFormFields form={createForm} setForm={setCreateForm} priceTypes={priceTypes} />
            <Button
              onClick={() => createMut.mutate()}
              disabled={!canManage || !createForm.externalCode.trim() || !createForm.name.trim() || createMut.isPending}
            >
              Simpan
            </Button>
            {!canManage && (
              <p className="text-xs text-muted-foreground">
                Hanya owner atau super admin yang sedang Pantau tenant yang dapat mengubah katalog.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Daftar produk ({total})</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Data dibatasi {pageSize} item per halaman agar tetap ringan meski SKU puluhan ribu.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative w-full min-w-0 lg:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") runSearch();
                    }}
                    placeholder="Cari nama, SKU, barcode..."
                  />
                </div>
                <Button variant="secondary" onClick={runSearch}>
                  Cari
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                Tidak ada produk yang cocok.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <div className="grid grid-cols-[minmax(180px,1fr)_130px_130px_120px] gap-3 border-b bg-muted/60 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground max-lg:hidden">
                  <span>Produk</span>
                  <span>SKU / Barcode</span>
                  <span>Harga</span>
                  <span className="text-right">Aksi</span>
                </div>
                <TooltipProvider>
                  <div className="max-h-[640px] divide-y overflow-auto">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[minmax(180px,1fr)_130px_130px_120px] lg:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <ProductNameTooltip name={item.name} />
                            <Badge variant={item.isActive ? "success" : "destructive"} className="shrink-0">
                              {item.isActive ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p className="font-mono text-foreground">{item.externalCode}</p>
                          {item.barcode && <p>{item.barcode}</p>}
                        </div>
                        <div className="text-sm">
                          {item.sellPrice != null ? formatRupiah(item.sellPrice) : "-"}
                          {item.sellUnit && <span className="text-muted-foreground"> / {item.sellUnit}</span>}
                        </div>
                        <div className="flex justify-start gap-1 lg:justify-end">
                          <Button
                            variant={item.isActive ? "outline" : "secondary"}
                            size="sm"
                            disabled={!canManage}
                            onClick={() => toggleActiveMut.mutate(item)}
                          >
                            {item.isActive ? "Off" : "On"}
                          </Button>
                          <Button variant="outline" size="sm" disabled={!canManage} onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!canManage}
                            className="text-destructive"
                            onClick={() => {
                              setDeleteProductId(item.id);
                              setDeleteProductName(item.name);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </TooltipProvider>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">
                {total === 0 ? "0 produk" : `Menampilkan ${firstItem}-${lastItem} dari ${total} produk`}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit produk</DialogTitle>
            <DialogDescription>Ubah nama, harga, barcode, deskripsi, dan status produk.</DialogDescription>
          </DialogHeader>
          <CatalogFormFields form={editForm} setForm={setEditForm} isEdit priceTypes={priceTypes} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Batal
            </Button>
            <Button onClick={() => updateMut.mutate()} disabled={!editForm.name.trim() || updateMut.isPending}>
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteProductId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteProductId(null);
            setDeleteProductName("");
          }
        }}
        title="Hapus produk?"
        description={deleteProductName ? `Produk "${deleteProductName}" akan dihapus permanen.` : undefined}
        confirmLabel="Hapus"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (deleteProductId) deleteMut.mutate(deleteProductId);
          setDeleteProductId(null);
          setDeleteProductName("");
        }}
      />
    </>
  );
}

function ProductNameTooltip({ name }: { name: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <p className="min-w-0 flex-1 truncate font-medium" tabIndex={0} aria-label={name}>
          {name}
        </p>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-sm break-words">
        {name}
      </TooltipContent>
    </Tooltip>
  );
}

function CatalogFormFields({
  form,
  setForm,
  isEdit,
  priceTypes,
}: {
  form: CatalogForm;
  setForm: (form: CatalogForm) => void;
  isEdit?: boolean;
  priceTypes: PriceType[];
}) {
  const update = (patch: Partial<CatalogForm>) => setForm({ ...form, ...patch });
  const updatePrice = (priceTypeId: string, value: string) => {
    const next = { ...form.priceByType, [priceTypeId]: value };
    const defaultType = priceTypes.find((pt) => pt.isDefault);
    const patch: Partial<CatalogForm> = { priceByType: next };
    if (defaultType && priceTypeId === defaultType.id) {
      patch.sellPrice = value;
    }
    setForm({ ...form, ...patch });
  };
  return (
    <div className="space-y-3">
      <div>
        <Label>SKU / Kode</Label>
        <Input
          value={form.externalCode}
          onChange={(e) => update({ externalCode: e.target.value })}
          disabled={isEdit}
          placeholder="SKU-001"
        />
      </div>
      <div>
        <Label>Nama</Label>
        <Input value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Nama produk" />
      </div>
      {priceTypes.length > 0 ? (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Harga per tipe</p>
          {priceTypes.map((pt) => (
            <div key={pt.id}>
              <Label>
                {pt.label}
                {pt.isDefault ? " (default)" : ""}
              </Label>
              <Input
                value={form.priceByType[pt.id] ?? ""}
                onChange={(e) => updatePrice(pt.id, e.target.value)}
                type="number"
                min="0"
                placeholder="25000"
              />
            </div>
          ))}
        </div>
      ) : (
        <div>
          <Label>Harga (IDR)</Label>
          <Input
            value={form.sellPrice}
            onChange={(e) => update({ sellPrice: e.target.value })}
            type="number"
            min="0"
            placeholder="25000"
          />
        </div>
      )}
      <div>
        <Label>Satuan</Label>
        <Input value={form.sellUnit} onChange={(e) => update({ sellUnit: e.target.value })} placeholder="pcs" />
      </div>
      <div>
        <Label>Barcode</Label>
        <Input value={form.barcode} onChange={(e) => update({ barcode: e.target.value })} placeholder="Opsional" />
      </div>
      <div>
        <Label>Deskripsi</Label>
        <Textarea
          value={form.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Opsional, dipakai AI untuk menjawab pertanyaan produk"
          rows={3}
        />
      </div>
      <button
        type="button"
        onClick={() => update({ isActive: !form.isActive })}
        className={cn(
          "rounded-md border px-3 py-2 text-left text-sm",
          form.isActive ? "border-primary/30 bg-primary/5" : "bg-muted/40 text-muted-foreground",
        )}
      >
        Status: {form.isActive ? "Aktif" : "Nonaktif"}
      </button>
    </div>
  );
}

function toCreatePayload(form: CatalogForm, priceTypes: PriceType[]) {
  const prices = buildPricesPayload(form, priceTypes);
  const defaultType = priceTypes.find((pt) => pt.isDefault);
  const defaultPrice =
    defaultType && form.priceByType[defaultType.id]
      ? optionalNumber(form.priceByType[defaultType.id])
      : optionalNumber(form.sellPrice);
  return {
    externalCode: form.externalCode.trim(),
    name: form.name.trim(),
    description: optionalString(form.description),
    sellPrice: defaultPrice,
    prices: prices.length > 0 ? prices : undefined,
    sellUnit: optionalString(form.sellUnit),
    barcode: optionalString(form.barcode),
    isActive: form.isActive,
  };
}

function toUpdatePayload(form: CatalogForm, priceTypes: PriceType[]) {
  const prices = buildPricesPayload(form, priceTypes);
  const defaultType = priceTypes.find((pt) => pt.isDefault);
  const defaultPrice =
    defaultType && form.priceByType[defaultType.id]
      ? optionalNumber(form.priceByType[defaultType.id])
      : optionalNumber(form.sellPrice);
  return {
    name: form.name.trim(),
    description: optionalString(form.description),
    sellPrice: defaultPrice,
    prices: prices.length > 0 ? prices : undefined,
    sellUnit: optionalString(form.sellUnit),
    barcode: optionalString(form.barcode),
    isActive: form.isActive,
  };
}

function buildPricesPayload(form: CatalogForm, priceTypes: PriceType[]): CatalogItemPrice[] {
  return priceTypes
    .map((pt) => {
      const raw = form.priceByType[pt.id];
      if (raw == null || raw.trim() === "") return null;
      const price = Number(raw);
      if (!Number.isFinite(price) || price < 0) return null;
      return { priceTypeId: pt.id, price };
    })
    .filter((row): row is CatalogItemPrice => row != null);
}

function optionalString(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function optionalNumber(value: string) {
  if (value.trim() === "") return undefined;
  return Number(value);
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
