import type { QueryClient } from "@tanstack/react-query";
import type { Category } from "@/lib/api/finance";

/** Radix Select forbids empty string as item value. */
export const NO_WALLET = "__no_wallet__";

/** Catat lewat menu Investasi & Aset — bukan sheet Catat Transaksi. */
export const INVESTMENT_ONLY_TXN_CODES = new Set([
  "investment_buy",
  "investment_sell",
  "dividend",
]);

export function filterGeneralLedgerTxnTypes<T extends { code: string }>(types: T[]): T[] {
  return types.filter((t) => !INVESTMENT_ONLY_TXN_CODES.has(t.code));
}

/** Kategori untuk Catat Transaksi — tanpa grup investasi (beli/jual/dividen pakai menu Investasi). */
export function filterCategoriesForGeneralLedger(categories: Category[], categoryKind: string) {
  switch (categoryKind) {
    case "income":
      return categories.filter((c) => c.type === "income");
    case "expense":
      return categories.filter((c) => c.type === "expense" || c.type === "any");
    case "any":
      return categories.filter((c) => c.type !== "investment");
    default:
      return categories.filter((c) => c.type !== "investment");
  }
}

/** Current calendar month in local timezone (YYYY-MM). */
export function currentFinancePeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Invalidate React Query caches after finance mutations. */
export function invalidateFinanceCaches(qc: QueryClient) {
  const keys = [
    "finance-dashboard",
    "finance-wallets",
    "finance-transactions",
    "finance-transactions-recent",
    "finance-budgets",
    "finance-budget-summary",
    "finance-checklist-today",
    "finance-transaction-types",
    "finance-recurring",
    "finance-investment",
    "finance-portfolio",
    "finance-report-jobs",
  ];
  for (const key of keys) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}
