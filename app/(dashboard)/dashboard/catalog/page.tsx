"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/page-header";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { CatalogBulkToolbar } from "@/components/catalog/catalog-bulk-toolbar";
import { CatalogProductSheet } from "@/components/catalog/catalog-product-sheet";
import { CatalogProductTable } from "@/components/catalog/catalog-product-table";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { catalogApi, type CatalogItem } from "@/lib/api/catalog";
import { priceTypesApi } from "@/lib/api/price-types";
import { toApiError } from "@/lib/api/client";
import {
  catalogFormFromItem,
  duplicateCatalogForm,
  emptyCatalogForm,
  toCreatePayload,
  toUpdatePayload,
  type CatalogForm,
} from "@/lib/catalog/form";
import { generateSkuFromProductName } from "@/lib/catalog/generate-sku";
import { toast } from "sonner";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { useTenantQueryEnabled } from "@/hooks/use-tenant-query-enabled";
import { tenantQueryKey } from "@/lib/query/tenant-query-key";
import { cn } from "@/lib/utils";

const pageSize = 25;

type SheetMode = "create" | "edit" | null;

export default function CatalogPage() {
  const { user } = useAuth();
  const tenantKey = useTenantKey();
  const tenantReady = useTenantQueryEnabled();
  const canManage = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [form, setForm] = useState<CatalogForm>(emptyCatalogForm);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteProductName, setDeleteProductName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
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

  const closeSheet = () => {
    setSheetMode(null);
    setEditItem(null);
    setForm(emptyCatalogForm);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyCatalogForm);
    setSheetMode("create");
  };

  const openEdit = (item: CatalogItem) => {
    setEditItem(item);
    setForm(catalogFormFromItem(item, priceTypes));
    setSheetMode("edit");
  };

  const openDuplicate = (item: CatalogItem) => {
    const dup = duplicateCatalogForm(item, priceTypes);
    dup.externalCode = generateSkuFromProductName(dup.name);
    setEditItem(null);
    setForm(dup);
    setSheetMode("create");
  };

  const createMut = useMutation({
    mutationFn: () => catalogApi.create(toCreatePayload(form, priceTypes)),
    onSuccess: () => {
      toast.success("Produk ditambahkan");
      closeSheet();
      setPage(1);
      invalidateCatalog();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const updateMut = useMutation({
    mutationFn: () => catalogApi.update(editItem!.id, toUpdatePayload(form, priceTypes)),
    onSuccess: () => {
      toast.success("Produk diperbarui");
      closeSheet();
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

  const batchDeleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => catalogApi.remove(id)));
      const deleted = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - deleted;
      if (deleted === 0) {
        const firstErr = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
        throw firstErr?.reason ?? new Error("Gagal menghapus produk");
      }
      return { deleted, failed };
    },
    onSuccess: ({ deleted, failed }) => {
      if (failed > 0) {
        toast.warning(`${deleted} produk dihapus, ${failed} gagal`);
      } else {
        toast.success(`${deleted} produk dihapus`);
      }
      setSelectedIds(new Set());
      setBatchDeleteOpen(false);
      invalidateCatalog();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const runSearch = () => {
    setSearch(q.trim());
    setPage(1);
    setSelectedIds(new Set());
  };

  const goToPage = (nextPage: number) => {
    setSelectedIds(new Set());
    setPage(nextPage);
  };

  const visibleIds = items.map((item) => item.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleSave = () => {
    if (sheetMode === "edit") updateMut.mutate();
    else if (sheetMode === "create") createMut.mutate();
  };

  return (
    <>
      <PageHeader title="Katalog Produk" description="Kelola produk untuk AI dan pesanan." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {canManage ? (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah produk
          </Button>
        ) : null}
        <Button variant="outline" asChild>
          <Link href="/dashboard/catalog/import-text">Import teks AI</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/catalog/import-image">Import gambar</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/import">Import CSV</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/dashboard/catalog/price-types">Kelola tipe harga</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Daftar produk ({total})</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Data dibatasi {pageSize} item per halaman agar tetap ringan meski SKU puluhan ribu.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                aria-label="Muat ulang daftar produk"
              >
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <CatalogBulkToolbar
              selectedCount={selectedIds.size}
              deleting={batchDeleteMut.isPending}
              onDelete={() => setBatchDeleteOpen(true)}
            />
          ) : null}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Tidak ada produk yang cocok.
            </div>
          ) : (
            <CatalogProductTable
              items={items}
              selectedIds={selectedIds}
              allVisibleSelected={allVisibleSelected}
              canManage={canManage}
              onToggleSelectAll={toggleSelectVisible}
              onToggleSelect={toggleSelected}
              onEdit={openEdit}
              onDuplicate={openDuplicate}
              onToggleActive={(item) => toggleActiveMut.mutate(item)}
              onDelete={(item) => {
                setDeleteProductId(item.id);
                setDeleteProductName(item.name);
              }}
            />
          )}

          <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">
              {total === 0 ? "0 produk" : `Menampilkan ${firstItem}-${lastItem} dari ${total} produk`}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(Math.max(1, page - 1))}>
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => goToPage(Math.min(totalPages, page + 1))}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CatalogProductSheet
        open={sheetMode !== null}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        mode={sheetMode === "edit" ? "edit" : "create"}
        form={form}
        setForm={setForm}
        priceTypes={priceTypes}
        canManage={canManage}
        saving={createMut.isPending || updateMut.isPending}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        title={`Hapus ${selectedIds.size} produk?`}
        description="Produk yang dipilih akan dihapus permanen dari katalog."
        confirmLabel="Hapus"
        destructive
        loading={batchDeleteMut.isPending}
        onConfirm={() => batchDeleteMut.mutate(Array.from(selectedIds))}
      />

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
