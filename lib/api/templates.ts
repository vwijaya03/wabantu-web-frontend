import { api } from "@/lib/api/client";

export type TemplateSummary = {
  slug: string;
  kind: string;
  title: string;
  description?: string;
  priceIdr: number;
};

export type TemplateDetail = TemplateSummary & {
  version: string;
  manifest: Record<string, unknown>;
};

export const templatesApi = {
  list(kind?: string) {
    const params = kind ? { kind } : undefined;
    return api
      .get<{ items: TemplateSummary[] }>("/api/v1/templates", { params })
      .then((r) => r.data);
  },
  get(slug: string) {
    return api.get<TemplateDetail>(`/api/v1/templates/${slug}`).then((r) => r.data);
  },
};
