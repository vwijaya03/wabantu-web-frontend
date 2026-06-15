"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ItemPicker, type PickedItem } from "@/components/inventory/item-picker";
import { inventoryApi, formatStockQty, type Warehouse } from "@/lib/api/inventory";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label ? <Label>{label}</Label> : null}
      {children}
    </div>
  );
}

function WhSelect({
  warehouses,
  value,
  onChange,
  exclude,
}: {
  warehouses: Warehouse[];
  value: string;
  onChange: (v: string) => void;
  exclude?: string;
}) {
  return (
    <select
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Pilih gudang...</option>
      {warehouses
        .filter((w) => w.id !== exclude)
        .map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
            {w.isDefault ? " (default)" : ""}
          </option>
        ))}
    </select>
  );
}

function useItemStock(itemId: string | undefined, warehouseId: string) {
  const { data } = useQuery({
    queryKey: ["inventory", "stock", "lookup", warehouseId],
    queryFn: () => inventoryApi.listStock({ warehouseId, pageSize: 200 }),
    enabled: Boolean(itemId && warehouseId),
  });
  return data?.stock.find((r) => r.catalogItemId === itemId && r.warehouseId === warehouseId);
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["inventory"] });
}

export function CreateAdjustmentPanel({ warehouses, onSuccess }: { warehouses: Warehouse[]; onSuccess: () => void }) {
  const qc = useQueryClient();
  const [item, setItem] = useState<PickedItem | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [note, setNote] = useState("");
  const stock = useItemStock(item?.id, warehouseId);
  const qtyNum = Number(qty) || 0;

  const mut = useMutation({
    mutationFn: () =>
      inventoryApi.adjust({
        catalogItemId: item!.id,
        warehouseId,
        qty: direction === "in" ? qtyNum : -qtyNum,
        unitCost: direction === "in" ? Number(unitCost) || 0 : undefined,
        note,
      }),
    onSuccess: () => {
      toast.success("Penyesuaian tersimpan");
      setItem(null);
      setQty("");
      setUnitCost("");
      setNote("");
      invalidateAll(qc);
      onSuccess();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const valid = item && warehouseId && qtyNum > 0 && note.trim().length > 0;

  return (
    <div className="space-y-4">
      <Field label="Produk"><ItemPicker value={item} onChange={setItem} /></Field>
      <Field label="Gudang"><WhSelect warehouses={warehouses} value={warehouseId} onChange={setWarehouseId} /></Field>
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
      <Field label="Alasan (wajib)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></Field>
      {item && warehouseId ? (
        <p className="text-xs text-muted-foreground">Stok saat ini: {formatStockQty(stock?.onHand ?? 0)}</p>
      ) : null}
      <Button onClick={() => mut.mutate()} disabled={!valid || mut.isPending}>{mut.isPending ? "Menyimpan..." : "Simpan"}</Button>
    </div>
  );
}

export function CreateTransferPanel({ warehouses, onSuccess }: { warehouses: Warehouse[]; onSuccess: () => void }) {
  const qc = useQueryClient();
  const [item, setItem] = useState<PickedItem | null>(null);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const qtyNum = Number(qty) || 0;

  const mut = useMutation({
    mutationFn: () => inventoryApi.transfer({ catalogItemId: item!.id, fromWarehouseId: fromId, toWarehouseId: toId, qty: qtyNum, note }),
    onSuccess: () => {
      toast.success("Transfer tersimpan");
      setItem(null);
      setQty("");
      setNote("");
      setConfirm(false);
      invalidateAll(qc);
      onSuccess();
    },
    onError: (e) => { toast.error(toApiError(e).message); setConfirm(false); },
  });

  const valid = item && fromId && toId && fromId !== toId && qtyNum > 0;

  return (
    <div className="space-y-4">
      <Field label="Produk"><ItemPicker value={item} onChange={setItem} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Dari"><WhSelect warehouses={warehouses} value={fromId} onChange={setFromId} exclude={toId} /></Field>
        <Field label="Ke"><WhSelect warehouses={warehouses} value={toId} onChange={setToId} exclude={fromId} /></Field>
      </div>
      <Field label="Jumlah"><Input type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
      <Field label="Catatan"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <Button onClick={() => setConfirm(true)} disabled={!valid}>Simpan Transfer</Button>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Konfirmasi transfer?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => mut.mutate()} disabled={mut.isPending}>Transfer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type OpeningRow = { item: PickedItem | null; warehouseId: string; qty: string; unitCost: string };

export function CreateOpeningBalancePanel({ warehouses, onSuccess }: { warehouses: Warehouse[]; onSuccess: () => void }) {
  const qc = useQueryClient();
  const defaultWh = warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? "";
  const [rows, setRows] = useState<OpeningRow[]>([{ item: null, warehouseId: defaultWh, qty: "", unitCost: "" }]);
  const setRow = (i: number, patch: Partial<OpeningRow>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const validRows = rows.filter((r) => r.item && r.warehouseId && Number(r.qty) > 0);

  const duplicatePair = (() => {
    const seen = new Map<string, number>();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.item || !r.warehouseId) continue;
      const key = `${r.item.id}:${r.warehouseId}`;
      if (seen.has(key)) {
        return { a: seen.get(key)! + 1, b: i + 1 };
      }
      seen.set(key, i);
    }
    return null;
  })();

  const mut = useMutation({
    mutationFn: () =>
      inventoryApi.openingBalance(
        validRows.map((r) => ({
          catalogItemId: r.item!.id,
          warehouseId: r.warehouseId,
          qty: Number(r.qty),
          unitCost: Number(r.unitCost) || 0,
        })),
      ),
    onSuccess: (res) => {
      toast.success(`Saldo awal ${res.docNo} — ${res.applied} baris`);
      setRows([{ item: null, warehouseId: defaultWh, qty: "", unitCost: "" }]);
      invalidateAll(qc);
      onSuccess();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Satu submit = satu nomor transaksi. Setiap kombinasi <strong>produk + gudang</strong> hanya boleh punya satu saldo awal — tambah/kurang stok pakai{" "}
        <Link href="/dashboard/inventory/adjustments" className="text-primary underline-offset-4 hover:underline">Penyesuaian</Link>.
      </p>
      {duplicatePair ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Baris {duplicatePair.a} dan {duplicatePair.b} memakai produk+gudang yang sama.
        </p>
      ) : null}
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_140px_100px_100px_auto] sm:items-end">
          <Field label={i === 0 ? "Produk" : ""}><ItemPicker value={r.item} onChange={(it) => setRow(i, { item: it })} /></Field>
          <Field label={i === 0 ? "Gudang" : ""}><WhSelect warehouses={warehouses} value={r.warehouseId} onChange={(v) => setRow(i, { warehouseId: v })} /></Field>
          <Field label={i === 0 ? "Qty" : ""}><Input type="number" min="0" step="any" value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} /></Field>
          <Field label={i === 0 ? "HPP" : ""}><Input type="number" min="0" step="any" value={r.unitCost} onChange={(e) => setRow(i, { unitCost: e.target.value })} /></Field>
          <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>Hapus</Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setRows((rs) => [...rs, { item: null, warehouseId: defaultWh, qty: "", unitCost: "" }])}>+ Baris</Button>
        <Button onClick={() => mut.mutate()} disabled={validRows.length === 0 || mut.isPending || duplicatePair != null}>{mut.isPending ? "Menyimpan..." : "Simpan Saldo Awal"}</Button>
      </div>
    </div>
  );
}

export function CreateRevaluationPanel({ warehouses, onSuccess }: { warehouses: Warehouse[]; onSuccess: () => void }) {
  const qc = useQueryClient();
  const [item, setItem] = useState<PickedItem | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [newCost, setNewCost] = useState("");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const stock = useItemStock(item?.id, warehouseId);
  const onHand = stock?.onHand ?? 0;

  const mut = useMutation({
    mutationFn: () => inventoryApi.revaluate({ catalogItemId: item!.id, warehouseId, newUnitCost: Number(newCost) || 0, note }),
    onSuccess: () => {
      toast.success("Revaluasi tersimpan");
      setItem(null);
      setNewCost("");
      setNote("");
      setConfirm(false);
      invalidateAll(qc);
      onSuccess();
    },
    onError: (e) => { toast.error(toApiError(e).message); setConfirm(false); },
  });

  const valid = item && warehouseId && Number(newCost) >= 0 && onHand > 0;

  return (
    <div className="space-y-4">
      <Field label="Produk"><ItemPicker value={item} onChange={setItem} /></Field>
      <Field label="Gudang"><WhSelect warehouses={warehouses} value={warehouseId} onChange={setWarehouseId} /></Field>
      <Field label="HPP baru / unit"><Input type="number" min="0" step="any" value={newCost} onChange={(e) => setNewCost(e.target.value)} /></Field>
      <Field label="Catatan"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <Button onClick={() => setConfirm(true)} disabled={!valid}>Simpan Revaluasi</Button>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Konfirmasi revaluasi HPP?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => mut.mutate()} disabled={mut.isPending}>Revaluasi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
