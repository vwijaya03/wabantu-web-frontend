import { api } from "./client";

export interface AIActivityEntry {
  id: string;
  purpose: string;
  path: string;
  reason: string;
  model?: string;
  tier?: string;
  llmUsed: boolean;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  conversationId?: string;
  inboundId?: string;
  routeReason?: string;
  classifier?: string;
  createdAt: string;
}

export interface AIActivityByPath {
  path: string;
  count: number;
  llmCalls: number;
  totalTokens: number;
}

export interface AIActivityByModel {
  model: string;
  tier: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface AIActivitySummary {
  period: string;
  totalEvents: number;
  llmCalls: number;
  totalTokens: number;
  byPath: AIActivityByPath[];
  byModel: AIActivityByModel[];
}

export interface ListAIActivityParams {
  period?: string;
  limit?: number;
}

export const aiActivityAdminApi = {
  async list(
    tenantId: string,
    params?: ListAIActivityParams,
  ): Promise<{ period: string; entries: AIActivityEntry[] }> {
    const res = await api.get(`/admin/tenant/${tenantId}/ai-activity`, { params });
    return res.data;
  },
  async summary(
    tenantId: string,
    params?: ListAIActivityParams,
  ): Promise<AIActivitySummary> {
    const res = await api.get(`/admin/tenant/${tenantId}/ai-activity/summary`, {
      params,
    });
    return res.data;
  },
};
