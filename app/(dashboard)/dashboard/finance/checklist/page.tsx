"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FinanceSubPageHeader } from "@/components/finance/finance-sub-page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { financeApi, formatIDR, type ChecklistTemplate } from "@/lib/api/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { formatFinanceDate, invalidateFinanceCaches } from "@/lib/finance/utils";
import { useReportingTimezone } from "@/hooks/use-reporting-timezone";
import { toApiError } from "@/lib/api/client";

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function defaultDueAnchorDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDueLabel(isoDate: string, tz: string): string {
  return formatFinanceDate(isoDate, tz);
}

const emptyForm = {
  title: "",
  amountHint: "",
  dueDate: defaultDueAnchorDate(),
  categoryId: "",
  walletId: "",
  description: "",
};

export default function ChecklistPage() {
  const { user } = useAuth();
  const isOwner = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const reportingTimezone = useReportingTimezone();

  const [tab, setTab] = useState<"billing" | "templates">("billing");
  const [period, setPeriod] = useState(currentPeriod);

  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [openCreate, setOpenCreate] = useState(false);
  const [editItem, setEditItem] = useState<ChecklistTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);

  const periodLabel = useMemo(() => {
    const [y, m] = period.split("-").map(Number);
    if (!y || !m) return period;
    return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  }, [period]);

  const { data: billing, isLoading: billingLoading } = useQuery({
    queryKey: ["finance-monthly-billing", period],
    queryFn: () => financeApi.getMonthlyBilling(period),
  });

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ["finance-checklist-templates-manage", search, page],
    queryFn: () =>
      financeApi.listChecklistTemplatesPaginated({
        q: search || undefined,
        page,
        pageSize,
        frequency: "monthly",
        activeOnly: false,
      }),
    enabled: tab === "templates" && isOwner,
  });

  const { data: wallets } = useQuery({
    queryKey: ["finance-wallets"],
    queryFn: () => financeApi.listWallets(),
    enabled: isOwner && (openCreate || !!editItem),
  });

  const { data: categories } = useQuery({
    queryKey: ["finance-categories"],
    queryFn: () => financeApi.listCategories(),
    enabled: isOwner && (openCreate || !!editItem),
  });

  const expenseCategories = useMemo(
    () =>
      (categories?.categories ?? []).filter(
        (c) => c.type === "expense" || c.type === "any"
      ),
    [categories]
  );

  const toggleMut = useMutation({
    mutationFn: ({ itemId, checked }: { itemId: string; checked: boolean }) =>
      financeApi.toggleMonthlyBillingItem(itemId, checked),
    onSuccess: (res, { checked }) => {
      qc.setQueryData(["finance-monthly-billing", period], res.billing);
      invalidateFinanceCaches(qc);
      if (!checked && res.item.transactionId == null) {
        toast.success("Centang dibatalkan — transaksi terkait dihapus");
      } else if (checked && res.item.transactionId) {
        toast.success("Tagihan dicatat sebagai transaksi pengeluaran");
      } else if (checked) {
        toast.warning("Tagihan dicentang, tetapi transaksi belum tercatat — cek nominal atau periode terkunci");
      }
    },
    onError: (e: unknown) => toast.error(toApiError(e).message),
  });

  const saveTemplateMut = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title.trim(),
        frequency: "monthly" as const,
        amountHint: parseFloat(form.amountHint),
        dueDate: form.dueDate,
        categoryId: form.categoryId || undefined,
        walletId: form.walletId || undefined,
        description: form.description.trim() || undefined,
      };
      if (editItem) {
        return financeApi.updateChecklistTemplate(editItem.id, payload);
      }
      return financeApi.createChecklistTemplate(payload);
    },
    onSuccess: async () => {
      toast.success(editItem ? "Tagihan diperbarui" : "Tagihan ditambahkan");
      setOpenCreate(false);
      setEditItem(null);
      setForm(emptyForm);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["finance-monthly-billing", period] }),
        qc.invalidateQueries({ queryKey: ["finance-checklist-templates-manage"] }),
      ]);
    },
    onError: (e: unknown) => toast.error(toApiError(e).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => financeApi.deleteChecklistTemplate(id),
    onSuccess: () => {
      toast.success("Tagihan dihapus");
      qc.invalidateQueries({ queryKey: ["finance-checklist-templates-manage"] });
      qc.invalidateQueries({ queryKey: ["finance-monthly-billing", period] });
    },
    onError: (e: unknown) => toast.error(toApiError(e).message),
  });

  const openEdit = (t: ChecklistTemplate) => {
    setEditItem(t);
    setForm({
      title: t.title,
      amountHint: t.amountHint ?? "",
      dueDate: t.dueAnchorDate ?? defaultDueAnchorDate(),
      categoryId: t.categoryId ?? "",
      walletId: t.walletId ?? "",
      description: t.description ?? "",
    });
  };

  const items = billing?.items ?? [];
  const progress =
    billing && billing.total > 0
      ? Math.round((billing.checked / billing.total) * 100)
      : 0;

  const totalPages = Math.max(1, Math.ceil((templatesData?.total ?? 0) / pageSize));

  const templateForm = (
    <div className="space-y-3">
      <div>
        <Label>Judul tagihan</Label>
        <Input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="mis. Listrik, Internet, Sewa"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Nominal (Rp)</Label>
          <Input
            type="number"
            min={1}
            value={form.amountHint}
            onChange={(e) => setForm((f) => ({ ...f, amountHint: e.target.value }))}
          />
        </div>
        <div>
          <Label>Tanggal jatuh tempo</Label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Hari dalam tanggal ini dipakai setiap bulan (mis. tgl 28 → setiap bulan tgl 28).
          </p>
        </div>
      </div>
      <div>
        <Label>Dompet (opsional)</Label>
        <Select
          value={form.walletId || "__none__"}
          onValueChange={(v) => setForm((f) => ({ ...f, walletId: v === "__none__" ? "" : v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Default (kas utama)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Default (kas utama)</SelectItem>
            {(wallets?.wallets ?? []).map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Kategori (opsional)</Label>
        <Select
          value={form.categoryId || "__none__"}
          onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v === "__none__" ? "" : v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tanpa kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Tanpa kategori</SelectItem>
            {expenseCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Catatan (opsional)</Label>
        <Input
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
    </div>
  );

  return (
    <>
      <FinanceSubPageHeader
        title="Tagihan Bulanan"
        description="Centang tagihan yang sudah dibayar — setiap centang langsung dicatat sebagai pengeluaran di Transaksi."
        actions={
          isOwner ? (
            <Button
              onClick={() => {
                setEditItem(null);
                setForm(emptyForm);
                setOpenCreate(true);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Tagihan
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button
          variant={tab === "billing" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("billing")}
        >
          Checklist {periodLabel}
        </Button>
        {isOwner && (
          <Button
            variant={tab === "templates" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("templates")}
          >
            Kelola Daftar Tagihan
          </Button>
        )}
      </div>

      {tab === "billing" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Periode</Label>
              <Input
                type="month"
                className="w-[180px]"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>
            {billing && billing.total > 0 && (
              <div className="flex-1 min-w-[200px]">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>
                    {billing.checked}/{billing.total} dibayar
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {billing?.allPosted && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="text-green-800 dark:text-green-200">
                  Semua tagihan bulan ini sudah dicatat sebagai transaksi pengeluaran.
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/finance/transactions">
                    Lihat Transaksi <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {billingLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Belum ada tagihan bulanan untuk periode ini.
                {isOwner ? " Tambahkan di tab Kelola Daftar Tagihan." : ""}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const checked = item.status === "done";
                const posted = !!item.transactionId;
                return (
                  <Card
                    key={item.id}
                    className={cn(posted && "border-green-200/60")}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <button
                        type="button"
                        disabled={toggleMut.isPending}
                        className="shrink-0 disabled:opacity-50"
                        onClick={() =>
                          toggleMut.mutate({ itemId: item.id, checked: !checked })
                        }
                        aria-label={checked ? "Batalkan centang" : "Tandai sudah dibayar"}
                      >
                        {checked ? (
                          <CheckCircle2 className="h-7 w-7 text-green-600" />
                        ) : (
                          <Circle className="h-7 w-7 text-muted-foreground" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={cn("font-medium", checked && "text-foreground")}>
                          {item.templateTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Jatuh tempo {formatDueLabel(item.dueDate, reportingTimezone)}
                          {item.amountHint ? ` · ${formatIDR(item.amountHint)}` : ""}
                        </p>
                      </div>
                      {posted && (
                        <Badge variant="secondary" className="shrink-0">
                          Tercatat
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {billing && billing.total > 0 && !billing.allPosted && billing.checked === billing.total && (
            <p className="text-xs text-muted-foreground">
              Semua tercentang — transaksi akan dibuat otomatis (refresh jika belum muncul).
            </p>
          )}
        </>
      )}

      {tab === "templates" && isOwner && (
        <>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(q);
              setPage(1);
            }}
          >
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Cari tagihan..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">
              Cari
            </Button>
          </form>

          {templatesLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : (templatesData?.items?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Belum ada daftar tagihan. Tambahkan tagihan tetap (listrik, sewa, dll.).
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-2">
                {templatesData!.items.map((t) => (
                  <Card key={t.id} className={cn(!t.isActive && "opacity-50")}>
                    <CardContent className="flex items-center justify-between gap-2 p-4">
                      <div>
                        <p className="font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Jatuh tempo{" "}
                          {t.dueAnchorDate
                            ? formatDueLabel(t.dueAnchorDate, reportingTimezone)
                            : `setiap tgl ${t.dayOfMonth ?? 1}`}
                          {t.amountHint ? ` · ${formatIDR(t.amountHint)}` : ""}
                          {!t.isActive ? " · Nonaktif" : ""}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteMut.mutate(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      <Dialog
        open={openCreate || !!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setOpenCreate(false);
            setEditItem(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Tagihan" : "Tambah Tagihan Bulanan"}</DialogTitle>
            <DialogDescription>
              Tagihan ini muncul di checklist setiap bulan pada tanggal jatuh tempo.
            </DialogDescription>
          </DialogHeader>
          {templateForm}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpenCreate(false);
                setEditItem(null);
              }}
            >
              Batal
            </Button>
            <Button
              onClick={() => saveTemplateMut.mutate()}
              disabled={
                !form.title.trim() ||
                !form.amountHint ||
                saveTemplateMut.isPending
              }
            >
              {saveTemplateMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
