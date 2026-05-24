"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { financeApi, formatIDR } from "@/lib/api/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function InvestmentPage() {
  const qc = useQueryClient();
  const [openAddAsset, setOpenAddAsset] = useState(false);
  const [openUpdatePrice, setOpenUpdatePrice] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState({ name: "", ticker: "", type: "stock", unitName: "lot", walletId: "" });
  const [newPrice, setNewPrice] = useState("");

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ["finance-portfolio"],
    queryFn: () => financeApi.portfolio(),
  });

  const { data: wallets } = useQuery({
    queryKey: ["finance-wallets"],
    queryFn: () => financeApi.listWallets(),
  });

  const createAssetMut = useMutation({
    mutationFn: () => financeApi.createAsset(assetForm),
    onSuccess: () => {
      toast.success("Aset berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["finance-portfolio"] });
      setOpenAddAsset(false);
      setAssetForm({ name: "", ticker: "", type: "stock", unitName: "lot", walletId: "" });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Gagal menyimpan"),
  });

  const updatePriceMut = useMutation({
    mutationFn: ({ assetId, price }: { assetId: string; price: number }) =>
      financeApi.updateAssetPrice(assetId, price),
    onSuccess: () => {
      toast.success("Harga diperbarui");
      qc.invalidateQueries({ queryKey: ["finance-portfolio"] });
      setOpenUpdatePrice(null);
      setNewPrice("");
    },
  });

  const assets = portfolio?.assets ?? [];
  const investmentWallets = wallets?.wallets.filter((w) => w.type === "investment" || w.type === "other") ?? [];

  const pnlColor = (val: string | undefined) => {
    if (!val) return "";
    const n = parseFloat(val);
    if (n > 0) return "text-green-600";
    if (n < 0) return "text-red-600";
    return "";
  };

  return (
    <>
      <PageHeader
        title="Investasi & Aset"
        description="Pantau portofolio investasi Anda."
        actions={
          <Button onClick={() => setOpenAddAsset(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Aset
          </Button>
        }
      />

      {/* Portfolio summary */}
      {portfolio && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Modal</p>
              <p className="mt-1 text-xl font-bold">{formatIDR(portfolio.totalCost)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Nilai Saat Ini</p>
              <p className="mt-1 text-xl font-bold">{formatIDR(portfolio.currentValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Unrealized P&L</p>
              <p className={cn("mt-1 text-xl font-bold", pnlColor(portfolio.unrealizedPnl))}>
                {parseFloat(portfolio.unrealizedPnl) >= 0 ? "+" : ""}{formatIDR(portfolio.unrealizedPnl)}
              </p>
              <p className="text-xs text-muted-foreground">{portfolio.unrealizedPct}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Dividen</p>
              <p className="mt-1 text-xl font-bold text-green-600">{formatIDR(portfolio.totalDividend)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2">
        Harga aset diinput manual. Tap "Update Harga" pada setiap aset untuk memperbarui nilai pasar.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada aset. Tambahkan aset investasi Anda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assets.map((a) => (
            <Card key={a.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base">
                    {a.name}
                    {a.ticker && <span className="ml-2 text-xs text-muted-foreground">{a.ticker}</span>}
                  </CardTitle>
                  <CardDescription>{a.type} · {a.unitName}</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenUpdatePrice(a.id)}
                >
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> Update Harga
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Qty Dipegang</p>
                    <p className="font-medium">{parseFloat(a.qtyHeld).toLocaleString("id-ID")} {a.unitName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Beli</p>
                    <p className="font-medium">{formatIDR(a.avgBuyPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Modal</p>
                    <p className="font-medium">{formatIDR(a.totalCost)}</p>
                  </div>
                  {a.currentValue && (
                    <div>
                      <p className="text-xs text-muted-foreground">Nilai Kini</p>
                      <p className="font-medium">{formatIDR(a.currentValue)}</p>
                    </div>
                  )}
                  {a.unrealizedPnl && (
                    <div>
                      <p className="text-xs text-muted-foreground">Unrealized P&L</p>
                      <p className={cn("font-medium", pnlColor(a.unrealizedPnl))}>
                        {parseFloat(a.unrealizedPnl) >= 0 ? "+" : ""}{formatIDR(a.unrealizedPnl)}
                        {a.unrealizedPct && <span className="ml-1 text-xs">({a.unrealizedPct}%)</span>}
                      </p>
                    </div>
                  )}
                  {a.latestPrice && (
                    <div>
                      <p className="text-xs text-muted-foreground">Harga Terakhir</p>
                      <p className="font-medium">{formatIDR(a.latestPrice)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Total Dividen</p>
                    <p className="font-medium text-green-600">{formatIDR(a.totalDividend)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add asset dialog */}
      <Dialog open={openAddAsset} onOpenChange={setOpenAddAsset}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Aset Investasi</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama Aset</Label>
              <Input value={assetForm.name} onChange={(e) => setAssetForm((f) => ({ ...f, name: e.target.value }))} placeholder="mis. BBCA, Bitcoin, Emas Antam" />
            </div>
            <div>
              <Label>Kode / Ticker (opsional)</Label>
              <Input value={assetForm.ticker} onChange={(e) => setAssetForm((f) => ({ ...f, ticker: e.target.value }))} placeholder="BBCA, BTC, XAU" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipe</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={assetForm.type}
                  onChange={(e) => setAssetForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="stock">Saham</option>
                  <option value="crypto">Kripto</option>
                  <option value="gold">Emas</option>
                  <option value="mutual_fund">Reksa Dana</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              <div>
                <Label>Satuan</Label>
                <Input value={assetForm.unitName} onChange={(e) => setAssetForm((f) => ({ ...f, unitName: e.target.value }))} placeholder="lot, unit, gram" />
              </div>
            </div>
            {investmentWallets.length > 0 && (
              <div>
                <Label>Wallet Investasi</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={assetForm.walletId}
                  onChange={(e) => setAssetForm((f) => ({ ...f, walletId: e.target.value }))}
                >
                  <option value="">— pilih wallet —</option>
                  {wallets?.wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAddAsset(false)}>Batal</Button>
            <Button onClick={() => createAssetMut.mutate()} disabled={!assetForm.name || createAssetMut.isPending}>
              {createAssetMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update price dialog */}
      <Dialog open={!!openUpdatePrice} onOpenChange={() => setOpenUpdatePrice(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Harga Pasar</DialogTitle></DialogHeader>
          <div>
            <Label>Harga terkini (per {assets.find((a) => a.id === openUpdatePrice)?.unitName ?? "unit"})</Label>
            <Input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="0"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenUpdatePrice(null)}>Batal</Button>
            <Button
              onClick={() => updatePriceMut.mutate({ assetId: openUpdatePrice!, price: parseFloat(newPrice) })}
              disabled={!newPrice || updatePriceMut.isPending}
            >
              Simpan Harga
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
