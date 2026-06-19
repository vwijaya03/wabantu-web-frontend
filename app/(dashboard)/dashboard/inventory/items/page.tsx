"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InventoryPageHeader } from "@/components/inventory/inventory-help";
import { InventoryFormModeSwitch } from "@/components/inventory/inventory-form-mode-switch";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { ItemPicker, type PickedItem } from "@/components/inventory/item-picker";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { type CatalogItem } from "@/lib/api/catalog";
import { inventoryApi, COSTING_METHOD_LABELS, type CostingMethod, type ConfigCatalogItem } from "@/lib/api/inventory";
import {
  InventoryTable,
  InventoryTableBody,
  InventoryTableCell,
  InventoryTableEmpty,
  InventoryTableHead,
  InventoryTableHeader,
  InventoryTableRow,
} from "@/components/inventory/inventory-table";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";
import { HelpCircle } from "lucide-react";

export default function InventoryItemsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [pageMode, setPageMode] = useState<"single" | "bulk">("single");

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "config-items", q],
    queryFn: () => inventoryApi.listConfigItems({ q, pageSize: 50 }),
  });
  const items: ConfigCatalogItem[] = data?.items ?? [];
  const visibleIds = items.map((it) => it.id);
  const allVisible = visibleIds.length > 0 && visibleIds.every((id) => checked.has(id));

  const toggleOne = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const batchMut = useMutation({
    mutationFn: (input: { all?: boolean; trackStock: boolean }) =>
      inventoryApi.batchTrackStock({
        all: input.all,
        catalogItemIds: input.all ? undefined : Array.from(checked),
        trackStock: input.trackStock,
      }),
    onSuccess: (res, vars) => {
      toast.success(
        vars.trackStock
          ? `${res.updated} produk dilacak stoknya${res.skipped ? `, ${res.skipped} dilewati (bundle)` : ""}`
          : `${res.updated} produk dinonaktifkan lacak stoknya`,
      );
      setChecked(new Set());
      void qc.invalidateQueries({ queryKey: ["inventory", "config-items"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <RequireTenantDashboard title="Konfigurasi Item">
      <InventoryPageHeader title="Konfigurasi Item Persediaan" description="Aktifkan pelacakan stok, metode HPP per item, bundle, dan batch/expiry." helpTopic="items" />

      <Card className="mb-4 border-amber-200 bg-amber-50/50">
        <CardContent className="py-4 text-sm text-amber-950">
          <p className="font-medium">Produk bundle tidak ditampilkan di sini</p>
          <p className="mt-1 text-amber-900/90">
            Bundle tidak dilacak stok di level parent — stok diambil dari komponen anak (nilai terkecil).
            Atur komponen bundle lewat tombol Konfigurasi di katalog produk yang menjadi parent bundle.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-4 border-blue-200 bg-blue-50/40">
        <CardContent className="py-4 text-sm text-blue-950">
          <p className="font-medium">Apa itu lacak stok?</p>
          <p className="mt-1 text-blue-900/90">
            Aktifkan untuk produk fisik agar setiap penjualan, pembelian, dan penyesuaian mengubah saldo gudang serta HPP.
            Produk jasa biasanya tidak perlu dilacak. Bundle mengambil stok dari komponen di dalamnya — jangan lacak stok di parent bundle.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <CardTitle>Produk Katalog</CardTitle>
            {canManage ? <InventoryFormModeSwitch mode={pageMode} onChange={setPageMode} singleLabel="Per produk" bulkLabel="Lacak massal" /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Cari produk..." value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
            {canManage && pageMode === "bulk" && checked.size > 0 ? (
              <>
                <Button size="sm" variant="outline" disabled={batchMut.isPending} onClick={() => batchMut.mutate({ trackStock: true })}>
                  Aktifkan lacak ({checked.size})
                </Button>
                <Button size="sm" variant="outline" disabled={batchMut.isPending} onClick={() => batchMut.mutate({ trackStock: false })}>
                  Nonaktifkan ({checked.size})
                </Button>
              </>
            ) : null}
            {canManage && pageMode === "bulk" ? (
              <Button
                size="sm"
                disabled={batchMut.isPending}
                onClick={() => {
                  if (confirm("Aktifkan lacak stok untuk semua produk katalog? Bundle akan dilewati. Nonaktifkan manual untuk produk jasa.")) {
                    batchMut.mutate({ all: true, trackStock: true });
                  }
                }}
              >
                Lacak semua produk
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <InventoryTable>
            <InventoryTableHeader>
              <InventoryTableRow>
                {canManage && pageMode === "bulk" ? (
                  <InventoryTableHead className="w-10">
                    <input type="checkbox" checked={allVisible} onChange={() => {
                      setChecked((prev) => {
                        const next = new Set(prev);
                        if (allVisible) visibleIds.forEach((id) => next.delete(id));
                        else visibleIds.forEach((id) => next.add(id));
                        return next;
                      });
                    }} aria-label="Pilih semua" />
                  </InventoryTableHead>
                ) : null}
                <InventoryTableHead>Produk</InventoryTableHead>
                <InventoryTableHead>Kode</InventoryTableHead>
                <InventoryTableHead align="right">Aksi</InventoryTableHead>
              </InventoryTableRow>
            </InventoryTableHeader>
            <InventoryTableBody>
              {isLoading ? (
                <InventoryTableEmpty colSpan={canManage ? (pageMode === "bulk" ? 4 : 3) : 3}>Memuat...</InventoryTableEmpty>
              ) : items.length === 0 ? (
                <InventoryTableEmpty colSpan={canManage ? (pageMode === "bulk" ? 4 : 3) : 3}>Belum ada produk.</InventoryTableEmpty>
              ) : (
                items.map((it) => (
                  <InventoryTableRow key={it.id}>
                    {canManage && pageMode === "bulk" ? (
                      <InventoryTableCell>
                        <input type="checkbox" checked={checked.has(it.id)} onChange={() => toggleOne(it.id)} />
                      </InventoryTableCell>
                    ) : null}
                    <InventoryTableCell className="font-medium">
                      {it.name}
                      {it.trackStock ? <Badge className="ml-2" variant="success">Dilacak</Badge> : null}
                    </InventoryTableCell>
                    <InventoryTableCell className="text-muted-foreground">{it.externalCode}</InventoryTableCell>
                    <InventoryTableCell align="right">
                      <Button variant="outline" size="sm" onClick={() => setSelected({ id: it.id, name: it.name, externalCode: it.externalCode } as CatalogItem)}>Konfigurasi</Button>
                    </InventoryTableCell>
                  </InventoryTableRow>
                ))
              )}
            </InventoryTableBody>
          </InventoryTable>
        </CardContent>
      </Card>

      <ItemConfigDialog item={selected} canManage={canManage} onClose={() => setSelected(null)} />
    </RequireTenantDashboard>
  );
}

function ItemConfigDialog({ item, canManage, onClose }: { item: CatalogItem | null; canManage: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const id = item?.id ?? "";

  const { data: sku } = useQuery({
    queryKey: ["inventory", "sku", id],
    queryFn: () => inventoryApi.getSku(id),
    enabled: Boolean(id),
  });
  const { data: bundle } = useQuery({
    queryKey: ["inventory", "bundle", id],
    queryFn: () => inventoryApi.getBundle(id),
    enabled: Boolean(id),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["inventory", "sku", id] });
    void qc.invalidateQueries({ queryKey: ["inventory", "bundle", id] });
  };

  const updateMut = useMutation({
    mutationFn: (input: Parameters<typeof inventoryApi.updateSku>[1]) => inventoryApi.updateSku(id, input),
    onSuccess: () => { toast.success("Konfigurasi disimpan"); refresh(); },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const [bComponents, setBComponents] = useState<Array<{ item: PickedItem | null; qty: string }>>([]);
  const [bundleMode, setBundleMode] = useState(false);

  const startBundleEdit = () => {
    setBundleMode(true);
    setBComponents(
      (bundle?.components ?? []).map((c) => ({
        item: { id: c.childCatalogItemId, name: c.childName, externalCode: c.childExternalCode },
        qty: String(c.qty),
      })),
    );
    if ((bundle?.components ?? []).length === 0) setBComponents([{ item: null, qty: "" }]);
  };

  const saveBundleMut = useMutation({
    mutationFn: () =>
      inventoryApi.setBundle(
        id,
        bComponents.filter((c) => c.item && Number(c.qty) > 0).map((c) => ({ childCatalogItemId: c.item!.id, qty: Number(c.qty) })),
      ),
    onSuccess: () => { toast.success("Bundle disimpan"); setBundleMode(false); refresh(); },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const clearBundleMut = useMutation({
    mutationFn: () => inventoryApi.setBundle(id, []),
    onSuccess: () => { toast.success("Bundle dibatalkan"); setBundleMode(false); refresh(); },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <Dialog open={Boolean(item)} onOpenChange={(o) => { if (!o) { setBundleMode(false); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item?.name}</DialogTitle>
          <DialogDescription className="sr-only">Konfigurasi persediaan produk</DialogDescription>
        </DialogHeader>
        {!sku ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : !canManage ? (
          <p className="text-sm text-muted-foreground">Hanya owner yang dapat mengubah konfigurasi.</p>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sku.trackStock} onChange={(e) => updateMut.mutate({ trackStock: e.target.checked })} />
              <span className="font-medium">Lacak stok untuk item ini</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground" aria-label="Penjelasan lacak stok">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Stok & HPP diperbarui otomatis dari penjualan, pembelian, dan penyesuaian. Nonaktifkan untuk jasa atau item tanpa inventori fisik.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>

            <div className="space-y-1.5">
              <Label>Metode HPP</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={sku.costingMethod ?? "inherit"}
                onChange={(e) => updateMut.mutate({ costingMethod: e.target.value })}
              >
                <option value="inherit">Ikuti default tenant ({sku.effectiveMethod.toUpperCase()})</option>
                {(["fifo", "lifo", "average"] as CostingMethod[]).map((m) => (
                  <option key={m} value={m}>{COSTING_METHOD_LABELS[m]}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Mengubah metode akan menghitung ulang HPP item ini.</p>
            </div>

            <div className="space-y-2">
              <Label>Pelacakan tambahan</Label>
              {([
                ["trackBatch", "Batch / lot"],
                ["trackExpiry", "Tanggal kedaluwarsa"],
                ["trackSerial", "Nomor seri"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={Boolean(sku[key])} onChange={(e) => updateMut.mutate({ [key]: e.target.checked })} />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Satuan dasar (opsional)</Label>
              <Input
                defaultValue={sku.baseUom ?? ""}
                placeholder="pcs / kg / box"
                onBlur={(e) => { if (e.target.value !== (sku.baseUom ?? "")) updateMut.mutate({ baseUom: e.target.value }); }}
              />
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Bundle / Paket</p>
                  <p className="text-xs text-muted-foreground">
                    {sku.isBundle ? "Item ini bundle — stok diambil dari komponen." : "Jadikan bundle: stok dari SKU anak."}
                  </p>
                </div>
                {!bundleMode ? (
                  <Button variant="outline" size="sm" onClick={startBundleEdit}>{sku.isBundle ? "Edit" : "Jadikan bundle"}</Button>
                ) : null}
              </div>

              {sku.isBundle && !bundleMode ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {(bundle?.components ?? []).map((c) => (
                    <li key={c.childCatalogItemId} className="flex justify-between">
                      <span>{c.childName}</span>
                      <span className="text-muted-foreground">×{c.qty}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {bundleMode ? (
                <div className="mt-3 space-y-2">
                  {bComponents.map((c, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_auto] items-end gap-2">
                      <ItemPicker value={c.item} onChange={(it) => setBComponents((cs) => cs.map((x, idx) => (idx === i ? { ...x, item: it } : x)))} />
                      <Input type="number" min="0" step="any" placeholder="qty" value={c.qty} onChange={(e) => setBComponents((cs) => cs.map((x, idx) => (idx === i ? { ...x, qty: e.target.value } : x)))} />
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setBComponents((cs) => cs.filter((_, idx) => idx !== i))}>×</Button>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setBComponents((cs) => [...cs, { item: null, qty: "" }])}>+ Komponen</Button>
                    <Button size="sm" onClick={() => saveBundleMut.mutate()} disabled={saveBundleMut.isPending}>Simpan Bundle</Button>
                    {sku.isBundle ? <Button variant="ghost" size="sm" className="text-destructive" onClick={() => clearBundleMut.mutate()}>Batalkan bundle</Button> : null}
                    <Button variant="ghost" size="sm" onClick={() => setBundleMode(false)}>Tutup</Button>
                  </div>
                </div>
              ) : null}
            </div>

            {sku.isBundle ? <Badge variant="secondary">Bundle aktif</Badge> : sku.trackStock ? <Badge variant="success">Stok dilacak</Badge> : <Badge variant="secondary">Stok tidak dilacak</Badge>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
