import { validateCatalogImageFiles } from "@/lib/catalog-image-limits";
import { api } from "./client";

export interface CatalogImageDraftItem {
  externalCode: string;
  name: string;
  description?: string;
  sellPrice?: number;
  sellUnit?: string;
  include: boolean;
}

export interface CatalogImagePreview {
  jobId: string;
  parentTitle?: string;
  items: CatalogImageDraftItem[];
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

export interface CatalogImageCommitResult {
  jobId: string;
  savedCount: number;
  skippedCount: number;
  message: string;
}

export const catalogImageApi = {
  async limits(): Promise<{
    maxBytes: number;
    maxMegabytes: number;
    minBytes: number;
    allowedMime: string[];
    allowedExt: string[];
    maxBatchBytes: number;
    maxBatchMegabytes: number;
    maxFilesPerBatch: number;
    maxItemsPerJob: number;
  }> {
    const res = await api.get("/business/catalog/import-image-limits");
    return res.data;
  },

  async preview(files: File[]): Promise<CatalogImagePreview> {
    const err = validateCatalogImageFiles(files);
    if (err) {
      throw new Error(err);
    }
    const form = new FormData();
    for (const f of files) {
      form.append("files", f);
    }
    const timeout = Math.min(300_000, 90_000 + files.length * 45_000);
    // Do not set Content-Type — axios/browser adds multipart boundary automatically.
    const res = await api.post("/business/catalog/import-image/preview", form, {
      timeout,
    });
    return res.data;
  },

  async getDraft(jobId: string): Promise<CatalogImagePreview> {
    const res = await api.get(`/business/catalog/import-image/draft/${jobId}`);
    return res.data;
  },

  async commit(jobId: string, items: CatalogImageDraftItem[]): Promise<CatalogImageCommitResult> {
    const res = await api.post(`/business/catalog/import-image/draft/${jobId}/commit`, { items });
    return res.data;
  },
};
