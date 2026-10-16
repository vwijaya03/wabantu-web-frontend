"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FinanceSubPageHeader } from "@/components/finance/finance-sub-page-header";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { financeApi, formatIDR, type Budget } from "@/lib/api/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { toApiError } from "@/lib/api/client";
import { currentFinancePeriod, financeMonthOptions } from "@/lib/finance/utils";
import { useReportingTimezone } from "@/hooks/use-reporting-timezone";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { tenantQueryKey } from "@/lib/query/tenant-query-key";
import { useLocale } from "@/lib/i18n/locale";

const NO_CATEGORY = "__no_category__";

export default function BudgetPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const tenantKey = useTenantKey();
  const isOwner = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const reportingTimezone = useReportingTimezone();
  const currentPeriod = currentFinancePeriod(reportingTimezone);
  const monthOptions = financeMonthOptions(reportingTimezone, 12);

  const [period, setPeriod] = useState("");
  const effectivePeriod = period || currentPeriod;
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ categoryId: "", amount: "" });

  const { data: budgetData, isLoading } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "finance-budgets", effectivePeriod),
    queryFn: ({ signal }) => financeApi.listBudgets(effectivePeriod, signal),
  });

  const { data: categories } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "finance-categories"),
    queryFn: ({ signal }) => financeApi.listCategories(signal),
  });

  const { data: summary } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "finance-budget-summary", effectivePeriod),
    queryFn: ({ signal }) => financeApi.budgetSummary(effectivePeriod, signal),
  });

  const upsertMut = useMutation({
    mutationFn: () =>
      financeApi.upsertBudget({
        categoryId: form.categoryId,
        period: effectivePeriod,
        amount: parseFloat(form.amount),
      }),
    onSuccess: () => {
      toast.success(t("Anggaran disimpan"));
      qc.invalidateQueries({ queryKey: ["finance-budgets"] });
      qc.invalidateQueries({ queryKey: ["finance-budget-summary"] });
      setOpenCreate(false);
      setForm({ categoryId: "", amount: "" });
    },
    onError: (e: unknown) => toast.error(toApiError(e).message ?? t("Gagal menyimpan")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => financeApi.deleteBudget(id),
    onSuccess: () => {
      toast.success(t("Anggaran dihapus"));
      qc.invalidateQueries({ queryKey: ["finance-budgets"] });
    },
  });

  const expenseCategories = categories?.categories.filter((c) =>
    c.type === "expense" || c.type === "any"
  ) ?? [];

  const budgets = budgetData?.budgets ?? [];

  return (
    <>
      <FinanceSubPageHeader
        title={t("Anggaran")}
        description={t("Tetapkan batas pengeluaran per kategori.")}
        actions={
          isOwner ? (
            <Button onClick={() => setOpenCreate(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> {t("Tambah Anggaran")}
            </Button>
          ) : null
        }
      />

      {/* Period selector */}
      <Select value={effectivePeriod} onValueChange={setPeriod}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Summary banner */}
      {summary && (summary.overBudget.length > 0 || summary.warnBudget.length > 0) && (
        <div className="space-y-2">
          {summary.overBudget.length > 0 && (
            <Card className="border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
              <CardContent className="p-4 text-sm text-red-700 dark:text-red-400">
                {t("🔴 Melebihi anggaran: {categories}", { categories: summary.overBudget.join(", ") })}
              </CardContent>
            </Card>
          )}
          {summary.warnBudget.length > 0 && (
            <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
              <CardContent className="p-4 text-sm text-amber-700 dark:text-amber-400">
                {t("⚠️ Hampir habis: {categories}", { categories: summary.warnBudget.join(", ") })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Summary totals */}
      {summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t("Total Anggaran")}</p>
              <p className="mt-1 text-xl font-bold">{formatIDR(summary.totalBudget)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t("Sudah Terpakai")}</p>
              <p className="mt-1 text-xl font-bold text-red-600">{formatIDR(summary.totalSpent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t("Sisa Anggaran")}</p>
              <p className="mt-1 text-xl font-bold text-green-600">
                {formatIDR(parseFloat(summary.totalBudget) - parseFloat(summary.totalSpent))}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("Memuat...")}</p>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t("Belum ada anggaran untuk periode ini.")}
            {isOwner ? t(" Klik 'Tambah Anggaran' untuk mulai.") : ""}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => (
            <BudgetRow key={b.id} budget={b} isOwner={isOwner} onDelete={() => deleteMut.mutate(b.id)} />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Tambah / Ubah Anggaran")}</DialogTitle>
            <DialogDescription>{t("Atur batas pengeluaran per kategori untuk periode yang dipilih.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("Kategori")}</Label>
              <Select
                value={form.categoryId || NO_CATEGORY}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, categoryId: v === NO_CATEGORY ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("Pilih kategori")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY} disabled>
                    {t("Pilih kategori")}
                  </SelectItem>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("Batas Anggaran (Rp)")}</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="1000000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>{t("Batal")}</Button>
            <Button
              onClick={() => upsertMut.mutate()}
              disabled={!form.categoryId || !form.amount || upsertMut.isPending}
            >
              {upsertMut.isPending ? t("Menyimpan...") : t("Simpan")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BudgetRow({ budget, isOwner, onDelete }: { budget: Budget; isOwner: boolean; onDelete: () => void }) {
  const { t } = useLocale();
  const progressColor =
    budget.status === "over" ? "bg-red-500" : budget.status === "warn" ? "bg-amber-500" : "bg-primary";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium">{budget.categoryName}</p>
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                budget.status === "over" && "text-red-600",
                budget.status === "warn" && "text-amber-600",
              )}
            >
              {budget.pct}%
            </p>
            {isOwner && (
              <Button variant="ghost" size="sm" className="h-6 text-muted-foreground" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", progressColor)}
            style={{ width: `${Math.min(budget.pct, 100)}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>{t("Terpakai {amount}", { amount: formatIDR(budget.spent) })}</span>
          <span>
            {budget.status === "over" ? (
              <span className="text-red-600">
                {t("Melebihi {amount}", { amount: formatIDR(Math.abs(parseFloat(budget.remaining))) })}
              </span>
            ) : (
              <>
                {t("Sisa {remaining} dari {total}", {
                  remaining: formatIDR(budget.remaining),
                  total: formatIDR(budget.amount),
                })}
              </>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
