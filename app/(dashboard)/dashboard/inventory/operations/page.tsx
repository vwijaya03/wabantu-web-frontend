"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InventoryHelpButton, InventoryPageHeader } from "@/components/inventory/inventory-help";
import type { InventoryHelpTopic } from "@/lib/inventory/help-content";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { ItemPicker, type PickedItem } from "@/components/inventory/item-picker";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { inventoryApi, formatIDR, formatStockQty, type Warehouse } from "@/lib/api/inventory";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Mode = "adjust" | "transfer" | "opening" | "revalue";

const MODES: Array<{ id: Mode; label: string; helpTopic: InventoryHelpTopic }> = [
  { id: "adjust", label: "Penyesuaian ±", helpTopic: "operations-adjust" },
  { id: "transfer", label: "Transfer", helpTopic: "operations-transfer" },
  { id: "opening", label: "Saldo Awal", helpTopic: "operations-opening" },
  { id: "revalue", label: "Revaluasi HPP", helpTopic: "operations-revalue" },
];

export default function StockOperationsPage() {
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const initialMode = MODES.some((m) => m.id === modeParam) ? (modeParam as Mode) : "adjust";
  const [mode, setMode] = useState<Mode>(initialMode);

  const { data: whData } = useQuery({
    queryKey: ["inventory", "warehouses"],
    queryFn: () => inventoryApi.listWarehouses(),
  });
  const warehouses = whData?.warehouses ?? [];

  if (!canManage) {
    return (
      <RequireTenantDashboard title="Operasi Stok">
        <InventoryPageHeader title="Operasi Stok" description="Hanya owner yang dapat mengubah stok." helpTopic="operations" />
      </RequireTenantDashboard>
    );
  }

  return (
    <RequireTenantDashboard title="Operasi Stok">
      <InventoryPageHeader
        title="Operasi Stok"
        description="Penyesuaian, transfer, saldo awal, dan revaluasi HPP."
        helpTopic="operations"
      />

      <div className="mb-4 inline-flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
        {MODES.map((m) => (
          <div key={m.id} className="inline-flex items-center">
            <button
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === m.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
            <InventoryHelpButton topic={m.helpTopic} />
          </div>
        ))}
      </div>

      <div className="max-w-2xl">
        {mode === "adjust" && <AdjustmentForm warehouses={warehouses} />}
        {mode === "transfer" && <TransferForm warehouses={warehouses} />}
        {mode === "opening" && <OpeningForm warehouses={warehouses} />}
        {mode === "revalue" && <RevaluationForm warehouses={warehouses} />}
      </div>
    </RequireTenantDashboard>
  );
}

// Shared: current stock for selected item + warehouse (inline warning context).
function useItemStock(itemId: string | undefined, warehouseId: string) {
  const { data } = useQuery({
    queryKey: ["inventory", "stock", "lookup", warehouseId],
    queryFn: () => inventoryApi.listStock({ warehouseId, pageSize: 200 }),
    enabled: Boolean(itemId && warehouseId),
  });
  return data?.stock.find((r) => r.catalogItemId === itemId && r.warehouseId === warehouseId);
}

function WarehouseSelect({
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

function invalidateStock(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["inventory", "stock"] });
  void qc.invalidateQueries({ queryKey: ["inventory", "movements"] });
}

// ---------- Adjustment ----------

function AdjustmentForm({ warehouses }: { warehouses: Warehouse[] }) {
  const qc = useQueryClient();
  const [item, setItem] = useState<PickedItem | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [note, setNote] = useState("");

  const stock = useItemStock(item?.id, warehouseId);
  const qtyNum = Number(qty) || 0;
  const willOversell = direction === "out" && stock && qtyNum > stock.onHand;

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
      toast.success("Penyesuaian stok tersimpan");
      setItem(null);
      setQty("");
      setUnitCost("");
      setNote("");
      invalidateStock(qc);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const valid = item && warehouseId && qtyNum > 0 && note.trim().length > 0 && (direction === "out" || Number(unitCost) >= 0);

  return (
    <Card>
      <CardHeader><CardTitle>Penyesuaian Stok</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Field label="Produk"><ItemPicker value={item} onChange={setItem} /></Field>
        <Field label="Gudang"><WarehouseSelect warehouses={warehouses} value={warehouseId} onChange={setWarehouseId} /></Field>
        {item && warehouseId ? (
          <p className="text-xs text-muted-foreground">
            Stok saat ini: <span className="font-medium text-foreground">{formatStockQty(stock?.onHand ?? 0)}</span>
            {stock ? ` · HPP rata-rata ${formatIDR(stock.avgUnitCost)}` : ""}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="button" variant={direction === "in" ? "default" : "outline"} size="sm" onClick={() => setDirection("in")}>
            Tambah (+)
          </Button>
          <Button type="button" variant={direction === "out" ? "default" : "outline"} size="sm" onClick={() => setDirection("out")}>
            Kurangi (−)
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Jumlah"><Input type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          {direction === "in" ? (
            <Field label="Harga pokok / unit"><Input type="number" min="0" step="any" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} /></Field>
          ) : null}
        </div>

        {willOversell ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Jumlah melebihi stok tersedia ({formatStockQty(stock?.onHand ?? 0)}). Jika blokir stok minus aktif, ini akan ditolak.
          </p>
        ) : null}

        <Field label="Alasan (wajib — untuk audit)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. opname fisik, barang rusak, koreksi" rows={2} />
        </Field>

        <Button onClick={() => mut.mutate()} disabled={!valid || mut.isPending}>
          {mut.isPending ? "Menyimpan..." : "Simpan Penyesuaian"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------- Transfer ----------

function TransferForm({ warehouses }: { warehouses: Warehouse[] }) {
  const qc = useQueryClient();
  const [item, setItem] = useState<PickedItem | null>(null);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);

  const stock = useItemStock(item?.id, fromId);
  const qtyNum = Number(qty) || 0;
  const fromName = warehouses.find((w) => w.id === fromId)?.name ?? "";
  const toName = warehouses.find((w) => w.id === toId)?.name ?? "";

  const mut = useMutation({
    mutationFn: () =>
      inventoryApi.transfer({ catalogItemId: item!.id, fromWarehouseId: fromId, toWarehouseId: toId, qty: qtyNum, note }),
    onSuccess: () => {
      toast.success("Transfer stok berhasil");
      setItem(null);
      setQty("");
      setNote("");
      setConfirm(false);
      invalidateStock(qc);
    },
    onError: (e) => {
      toast.error(toApiError(e).message);
      setConfirm(false);
    },
  });

  const valid = item && fromId && toId && fromId !== toId && qtyNum > 0;

  return (
    <Card>
      <CardHeader><CardTitle>Transfer Antar Gudang</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Field label="Produk"><ItemPicker value={item} onChange={setItem} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Dari gudang"><WarehouseSelect warehouses={warehouses} value={fromId} onChange={setFromId} exclude={toId} /></Field>
          <Field label="Ke gudang"><WarehouseSelect warehouses={warehouses} value={toId} onChange={setToId} exclude={fromId} /></Field>
        </div>
        {item && fromId ? (
          <p className="text-xs text-muted-foreground">
            Stok di {fromName}: <span className="font-medium text-foreground">{formatStockQty(stock?.onHand ?? 0)}</span>
          </p>
        ) : null}
        <Field label="Jumlah"><Input type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
        <Field label="Catatan (opsional)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>

        <Button onClick={() => setConfirm(true)} disabled={!valid}>Transfer</Button>
      </CardContent>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Transfer {formatStockQty(qtyNum)} {item?.name} dari {fromName} ke {toName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Stok akan keluar dari {fromName} dan masuk ke {toName} dengan HPP yang sama.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => mut.mutate()} disabled={mut.isPending}>
              {mut.isPending ? "Memproses..." : "Konfirmasi Transfer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ---------- Opening balance ----------

type OpeningRow = { item: PickedItem | null; warehouseId: string; qty: string; unitCost: string };

function OpeningForm({ warehouses }: { warehouses: Warehouse[] }) {
  const qc = useQueryClient();
  const defaultWh = warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? "";
  const [rows, setRows] = useState<OpeningRow[]>([{ item: null, warehouseId: defaultWh, qty: "", unitCost: "" }]);

  const setRow = (i: number, patch: Partial<OpeningRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, { item: null, warehouseId: defaultWh, qty: "", unitCost: "" }]);
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const mut = useMutation({
    mutationFn: () =>
      inventoryApi.openingBalance(
        rows
          .filter((r) => r.item && r.warehouseId && Number(r.qty) > 0)
          .map((r) => ({
            catalogItemId: r.item!.id,
            warehouseId: r.warehouseId,
            qty: Number(r.qty),
            unitCost: Number(r.unitCost) || 0,
          })),
      ),
    onSuccess: (res) => {
      toast.success(`${res.applied} baris saldo awal tersimpan`);
      setRows([{ item: null, warehouseId: defaultWh, qty: "", unitCost: "" }]);
      invalidateStock(qc);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const validRows = rows.filter((r) => r.item && r.warehouseId && Number(r.qty) > 0);

  return (
    <Card>
      <CardHeader><CardTitle>Saldo Awal Stok</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Masukkan stok awal beserta harga pokoknya. Item otomatis mulai dilacak.
        </p>
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_140px_110px_110px_auto] sm:items-end">
              <Field label={i === 0 ? "Produk" : ""}><ItemPicker value={r.item} onChange={(it) => setRow(i, { item: it })} /></Field>
              <Field label={i === 0 ? "Gudang" : ""}><WarehouseSelect warehouses={warehouses} value={r.warehouseId} onChange={(v) => setRow(i, { warehouseId: v })} /></Field>
              <Field label={i === 0 ? "Qty" : ""}><Input type="number" min="0" step="any" value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} /></Field>
              <Field label={i === 0 ? "HPP/unit" : ""}><Input type="number" min="0" step="any" value={r.unitCost} onChange={(e) => setRow(i, { unitCost: e.target.value })} /></Field>
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeRow(i)} disabled={rows.length === 1}>
                Hapus
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={addRow}>+ Tambah baris</Button>
          <Button onClick={() => mut.mutate()} disabled={validRows.length === 0 || mut.isPending}>
            {mut.isPending ? "Menyimpan..." : `Simpan ${validRows.length} baris`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Revaluation ----------

function RevaluationForm({ warehouses }: { warehouses: Warehouse[] }) {
  const qc = useQueryClient();
  const [item, setItem] = useState<PickedItem | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [newCost, setNewCost] = useState("");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);

  const stock = useItemStock(item?.id, warehouseId);
  const onHand = stock?.onHand ?? 0;
  const oldValue = stock?.totalValue ?? 0;
  const newValue = onHand * (Number(newCost) || 0);
  const delta = newValue - oldValue;

  const mut = useMutation({
    mutationFn: () =>
      inventoryApi.revaluate({ catalogItemId: item!.id, warehouseId, newUnitCost: Number(newCost) || 0, note }),
    onSuccess: () => {
      toast.success("Revaluasi HPP tersimpan");
      setItem(null);
      setNewCost("");
      setNote("");
      setConfirm(false);
      invalidateStock(qc);
    },
    onError: (e) => {
      toast.error(toApiError(e).message);
      setConfirm(false);
    },
  });

  const valid = item && warehouseId && Number(newCost) >= 0 && onHand > 0;

  return (
    <Card>
      <CardHeader><CardTitle>Revaluasi HPP</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Field label="Produk"><ItemPicker value={item} onChange={setItem} /></Field>
        <Field label="Gudang"><WarehouseSelect warehouses={warehouses} value={warehouseId} onChange={setWarehouseId} /></Field>
        {item && warehouseId ? (
          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs">
            <p>Stok: <span className="font-medium">{formatStockQty(onHand)}</span></p>
            <p>HPP rata-rata saat ini: <span className="font-medium">{formatIDR(stock?.avgUnitCost ?? 0)}</span></p>
            <p>Nilai persediaan saat ini: <span className="font-medium">{formatIDR(oldValue)}</span></p>
          </div>
        ) : null}
        <Field label="HPP baru / unit"><Input type="number" min="0" step="any" value={newCost} onChange={(e) => setNewCost(e.target.value)} /></Field>
        {item && warehouseId && newCost ? (
          <p className={cn("text-xs", delta >= 0 ? "text-emerald-700" : "text-amber-800")}>
            Nilai baru {formatIDR(newValue)} · selisih {delta >= 0 ? "+" : ""}{formatIDR(delta)}
          </p>
        ) : null}
        <Field label="Catatan (opsional)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <Button onClick={() => setConfirm(true)} disabled={!valid}>Revaluasi</Button>
      </CardContent>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revaluasi HPP {item?.name} jadi {formatIDR(Number(newCost) || 0)}/unit?</AlertDialogTitle>
            <AlertDialogDescription>
              Nilai persediaan berubah dari {formatIDR(oldValue)} menjadi {formatIDR(newValue)}
              {" "}(selisih {delta >= 0 ? "+" : ""}{formatIDR(delta)}) dan dicatat ke jurnal Penyesuaian Nilai Persediaan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => mut.mutate()} disabled={mut.isPending}>
              {mut.isPending ? "Memproses..." : "Konfirmasi Revaluasi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ---------- shared field ----------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label ? <Label>{label}</Label> : null}
      {children}
    </div>
  );
}
