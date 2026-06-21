"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InventoryPageHeader } from "@/components/inventory/inventory-help";
import { InventoryDataTablePagination } from "@/components/inventory/data-table-pagination";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { inventoryApi, type Warehouse } from "@/lib/api/inventory";
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

export default function WarehousesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const [creating, setCreating] = useState(false);
  const [editWh, setEditWh] = useState<Warehouse | null>(null);
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "warehouses", "list", searchQ, page, pageSize],
    queryFn: () => inventoryApi.listWarehouses({ q: searchQ || undefined, page, pageSize }),
  });

  const reactivateMut = useMutation({
    mutationFn: (id: string) => inventoryApi.reactivateWarehouse(id),
    onSuccess: () => {
      toast.success("Gudang diaktifkan kembali");
      void qc.invalidateQueries({ queryKey: ["inventory", "warehouses"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteWarehouse(id),
    onSuccess: () => {
      toast.success("Gudang dihapus");
      void qc.invalidateQueries({ queryKey: ["inventory", "warehouses"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const warehouses = data?.warehouses ?? [];
  const total = data?.total ?? 0;

  return (
    <RequireTenantDashboard title="Gudang">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <InventoryPageHeader
          title="Gudang"
          description="Lokasi penyimpanan stok. Setiap pesanan & pembelian memilih gudang."
          helpTopic="warehouses"
        />
        {canManage ? (
          <Button onClick={() => setCreating((v) => !v)}>{creating ? "Tutup" : "Tambah Gudang"}</Button>
        ) : null}
      </div>

      {creating && canManage ? (
        <CreateWarehousePanel onDone={() => { setCreating(false); void qc.invalidateQueries({ queryKey: ["inventory", "warehouses"] }); }} />
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Daftar Gudang</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearchQ(q.trim());
              setPage(1);
            }}
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama, kode, alamat…"
              className="max-w-sm"
            />
            <Button type="submit" variant="secondary">Cari</Button>
            {searchQ ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setQ("");
                  setSearchQ("");
                  setPage(1);
                }}
              >
                Reset
              </Button>
            ) : null}
          </form>

          <InventoryTable>
            <InventoryTableHeader>
              <InventoryTableRow>
                <InventoryTableHead>Nama</InventoryTableHead>
                <InventoryTableHead>Kode</InventoryTableHead>
                <InventoryTableHead>Alamat</InventoryTableHead>
                <InventoryTableHead>Status</InventoryTableHead>
                {canManage ? <InventoryTableHead align="right">Aksi</InventoryTableHead> : null}
              </InventoryTableRow>
            </InventoryTableHeader>
            <InventoryTableBody>
              {isLoading ? (
                <InventoryTableEmpty colSpan={canManage ? 5 : 4}>Memuat...</InventoryTableEmpty>
              ) : warehouses.length === 0 ? (
                <InventoryTableEmpty colSpan={canManage ? 5 : 4}>
                  {searchQ ? "Tidak ada gudang cocok." : "Belum ada gudang."}
                </InventoryTableEmpty>
              ) : (
                warehouses.map((w) => (
                  <InventoryTableRow key={w.id}>
                    <InventoryTableCell>
                      <span className="font-medium">{w.name}</span>
                      {w.isDefault ? <Badge className="ml-2" variant="secondary">Default</Badge> : null}
                    </InventoryTableCell>
                    <InventoryTableCell className="text-muted-foreground">{w.code}</InventoryTableCell>
                    <InventoryTableCell className="max-w-[240px] truncate text-muted-foreground" title={w.address ?? ""}>
                      {w.address || "—"}
                    </InventoryTableCell>
                    <InventoryTableCell>
                      {w.isDeleted ? (
                        <Badge variant="warning">Terhapus</Badge>
                      ) : w.isActive ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="destructive">Nonaktif</Badge>
                      )}
                    </InventoryTableCell>
                    {canManage ? (
                      <InventoryTableCell align="right">
                        <div className="flex justify-end gap-1">
                          {!w.isDeleted ? (
                            <Button variant="outline" size="sm" onClick={() => setEditWh(w)}>
                              Edit
                            </Button>
                          ) : null}
                          {w.isDeleted ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={reactivateMut.isPending}
                              onClick={() => reactivateMut.mutate(w.id)}
                            >
                              Aktifkan
                            </Button>
                          ) : w.isDefault ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              disabled
                              title="Gudang default tidak bisa dihapus"
                              aria-label="Gudang default tidak bisa dihapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              disabled={deleteMut.isPending}
                              title="Hapus gudang (hanya jika belum dipakai transaksi)"
                              aria-label={`Hapus gudang ${w.name}`}
                              onClick={() => {
                                if (confirm(`Hapus gudang ${w.name}? Tidak bisa jika sudah dipakai di transaksi stok, PO, atau pesanan.`)) {
                                  deleteMut.mutate(w.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </InventoryTableCell>
                    ) : null}
                  </InventoryTableRow>
                ))
              )}
            </InventoryTableBody>
          </InventoryTable>

          <InventoryDataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      {editWh ? (
        <EditWarehouseDialog
          warehouse={editWh}
          onClose={() => setEditWh(null)}
          onSaved={() => {
            setEditWh(null);
            void qc.invalidateQueries({ queryKey: ["inventory", "warehouses"] });
          }}
        />
      ) : null}
    </RequireTenantDashboard>
  );
}

function CreateWarehousePanel({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [customerLabel, setCustomerLabel] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

  const createMut = useMutation({
    mutationFn: () =>
      inventoryApi.createWarehouse({
        name,
        code: code || undefined,
        customerLabel: customerLabel.trim() || undefined,
        address: address || undefined,
        note: note || undefined,
      }),
    onSuccess: () => {
      toast.success("Gudang ditambahkan");
      onDone();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <Card className="mt-6">
      <CardHeader><CardTitle>Tambah Gudang</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Nama gudang</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Gudang Cabang Bekasi" />
          <p className="text-xs text-muted-foreground">Nama internal untuk tim Anda. Tampil ke pelanggan lewat label di bawah (atau nama ini jika label kosong).</p>
        </div>
        <div className="space-y-1.5">
          <Label>Label untuk pelanggan (opsional)</Label>
          <Input value={customerLabel} onChange={(e) => setCustomerLabel(e.target.value)} placeholder="Contoh: Jakarta Selatan, Surabaya" />
        </div>
        <div className="space-y-1.5">
          <Label>Kode (opsional)</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="otomatis dari nama" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Alamat (opsional)</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Catatan (opsional)</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button onClick={() => createMut.mutate()} disabled={!name.trim() || createMut.isPending}>
            {createMut.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
          <Button type="button" variant="outline" onClick={onDone}>Batal</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EditWarehouseDialog({
  warehouse,
  onClose,
  onSaved,
}: {
  warehouse: Warehouse;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(warehouse.name);
  const [customerLabel, setCustomerLabel] = useState(warehouse.customerLabel ?? "");
  const [address, setAddress] = useState(warehouse.address ?? "");
  const [note, setNote] = useState(warehouse.note ?? "");
  const [isActive, setIsActive] = useState(warehouse.isActive);

  const saveMut = useMutation({
    mutationFn: () =>
      inventoryApi.updateWarehouse(warehouse.id, {
        name: name.trim(),
        customerLabel: customerLabel.trim() || undefined,
        address: address.trim() || undefined,
        note: note.trim() || undefined,
        isActive: warehouse.isDefault ? true : isActive,
      }),
    onSuccess: () => {
      toast.success("Gudang diperbarui");
      onSaved();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Gudang</DialogTitle>
          <DialogDescription className="sr-only">Form edit data gudang</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nama</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <p className="text-xs text-muted-foreground">Nama internal. Jika label pelanggan kosong, nama ini yang dipakai di chat WhatsApp.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Label untuk pelanggan (opsional)</Label>
            <Input value={customerLabel} onChange={(e) => setCustomerLabel(e.target.value)} placeholder="Contoh: Surabaya" />
          </div>
          <div className="space-y-1.5">
            <Label>Kode</Label>
            <Input value={warehouse.code} disabled className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label>Alamat</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          {!warehouse.isDefault ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Gudang aktif (muncul di dropdown)
            </label>
          ) : (
            <p className="text-xs text-muted-foreground">Gudang default selalu aktif.</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={() => saveMut.mutate()} disabled={!name.trim() || saveMut.isPending}>
              {saveMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
