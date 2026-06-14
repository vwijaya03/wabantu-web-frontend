"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { inventoryApi } from "@/lib/api/inventory";
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
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "warehouses"],
    queryFn: () => inventoryApi.listWarehouses(),
  });

  const createMut = useMutation({
    mutationFn: () => inventoryApi.createWarehouse({ name, code: code || undefined, address: address || undefined }),
    onSuccess: () => {
      toast.success("Gudang ditambahkan");
      setName("");
      setCode("");
      setAddress("");
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

  return (
    <RequireTenantDashboard title="Gudang">
      <PageHeader title="Gudang" description="Lokasi penyimpanan stok. Setiap pesanan & pembelian memilih gudang." />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {canManage ? (
          <Card>
            <CardHeader><CardTitle>Tambah Gudang</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Nama gudang</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Gudang Cabang Bekasi" />
              </div>
              <div>
                <Label>Kode (opsional)</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="otomatis dari nama" />
              </div>
              <div>
                <Label>Alamat (opsional)</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <Button onClick={() => createMut.mutate()} disabled={!name || createMut.isPending}>
                {createMut.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader><CardTitle>Daftar Gudang</CardTitle></CardHeader>
          <CardContent>
            <InventoryTable>
              <InventoryTableHeader>
                <InventoryTableRow>
                  <InventoryTableHead>Nama</InventoryTableHead>
                  <InventoryTableHead>Kode</InventoryTableHead>
                  <InventoryTableHead>Alamat</InventoryTableHead>
                  <InventoryTableHead align="right">Aksi</InventoryTableHead>
                </InventoryTableRow>
              </InventoryTableHeader>
              <InventoryTableBody>
                {isLoading ? (
                  <InventoryTableEmpty colSpan={4}>Memuat...</InventoryTableEmpty>
                ) : warehouses.length === 0 ? (
                  <InventoryTableEmpty colSpan={4}>Belum ada gudang.</InventoryTableEmpty>
                ) : (
                  warehouses.map((w) => (
                    <InventoryTableRow key={w.id}>
                      <InventoryTableCell>
                        <span className="font-medium">{w.name}</span>{" "}
                        {w.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                        {!w.isActive ? <Badge variant="destructive">Nonaktif</Badge> : null}
                      </InventoryTableCell>
                      <InventoryTableCell className="text-muted-foreground">{w.code}</InventoryTableCell>
                      <InventoryTableCell className="text-muted-foreground">{w.address || "-"}</InventoryTableCell>
                      <InventoryTableCell align="right">
                        {canManage && !w.isDefault ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={deleteMut.isPending}
                            onClick={() => {
                              if (confirm(`Hapus gudang ${w.name}?`)) deleteMut.mutate(w.id);
                            }}
                          >
                            Hapus
                          </Button>
                        ) : null}
                      </InventoryTableCell>
                    </InventoryTableRow>
                  ))
                )}
              </InventoryTableBody>
            </InventoryTable>
          </CardContent>
        </Card>
      </div>
    </RequireTenantDashboard>
  );
}
