"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/lib/api/finance";
import { Textarea } from "@/components/ui/textarea";
import { financeApi, type TransactionType } from "@/lib/api/finance";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { toApiError } from "@/lib/api/client";
import {
  NO_WALLET,
  filterCategoriesForGeneralLedger,
  filterGeneralLedgerTxnTypes,
  todayISOInTimezone,
} from "@/lib/finance/utils";
import { useReportingTimezone } from "@/hooks/use-reporting-timezone";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

/** Radix Select forbids empty string as item value. */
const NO_CATEGORY = "__none__";
const MORE_TYPE_NONE = "__more_none__";

/** Group sub-categories under one parent label (guards against duplicate DB rows). */
function buildCategoryGroups(categories: Category[]) {
  const parents = categories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

  const seen = new Set<string>();
  const groups: { parent: Category; children: Category[] }[] = [];

  for (const parent of parents) {
    const key = parent.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const children = categories
      .filter((c) => c.parentId === parent.id)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

    const childSeen = new Set<string>();
    const uniqueChildren = children.filter((c) => {
      const ck = c.name.trim().toLowerCase();
      if (childSeen.has(ck)) return false;
      childSeen.add(ck);
      return true;
    });

    groups.push({ parent, children: uniqueChildren });
  }

  return groups;
}

export function AddTransactionSheet({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const reportingTimezone = useReportingTimezone();

  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    walletId: "",
    toWalletId: "",
    categoryId: "",
    description: "",
    transactionDate: todayISOInTimezone(reportingTimezone),
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

  const { data: typesData } = useQuery({
    queryKey: ["finance-transaction-types", "picker"],
    queryFn: () => financeApi.listTransactionTypes({ activeOnly: true, pageSize: 100 }),
    enabled: open,
  });

  const txnTypes = useMemo(() => {
    const items = (typesData?.items ?? [])
      .filter((t) => t.isActive && (!t.ownerOnly || canManage));
    return filterGeneralLedgerTxnTypes([...items]).sort(
      (a, b) => a.displayOrder - b.displayOrder || a.label.localeCompare(b.label),
    );
  }, [typesData, canManage]);

  const quickTypes = txnTypes.filter((t) => t.showInQuick);
  const moreTypes = txnTypes.filter((t) => !t.showInQuick);

  const effectiveTypeCode = txnTypes.some((t) => t.code === form.type)
    ? form.type
    : quickTypes[0]?.code ?? txnTypes[0]?.code ?? "expense";
  const selectedType: TransactionType | undefined = txnTypes.find((t) => t.code === effectiveTypeCode);
  const isTransfer = selectedType?.flow === "transfer";

  const wallets = walletsData?.wallets ?? [];
  const categories = categoriesData?.categories ?? [];
  const filteredCategories = filterCategoriesForGeneralLedger(
    categories,
    selectedType?.categoryKind ?? "any",
  );
  const categoryGroups = useMemo(
    () => buildCategoryGroups(filteredCategories),
    [filteredCategories],
  );

  const reset = () => {
    setForm({
      type: quickTypes[0]?.code ?? txnTypes[0]?.code ?? "expense",
      amount: "",
      walletId: "",
      toWalletId: "",
      categoryId: "",
      description: "",
      transactionDate: todayISOInTimezone(reportingTimezone),
    });
  };

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setForm((f) => ({ ...f, transactionDate: todayISOInTimezone(reportingTimezone) }));
    }
    onOpenChange(v);
    if (!v) reset();
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
        type: effectiveTypeCode,
        amount: parseFloat(form.amount),
        walletId: form.walletId,
        toWalletId: isTransfer ? form.toWalletId : undefined,
        categoryId: form.categoryId || undefined,
        description: form.description || undefined,
        transactionDate: form.transactionDate,
        currency: "IDR",
        tags: [],
      });
      toast.success("Transaksi berhasil dicatat");
      onCreated?.();
      onOpenChange(false);
      reset();
    } catch (e: unknown) {
      toast.error(toApiError(e).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Catat Transaksi</SheetTitle>
          <SheetDescription>
            Pemasukan, pengeluaran, dan transfer operasional. Beli/jual aset dan dividen dicatat di menu Investasi & Aset.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {quickTypes.map((t) => (
              <button
                key={t.code}
                type="button"
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  effectiveTypeCode === t.code
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                onClick={() => setForm((f) => ({ ...f, type: t.code, toWalletId: "", categoryId: "" }))}
              >
                {t.label}
              </button>
            ))}
            {moreTypes.length > 0 && (
              <Select
                value={moreTypes.some((t) => t.code === effectiveTypeCode) ? effectiveTypeCode : MORE_TYPE_NONE}
                onValueChange={(v) => {
                  if (v === MORE_TYPE_NONE) return;
                  setForm((f) => ({ ...f, type: v, categoryId: "" }));
                }}
              >
                <SelectTrigger className="h-8 w-auto rounded-full px-3 text-sm">
                  <SelectValue placeholder="Lainnya…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MORE_TYPE_NONE} className="text-muted-foreground">
                    Lainnya…
                  </SelectItem>
                  {moreTypes.map((t) => (
                    <SelectItem key={t.code} value={t.code}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

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

          <div>
            <Label>Dompet {isTransfer ? "Asal" : ""}</Label>
            <Select
              value={form.walletId || NO_WALLET}
              onValueChange={(v) => setForm((f) => ({ ...f, walletId: v === NO_WALLET ? "" : v }))}
            >
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

          {isTransfer && (
            <div>
              <Label>Dompet Tujuan</Label>
              <Select
                value={form.toWalletId || NO_WALLET}
                onValueChange={(v) => setForm((f) => ({ ...f, toWalletId: v === NO_WALLET ? "" : v }))}
              >
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

          {!isTransfer && (
            <div>
              <Label>Kategori (opsional)</Label>
              <Select
                value={form.categoryId || NO_CATEGORY}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, categoryId: v === NO_CATEGORY ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>— Tanpa kategori —</SelectItem>
                  {categoryGroups.map(({ parent, children }) => (
                    <SelectGroup key={parent.id}>
                      <SelectLabel>{parent.name}</SelectLabel>
                      {children.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Tanggal</Label>
            <DatePicker
              value={form.transactionDate}
              onChange={(transactionDate) => setForm((f) => ({ ...f, transactionDate }))}
            />
          </div>

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
          <Button className="flex-1" onClick={handleSubmit} disabled={loading || !selectedType}>
            {loading ? "Menyimpan..." : "Simpan Transaksi"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
