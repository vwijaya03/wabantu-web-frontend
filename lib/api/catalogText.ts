import { api } from "./client";
import type { CatalogImageCommitResult, CatalogImageDraftItem, CatalogImagePreview } from "./catalogImage";

export interface CatalogTextPreviewRequest {
  text: string;
}

export const catalogTextApi = {
  async preview(text: string): Promise<CatalogImagePreview> {
    const res = await api.post("/business/catalog/import-text/preview", { text } satisfies CatalogTextPreviewRequest, {
      timeout: 120_000,
    });
    return res.data;
  },

  async getDraft(jobId: string): Promise<CatalogImagePreview> {
    const res = await api.get(`/business/catalog/import-text/draft/${jobId}`);
    return res.data;
  },

  async commit(jobId: string, items: CatalogImageDraftItem[]): Promise<CatalogImageCommitResult> {
    const res = await api.post(`/business/catalog/import-text/draft/${jobId}/commit`, { items });
    return res.data;
  },
};
