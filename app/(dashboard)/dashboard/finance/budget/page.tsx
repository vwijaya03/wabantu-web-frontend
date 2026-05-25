"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
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

const NO_CATEGORY = "__no_category__";

export default function BudgetPage() {
  const { user } = useAuth();
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
    queryKey: ["finance-budgets", effectivePeriod],
    queryFn: () => financeApi.listBudgets(effectivePeriod),
  });

  const { data: categories } = useQuery({
    queryKey: ["finance-categories"],
    queryFn: () => financeApi.listCategories(),
  });

  const { data: summary } = useQuery({
    queryKey: ["finance-budget-summary", effectivePeriod],
    queryFn: () => financeApi.budgetSummary(effectivePeriod),
  });

  const upsertMut = useMutation({
    mutationFn: () =>
      financeApi.upsertBudget({
        categoryId: form.categoryId,
        period: effectivePeriod,
        amount: parseFloat(form.amount),
      }),
    onSuccess: () => {
      toast.success("Anggaran disimpan");
      qc.invalidateQueries({ queryKey: ["finance-budgets"] });
      qc.invalidateQueries({ queryKey: ["finance-budget-summary"] });
      setOpenCreate(false);
      setForm({ categoryId: "", amount: "" });
    },
    onError: (e: unknown) => toast.error(toApiError(e).message ?? "Gagal menyimpan"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => financeApi.deleteBudget(id),
    onSuccess: () => {
      toast.success("Anggaran dihapus");
      qc.invalidateQueries({ queryKey: ["finance-budgets"] });
    },
  });

  const expenseCategories = categories?.categories.filter((c) =>
    c.type === "expense" || c.type === "any"
  ) ?? [];

  const budgets = budgetData?.budgets ?? [];

  return (
    <>
      <PageHeader
        title="Anggaran"
        description="Tetapkan batas pengeluaran per kategori."
        actions={
          isOwner ? (
            <Button onClick={() => setOpenCreate(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Anggaran
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
                🔴 Melebihi anggaran: <strong>{summary.overBudget.join(", ")}</strong>
              </CardContent>
            </Card>
          )}
          {summary.warnBudget.length > 0 && (
            <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
              <CardContent className="p-4 text-sm text-amber-700 dark:text-amber-400">
                ⚠️ Hampir habis: <strong>{summary.warnBudget.join(", ")}</strong>
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
              <p className="text-xs text-muted-foreground">Total Anggaran</p>
              <p className="mt-1 text-xl font-bold">{formatIDR(summary.totalBudget)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Sudah Terpakai</p>
              <p className="mt-1 text-xl font-bold text-red-600">{formatIDR(summary.totalSpent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Sisa Anggaran</p>
              <p className="mt-1 text-xl font-bold text-green-600">
                {formatIDR(parseFloat(summary.totalBudget) - parseFloat(summary.totalSpent))}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada anggaran untuk periode ini.
            {isOwner ? " Klik 'Tambah Anggaran' untuk mulai." : ""}
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
            <DialogTitle>Tambah / Ubah Anggaran</DialogTitle>
            <DialogDescription>Atur batas pengeluaran per kategori untuk periode yang dipilih.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Kategori</Label>
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
                  <SelectItem value={NO_CATEGORY} disabled>
                    Pilih kategori
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
              <Label>Batas Anggaran (Rp)</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="1000000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
            <Button
              onClick={() => upsertMut.mutate()}
              disabled={!form.categoryId || !form.amount || upsertMut.isPending}
            >
              {upsertMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BudgetRow({ budget, isOwner, onDelete }: { budget: Budget; isOwner: boolean; onDelete: () => void }) {
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
          <span>Terpakai {formatIDR(budget.spent)}</span>
          <span>
            {budget.status === "over" ? (
              <span className="text-red-600">Melebihi {formatIDR(Math.abs(parseFloat(budget.remaining)))}</span>
            ) : (
              <>Sisa {formatIDR(budget.remaining)} dari {formatIDR(budget.amount)}</>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
