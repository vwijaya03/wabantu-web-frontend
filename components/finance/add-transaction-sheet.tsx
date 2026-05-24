"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { financeApi, TXN_TYPES } from "@/lib/api/finance";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

const INCOME_TYPES = new Set(["income", "dividend", "interest", "cashback", "investment_sell"]);

export function AddTransactionSheet({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();

  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    walletId: "",
    toWalletId: "",
    categoryId: "",
    description: "",
    transactionDate: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);

  const { data: walletsData } = useQuery({
    queryKey: ["finance-wallets"],
    queryFn: () => financeApi.listWallets(),
    enabled: open,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["finance-categories"],
    queryFn: () => financeApi.listCategories(),
    enabled: open,
  });

  const wallets = walletsData?.wallets ?? [];
  const categories = categoriesData?.categories ?? [];

  const isTransfer = form.type === "transfer";

  const filteredCategories = categories.filter((c) => {
    if (c.type === "any") return true;
    if (INCOME_TYPES.has(form.type)) return c.type === "income" || c.type === "investment";
    if (form.type === "expense") return c.type === "expense" || c.type === "any";
    if (["investment_buy", "investment_sell"].includes(form.type)) return c.type === "investment";
    return true;
  });

  const reset = () => {
    setForm({
      type: "expense",
      amount: "",
      walletId: "",
      toWalletId: "",
      categoryId: "",
      description: "",
      transactionDate: new Date().toISOString().slice(0, 10),
    });
  };

  const handleSubmit = async () => {
    if (!form.amount || !form.walletId) {
      toast.error("Jumlah dan dompet wajib diisi");
      return;
    }
    if (isTransfer && !form.toWalletId) {
      toast.error("Pilih dompet tujuan untuk transfer");
      return;
    }
    setLoading(true);
    try {
      await financeApi.createTransaction({
        type: form.type,
        amount: parseFloat(form.amount) as any,
        walletId: form.walletId,
        toWalletId: isTransfer ? form.toWalletId : undefined,
        categoryId: form.categoryId || undefined,
        description: form.description || undefined,
        transactionDate: form.transactionDate,
        currency: "IDR",
        tags: [],
      } as any);
      toast.success("Transaksi berhasil dicatat");
      onCreated?.();
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal menyimpan transaksi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Catat Transaksi</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Type selector tabs */}
          <div className="flex flex-wrap gap-2">
            {TXN_TYPES.slice(0, 5).map((t) => (
              <button
                key={t.value}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  form.type === t.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                onClick={() => setForm((f) => ({ ...f, type: t.value, toWalletId: "", categoryId: "" }))}
              >
                {t.label}
              </button>
            ))}
            <Select
              value={["investment_buy","investment_sell","dividend","interest","cashback","adjustment"].includes(form.type) ? form.type : ""}
              onValueChange={(v) => setForm((f) => ({ ...f, type: v, categoryId: "" }))}
            >
              <SelectTrigger className="h-8 w-auto rounded-full px-3 text-sm">
                <SelectValue placeholder="Lainnya…" />
              </SelectTrigger>
              <SelectContent>
                {TXN_TYPES.slice(5).map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div>
            <Label>Jumlah (Rp)</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0"
              className="text-xl font-bold"
              autoFocus
            />
          </div>

          {/* Wallet */}
          <div>
            <Label>Dompet {isTransfer ? "Asal" : ""}</Label>
            <Select value={form.walletId} onValueChange={(v) => setForm((f) => ({ ...f, walletId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih dompet" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transfer to */}
          {isTransfer && (
            <div>
              <Label>Dompet Tujuan</Label>
              <Select value={form.toWalletId} onValueChange={(v) => setForm((f) => ({ ...f, toWalletId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih dompet tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.filter((w) => w.id !== form.walletId).map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Category */}
          {!isTransfer && (
            <div>
              <Label>Kategori (opsional)</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Tanpa kategori —</SelectItem>
                  {filteredCategories.filter((c) => !c.parentId).map((parent) => {
                    const children = filteredCategories.filter((c) => c.parentId === parent.id);
                    return (
                      <>
                        <SelectItem key={parent.id} value={parent.id} className="font-semibold">
                          {parent.name}
                        </SelectItem>
                        {children.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="pl-6">
                            {c.name}
                          </SelectItem>
                        ))}
                      </>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date */}
          <div>
            <Label>Tanggal</Label>
            <Input
              type="date"
              value={form.transactionDate}
              onChange={(e) => setForm((f) => ({ ...f, transactionDate: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div>
            <Label>Keterangan (opsional)</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="mis. Gaji karyawan Budi, Bayar listrik"
              rows={2}
            />
          </div>
        </div>

        <SheetFooter className="mt-6 flex-row gap-3">
          <Button variant="outline" className="flex-1" onClick={() => { onOpenChange(false); reset(); }}>
            Batal
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Transaksi"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
