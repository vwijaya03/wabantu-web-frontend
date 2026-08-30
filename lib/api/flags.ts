import { api } from "./client";

export type RetrievalMode = "disabled" | "shadow" | "vector";

export type RAGRolloutScope = "selected" | "all_active" | "lexical_only";

export interface RetrievalModeResponse {
  tenantId: string;
  mode: RetrievalMode;
}

export interface SetRetrievalModeResponse extends RetrievalModeResponse {
  previous: RetrievalMode;
  kbEnqueued: number;
  catalogEnqueued: number;
}

export interface RAGRolloutJobSummary {
  jobId: string;
  mode: "shadow" | "vector";
  scope: RAGRolloutScope;
  status: string;
  totalCount: number;
  doneCount: number;
  failedCount: number;
  kbEnqueuedTotal: number;
  catalogEnqueuedTotal: number;
  tenantDelayMs: number;
  startedBy?: string;
  createdAt: string;
  completedAt?: string;
  recentErrors?: string[];
}

export interface StartRAGRolloutResponse {
  jobId: string;
  enqueued: number;
}

export interface TenantIndexingProgress {
  tenantId: string;
  kb: EntityIndexCounts;
  catalog: EntityIndexCounts;
  outbox: OutboxCounts;
  percentComplete: number;
  outboxPercentDone: number;
  isComplete: boolean;
  oldestPendingAt?: string;
}

export interface EntityIndexCounts {
  pending: number;
  indexed: number;
  failed: number;
  dlq: number;
  total: number;
}

export interface OutboxCounts {
  pending: number;
  done: number;
  failed: number;
  dlq: number;
  total: number;
}

export interface RetrievalObservabilitySnapshot {
  requests: number;
  fallbacks: number;
  zeroHits: number;
  fallbackRatio: number;
  zeroHitRatio: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  embedCacheHits: number;
  embedCacheMisses: number;
  embedCacheHitRatio: number;
  indexingSuccess: number;
  indexingFailure: number;
}

export const flagsApi = {
  async getRetrievalMode(tenantId: string): Promise<RetrievalModeResponse> {
    const { data } = await api.get<RetrievalModeResponse>(
      `/api/v1/flags/retrieval-mode/${encodeURIComponent(tenantId)}`,
    );
    return data;
  },

  async setRetrievalMode(
    tenantId: string,
    mode: RetrievalMode,
  ): Promise<SetRetrievalModeResponse> {
    const { data } = await api.put<SetRetrievalModeResponse>("/api/v1/flags/retrieval-mode", {
      tenantId,
      mode,
    });
    return data;
  },

  async startRAGRollout(input: {
    mode: "shadow" | "vector";
    scope: RAGRolloutScope;
    tenantIds?: string[];
    tenantDelayMs?: number;
  }): Promise<StartRAGRolloutResponse> {
    const { data } = await api.post<StartRAGRolloutResponse>(
      "/api/v1/flags/retrieval-rollout",
      input,
    );
    return data;
  },

  async getRAGRolloutJob(jobId: string): Promise<RAGRolloutJobSummary> {
    const { data } = await api.get<RAGRolloutJobSummary>(
      `/api/v1/flags/retrieval-rollout/jobs/${encodeURIComponent(jobId)}`,
    );
    return data;
  },

  async listActiveRAGRolloutJobs(): Promise<{ jobs: RAGRolloutJobSummary[] }> {
    const { data } = await api.get<{ jobs: RAGRolloutJobSummary[] }>(
      "/api/v1/flags/retrieval-rollout/active-jobs",
    );
    return data;
  },

  async cancelRAGRolloutJob(jobId: string): Promise<RAGRolloutJobSummary> {
    const { data } = await api.post<RAGRolloutJobSummary>(
      `/api/v1/flags/retrieval-rollout/jobs/${encodeURIComponent(jobId)}/cancel`,
    );
    return data;
  },

  async getRetrievalIndexingProgress(tenantId: string): Promise<TenantIndexingProgress> {
    const { data } = await api.get<TenantIndexingProgress>(
      `/api/v1/flags/retrieval-indexing/${encodeURIComponent(tenantId)}`,
    );
    return data;
  },

  async getRetrievalObservability(): Promise<{ metrics: RetrievalObservabilitySnapshot }> {
    const { data } = await api.get<{ metrics: RetrievalObservabilitySnapshot }>(
      "/api/v1/flags/retrieval-observability",
    );
    return data;
  },
};
