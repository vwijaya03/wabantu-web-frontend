"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InventoryDataTablePagination } from "@/components/inventory/data-table-pagination";
import {
  InventoryTable,
  InventoryTableBody,
  InventoryTableCell,
  InventoryTableHead,
  InventoryTableHeader,
  InventoryTableRow,
} from "@/components/inventory/inventory-table";
import { formatStockQty, type BackfillOrdersResult } from "@/lib/api/inventory";

type Issue = NonNullable<BackfillOrdersResult["issues"]>[number];
type Suggested = NonNullable<BackfillOrdersResult["suggestedOpening"]>[number];

function insufficientCount(result: BackfillOrdersResult): number {
  if (result.insufficientCount != null) return result.insufficientCount;
  return result.insufficient?.length ?? 0;
}

function orderStatusLabel(status: string) {
  const s = status.trim().toLowerCase();
  if (s === "confirmed" || s === "paid") return "Sedang diproses";
  const labels: Record<string, string> = {
    processing: "Sedang diproses",
    shipped: "Dalam pengiriman",
    completed: "Selesai",
    draft: "Draft",
    cancelled: "Dibatalkan",
  };
  return labels[s] ?? status;
}

function shortageLineCount(issue: Issue): number {
  return issue.shortages?.length ?? 0;
}

function totalQtyShort(issue: Issue): number {
  return (issue.shortages ?? []).reduce((sum, s) => sum + s.qtyShort, 0);
}

export function BackfillResultPanel({
  result,
  mode,
}: {
  result: BackfillOrdersResult;
  mode: "preview" | "execute";
}) {
  const blocked = insufficientCount(result);
  const sufficient = result.sufficientOrders ?? Math.max(0, result.pendingOrders - blocked);
  const issueTotal = result.issueCount ?? result.issues?.length ?? 0;
  const issues = result.issues ?? [];
  const suggested = result.suggestedOpening ?? [];

  if (blocked === 0 && issueTotal === 0 && suggested.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-md border border-amber-200 bg-amber-50/50 p-3 text-sm">
      <BackfillSummaryStats
        mode={mode}
        pending={result.pendingOrders}
        sufficient={sufficient}
        blocked={blocked}
        processed={result.processed}
        failed={result.failed}
      />

      {result.issuesTruncated ? (
        <p className="rounded-md border border-amber-300 bg-amber-100/80 px-3 py-2 text-amber-950">
          Detail pesanan dibatasi {issues.length} dari {issueTotal.toLocaleString("id-ID")} baris.
          Tabel <strong>saldo awal disarankan</strong> di bawah sudah merangkum semua kekurangan — fokus perbaiki stok dari situ.
        </p>
      ) : null}

      {suggested.length > 0 ? (
        <SuggestedOpeningSection items={suggested} />
      ) : null}

      {issues.length > 0 ? (
        <IssuesSection
          issues={issues}
          total={issueTotal}
          truncated={result.issuesTruncated ?? false}
        />
      ) : null}

      {result.failures && result.failures.length > 0 ? (
        <FailuresSection
          failures={result.failures}
          total={result.failureCount ?? result.failures.length}
          truncated={result.failuresTruncated ?? false}
        />
      ) : null}
    </div>
  );
}

function BackfillSummaryStats({
  mode,
  pending,
  sufficient,
  blocked,
  processed,
  failed,
}: {
  mode: "preview" | "execute";
  pending: number;
  sufficient: number;
  blocked: number;
  processed?: number;
  failed?: number;
}) {
  if (mode === "execute") {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        <StatCard label="Berhasil" value={processed ?? 0} tone="ok" />
        <StatCard label="Gagal" value={failed ?? 0} tone={failed ? "warn" : "muted"} />
        <StatCard label="Stok kurang" value={blocked} tone={blocked ? "warn" : "muted"} />
      </div>
    );
  }

  return (
    <div>
      <p className="font-medium text-amber-950">Ringkasan preview</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <StatCard label="Akan diproses" value={pending} />
        <StatCard label="Stok cukup" value={sufficient} tone="ok" />
        <StatCard label="Stok kurang" value={blocked} tone={blocked ? "warn" : "muted"} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "ok" | "warn" | "muted";
}) {
  const valueClass =
    tone === "ok"
      ? "text-emerald-800"
      : tone === "warn"
        ? "text-amber-900"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";

  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${valueClass}`}>
        {value.toLocaleString("id-ID")}
      </p>
    </div>
  );
}

function SuggestedOpeningSection({ items }: { items: Suggested[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const slice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return (
    <div className="space-y-2 border-t border-amber-200 pt-3">
      <p className="font-medium text-amber-950">Saldo awal disarankan ({items.length.toLocaleString("id-ID")} baris)</p>
      <p className="text-amber-900">
        Qty = <strong>total kekurangan</strong> semua pesanan per item+gudang. Isi di Operasi Stok → Saldo Awal, lalu ulangi backfill.
      </p>
      <InventoryTable>
        <InventoryTableHeader>
          <InventoryTableRow>
            <InventoryTableHead>Item</InventoryTableHead>
            <InventoryTableHead>Gudang</InventoryTableHead>
            <InventoryTableHead align="right">Qty total</InventoryTableHead>
          </InventoryTableRow>
        </InventoryTableHeader>
        <InventoryTableBody>
          {slice.map((s) => (
            <InventoryTableRow key={`${s.catalogItemId}-${s.warehouseId}`}>
              <InventoryTableCell className="max-w-[240px] truncate" title={s.itemName}>
                {s.itemName}
              </InventoryTableCell>
              <InventoryTableCell>{s.warehouseName}</InventoryTableCell>
              <InventoryTableCell align="right" className="font-medium tabular-nums">
                {formatStockQty(s.minQty)}
              </InventoryTableCell>
            </InventoryTableRow>
          ))}
        </InventoryTableBody>
      </InventoryTable>
      {items.length > pageSize ? (
        <InventoryDataTablePagination
          page={page}
          pageSize={pageSize}
          total={items.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}
      <Button asChild size="sm" variant="outline">
        <Link href="/dashboard/inventory/opening-balance">Buka Saldo Awal</Link>
      </Button>
    </div>
  );
}

function IssuesSection({
  issues,
  total,
  truncated,
}: {
  issues: Issue[];
  total: number;
  truncated: boolean;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return issues;
    return issues.filter(
      (issue) =>
        issue.orderRef.toLowerCase().includes(needle) ||
        issue.orderId.toLowerCase().includes(needle) ||
        (issue.message?.toLowerCase().includes(needle) ?? false),
    );
  }, [issues, q]);

  const slice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <details className="border-t border-amber-200 pt-3">
      <summary className="cursor-pointer font-medium text-amber-950">
        Detail pesanan bermasalah ({total.toLocaleString("id-ID")})
        {truncated ? " — sampel" : ""}
      </summary>
      <div className="mt-3 space-y-3">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Cari nomor pesanan…"
          className="max-w-sm bg-background"
        />
        <InventoryTable>
          <InventoryTableHeader>
            <InventoryTableRow>
              <InventoryTableHead>Pesanan</InventoryTableHead>
              <InventoryTableHead>Status</InventoryTableHead>
              <InventoryTableHead align="right">Baris kurang</InventoryTableHead>
              <InventoryTableHead align="right">Qty kurang</InventoryTableHead>
              <InventoryTableHead className="w-[88px]" />
            </InventoryTableRow>
          </InventoryTableHeader>
          <InventoryTableBody>
            {slice.map((issue) => {
              const open = expandedId === issue.orderId;
              return (
                <IssueRow
                  key={issue.orderId}
                  issue={issue}
                  open={open}
                  onToggle={() => setExpandedId(open ? null : issue.orderId)}
                />
              );
            })}
          </InventoryTableBody>
        </InventoryTable>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">Tidak ada pesanan cocok dengan pencarian.</p>
        ) : (
          <InventoryDataTablePagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </div>
    </details>
  );
}

function IssueRow({
  issue,
  open,
  onToggle,
}: {
  issue: Issue;
  open: boolean;
  onToggle: () => void;
}) {
  const lines = issue.shortages ?? [];
  return (
    <>
      <InventoryTableRow>
        <InventoryTableCell className="font-medium">{issue.orderRef}</InventoryTableCell>
        <InventoryTableCell>
          <Badge variant="secondary">{orderStatusLabel(issue.status)}</Badge>
        </InventoryTableCell>
        <InventoryTableCell align="right" className="tabular-nums">
          {shortageLineCount(issue)}
        </InventoryTableCell>
        <InventoryTableCell align="right" className="font-medium tabular-nums text-amber-800">
          {formatStockQty(totalQtyShort(issue))}
        </InventoryTableCell>
        <InventoryTableCell>
          {lines.length > 0 ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={onToggle}>
              {open ? "Tutup" : "Detail"}
            </Button>
          ) : null}
        </InventoryTableCell>
      </InventoryTableRow>
      {open && lines.length > 0 ? (
        <InventoryTableRow className="bg-muted/30 hover:bg-muted/30">
          <InventoryTableCell colSpan={5} className="p-0">
            <div className="border-t px-3 py-2">
              {issue.message ? (
                <p className="mb-2 text-muted-foreground">{issue.message}</p>
              ) : null}
              <InventoryTable>
                <InventoryTableHeader>
                  <InventoryTableRow>
                    <InventoryTableHead>Item</InventoryTableHead>
                    <InventoryTableHead>Gudang</InventoryTableHead>
                    <InventoryTableHead align="right">Butuh</InventoryTableHead>
                    <InventoryTableHead align="right">Tersedia</InventoryTableHead>
                    <InventoryTableHead align="right">Kurang</InventoryTableHead>
                  </InventoryTableRow>
                </InventoryTableHeader>
                <InventoryTableBody>
                  {lines.map((s) => (
                    <InventoryTableRow key={`${issue.orderId}-${s.catalogItemId}-${s.warehouseId}`}>
                      <InventoryTableCell className="max-w-[200px] truncate" title={s.itemName}>
                        {s.itemName}
                      </InventoryTableCell>
                      <InventoryTableCell>{s.warehouseName}</InventoryTableCell>
                      <InventoryTableCell align="right">{formatStockQty(s.qtyRequired)}</InventoryTableCell>
                      <InventoryTableCell align="right">{formatStockQty(s.qtyAvailable)}</InventoryTableCell>
                      <InventoryTableCell align="right" className="font-medium text-amber-800">
                        {formatStockQty(s.qtyShort)}
                      </InventoryTableCell>
                    </InventoryTableRow>
                  ))}
                </InventoryTableBody>
              </InventoryTable>
            </div>
          </InventoryTableCell>
        </InventoryTableRow>
      ) : null}
    </>
  );
}

function FailuresSection({
  failures,
  total,
  truncated,
}: {
  failures: string[];
  total: number;
  truncated: boolean;
}) {
  return (
    <details className="border-t border-amber-200 pt-3">
      <summary className="cursor-pointer font-medium text-amber-950">
        Log error ({total.toLocaleString("id-ID")})
        {truncated ? " — sampel" : ""}
      </summary>
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border bg-background p-2 font-mono text-xs">
        {failures.map((line) => (
          <li key={line} className="break-all text-destructive">
            {line}
          </li>
        ))}
      </ul>
    </details>
  );
}

export { insufficientCount };
