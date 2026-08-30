import { api } from "./client";

export type RetrievalMode = "disabled" | "shadow" | "vector";

export interface RetrievalModeResponse {
  tenantId: string;
  mode: RetrievalMode;
}

export interface SetRetrievalModeResponse extends RetrievalModeResponse {
  previous: RetrievalMode;
  kbEnqueued: number;
  catalogEnqueued: number;
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
};
