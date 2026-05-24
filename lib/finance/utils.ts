import type { QueryClient } from "@tanstack/react-query";

/** Radix Select forbids empty string as item value. */
export const NO_WALLET = "__no_wallet__";

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
