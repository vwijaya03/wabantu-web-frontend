"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ItemPicker, type PickedItem } from "@/components/inventory/item-picker";
import { WarehouseSelect } from "@/components/inventory/warehouse-select";
import { inventoryApi, formatIDR, type StockTransaction } from "@/lib/api/inventory";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

const KIND_LABELS: Record<StockTransaction["kind"], string> = {
  adjustment: "Penyesuaian",
  transfer: "Transfer",
  opening_balance: "Saldo Awal",
  revaluation: "Revaluasi HPP",
};

function pickedItem(id: string, name?: string): PickedItem {
  return { id, name: name ?? "Produk", externalCode: "" };
}

export function StockTransactionEditDialog({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: txn, isLoading } = useQuery({
    queryKey: ["inventory", "stock-transaction", id],
    queryFn: () => inventoryApi.getStockTransaction(id!),
    enabled: Boolean(id),
  });

  const mut = useMutation({
    mutationFn: (body: Record<string, unknown>) => inventoryApi.updateStockTransaction(id!, body),
    onSuccess: () => {
      toast.success("Transaksi diperbarui — nomor dokumen tetap");
      onClose();
      void qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <Dialog open={Boolean(id)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {txn ? `Edit ${txn.docNo} · ${KIND_LABELS[txn.kind]}` : "Memuat..."}
          </DialogTitle>
          {txn ? (
            <DialogDescription className="sr-only">
              Form edit transaksi {txn.docNo}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {isLoading || !txn ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : (
          <EditForm key={txn.id} txn={txn} saving={mut.isPending} onSave={(body) => mut.mutate(body)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  txn,
  saving,
  onSave,
}: {
  txn: StockTransaction;
  saving: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  switch (txn.kind) {
    case "adjustment":
      return <AdjustmentEdit txn={txn} saving={saving} onSave={onSave} />;
    case "transfer":
      return <TransferEdit txn={txn} saving={saving} onSave={onSave} />;
    case "opening_balance":
      return <OpeningEdit txn={txn} saving={saving} onSave={onSave} />;
    case "revaluation":
      return <RevaluationEdit txn={txn} saving={saving} onSave={onSave} />;
    default:
      return <p className="text-sm text-muted-foreground">Jenis tidak didukung.</p>;
  }
}

function AdjustmentEdit({ txn, saving, onSave }: { txn: StockTransaction; saving: boolean; onSave: (b: Record<string, unknown>) => void }) {
  const signed = txn.signedQty ?? 0;
  const [item, setItem] = useState<PickedItem | null>(
    txn.catalogItemId ? pickedItem(txn.catalogItemId) : null,
  );
  const [warehouseId, setWarehouseId] = useState(txn.warehouseId ?? "");
  const [direction, setDirection] = useState<"in" | "out">(signed >= 0 ? "in" : "out");
  const [qty, setQty] = useState(String(Math.abs(signed)));
  const [unitCost, setUnitCost] = useState(String(txn.unitCost ?? 0));
  const [note, setNote] = useState(txn.note ?? "");

  const qtyNum = Number(qty) || 0;
  const valid = item && warehouseId && qtyNum > 0 && note.trim().length > 0;

  return (
    <div className="space-y-4">
      <Field label="Produk"><ItemPicker value={item} onChange={setItem} /></Field>
      <Field label="Gudang"><WarehouseSelect value={warehouseId} onChange={setWarehouseId} /></Field>
      <div className="flex gap-2">
        <Button type="button" variant={direction === "in" ? "default" : "outline"} size="sm" onClick={() => setDirection("in")}>Tambah (+)</Button>
        <Button type="button" variant={direction === "out" ? "default" : "outline"} size="sm" onClick={() => setDirection("out")}>Kurangi (−)</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Jumlah"><Input type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
        {direction === "in" ? (
          <Field label="HPP / unit"><Input type="number" min="0" step="any" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} /></Field>
        ) : null}
      </div>
      <Field label="Alasan"><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></Field>
      <Button
        disabled={!valid || saving}
        onClick={() => onSave({
          catalogItemId: item!.id,
          warehouseId,
          qty: direction === "in" ? qtyNum : -qtyNum,
          unitCost: direction === "in" ? Number(unitCost) || 0 : undefined,
          note,
        })}
      >
        {saving ? "Menyimpan..." : "Simpan Perubahan"}
      </Button>
    </div>
  );
}

function TransferEdit({ txn, saving, onSave }: { txn: StockTransaction; saving: boolean; onSave: (b: Record<string, unknown>) => void }) {
  const [item, setItem] = useState<PickedItem | null>(
    txn.catalogItemId ? pickedItem(txn.catalogItemId) : null,
  );
  const [fromId, setFromId] = useState(txn.fromWarehouseId ?? "");
  const [toId, setToId] = useState(txn.toWarehouseId ?? "");
  const [qty, setQty] = useState(String(txn.signedQty ?? 0));
  const [note, setNote] = useState(txn.note ?? "");

  const qtyNum = Number(qty) || 0;
  const valid = item && fromId && toId && fromId !== toId && qtyNum > 0;

  return (
    <div className="space-y-4">
      <Field label="Produk"><ItemPicker value={item} onChange={setItem} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Dari"><WarehouseSelect value={fromId} onChange={setFromId} /></Field>
        <Field label="Ke"><WarehouseSelect value={toId} onChange={setToId} /></Field>
      </div>
      <Field label="Jumlah"><Input type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
      <Field label="Catatan"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <Button
        disabled={!valid || saving}
        onClick={() => onSave({
          catalogItemId: item!.id,
          fromWarehouseId: fromId,
          toWarehouseId: toId,
          transferQty: qtyNum,
          note,
        })}
      >
        {saving ? "Menyimpan..." : "Simpan Perubahan"}
      </Button>
    </div>
  );
}

type OpeningRow = { item: PickedItem | null; warehouseId: string; qty: string; unitCost: string };

function OpeningEdit({ txn, saving, onSave }: { txn: StockTransaction; saving: boolean; onSave: (b: Record<string, unknown>) => void }) {
  const [rows, setRows] = useState<OpeningRow[]>(
    (txn.lines ?? []).map((l) => ({
      item: pickedItem(l.catalogItemId, l.itemName),
      warehouseId: l.warehouseId,
      qty: String(l.qty),
      unitCost: String(l.unitCost),
    })),
  );

  const setRow = (i: number, patch: Partial<OpeningRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const valid = rows.filter((r) => r.item && r.warehouseId && Number(r.qty) > 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Edit baris saldo awal dalam satu nomor transaksi ({txn.docNo}).</p>
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_140px_100px_100px] sm:items-end">
          <Field label={i === 0 ? "Produk" : ""}><ItemPicker value={r.item} onChange={(it) => setRow(i, { item: it })} /></Field>
          <Field label={i === 0 ? "Gudang" : ""}><WarehouseSelect value={r.warehouseId} onChange={(v) => setRow(i, { warehouseId: v })} /></Field>
          <Field label={i === 0 ? "Qty" : ""}><Input type="number" min="0" step="any" value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} /></Field>
          <Field label={i === 0 ? "HPP" : ""}><Input type="number" min="0" step="any" value={r.unitCost} onChange={(e) => setRow(i, { unitCost: e.target.value })} /></Field>
        </div>
      ))}
      <Button
        disabled={valid.length === 0 || saving}
        onClick={() => onSave({
          entries: valid.map((r) => ({
            catalogItemId: r.item!.id,
            warehouseId: r.warehouseId,
            qty: Number(r.qty),
            unitCost: Number(r.unitCost) || 0,
          })),
        })}
      >
        {saving ? "Menyimpan..." : `Simpan ${valid.length} baris`}
      </Button>
    </div>
  );
}

function RevaluationEdit({ txn, saving, onSave }: { txn: StockTransaction; saving: boolean; onSave: (b: Record<string, unknown>) => void }) {
  const [item, setItem] = useState<PickedItem | null>(
    txn.catalogItemId ? pickedItem(txn.catalogItemId) : null,
  );
  const [warehouseId, setWarehouseId] = useState(txn.warehouseId ?? "");
  const [newCost, setNewCost] = useState(String(txn.newUnitCost ?? 0));
  const [note, setNote] = useState(txn.note ?? "");

  const valid = item && warehouseId && Number(newCost) >= 0;

  return (
    <div className="space-y-4">
      <Field label="Produk"><ItemPicker value={item} onChange={setItem} /></Field>
      <Field label="Gudang"><WarehouseSelect value={warehouseId} onChange={setWarehouseId} /></Field>
      <Field label="HPP baru / unit"><Input type="number" min="0" step="any" value={newCost} onChange={(e) => setNewCost(e.target.value)} /></Field>
      <p className="text-xs text-muted-foreground">Nilai baru: {formatIDR((Number(newCost) || 0) * (txn.signedQty ?? 0))}</p>
      <Field label="Catatan"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <Button
        disabled={!valid || saving}
        onClick={() => onSave({
          catalogItemId: item!.id,
          warehouseId,
          newUnitCost: Number(newCost) || 0,
          note,
        })}
      >
        {saving ? "Menyimpan..." : "Simpan Perubahan"}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label ? <Label>{label}</Label> : null}
      {children}
    </div>
  );
}
