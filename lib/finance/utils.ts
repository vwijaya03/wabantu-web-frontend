import type { QueryClient } from "@tanstack/react-query";
import type { Category } from "@/lib/api/finance";
import { DEFAULT_REPORTING_TIMEZONE_UI } from "@/lib/reporting-timezones";

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
function datePartsInTimezone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    year: parts.find((p) => p.type === "year")?.value ?? "1970",
    month: parts.find((p) => p.type === "month")?.value ?? "01",
    day: parts.find((p) => p.type === "day")?.value ?? "01",
  };
}

export function todayISOInTimezone(timeZone = DEFAULT_REPORTING_TIMEZONE_UI): string {
  try {
    const p = datePartsInTimezone(new Date(), timeZone);
    return `${p.year}-${p.month}-${p.day}`;
  } catch {
    const p = datePartsInTimezone(new Date(), DEFAULT_REPORTING_TIMEZONE_UI);
    return `${p.year}-${p.month}-${p.day}`;
  }
}

/** Current calendar month in selected reporting timezone (YYYY-MM). */
export function currentFinancePeriod(timeZone = DEFAULT_REPORTING_TIMEZONE_UI): string {
  return todayISOInTimezone(timeZone).slice(0, 7);
}

export function financeMonthOptions(
  timeZone = DEFAULT_REPORTING_TIMEZONE_UI,
  count = 24,
): Array<{ value: string; label: string }> {
  const today = todayISOInTimezone(timeZone);
  const [year, month] = today.split("-").map(Number);
  const base = new Date(Date.UTC(year, month - 1, 1, 12));

  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base);
    d.setUTCMonth(base.getUTCMonth() - i);
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return {
      value,
      label: new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(d),
    };
  });
}

export function formatFinanceDate(
  value: string | null | undefined,
  timeZone = DEFAULT_REPORTING_TIMEZONE_UI,
): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "—";

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const date = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12))
    : new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: dateOnly ? "UTC" : timeZone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: dateOnly ? "UTC" : DEFAULT_REPORTING_TIMEZONE_UI,
    }).format(date);
  }
}

export function formatFinanceDateTime(
  value: string | null | undefined,
  timeZone = DEFAULT_REPORTING_TIMEZONE_UI,
): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "—";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: DEFAULT_REPORTING_TIMEZONE_UI,
    }).format(date);
  }
}

/** Invalidate tenant-scoped React Query caches after finance mutations. */
export function invalidateFinanceCaches(qc: QueryClient, tenantKey: string) {
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
    void qc.invalidateQueries({ queryKey: [key, tenantKey] });
  }
}
