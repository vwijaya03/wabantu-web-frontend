"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/dashboard/page-header";
import { catalogApi } from "@/lib/api/catalog";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

export default function CatalogPage() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => catalogApi.list(),
  });

  const createMut = useMutation({
    mutationFn: () =>
      catalogApi.create({
        externalCode: code,
        name,
        sellPrice: price ? Number(price) : undefined,
      }),
    onSuccess: () => {
      toast.success("Produk ditambahkan");
      setCode("");
      setName("");
      setPrice("");
      void qc.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <>
      <PageHeader title="Katalog Produk" description="Kelola produk untuk AI dan pesanan." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tambah produk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>SKU / Kode</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div>
              <Label>Nama</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Harga (IDR)</Label>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" />
            </div>
            <Button onClick={() => createMut.mutate()} disabled={!code || !name || createMut.isPending}>
              Simpan
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daftar produk ({data?.total ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : (
              (data?.items ?? []).map((item) => (
                <div key={item.id} className="rounded border p-3 text-sm">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground">
                    {item.externalCode}
                    {item.sellPrice != null ? ` · Rp ${item.sellPrice.toLocaleString("id-ID")}` : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
