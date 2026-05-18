import { api } from "./client";

export interface QuotaItem {
  eventType: string;
  used: number;
  limit: number;
  remaining: number;
}

export interface UsageSummary {
  period: string;
  plan: string;
  quotas: QuotaItem[];
}

export const usageApi = {
  async summary(period?: string): Promise<UsageSummary> {
    const res = await api.get("/usage/summary", { params: period ? { period } : {} });
    return res.data;
  },
};
