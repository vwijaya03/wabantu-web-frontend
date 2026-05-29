import { validateCatalogImageFiles } from "@/lib/catalog-image-limits";
import { api } from "./client";

export interface TransactionImageDraftItem {
  draftKey: string;
  type: "income" | "expense";
  typeSignals?: string[];
  amount: number;
  description: string;
  transactionDate: string;
  walletId?: string;
  categoryId?: string;
  walletNameHint?: string;
  categoryNameHint?: string;
  include: boolean;
}

export interface TransactionImagePreview {
  jobId: string;
  items: TransactionImageDraftItem[];
  sourceFilenames?: string[];
  imagesProcessed?: number;
  warnings?: string[];
  inputTokens: number;
  outputTokens: number;
  tokensUsed: number;
  tokenQuotaRemaining: number;
  tokenQuotaLimit: number;
  quotaNotice: string;
}

export interface TransactionImageCommitResult {
  jobId: string;
  savedCount: number;
  skippedCount: number;
  message: string;
}

export const transactionImageApi = {
  async preview(files: File[]): Promise<TransactionImagePreview> {
    const err = validateCatalogImageFiles(files);
    if (err) {
      throw new Error(err);
    }
    const form = new FormData();
    for (const f of files) {
      form.append("files", f);
    }
    const timeout = Math.min(300_000, 90_000 + files.length * 45_000);
    const res = await api.post("/finance/transactions/import-image/preview", form, {
      timeout,
    });
    return res.data;
  },

  async getDraft(jobId: string): Promise<TransactionImagePreview> {
    const res = await api.get(`/finance/transactions/import-image/draft/${jobId}`);
    return res.data;
  },

  async commit(
    jobId: string,
    items: TransactionImageDraftItem[],
  ): Promise<TransactionImageCommitResult> {
    const res = await api.post(`/finance/transactions/import-image/draft/${jobId}/commit`, {
      items,
    });
    return res.data;
  },
};

/** Match wallet/category hints from AI to tenant records. */
export function matchWalletId(
  wallets: { id: string; name: string }[],
  hint?: string,
  selected?: string,
): string {
  if (selected) return selected;
  const h = (hint ?? "").trim().toLowerCase();
  if (!h) return "";
  const exact = wallets.find((w) => w.name.toLowerCase() === h);
  if (exact) return exact.id;
  const partial = wallets.find(
    (w) => w.name.toLowerCase().includes(h) || h.includes(w.name.toLowerCase()),
  );
  return partial?.id ?? "";
}

export function matchCategoryId(
  categories: { id: string; name: string; type: string }[],
  txnType: "income" | "expense",
  hint?: string,
  selected?: string,
): string {
  if (selected) return selected;
  const kind = txnType === "income" ? "income" : "expense";
  const pool = categories.filter((c) => c.type === kind || c.type === "any");
  const h = (hint ?? "").trim().toLowerCase();
  if (h) {
    const exact = pool.find((c) => c.name.toLowerCase() === h);
    if (exact) return exact.id;
    const partial = pool.find(
      (c) => c.name.toLowerCase().includes(h) || h.includes(c.name.toLowerCase()),
    );
    if (partial) return partial.id;
  }
  return pool[0]?.id ?? "";
}

export const TYPE_SIGNAL_LABELS: Record<string, string> = {
  green_amount: "Nominal hijau",
  red_amount: "Nominal merah",
  plus_prefix: "Tanda +",
  minus_prefix: "Tanda −",
  green_icon: "Ikon hijau",
  red_icon: "Ikon merah",
  label_pemasukan: "Label pemasukan",
  label_pengeluaran: "Label pengeluaran",
  income: "Jenis masuk",
  expense: "Jenis keluar",
};
