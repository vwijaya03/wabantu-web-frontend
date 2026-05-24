import { api } from "./client";

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

export interface ChecklistTemplate {
  id: string;
  title: string;
  description?: string;
  amountHint?: string;
  categoryId?: string;
  walletId?: string;
  frequency: string;
  dayOfMonth?: number;
  isActive: boolean;
  order: number;
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
  status: "queued" | "processing" | "done" | "failed";
  downloadUrl?: string;
  errorMsg?: string;
  createdAt: string;
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
  dashboard: (period?: string) =>
    api.get<DashboardSummary>("/finance/dashboard", { params: period ? { period } : {} }).then((r) => r.data),

  // Wallets
  listWallets: () => api.get<{ wallets: Wallet[] }>("/finance/wallets").then((r) => r.data),
  createWallet: (d: Partial<Wallet> & { initialBalance: number }) =>
    api.post<Wallet>("/finance/wallets", d).then((r) => r.data),
  updateWallet: (id: string, d: Partial<Wallet>) =>
    api.put<Wallet>(`/finance/wallets/${id}`, d).then((r) => r.data),
  deleteWallet: (id: string) =>
    api.delete<{ ok: boolean }>(`/finance/wallets/${id}`).then((r) => r.data),

  // Categories
  listCategories: () => api.get<{ categories: Category[] }>("/finance/categories").then((r) => r.data),
  createCategory: (d: Partial<Category>) =>
    api.post<Category>("/finance/categories", d).then((r) => r.data),
  deleteCategory: (id: string) =>
    api.delete<{ ok: boolean }>(`/finance/categories/${id}`).then((r) => r.data),

  // Transaction types
  listTransactionTypes: (params?: {
    q?: string;
    page?: number;
    pageSize?: number;
    activeOnly?: boolean;
  }) =>
    api
      .get<{ items: TransactionType[]; total: number }>("/finance/transaction-types", { params })
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
  listTransactions: (params?: Record<string, string | number>) =>
    api.get<{ items: Transaction[]; total: number }>("/finance/transactions", { params }).then((r) => r.data),
  createTransaction: (d: Partial<Transaction>) =>
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
  getApprovalSetting: () => api.get<ApprovalSetting>("/finance/approval-setting").then((r) => r.data),
  updateApprovalSetting: (d: ApprovalSetting) =>
    api.put<ApprovalSetting>("/finance/approval-setting", d).then((r) => r.data),

  // Period lock
  lockPeriod: (period: string, note?: string) =>
    api.post<{ ok: boolean }>("/finance/period-lock", { period, note }).then((r) => r.data),
  listLockedPeriods: () => api.get<{ periods: string[] }>("/finance/locked-periods").then((r) => r.data),

  // Budgets
  listBudgets: (period?: string) =>
    api.get<{ budgets: Budget[]; period: string }>("/finance/budgets", { params: period ? { period } : {} }).then((r) => r.data),
  upsertBudget: (d: { categoryId: string; period: string; amount: number }) =>
    api.post<Budget>("/finance/budgets", d).then((r) => r.data),
  deleteBudget: (id: string) =>
    api.delete<{ ok: boolean }>(`/finance/budgets/${id}`).then((r) => r.data),
  budgetSummary: (period?: string) =>
    api.get<BudgetSummary>("/finance/budgets/summary", { params: period ? { period } : {} }).then((r) => r.data),
  categorySpending: (period?: string) =>
    api.get<{ items: CategorySpendingItem[]; period: string }>("/finance/reports/category-spending", {
      params: period ? { period } : {},
    }).then((r) => r.data),
  monthlyComparison: (months?: number) =>
    api.get<{ items: MonthlyComparisonItem[] }>("/finance/reports/monthly-comparison", {
      params: months ? { months } : {},
    }).then((r) => r.data),

  // Investment
  portfolio: (params?: { search?: string; page?: number; pageSize?: number }) =>
    api.get<PortfolioSummary>("/finance/investments/portfolio", { params }).then((r) => r.data),
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
  listAssetTrades: (assetId: string) =>
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
      }>(`/finance/investments/assets/${assetId}/trades`)
      .then((r) => r.data),
  deleteAssetTrade: (assetId: string, txnId: string) =>
    api.delete<{ ok: boolean }>(`/finance/investments/assets/${assetId}/trades/${txnId}`).then((r) => r.data),
  assetPriceHistory: (assetId: string) =>
    api.get(`/finance/investments/assets/${assetId}/prices`).then((r) => r.data),

  // Recurring
  listRecurring: () => api.get<{ items: Recurring[] }>("/finance/recurring").then((r) => r.data),
  createRecurring: (d: Partial<Recurring>) =>
    api.post<Recurring>("/finance/recurring", d).then((r) => r.data),
  deleteRecurring: (id: string) =>
    api.delete<{ ok: boolean }>(`/finance/recurring/${id}`).then((r) => r.data),

  // Checklist
  listChecklistTemplates: () =>
    api.get<{ templates: ChecklistTemplate[] }>("/finance/checklist/templates").then((r) => r.data),
  createChecklistTemplate: (d: Partial<ChecklistTemplate>) =>
    api.post<ChecklistTemplate>("/finance/checklist/templates", d).then((r) => r.data),
  deleteChecklistTemplate: (id: string) =>
    api.delete<{ ok: boolean }>(`/finance/checklist/templates/${id}`).then((r) => r.data),
  todayChecklist: () =>
    api.get<{ items: ChecklistItem[]; date: string; pending: number }>("/finance/checklist/today").then((r) => r.data),
  checklistAction: (itemId: string, action: "done" | "skip", note?: string, transactionId?: string) =>
    api.post<ChecklistItem>("/finance/checklist/action", { itemId, action, note, transactionId }).then((r) => r.data),

  // Reports
  createReportJob: (d: { type: string; startDate: string; endDate: string; format: "pdf" | "csv"; period?: string }) =>
    api.post<ReportJob>("/finance/reports/export", d).then((r) => r.data),
  getReportJob: (id: string) => api.get<ReportJob>(`/finance/reports/jobs/${id}`).then((r) => r.data),
  listReportJobs: () => api.get<{ items: ReportJob[] }>("/finance/reports/jobs").then((r) => r.data),

  // Audit
  auditLog: (params?: { entityType?: string; entityId?: string; limit?: number }) =>
    api.get<{ items: AuditEntry[] }>("/finance/audit-log", { params }).then((r) => r.data),
};

// ---- HELPERS ----

export function formatIDR(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "Rp 0";
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
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "Rp 0";
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
