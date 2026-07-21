import { api } from "./client";
import { apiGetConfig } from "./read-options";

// ---- SHARED TYPES ----

export interface Wallet {
  id: string;
  name: string;
  type: "cash" | "bank" | "ewallet" | "crypto" | "investment" | "other";
  institution?: string;
  accountNoMask?: string;
  currency: string;
  initialBalance: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  visibility: "all" | "owner";
  displayOrder: number;
  balance: string;
  createdAt: string;
}

export type CreateWalletInput = {
  name?: string;
  type?: Wallet["type"];
  institution?: string;
  accountNoMask?: string;
  currency?: string;
  initialBalance: number;
  color?: string;
  icon?: string;
  visibility?: Wallet["visibility"];
  displayOrder?: number;
};

export type UpdateWalletInput = Partial<Omit<CreateWalletInput, "initialBalance">>;

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense" | "investment" | "any";
  parentId?: string;
  icon?: string;
  color?: string;
  isSystem: boolean;
  displayOrder: number;
}

export interface TransactionType {
  id: string;
  code: string;
  label: string;
  flow: "income" | "expense" | "transfer" | "adjustment";
  categoryKind: "income" | "expense" | "investment" | "any";
  showInQuick: boolean;
  displayOrder: number;
  isSystem: boolean;
  ownerOnly: boolean;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  type: string;
  amount: string;
  currency: string;
  walletId: string;
  walletName: string;
  toWalletId?: string;
  toWalletName?: string;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  notes?: string;
  referenceNo?: string;
  transactionDate: string;
  status: "approved" | "pending_approval" | "rejected" | "draft";
  tags: string[];
  attachmentUrls: string[];
  assetId?: string;
  assetName?: string;
  assetTicker?: string;
  assetQty?: string;
  assetPricePerUnit?: string;
  createdBy: string;
  createdAt: string;
}

export type CreateTransactionInput = {
  type: string;
  amount: number;
  currency?: string;
  walletId: string;
  toWalletId?: string;
  categoryId?: string;
  description?: string;
  notes?: string;
  referenceNo?: string;
  transactionDate: string;
  tags?: string[];
};

export interface DashboardSummary {
  period: string;
  totalIncome: string;
  totalExpense: string;
  netBalance: string;
  totalWallets: string;
  pendingCount: number;
  wallets: WalletSnap[];
}

export interface WalletSnap {
  id: string;
  name: string;
  type: string;
  balance: string;
  currency: string;
  color?: string;
  icon?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  categoryName: string;
  period: string;
  amount: string;
  spent: string;
  remaining: string;
  pct: number;
  status: "ok" | "warn" | "over";
}

export interface BudgetSummary {
  period: string;
  totalBudget: string;
  totalSpent: string;
  overBudget: string[];
  warnBudget: string[];
}

export interface CategorySpendingItem {
  categoryId: string;
  categoryName: string;
  total: string;
  txnCount: number;
}

export interface MonthlyComparisonItem {
  period: string;
  income: string;
  expense: string;
  net: string;
}

export interface AssetWithPortfolio {
  id: string;
  name: string;
  ticker?: string;
  type: string;
  unitName: string;
  unitMultiplier: string;
  priceUnitName: string;
  walletId: string;
  notes?: string;
  isActive: boolean;
  qtyHeld: string;
  qtyHeldBase: string;
  avgBuyPrice: string;
  totalCost: string;
  latestPrice?: string;
  currentValue?: string;
  unrealizedPnl?: string;
  unrealizedPct?: string;
  totalDividend: string;
}

export interface PortfolioSummary {
  totalCost: string;
  currentValue: string;
  unrealizedPnl: string;
  unrealizedPct: string;
  totalDividend: string;
  total: number;
  page: number;
  pageSize: number;
  assets: AssetWithPortfolio[];
}

export interface Recurring {
  id: string;
  title: string;
  type: string;
  amount: string;
  walletId: string;
  toWalletId?: string;
  categoryId?: string;
  description?: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  frequencyValue: number;
  dayOfMonth?: number;
  mode: "auto" | "reminder";
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
  occurrencesDone: number;
  nextRunDate: string;
  isActive: boolean;
}

export type CreateRecurringInput = {
  title: string;
  type: string;
  amount: number;
  walletId: string;
  toWalletId?: string;
  categoryId?: string;
  description?: string;
  frequency: Recurring["frequency"];
  frequencyValue?: number;
  dayOfMonth?: number;
  mode: Recurring["mode"];
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
};

export interface ChecklistTemplate {
  id: string;
  title: string;
  description?: string;
  amountHint?: string;
  categoryId?: string;
  walletId?: string;
  frequency: string;
  dayOfMonth?: number;
  dueAnchorDate?: string;
  isActive: boolean;
  order: number;
}

export type CreateChecklistTemplateInput = {
  title?: string;
  description?: string;
  amountHint?: number;
  categoryId?: string;
  walletId?: string;
  frequency?: string;
  dayOfMonth?: number;
  dueDate?: string;
  order?: number;
};

export type UpdateChecklistTemplateInput = {
  title?: string;
  description?: string;
  amountHint?: number;
  categoryId?: string;
  walletId?: string;
  frequency?: string;
  dayOfMonth?: number;
  dueDate?: string;
  order?: number;
  isActive?: boolean;
};

export interface MonthlyBillingResponse {
  period: string;
  items: ChecklistItem[];
  total: number;
  checked: number;
  allChecked: boolean;
  allPosted: boolean;
  postedCount: number;
}

export interface ToggleMonthlyBillingResponse {
  item: ChecklistItem;
  billing: MonthlyBillingResponse;
}

export interface ChecklistItem {
  id: string;
  templateId: string;
  templateTitle: string;
  dueDate: string;
  status: "pending" | "done" | "skipped";
  transactionId?: string;
  completedBy?: string;
  completedAt?: string;
  notes?: string;
  amountHint?: string;
  categoryId?: string;
  walletId?: string;
}

export interface ReportJob {
  id: string;
  type: string;
  format?: "pdf" | "csv" | string;
  status: "queued" | "processing" | "done" | "failed";
  downloadUrl?: string;
  errorMsg?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ApprovalSetting {
  enabled: boolean;
  amountThreshold?: number;
  requireForTypes: string[];
}

export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorRole: string;
  beforeData?: unknown;
  afterData?: unknown;
  createdAt: string;
}

// ---- API CLIENT ----

export const financeApi = {
  // Dashboard
  dashboard: (period?: string, signal?: AbortSignal) =>
    api
      .get<DashboardSummary>("/finance/dashboard", apiGetConfig(period ? { period } : undefined, signal))
      .then((r) => r.data),

  // Wallets
  listWallets: (signal?: AbortSignal) =>
    api.get<{ wallets: Wallet[] }>("/finance/wallets", apiGetConfig(undefined, signal)).then((r) => r.data),
  createWallet: (d: CreateWalletInput) =>
    api.post<Wallet>("/finance/wallets", d).then((r) => r.data),
  updateWallet: (id: string, d: UpdateWalletInput) =>
    api.put<Wallet>(`/finance/wallets/${id}`, d).then((r) => r.data),
  deleteWallet: (id: string) =>
    api.delete<{ ok: boolean }>(`/finance/wallets/${id}`).then((r) => r.data),

  // Categories
  listCategories: (signal?: AbortSignal) =>
    api
      .get<{ categories: Category[] }>("/finance/categories", apiGetConfig(undefined, signal))
      .then((r) => r.data),
  createCategory: (d: Partial<Category>) =>
    api.post<Category>("/finance/categories", d).then((r) => r.data),
  deleteCategory: (id: string) =>
    api.delete<{ ok: boolean }>(`/finance/categories/${id}`).then((r) => r.data),

  // Transaction types
  listTransactionTypes: (
    params?: {
      q?: string;
      page?: number;
      pageSize?: number;
      activeOnly?: boolean;
    },
    signal?: AbortSignal,
  ) =>
    api
      .get<{ items: TransactionType[]; total: number }>("/finance/transaction-types", apiGetConfig(params, signal))
      .then((r) => r.data),
  createTransactionType: (d: {
    code: string;
    label: string;
    flow: TransactionType["flow"];
    categoryKind?: TransactionType["categoryKind"];
    showInQuick?: boolean;
    displayOrder?: number;
  }) => api.post<TransactionType>("/finance/transaction-types", d).then((r) => r.data),
  updateTransactionType: (
    id: string,
    d: Partial<{
      label: string;
      flow: TransactionType["flow"];
      categoryKind: TransactionType["categoryKind"];
      showInQuick: boolean;
      displayOrder: number;
      isActive: boolean;
    }>,
  ) => api.put<TransactionType>(`/finance/transaction-types/${id}`, d).then((r) => r.data),
  deleteTransactionType: (id: string) =>
    api.delete<{ ok: boolean }>(`/finance/transaction-types/${id}`).then((r) => r.data),

  // Transactions
  listTransactions: (params?: Record<string, string | number | undefined>, signal?: AbortSignal) =>
    api
      .get<{ items: Transaction[]; total: number }>("/finance/transactions", apiGetConfig(params, signal))
      .then((r) => r.data),
  createTransaction: (d: CreateTransactionInput) =>
    api.post<Transaction>("/finance/transactions", d).then((r) => r.data),
  updateTransaction: (id: string, d: Partial<Transaction>) =>
    api.put<Transaction>(`/finance/transactions/${id}`, d).then((r) => r.data),
  deleteTransaction: (id: string) =>
    api.delete<{ ok: boolean }>(`/finance/transactions/${id}`).then((r) => r.data),
  duplicateTransactions: (ids: string[], targetDate: string) =>
    api.post<{ count: number }>("/finance/transactions/duplicate", { transactionIds: ids, targetDate }).then((r) => r.data),

  // Approval
  approveTransaction: (id: string, action: "approve" | "reject", reason?: string) =>
    api.post<Transaction>("/finance/transactions/approve", { id, action, reason }).then((r) => r.data),
  getApprovalSetting: (signal?: AbortSignal) =>
    api.get<ApprovalSetting>("/finance/approval-setting", apiGetConfig(undefined, signal)).then((r) => r.data),
  updateApprovalSetting: (d: ApprovalSetting) =>
    api.put<ApprovalSetting>("/finance/approval-setting", d).then((r) => r.data),

  // Period lock
  lockPeriod: (period: string, note?: string) =>
    api.post<{ ok: boolean }>("/finance/period-lock", { period, note }).then((r) => r.data),
  listLockedPeriods: (signal?: AbortSignal) =>
    api.get<{ periods: string[] }>("/finance/locked-periods", apiGetConfig(undefined, signal)).then((r) => r.data),

  // Budgets
  listBudgets: (period?: string, signal?: AbortSignal) =>
    api
      .get<{ budgets: Budget[]; period: string }>("/finance/budgets", apiGetConfig(period ? { period } : undefined, signal))
      .then((r) => r.data),
  upsertBudget: (d: { categoryId: string; period: string; amount: number }) =>
    api.post<Budget>("/finance/budgets", d).then((r) => r.data),
  deleteBudget: (id: string) =>
    api.delete<{ ok: boolean }>(`/finance/budgets/${id}`).then((r) => r.data),
  budgetSummary: (period?: string, signal?: AbortSignal) =>
    api
      .get<BudgetSummary>("/finance/budgets/summary", apiGetConfig(period ? { period } : undefined, signal))
      .then((r) => r.data),
  categorySpending: (period?: string, signal?: AbortSignal) =>
    api
      .get<{ items: CategorySpendingItem[]; period: string }>(
        "/finance/reports/category-spending",
        apiGetConfig(period ? { period } : undefined, signal),
      )
      .then((r) => r.data),
  monthlyComparison: (months?: number, signal?: AbortSignal) =>
    api
      .get<{ items: MonthlyComparisonItem[] }>(
        "/finance/reports/monthly-comparison",
        apiGetConfig(months ? { months } : undefined, signal),
      )
      .then((r) => r.data),

  // Investment
  portfolio: (params?: { search?: string; page?: number; pageSize?: number }, signal?: AbortSignal) =>
    api.get<PortfolioSummary>("/finance/investments/portfolio", apiGetConfig(params, signal)).then((r) => r.data),
  createAsset: (d: { name: string; ticker?: string; type: string; unitName: string; walletId: string; notes?: string }) =>
    api.post<AssetWithPortfolio>("/finance/investments/assets", d).then((r) => r.data),
  updateAsset: (
    id: string,
    d: {
      name?: string;
      ticker?: string;
      type?: string;
      unitName?: string;
      walletId?: string;
      notes?: string;
    }
  ) => api.put(`/finance/investments/assets/${id}`, d).then((r) => r.data),
  deleteAsset: (id: string) =>
    api.delete<{ ok: boolean }>(`/finance/investments/assets/${id}`).then((r) => r.data),
  updateAssetPrice: (assetId: string, price: number) =>
    api.post("/finance/investments/prices", { assetId, price }).then((r) => r.data),
  recordAssetTrade: (
    assetId: string,
    d: {
      side: "buy" | "sell";
      quantity: number;
      pricePerUnit: number;
      fee?: number;
      feePercent?: number;
      transactionDate?: string;
      description?: string;
    }
  ) =>
    api
      .post<{ transactionId: string; qtyHeld: string; amount: string; status: string }>(
        `/finance/investments/assets/${assetId}/trades`,
        d
      )
      .then((r) => r.data),
  recordAssetDividend: (
    assetId: string,
    d: { amount: number; transactionDate?: string; description?: string }
  ) =>
    api
      .post<{ transactionId: string; amount: string; status: string }>(
        `/finance/investments/assets/${assetId}/dividends`,
        d
      )
      .then((r) => r.data),
  listAssetTrades: (assetId: string, signal?: AbortSignal) =>
    api
      .get<{
        items: {
          id: string;
          type: string;
          quantity: string;
          pricePerUnit: string;
          fee: string;
          amount: string;
          transactionDate: string;
          description?: string;
          status: string;
        }[];
      }>(`/finance/investments/assets/${assetId}/trades`, apiGetConfig(undefined, signal))
      .then((r) => r.data),
  deleteAssetTrade: (assetId: string, txnId: string) =>
    api.delete<{ ok: boolean }>(`/finance/investments/assets/${assetId}/trades/${txnId}`).then((r) => r.data),
  assetPriceHistory: (assetId: string, signal?: AbortSignal) =>
    api.get(`/finance/investments/assets/${assetId}/prices`, apiGetConfig(undefined, signal)).then((r) => r.data),

  // Recurring
  listRecurring: (signal?: AbortSignal) =>
    api.get<{ items: Recurring[] }>("/finance/recurring", apiGetConfig(undefined, signal)).then((r) => r.data),
  createRecurring: (d: CreateRecurringInput) =>
    api.post<Recurring>("/finance/recurring", d).then((r) => r.data),
  deleteRecurring: (id: string) =>
    api.delete<{ ok: boolean }>(`/finance/recurring/${id}`).then((r) => r.data),

  cloneRecurringToBilling: (recurringIds: string[]) =>
    api
      .post<{
        created: ChecklistTemplate[];
        skipped: { recurringId: string; title: string; reason: string }[];
      }>("/finance/checklist/clone-from-recurring", { recurringIds })
      .then((r) => r.data),

  // Checklist (tagihan bulanan + template)
  listChecklistTemplates: (signal?: AbortSignal) =>
    api
      .get<{ templates: ChecklistTemplate[] }>("/finance/checklist/templates", apiGetConfig(undefined, signal))
      .then((r) => r.data),
  listChecklistTemplatesPaginated: (
    params?: {
      q?: string;
      page?: number;
      pageSize?: number;
      frequency?: string;
      activeOnly?: boolean;
    },
    signal?: AbortSignal,
  ) =>
    api
      .get<{ items: ChecklistTemplate[]; total: number }>(
        "/finance/checklist/templates/manage",
        apiGetConfig(params, signal),
      )
      .then((r) => r.data),
  createChecklistTemplate: (d: CreateChecklistTemplateInput) =>
    api.post<ChecklistTemplate>("/finance/checklist/templates", d).then((r) => r.data),
  updateChecklistTemplate: (id: string, d: UpdateChecklistTemplateInput) =>
    api.patch<ChecklistTemplate>(`/finance/checklist/templates/${id}`, d).then((r) => r.data),
  deleteChecklistTemplate: (id: string) =>
    api.delete<{ ok: boolean }>(`/finance/checklist/templates/${id}`).then((r) => r.data),
  getMonthlyBilling: (period: string, signal?: AbortSignal) =>
    api
      .get<MonthlyBillingResponse>("/finance/checklist/monthly", apiGetConfig({ period }, signal))
      .then((r) => r.data),
  toggleMonthlyBillingItem: (itemId: string, checked: boolean) =>
    api
      .post<ToggleMonthlyBillingResponse>("/finance/checklist/monthly/toggle", { itemId, checked })
      .then((r) => r.data),
  todayChecklist: (signal?: AbortSignal) =>
    api
      .get<{ items: ChecklistItem[]; date: string; pending: number }>(
        "/finance/checklist/today",
        apiGetConfig(undefined, signal),
      )
      .then((r) => r.data),
  checklistAction: (itemId: string, action: "done" | "skip", note?: string, transactionId?: string) =>
    api.post<ChecklistItem>("/finance/checklist/action", { itemId, action, note, transactionId }).then((r) => r.data),

  // Reports
  createReportJob: (d: { type: string; startDate: string; endDate: string; format: "pdf" | "csv"; period?: string }) =>
    api.post<ReportJob>("/finance/reports/export", d).then((r) => r.data),
  getReportJob: (id: string, signal?: AbortSignal) =>
    api.get<ReportJob>(`/finance/reports/jobs/${id}`, apiGetConfig(undefined, signal)).then((r) => r.data),
  listReportJobs: (signal?: AbortSignal) =>
    api.get<{ items: ReportJob[] }>("/finance/reports/jobs", apiGetConfig(undefined, signal)).then((r) => r.data),

  // Audit
  auditLog: (
    params?: { entityType?: string; entityId?: string; limit?: number },
    signal?: AbortSignal,
  ) =>
    api.get<{ items: AuditEntry[] }>("/finance/audit-log", apiGetConfig(params, signal)).then((r) => r.data),
};

// ---- HELPERS ----

export function formatIDR(value: string | number): string {
  let num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "Rp 0";
  if (Math.abs(num) < 0.5) num = 0;
  return "Rp " + num.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Parse user input with dot or comma as decimal separator (e.g. 1191.69 or 1191,69). */
export function parseDecimalInput(raw: string): number {
  const s = raw.trim().replace(/\s/g, "");
  if (!s) return NaN;
  if (s.includes(",") && s.includes(".")) {
    return parseFloat(s.replace(/\./g, "").replace(",", "."));
  }
  if (s.includes(",")) {
    return parseFloat(s.replace(",", "."));
  }
  return parseFloat(s);
}

/** IDR for unit prices (avg buy, market price) — keeps fractional rupiah when present. */
export function formatIDRPrice(value: string | number): string {
  let num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "Rp 0";
  if (Math.abs(num) < 1e-9) num = 0;
  const hasFrac = Math.abs(num - Math.round(num)) > 1e-9;
  return (
    "Rp " +
    num.toLocaleString("id-ID", {
      minimumFractionDigits: hasFrac ? 2 : 0,
      maximumFractionDigits: 4,
    })
  );
}

/** Default labels when API types are not loaded yet. */
export const TXN_TYPE_LABEL_FALLBACK: Record<string, string> = {
  income: "Pemasukan",
  expense: "Pengeluaran",
  transfer: "Transfer",
  investment_buy: "Beli Aset",
  investment_sell: "Jual Aset",
  dividend: "Dividen",
  interest: "Bunga",
  cashback: "Cashback",
  adjustment: "Penyesuaian (Owner)",
};

export function resolveTxnType(types: TransactionType[] | undefined, code: string): TransactionType | undefined {
  return types?.find((t) => t.code === code);
}

export function txnTypeLabel(type: string, types?: TransactionType[]): string {
  return resolveTxnType(types, type)?.label ?? TXN_TYPE_LABEL_FALLBACK[type] ?? type;
}

export function txnTypeFlow(type: string, types?: TransactionType[]): string {
  const t = resolveTxnType(types, type);
  if (t) return t.flow;
  if (["income", "dividend", "interest", "cashback", "investment_sell"].includes(type)) return "income";
  if (["expense", "investment_buy"].includes(type)) return "expense";
  if (type === "transfer") return "transfer";
  if (type === "adjustment") return "adjustment";
  return "expense";
}

export function txnTypeColor(type: string, types?: TransactionType[]): string {
  const flow = txnTypeFlow(type, types);
  if (flow === "income") return "text-green-600";
  if (flow === "expense") return "text-red-600";
  if (flow === "transfer") return "text-blue-600";
  return "text-muted-foreground";
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    approved: "Disetujui",
    pending_approval: "Menunggu Persetujuan",
    rejected: "Ditolak",
    draft: "Draft",
  };
  return map[status] ?? status;
}

/** @deprecated Prefer `listTransactionTypes` from API. */
export const TXN_TYPES = Object.entries(TXN_TYPE_LABEL_FALLBACK).map(([value, label]) => ({
  value,
  label,
}));

export const WALLET_TYPES = [
  { value: "cash", label: "Kas Tunai" },
  { value: "bank", label: "Bank" },
  { value: "ewallet", label: "E-Wallet" },
  { value: "crypto", label: "Kripto" },
  { value: "investment", label: "Investasi" },
  { value: "other", label: "Lainnya" },
] as const;

/** Stored in fin_wallet.icon — mapped to Lucide on the wallets page. */
export const WALLET_ICON_OPTIONS = [
  { value: "wallet", label: "Dompet" },
  { value: "banknote", label: "Uang tunai" },
  { value: "landmark", label: "Bank" },
  { value: "credit-card", label: "Kartu" },
  { value: "smartphone", label: "E-wallet" },
  { value: "bitcoin", label: "Kripto" },
  { value: "trending-up", label: "Investasi" },
  { value: "piggy-bank", label: "Tabungan" },
  { value: "building-2", label: "Kantor" },
  { value: "circle-dollar-sign", label: "Dollar" },
] as const;

export const WALLET_COLOR_PRESETS = [
  "#16A34A",
  "#2563EB",
  "#7C3AED",
  "#F59E0B",
  "#0891B2",
  "#DC2626",
  "#6B7280",
  "#DB2777",
] as const;
