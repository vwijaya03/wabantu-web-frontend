"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlusCircle,
  RefreshCw,
  ArrowDownCircle,
  ArrowUpCircle,
  Pencil,
  Trash2,
  Search,
  History,
  Coins,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FinanceSubPageHeader } from "@/components/finance/finance-sub-page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
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
import { financeApi, formatIDR, formatIDRPrice, parseDecimalInput } from "@/lib/api/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { toApiError } from "@/lib/api/client";
import { formatFinanceDate, invalidateFinanceCaches, NO_WALLET, todayISOInTimezone } from "@/lib/finance/utils";
import { useReportingTimezone } from "@/hooks/use-reporting-timezone";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { tenantQueryKey } from "@/lib/query/tenant-query-key";
import {
  CUSTOM_UNIT,
  defaultUnitNameForType,
  defaultUnitPreset,
  findUnitPreset,
  INVESTMENT_ASSET_UNIT_PRESETS,
  resolveUnitConfig,
  unitSelectValue,
  type InvestmentAssetType,
} from "@/lib/finance/investment-units";

function defaultFeePercent(side: "buy" | "sell", assetType: string) {
  if (assetType === "stock") return side === "buy" ? "0.15" : "0.25";
  return "0";
}

function tradeTypeLabel(type: string) {
  if (type === "investment_buy") return "Beli";
  if (type === "investment_sell") return "Jual";
  if (type === "dividend") return "Dividen";
  return type;
}

function formatQtyHeld(a: { qtyHeld: string; qtyHeldBase?: string; unitName: string; unitMultiplier?: string; priceUnitName?: string }) {
  const lots = parseFloat(a.qtyHeld) || 0;
  const mult = parseFloat(a.unitMultiplier || "1") || 1;
  if (mult > 1) {
    const base = parseFloat(a.qtyHeldBase || "") || lots * mult;
    const pu = a.priceUnitName || "lembar";
    return `${lots.toLocaleString("id-ID")} ${a.unitName} (${base.toLocaleString("id-ID")} ${pu})`;
  }
  return `${lots.toLocaleString("id-ID")} ${a.unitName}`;
}

function assetFieldHints(type: string) {
  switch (type) {
    case "stock":
      return {
        namePh: "mis. PT Bank Central Asia Tbk",
        tickerPh: "mis. BBCA",
        hint: "Nama: nama resmi emiten. Kode: simbol di bursa (ticker), mis. BBCA.",
      };
    case "crypto":
      return {
        namePh: "mis. Bitcoin",
        tickerPh: "mis. BTC",
        hint: "Nama: nama aset kripto. Kode: simbol singkat (ticker), mis. BTC.",
      };
    case "gold":
      return {
        namePh: "mis. Emas Antam 1 gram",
        tickerPh: "mis. XAU / ANTAM",
        hint: "Nama: deskripsi produk emas. Satuan umum: gram (harga Antam per gram).",
      };
    case "mutual_fund":
      return {
        namePh: "mis. Reksa Dana Pasar Uang XYZ",
        tickerPh: "mis. RD123 (jika ada)",
        hint: "Nama: nama produk reksa dana. Kode: kode produk jika Anda punya.",
      };
    default:
      return {
        namePh: "mis. Properti sewa Gedung A",
        tickerPh: "opsional",
        hint: "Nama: nama yang mudah dikenali. Kode: singkatan atau kode internal (opsional).",
      };
  }
}

export default function InvestmentPage() {
  const { user } = useAuth();
  const tenantKey = useTenantKey();
  const canManage = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const reportingTimezone = useReportingTimezone();
  const todayISO = () => todayISOInTimezone(reportingTimezone);
  const pageSize = 10;
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openAddAsset, setOpenAddAsset] = useState(false);
  const [editAssetId, setEditAssetId] = useState<string | null>(null);
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null);
  const [openUpdatePrice, setOpenUpdatePrice] = useState<string | null>(null);
  const [recordTrade, setRecordTrade] = useState<{ assetId: string; side: "buy" | "sell" } | null>(null);
  const [recordDividendAssetId, setRecordDividendAssetId] = useState<string | null>(null);
  const [dividendForm, setDividendForm] = useState({
    amount: "",
    transactionDate: todayISO(),
    description: "",
  });
  const [tradeHistoryAssetId, setTradeHistoryAssetId] = useState<string | null>(null);
  const [deleteTradeTarget, setDeleteTradeTarget] = useState<{ assetId: string; txnId: string } | null>(null);
  const [assetForm, setAssetForm] = useState({
    name: "",
    ticker: "",
    type: "stock",
    unitName: defaultUnitPreset("stock").value,
    walletId: "",
    notes: "",
  });
  const [customUnitMode, setCustomUnitMode] = useState(false);
  const [tradeForm, setTradeForm] = useState({
    quantity: "",
    pricePerUnit: "",
    feeMode: "percent" as "percent" | "fixed",
    feePercent: "0.15",
    fee: "0",
    transactionDate: todayISO(),
  });
  const [newPrice, setNewPrice] = useState("");

  const {
    data: portfolio,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "finance-portfolio", search, page),
    queryFn: ({ signal }) => financeApi.portfolio({ search: search || undefined, page, pageSize }, signal),
  });

  const { data: wallets } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "finance-wallets"),
    queryFn: ({ signal }) => financeApi.listWallets(signal),
  });

  const { data: tradesData, isLoading: tradesLoading } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "finance-asset-trades", tradeHistoryAssetId),
    queryFn: ({ signal }) => financeApi.listAssetTrades(tradeHistoryAssetId!, signal),
    enabled: !!tradeHistoryAssetId,
  });

  const resetAssetForm = () => {
    setAssetForm({
      name: "",
      ticker: "",
      type: "stock",
      unitName: defaultUnitPreset("stock").value,
      walletId: "",
      notes: "",
    });
    setCustomUnitMode(false);
  };

  const createAssetMut = useMutation({
    mutationFn: () =>
      financeApi.createAsset({
        name: assetForm.name.trim(),
        ticker: assetForm.ticker.trim() || undefined,
        type: assetForm.type,
        unitName: assetForm.unitName.trim() || defaultUnitNameForType(assetForm.type),
        walletId: assetForm.walletId,
        notes: assetForm.notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Aset berhasil ditambahkan");
      invalidateFinanceCaches(qc);
      setOpenAddAsset(false);
      resetAssetForm();
    },
    onError: (e: unknown) => toast.error(toApiError(e).message),
  });

  const updateAssetMut = useMutation({
    mutationFn: () =>
      financeApi.updateAsset(editAssetId!, {
        name: assetForm.name.trim(),
        ticker: assetForm.ticker.trim(),
        type: assetForm.type,
        unitName: assetForm.unitName.trim() || defaultUnitNameForType(assetForm.type),
        walletId: assetForm.walletId || undefined,
        notes: assetForm.notes.trim(),
      }),
    onSuccess: () => {
      toast.success("Aset diperbarui");
      invalidateFinanceCaches(qc);
      setEditAssetId(null);
      resetAssetForm();
    },
    onError: (e: unknown) => toast.error(toApiError(e).message),
  });

  const deleteAssetMut = useMutation({
    mutationFn: (id: string) => financeApi.deleteAsset(id),
    onSuccess: () => {
      toast.success("Aset dihapus");
      invalidateFinanceCaches(qc);
      setDeleteAssetId(null);
    },
    onError: (e: unknown) => toast.error(toApiError(e).message),
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

  const recordDividendMut = useMutation({
    mutationFn: () => {
      if (!recordDividendAssetId) throw new Error("no asset");
      const amount = parseDecimalInput(dividendForm.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("invalid");
      return financeApi.recordAssetDividend(recordDividendAssetId, {
        amount,
        transactionDate: dividendForm.transactionDate,
        description: dividendForm.description.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      toast.success(
        data.status === "pending_approval" ? "Dividen menunggu persetujuan" : "Dividen tercatat",
      );
      invalidateFinanceCaches(qc);
      if (tradeHistoryAssetId) {
        qc.invalidateQueries({ queryKey: ["finance-asset-trades", tradeHistoryAssetId] });
      }
      setRecordDividendAssetId(null);
      setDividendForm({ amount: "", transactionDate: todayISO(), description: "" });
    },
    onError: (e: unknown) => toast.error(toApiError(e).message),
  });

  const recordTradeMut = useMutation({
    mutationFn: () => {
      if (!recordTrade) throw new Error("no asset");
      const qty = parseDecimalInput(tradeForm.quantity);
      const price = parseDecimalInput(tradeForm.pricePerUnit);
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
        throw new Error("invalid");
      }
      const payload: Parameters<typeof financeApi.recordAssetTrade>[1] = {
        side: recordTrade.side,
        quantity: qty,
        pricePerUnit: price,
        transactionDate: tradeForm.transactionDate,
      };
      if (tradeForm.feeMode === "percent") {
        payload.feePercent = parseFloat(tradeForm.feePercent) || 0;
      } else {
        payload.fee = parseFloat(tradeForm.fee || "0") || 0;
      }
      return financeApi.recordAssetTrade(recordTrade.assetId, payload);
    },
    onSuccess: (data) => {
      const side = recordTrade?.side ?? "buy";
      const assetType =
        portfolio?.assets.find((a) => a.id === recordTrade?.assetId)?.type ?? "stock";
      const label = side === "sell" ? "Penjualan" : "Pembelian";
      toast.success(
        data.status === "pending_approval"
          ? `${label} menunggu persetujuan`
          : `${label} tercatat`
      );
      invalidateFinanceCaches(qc);
      if (tradeHistoryAssetId) {
        qc.invalidateQueries({ queryKey: ["finance-asset-trades", tradeHistoryAssetId] });
      }
      setRecordTrade(null);
      resetTradeForm(side, assetType);
    },
    onError: (e: unknown) => toast.error(toApiError(e).message),
  });

  const deleteTradeMut = useMutation({
    mutationFn: ({ assetId, txnId }: { assetId: string; txnId: string }) =>
      financeApi.deleteAssetTrade(assetId, txnId),
    onSuccess: () => {
      toast.success("Transaksi dihapus");
      invalidateFinanceCaches(qc);
      if (tradeHistoryAssetId) {
        qc.invalidateQueries({ queryKey: ["finance-asset-trades", tradeHistoryAssetId] });
      }
      setDeleteTradeTarget(null);
    },
    onError: (e: unknown) => toast.error(toApiError(e).message),
  });

  const assets = portfolio?.assets ?? [];
  const total = portfolio?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const deleteTarget = deleteAssetId ? assets.find((a) => a.id === deleteAssetId) : undefined;
  const activeWallets = wallets?.wallets.filter((w) => w.isActive) ?? [];
  const preferredWallets = activeWallets.filter((w) => w.type === "investment" || w.type === "other");
  const walletOptions = preferredWallets.length > 0 ? preferredWallets : activeWallets;

  const pnlColor = (val: string | undefined) => {
    if (!val) return "";
    const n = parseFloat(val);
    if (n > 0) return "text-green-600";
    if (n < 0) return "text-red-600";
    return "";
  };

  const fieldHints = useMemo(() => assetFieldHints(assetForm.type), [assetForm.type]);
  const unitPresets = INVESTMENT_ASSET_UNIT_PRESETS[assetForm.type as InvestmentAssetType] ?? INVESTMENT_ASSET_UNIT_PRESETS.other;
  const unitConfig = useMemo(
    () => resolveUnitConfig(assetForm.type, assetForm.unitName),
    [assetForm.type, assetForm.unitName],
  );
  const unitUsesCustom = customUnitMode || unitSelectValue(assetForm.type, assetForm.unitName) === CUSTOM_UNIT;

  const tradeAsset = recordTrade ? assets.find((a) => a.id === recordTrade.assetId) : undefined;
  const dividendAsset = recordDividendAssetId
    ? assets.find((a) => a.id === recordDividendAssetId)
    : undefined;
  const tradeQty = parseDecimalInput(tradeForm.quantity) || 0;
  const tradePrice = parseDecimalInput(tradeForm.pricePerUnit) || 0;
  const tradeMult = tradeAsset ? parseFloat(tradeAsset.unitMultiplier || "1") || 1 : 1;
  const tradePriceUnit = tradeAsset?.priceUnitName || tradeAsset?.unitName || "unit";
  const tradeGross = tradeQty * tradeMult * tradePrice;
  const tradeFee =
    tradeForm.feeMode === "percent"
      ? tradeGross * ((parseFloat(tradeForm.feePercent) || 0) / 100)
      : parseFloat(tradeForm.fee || "0") || 0;
  const tradeTotal =
    recordTrade?.side === "sell" ? Math.max(0, tradeGross - tradeFee) : tradeGross + tradeFee;
  const tradeHeld = tradeAsset ? parseFloat(tradeAsset.qtyHeld) || 0 : 0;

  const resetTradeForm = (side: "buy" | "sell", assetType: string) => {
    setTradeForm({
      quantity: "",
      pricePerUnit: "",
      feeMode: "percent",
      feePercent: defaultFeePercent(side, assetType),
      fee: "0",
      transactionDate: todayISO(),
    });
  };

  const openDividendDialog = (assetId: string) => {
    setDividendForm({ amount: "", transactionDate: todayISO(), description: "" });
    setRecordDividendAssetId(assetId);
  };

  const openTradeDialog = (assetId: string, side: "buy" | "sell") => {
    const a = assets.find((x) => x.id === assetId);
    setRecordTrade({ assetId, side });
    resetTradeForm(side, a?.type ?? "stock");
  };

  const historyAsset = tradeHistoryAssetId ? assets.find((a) => a.id === tradeHistoryAssetId) : undefined;

  const openEditAsset = (a: (typeof assets)[0]) => {
    setEditAssetId(a.id);
    setAssetForm({
      name: a.name,
      ticker: a.ticker ?? "",
      type: a.type,
      unitName: a.unitName,
      walletId: a.walletId,
      notes: a.notes ?? "",
    });
    setCustomUnitMode(!findUnitPreset(a.type, a.unitName));
  };

  const openCreateAssetDialog = () => {
    setAssetForm((f) => ({
      ...f,
      walletId: walletOptions.some((w) => w.id === f.walletId)
        ? f.walletId
        : walletOptions[0]?.id ?? "",
    }));
    setOpenAddAsset(true);
  };

  const onAssetTypeChange = (type: string) => {
    const preset = defaultUnitPreset(type as InvestmentAssetType);
    setAssetForm((f) => ({ ...f, type, unitName: preset.value }));
    setCustomUnitMode(false);
  };

  const onUnitPresetChange = (value: string) => {
    if (value === CUSTOM_UNIT) {
      setCustomUnitMode(true);
      return;
    }
    setCustomUnitMode(false);
    const preset = findUnitPreset(assetForm.type, value);
    if (preset) setAssetForm((f) => ({ ...f, unitName: preset.value }));
  };

  const assetDialogOpen = openAddAsset || !!editAssetId;
  const closeAssetDialog = () => {
    setOpenAddAsset(false);
    setEditAssetId(null);
    resetAssetForm();
  };

  return (
    <>
      <FinanceSubPageHeader
        title="Investasi & Aset"
        description="Pantau portofolio investasi Anda."
        actions={
          canManage ? (
            <Button onClick={openCreateAssetDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Aset
            </Button>
          ) : null
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
        <strong>Tambah Aset</strong> hanya mendaftarkan instrumen. Jumlah lot/unit dan modal dihitung dari{" "}
        <strong>Catat Pembelian</strong> / <strong>Catat Penjualan</strong>. Setelah ada kepemilikan, gunakan{" "}
        <strong>Update Harga</strong> untuk nilai pasar dan P&L unrealized. Saham Indonesia: 1 lot = 100 lembar; harga per lembar (mis. Rp 1.055).
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Cari nama atau ticker..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(q.trim());
                setPage(1);
              }
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch(q.trim());
              setPage(1);
            }}
          >
            Cari
          </Button>
          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setSearch("");
                setPage(1);
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {isError ? (
        <Card className="border-destructive">
          <CardContent className="py-6 text-center text-sm">
            <p className="text-destructive">
              Gagal memuat portofolio
              {(error as { response?: { data?: { message?: string } } })?.response?.data?.message
                ? `: ${(error as { response?: { data?: { message?: string } } }).response!.data!.message}`
                : ""}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              Coba lagi
            </Button>
          </CardContent>
        </Card>
      ) : isPending ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {search ? "Tidak ada aset yang cocok dengan pencarian." : "Belum ada aset. Tambahkan aset investasi Anda."}
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="space-y-3">
          {assets.map((a) => (
            <Card key={a.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base">
                    {a.name}
                    {a.ticker && <span className="ml-2 text-xs text-muted-foreground">{a.ticker}</span>}
                  </CardTitle>
                  <CardDescription>
                    {a.type} · {a.unitName}
                    {(parseFloat(a.unitMultiplier) || 1) > 1 && (
                      <span className="ml-1">(1 {a.unitName} = {a.unitMultiplier} {a.priceUnitName})</span>
                    )}
                  </CardDescription>
                </div>
                {canManage && (
                  <div className="flex flex-wrap gap-2 justify-end shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Ubah aset" onClick={() => openEditAsset(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Hapus aset"
                      onClick={() => setDeleteAssetId(a.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="default" size="sm" onClick={() => openTradeDialog(a.id, "buy")}>
                      <ArrowDownCircle className="mr-1 h-3.5 w-3.5" /> Catat Pembelian
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={(parseFloat(a.qtyHeld) || 0) <= 0}
                      onClick={() => openTradeDialog(a.id, "sell")}
                    >
                      <ArrowUpCircle className="mr-1 h-3.5 w-3.5" /> Catat Penjualan
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openDividendDialog(a.id)}>
                      <Coins className="mr-1 h-3.5 w-3.5" /> Catat Dividen
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setOpenUpdatePrice(a.id)}>
                      <RefreshCw className="mr-1 h-3.5 w-3.5" /> Update Harga
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setTradeHistoryAssetId(a.id)}>
                      <History className="mr-1 h-3.5 w-3.5" /> Riwayat
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {(parseFloat(a.qtyHeld) || 0) <= 0 && canManage && (
                  <p className="mb-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-2 py-1.5">
                    Belum ada kepemilikan. Gunakan Catat Pembelian untuk mencatat jumlah {a.unitName} yang Anda pegang.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Qty Dipegang</p>
                    <p className="font-medium">{formatQtyHeld(a)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Beli (per {a.priceUnitName || a.unitName})</p>
                    <p className="font-medium">{formatIDRPrice(a.avgBuyPrice)}</p>
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
                      <p className="text-xs text-muted-foreground">Harga Terakhir (per {a.priceUnitName || a.unitName})</p>
                      <p className="font-medium">{formatIDRPrice(a.latestPrice)}</p>
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
        {total > pageSize && (
          <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
            <span>
              Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total} aset
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Sebelumnya
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Berikutnya
              </Button>
            </div>
          </div>
        )}
        </>
      )}

      {/* Add / edit asset dialog */}
      <Dialog open={assetDialogOpen} onOpenChange={(open) => !open && closeAssetDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editAssetId ? "Ubah Aset Investasi" : "Tambah Aset Investasi"}</DialogTitle>
            <DialogDescription>
              Nama aset = nama lengkap yang mudah dibaca. Kode = ticker/simbol singkat (opsional, tapi disarankan untuk saham).
              {editAssetId && (parseFloat(assets.find((x) => x.id === editAssetId)?.qtyHeld ?? "0") || 0) > 0 && (
                <span className="block mt-1 text-amber-700 dark:text-amber-400">
                  Dompet tidak dapat diubah jika aset sudah memiliki transaksi beli/jual.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama Aset</Label>
              <Input
                value={assetForm.name}
                onChange={(e) => setAssetForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={fieldHints.namePh}
              />
              <p className="mt-1 text-xs text-muted-foreground">{fieldHints.hint}</p>
            </div>
            <div>
              <Label>Kode / Ticker (opsional)</Label>
              <Input
                value={assetForm.ticker}
                onChange={(e) => setAssetForm((f) => ({ ...f, ticker: e.target.value }))}
                placeholder={fieldHints.tickerPh}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipe</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={assetForm.type}
                  onChange={(e) => onAssetTypeChange(e.target.value)}
                >
                  <option value="stock">Saham</option>
                  <option value="crypto">Kripto</option>
                  <option value="gold">Emas</option>
                  <option value="mutual_fund">Reksa Dana</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              <div>
                <Label>Satuan kepemilikan</Label>
                <Select
                  value={unitUsesCustom ? CUSTOM_UNIT : assetForm.unitName}
                  onValueChange={onUnitPresetChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih satuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitPresets.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_UNIT}>Lainnya…</SelectItem>
                  </SelectContent>
                </Select>
                {unitUsesCustom && (
                  <Input
                    className="mt-2"
                    value={assetForm.unitName}
                    onChange={(e) => setAssetForm((f) => ({ ...f, unitName: e.target.value }))}
                    placeholder="mis. bare, kontrak"
                  />
                )}
                {unitConfig.hint && (
                  <p className="mt-1 text-xs text-muted-foreground">{unitConfig.hint}</p>
                )}
              </div>
            </div>
            <div>
              <Label>Dompet</Label>
              {walletOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Buat dompet terlebih dahulu di menu Dompet sebelum menambah aset.
                </p>
              ) : (
                <Select
                  value={assetForm.walletId || NO_WALLET}
                  onValueChange={(v) =>
                    setAssetForm((f) => ({ ...f, walletId: v === NO_WALLET ? "" : v }))
                  }
                  disabled={!!editAssetId && (parseFloat(assets.find((x) => x.id === editAssetId)?.qtyHeld ?? "0") || 0) > 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih dompet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_WALLET} disabled>
                      Pilih dompet
                    </SelectItem>
                    {walletOptions.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Catatan (opsional)</Label>
              <Input
                value={assetForm.notes}
                onChange={(e) => setAssetForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Catatan internal"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAssetDialog}>Batal</Button>
            <Button
              onClick={() => (editAssetId ? updateAssetMut.mutate() : createAssetMut.mutate())}
              disabled={
                !assetForm.name ||
                (!editAssetId && (!assetForm.walletId || walletOptions.length === 0)) ||
                createAssetMut.isPending ||
                updateAssetMut.isPending
              }
            >
              {(createAssetMut.isPending || updateAssetMut.isPending) ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAssetId} onOpenChange={(open) => !open && setDeleteAssetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus aset?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Aset "${deleteTarget.name}" akan dihapus dari daftar.`
                : "Aset akan dihapus dari daftar."}
              {(parseFloat(deleteTarget?.qtyHeld ?? "0") || 0) > 0 ? (
                <span className="block mt-2 text-destructive">
                  Aset masih memiliki kepemilikan. Hapus transaksi beli/jual lewat tombol <strong>Riwayat</strong> pada kartu aset,
                  atau catat penjualan hingga qty menjadi 0.
                </span>
              ) : (
                <span className="block mt-2">Riwayat harga tetap tersimpan di database; aset tidak lagi muncul di portofolio.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={
                deleteAssetMut.isPending ||
                (parseFloat(deleteTarget?.qtyHeld ?? "0") || 0) > 0
              }
              onClick={() => deleteAssetId && deleteAssetMut.mutate(deleteAssetId)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Record dividend */}
      <Dialog open={!!recordDividendAssetId} onOpenChange={(open) => !open && setRecordDividendAssetId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Catat Dividen{dividendAsset ? ` — ${dividendAsset.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Nominal masuk ke dompet{" "}
              {dividendAsset
                ? wallets?.wallets.find((w) => w.id === dividendAsset.walletId)?.name ?? "terhubung aset"
                : "aset"}
              , menambah Total Dividen, dan tidak mengubah qty kepemilikan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Jumlah dividen (Rp)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={dividendForm.amount}
                onChange={(e) => setDividendForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                className="text-lg font-semibold"
                autoFocus
              />
            </div>
            <div>
              <Label>Tanggal</Label>
              <DatePicker
                value={dividendForm.transactionDate}
                onChange={(transactionDate) => setDividendForm((f) => ({ ...f, transactionDate }))}
              />
            </div>
            <div>
              <Label>Keterangan (opsional)</Label>
              <Input
                value={dividendForm.description}
                onChange={(e) => setDividendForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="mis. Dividen interim TOTL"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordDividendAssetId(null)}>
              Batal
            </Button>
            <Button
              onClick={() => recordDividendMut.mutate()}
              disabled={recordDividendMut.isPending || !(parseDecimalInput(dividendForm.amount) > 0)}
            >
              {recordDividendMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record buy/sell dialog */}
      <Dialog open={!!recordTrade} onOpenChange={(open) => !open && setRecordTrade(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {recordTrade?.side === "sell" ? "Catat Penjualan" : "Catat Pembelian"}
              {tradeAsset ? ` — ${tradeAsset.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              {recordTrade?.side === "sell"
                ? "Mencatat penjualan mengurangi qty dan menambah saldo dompet terkait."
                : "Mencatat pembelian menambah qty dan mengurangi saldo dompet terkait."}
              {tradeAsset && (
                <span className="block mt-1">
                  Kepemilikan saat ini: {tradeAsset ? formatQtyHeld(tradeAsset) : ""}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Jumlah ({tradeAsset?.unitName ?? "unit"})</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={tradeForm.quantity}
                onChange={(e) => setTradeForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="mis. 10"
              />
            </div>
            <div>
              <Label>Harga per {tradePriceUnit} (Rp)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={tradeForm.pricePerUnit}
                onChange={(e) => setTradeForm((f) => ({ ...f, pricePerUnit: e.target.value }))}
                placeholder="mis. 1191,69"
              />
              <p className="mt-1 text-xs text-muted-foreground">Boleh pakai koma atau titik desimal.</p>
            </div>
            <div className="space-y-2">
              <Label>Biaya transaksi</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tradeForm.feeMode === "percent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTradeForm((f) => ({ ...f, feeMode: "percent" }))}
                >
                  Persen (%)
                </Button>
                <Button
                  type="button"
                  variant={tradeForm.feeMode === "fixed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTradeForm((f) => ({ ...f, feeMode: "fixed" }))}
                >
                  Nominal (Rp)
                </Button>
              </div>
              {tradeForm.feeMode === "percent" ? (
                <>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={tradeForm.feePercent}
                    onChange={(e) => setTradeForm((f) => ({ ...f, feePercent: e.target.value }))}
                    placeholder="mis. 0.15"
                  />
                  <p className="text-xs text-muted-foreground">
                    Dari nilai transaksi (lot × lembar × harga). Saham IDX umumnya beli ~0,15%, jual ~0,25%.
                    {tradeGross > 0 && (
                      <span className="block mt-0.5">
                        Estimasi biaya: {formatIDR(String(Math.round(tradeFee)))}
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={tradeForm.fee}
                  onChange={(e) => setTradeForm((f) => ({ ...f, fee: e.target.value }))}
                  placeholder="0"
                />
              )}
            </div>
            <div>
              <Label>Tanggal</Label>
              <DatePicker
                value={tradeForm.transactionDate}
                onChange={(transactionDate) => setTradeForm((f) => ({ ...f, transactionDate }))}
              />
            </div>
            {tradeQty > 0 && tradePrice > 0 && (
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p>
                  Nilai transaksi: <span className="font-medium text-foreground">{formatIDR(String(tradeGross))}</span>
                </p>
                <p>
                  Biaya: <span className="font-medium text-foreground">{formatIDR(String(Math.round(tradeFee)))}</span>
                </p>
                <p>
                  Total {recordTrade?.side === "sell" ? "diterima" : "dibayar"}:{" "}
                  <span className="font-medium text-foreground">{formatIDR(String(Math.round(tradeTotal)))}</span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordTrade(null)}>
              Batal
            </Button>
            <Button
              onClick={() => recordTradeMut.mutate()}
              disabled={
                recordTradeMut.isPending ||
                !tradeForm.quantity ||
                !tradeForm.pricePerUnit ||
                parseFloat(tradeForm.quantity) <= 0 ||
                !Number.isFinite(parseDecimalInput(tradeForm.pricePerUnit)) ||
                parseDecimalInput(tradeForm.pricePerUnit) <= 0 ||
                (recordTrade?.side === "sell" && tradeQty > tradeHeld)
              }
            >
              {recordTradeMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trade history dialog */}
      <Dialog open={!!tradeHistoryAssetId} onOpenChange={(open) => !open && setTradeHistoryAssetId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Riwayat Transaksi — {historyAsset?.name}</DialogTitle>
            <DialogDescription>
              Hapus transaksi beli/jual yang salah agar kepemilikan dan saldo dompet kembali benar. Setelah qty 0, aset bisa dihapus.
            </DialogDescription>
          </DialogHeader>
          {tradesLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : (tradesData?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Belum ada transaksi.</p>
          ) : (
            <ul className="space-y-2">
              {(tradesData?.items ?? []).map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-2 rounded-md border p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{tradeTypeLabel(t.type)}</p>
                    <p className="text-xs text-muted-foreground">{formatFinanceDate(t.transactionDate, reportingTimezone)}</p>
                    {t.type !== "dividend" && (
                      <p className="text-xs mt-1">
                        {parseFloat(t.quantity).toLocaleString("id-ID")} {historyAsset?.unitName ?? "unit"}
                        {" × "}
                        {formatIDRPrice(t.pricePerUnit)} / {historyAsset?.priceUnitName ?? "unit"}
                        {parseFloat(t.fee) > 0 && (
                          <span> · biaya {formatIDR(t.fee)}</span>
                        )}
                      </p>
                    )}
                    <p className="text-xs font-medium mt-0.5">{formatIDR(t.amount)}</p>
                    {t.status === "pending_approval" && (
                      <p className="text-xs text-amber-600">Menunggu persetujuan</p>
                    )}
                  </div>
                  {canManage && t.status !== "pending_approval" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() =>
                        tradeHistoryAssetId &&
                        setDeleteTradeTarget({ assetId: tradeHistoryAssetId, txnId: t.id })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTradeHistoryAssetId(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTradeTarget} onOpenChange={(open) => !open && setDeleteTradeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Transaksi akan dihapus dan saldo dompet disesuaikan. Kepemilikan aset dihitung ulang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTradeMut.isPending}
              onClick={() =>
                deleteTradeTarget && deleteTradeMut.mutate(deleteTradeTarget)
              }
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update price dialog */}
      <Dialog open={!!openUpdatePrice} onOpenChange={() => setOpenUpdatePrice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Harga Pasar</DialogTitle>
            <DialogDescription>Masukkan harga pasar terbaru untuk menghitung nilai portofolio.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>
              Harga terkini (per {assets.find((a) => a.id === openUpdatePrice)?.priceUnitName ?? assets.find((a) => a.id === openUpdatePrice)?.unitName ?? "unit"})
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="mis. 1055,50"
            />
            <p className="mt-1 text-xs text-muted-foreground">Boleh pakai koma atau titik desimal.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenUpdatePrice(null)}>Batal</Button>
            <Button
              onClick={() => {
                const p = parseDecimalInput(newPrice);
                if (!Number.isFinite(p) || p <= 0) {
                  toast.error("Harga tidak valid");
                  return;
                }
                updatePriceMut.mutate({ assetId: openUpdatePrice!, price: p });
              }}
              disabled={!newPrice || updatePriceMut.isPending || !(parseDecimalInput(newPrice) > 0)}
            >
              Simpan Harga
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
