"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InventoryDataTablePagination } from "@/components/inventory/data-table-pagination";
import { BulkActionResultPanel } from "@/components/inventory/bulk-action-result-panel";
import { inventoryApi, formatStockQty } from "@/lib/api/inventory";
import { formatOrderNumber } from "@/lib/format-order-number";
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
import { useTenantKey } from "@/hooks/use-tenant-key";
import { invalidateTenantQueries, tenantQueryKey } from "@/lib/query/tenant-query-key";

const MAX_BATCH = 100;

type ReviewOrder = {
  orderId: string;
  lines: Array<{
    catalogItemId: string;
    itemName: string;
    warehouseId?: string;
    qtyReturnable: number;
    qty: string;
  }>;
};

export function BulkSalesReturnPanel({ embedded = false }: { embedded?: boolean }) {
  const qc = useQueryClient();
  const tenantKey = useTenantKey();
  const [step, setStep] = useState<"select" | "review">("select");
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewOrders, setReviewOrders] = useState<ReviewOrder[]>([]);
  const [batchResult, setBatchResult] = useState<Awaited<ReturnType<typeof inventoryApi.batchCreateSalesReturns>> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "inventory", "sales-returns", "eligible", searchQ, page, pageSize),
    queryFn: ({ signal }) =>
      inventoryApi.listEligibleInvoiceOrders({ q: searchQ || undefined, page, pageSize }, signal),
    enabled: step === "select",
  });
  const orders = useMemo(() => data?.orders ?? [], [data?.orders]);
  const visibleIds = useMemo(() => orders.map((o) => o.id), [orders]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_BATCH) next.add(id);
      else toast.error(`Maksimal ${MAX_BATCH} pesanan per aksi`);
      return next;
    });
  };

  const loadReviewMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const loaded: ReviewOrder[] = [];
      for (const orderId of ids) {
        const data = await inventoryApi.getReturnableOrderLines(orderId);
        if (data.lines.length === 0) continue;
        loaded.push({
          orderId,
          lines: data.lines.map((l) => ({
            catalogItemId: l.catalogItemId,
            itemName: l.itemName,
            warehouseId: l.warehouseId,
            qtyReturnable: l.qtyReturnable,
            qty: "",
          })),
        });
      }
      return loaded;
    },
    onSuccess: (loaded) => {
      if (loaded.length === 0) {
        toast.error("Tidak ada baris yang bisa diretur pada pesanan terpilih");
        return;
      }
      setReviewOrders(loaded);
      setStep("review");
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const batchMut = useMutation({
    mutationFn: () => {
      const payload = reviewOrders
        .map((o) => ({
          orderId: o.orderId,
          lines: o.lines
            .filter((l) => Number(l.qty) > 0)
            .map((l) => ({
              catalogItemId: l.catalogItemId,
              warehouseId: l.warehouseId,
              qty: Number(l.qty),
            })),
        }))
        .filter((o) => o.lines.length > 0);
      if (payload.length === 0) throw new Error("Isi minimal satu qty retur");
      return inventoryApi.batchCreateSalesReturns(payload);
    },
    onSuccess: (res) => {
      setBatchResult(res);
      if (res.processed > 0) {
        toast.success(`${res.processed} retur dibuat`);
        invalidateTenantQueries(qc, tenantKey, "inventory", "sales-returns");
        invalidateTenantQueries(qc, tenantKey, "inventory", "stock");
      }
      if (res.failed > 0) toast.error(`${res.failed} retur gagal`);
      setStep("select");
      setSelected(new Set());
      setReviewOrders([]);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const setLineQty = (orderId: string, catalogItemId: string, qty: string) => {
    setReviewOrders((rows) =>
      rows.map((o) =>
        o.orderId !== orderId
          ? o
          : {
              ...o,
              lines: o.lines.map((l) => (l.catalogItemId === catalogItemId ? { ...l, qty } : l)),
            },
      ),
    );
  };

  const resultLines = (batchResult?.results ?? []).map((r) => ({
    key: r.orderId,
    label: formatOrderNumber(r.orderId),
    success: !r.error,
    detail: r.returnNo,
    error: r.error,
  }));

  const wrap = (title: string, children: ReactNode) =>
    embedded ? children : (
      <Card className="mb-4 border-primary/20">
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    );

  if (step === "review") {
    return wrap(
      "Review Retur Massal",
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Isi qty retur per produk. Kosongkan baris yang tidak diretur.</p>
          {reviewOrders.map((o) => (
            <div key={o.orderId} className="rounded-lg border p-3 space-y-2">
              <p className="font-medium">{formatOrderNumber(o.orderId)}</p>
              {o.lines.map((l) => (
                <div key={l.catalogItemId} className="grid grid-cols-[1fr_100px_120px] items-center gap-2 text-sm">
                  <div>
                    <p>{l.itemName}</p>
                    <p className="text-xs text-muted-foreground">Sisa bisa diretur: {formatStockQty(l.qtyReturnable)}</p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max={l.qtyReturnable}
                    step="any"
                    placeholder="0"
                    value={l.qty}
                    onChange={(e) => setLineQty(o.orderId, l.catalogItemId, e.target.value)}
                  />
                </div>
              ))}
            </div>
          ))}
          <div className="flex gap-2">
            <Button onClick={() => batchMut.mutate()} disabled={batchMut.isPending}>
              {batchMut.isPending ? "Memproses..." : "Proses retur"}
            </Button>
            <Button variant="outline" onClick={() => { setStep("select"); setReviewOrders([]); }}>
              Kembali
            </Button>
          </div>
          {batchResult ? (
            <BulkActionResultPanel
              title="Hasil retur massal"
              processed={batchResult.processed}
              failed={batchResult.failed}
              results={resultLines}
            />
          ) : null}
      </div>,
    );
  }

  return wrap(
    "Buat Retur Massal",
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Pilih pesanan Dalam pengiriman / Selesai, lalu isi qty retur per produk. Maks. {MAX_BATCH} per aksi.
      </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Cari pesanan / pelanggan..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearchQ(q); setPage(1); } }}
            className="w-56"
          />
          {selected.size > 0 ? (
            <Button
              size="sm"
              onClick={() => loadReviewMut.mutate(Array.from(selected))}
              disabled={loadReviewMut.isPending}
            >
              {loadReviewMut.isPending ? "Memuat..." : `Review retur (${selected.size})`}
            </Button>
          ) : null}
        </div>

        <InventoryTable>
          <InventoryTableHeader>
            <InventoryTableRow>
              <InventoryTableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={() => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (allVisibleSelected) {
                        for (const id of visibleIds) next.delete(id);
                        return next;
                      }
                      for (const id of visibleIds) {
                        if (next.size >= MAX_BATCH) break;
                        next.add(id);
                      }
                      return next;
                    });
                  }}
                  aria-label="Pilih semua di halaman ini"
                />
              </InventoryTableHead>
              <InventoryTableHead>Pesanan</InventoryTableHead>
              <InventoryTableHead>Pelanggan</InventoryTableHead>
            </InventoryTableRow>
          </InventoryTableHeader>
          <InventoryTableBody>
            {isLoading ? (
              <InventoryTableEmpty colSpan={3}>Memuat...</InventoryTableEmpty>
            ) : orders.length === 0 ? (
              <InventoryTableEmpty colSpan={3}>Tidak ada pesanan eligible.</InventoryTableEmpty>
            ) : (
              orders.map((o) => (
                <InventoryTableRow key={o.id}>
                  <InventoryTableCell>
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleOne(o.id)} />
                  </InventoryTableCell>
                  <InventoryTableCell className="font-medium">{formatOrderNumber(o.id)}</InventoryTableCell>
                  <InventoryTableCell className="text-muted-foreground">
                    {o.contactDisplayName || o.contactPhone || "—"}
                  </InventoryTableCell>
                </InventoryTableRow>
              ))
            )}
          </InventoryTableBody>
        </InventoryTable>

        <InventoryDataTablePagination page={page} pageSize={pageSize} total={data?.total ?? 0} onPageChange={setPage} />
    </div>,
  );
}
