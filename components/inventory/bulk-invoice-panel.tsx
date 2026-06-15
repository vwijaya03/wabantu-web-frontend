"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InventoryDataTablePagination } from "@/components/inventory/data-table-pagination";
import { BulkActionResultPanel } from "@/components/inventory/bulk-action-result-panel";
import { inventoryApi, formatIDR } from "@/lib/api/inventory";
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

const MAX_BATCH = 100;

function orderStatusLabel(status: string) {
  const s = status.trim().toLowerCase();
  if (s === "shipped") return "Dalam pengiriman";
  if (s === "completed") return "Selesai";
  return status;
}

export function BulkInvoicePanel() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchResult, setBatchResult] = useState<Awaited<ReturnType<typeof inventoryApi.batchCreateInvoices>> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "invoices", "eligible", searchQ, page, pageSize],
    queryFn: () => inventoryApi.listEligibleInvoiceOrders({ q: searchQ || undefined, page, pageSize }),
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

  const toggleAllVisible = () => {
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
      if (visibleIds.length > MAX_BATCH) toast.message(`Hanya ${MAX_BATCH} pesanan pertama yang dipilih`);
      return next;
    });
  };

  const batchMut = useMutation({
    mutationFn: () => inventoryApi.batchCreateInvoices(Array.from(selected)),
    onSuccess: (res) => {
      setBatchResult(res);
      if (res.processed > 0) {
        toast.success(`${res.processed} faktur dibuat`);
        void qc.invalidateQueries({ queryKey: ["inventory", "invoices"] });
        void qc.invalidateQueries({ queryKey: ["inventory", "invoices", "eligible"] });
      }
      if (res.failed > 0) toast.error(`${res.failed} pesanan gagal`);
      setSelected(new Set());
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const resultLines = (batchResult?.results ?? []).map((r) => ({
    key: r.orderId,
    label: formatOrderNumber(r.orderId),
    success: !r.error,
    detail: r.invoiceNo,
    error: r.error,
  }));

  return (
    <Card className="mb-4 border-primary/20">
      <CardHeader>
        <CardTitle>Buat Faktur Massal</CardTitle>
        <p className="text-sm text-muted-foreground">
          Hanya pesanan <strong>Dalam pengiriman</strong> atau <strong>Selesai</strong> yang belum punya faktur. Maks. {MAX_BATCH} per aksi.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Cari pesanan / pelanggan..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearchQ(q); setPage(1); } }}
            className="w-56"
          />
          {selected.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">{selected.size} dipilih</span>
              <Button size="sm" onClick={() => batchMut.mutate()} disabled={batchMut.isPending}>
                {batchMut.isPending ? "Memproses..." : `Buat faktur (${selected.size})`}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Batal pilih</Button>
            </div>
          ) : null}
        </div>

        <InventoryTable>
          <InventoryTableHeader>
            <InventoryTableRow>
              <InventoryTableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  aria-label="Pilih semua di halaman ini"
                />
              </InventoryTableHead>
              <InventoryTableHead>Pesanan</InventoryTableHead>
              <InventoryTableHead>Pelanggan</InventoryTableHead>
              <InventoryTableHead>Status</InventoryTableHead>
              <InventoryTableHead align="right">Subtotal</InventoryTableHead>
            </InventoryTableRow>
          </InventoryTableHeader>
          <InventoryTableBody>
            {isLoading ? (
              <InventoryTableEmpty colSpan={5}>Memuat...</InventoryTableEmpty>
            ) : orders.length === 0 ? (
              <InventoryTableEmpty colSpan={5}>Tidak ada pesanan eligible.</InventoryTableEmpty>
            ) : (
              orders.map((o) => (
                <InventoryTableRow key={o.id}>
                  <InventoryTableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggleOne(o.id)}
                      aria-label={`Pilih ${formatOrderNumber(o.id)}`}
                    />
                  </InventoryTableCell>
                  <InventoryTableCell className="font-medium">{formatOrderNumber(o.id)}</InventoryTableCell>
                  <InventoryTableCell className="text-muted-foreground">
                    {o.contactDisplayName || o.contactPhone || "—"}
                  </InventoryTableCell>
                  <InventoryTableCell><Badge variant="secondary">{orderStatusLabel(o.status)}</Badge></InventoryTableCell>
                  <InventoryTableCell align="right">{formatIDR(o.subtotal)}</InventoryTableCell>
                </InventoryTableRow>
              ))
            )}
          </InventoryTableBody>
        </InventoryTable>

        <InventoryDataTablePagination page={page} pageSize={pageSize} total={data?.total ?? 0} onPageChange={setPage} />

        {batchResult ? (
          <BulkActionResultPanel
            title="Hasil buat faktur massal"
            processed={batchResult.processed}
            failed={batchResult.failed}
            results={resultLines}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
