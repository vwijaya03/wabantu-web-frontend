"use client";

import { Badge } from "@/components/ui/badge";
import {
  InventoryTable,
  InventoryTableBody,
  InventoryTableCell,
  InventoryTableEmpty,
  InventoryTableHead,
  InventoryTableHeader,
  InventoryTableRow,
} from "@/components/inventory/inventory-table";

export type BulkActionResultLine = {
  key: string;
  label: string;
  success: boolean;
  detail?: string;
  error?: string;
};

export function BulkActionResultPanel({
  title,
  processed,
  failed,
  results,
}: {
  title: string;
  processed: number;
  failed: number;
  results: BulkActionResultLine[];
}) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50/50 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-amber-950">{title}</p>
        <Badge variant="success">{processed} berhasil</Badge>
        {failed > 0 ? <Badge variant="destructive">{failed} gagal</Badge> : null}
      </div>
      <InventoryTable>
        <InventoryTableHeader>
          <InventoryTableRow>
            <InventoryTableHead>Item</InventoryTableHead>
            <InventoryTableHead>Hasil</InventoryTableHead>
            <InventoryTableHead>Catatan</InventoryTableHead>
          </InventoryTableRow>
        </InventoryTableHeader>
        <InventoryTableBody>
          {results.map((r) => (
            <InventoryTableRow key={r.key}>
              <InventoryTableCell className="font-medium">{r.label}</InventoryTableCell>
              <InventoryTableCell>
                <Badge variant={r.success ? "success" : "destructive"}>
                  {r.success ? "Berhasil" : "Gagal"}
                </Badge>
              </InventoryTableCell>
              <InventoryTableCell className="text-muted-foreground">
                {r.success ? (r.detail ?? "—") : (r.error ?? "—")}
              </InventoryTableCell>
            </InventoryTableRow>
          ))}
        </InventoryTableBody>
      </InventoryTable>
    </div>
  );
}
