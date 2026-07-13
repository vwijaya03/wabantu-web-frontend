import { api } from "./client";

export interface AITriageAnomaly {
  tenantId: string;
  tenantSchema: string;
  path: string;
  reason?: string;
  conversationId?: string;
  inboundId?: string;
  userText?: string;
  createdAt: string;
  reviewSuggested: boolean;
}

export interface TriageMismatch {
  inboundId: string;
  userText: string;
  actualPath?: string;
  expectedPath?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface AnalyzeConversationResult {
  tenantSchema: string;
  conversationId: string;
  focusInboundId?: string;
  messagesLoaded: number;
  turnsChecked: number;
  turnsSkipped: number;
  mismatches: TriageMismatch[];
  hasDeterministicMismatch: boolean;
}

export type AITriageJobStatus = "pending" | "running" | "pr_ready" | "failed";

export interface AITriageJob {
  id: string;
  tenantId: string;
  tenantSchema: string;
  conversationId: string;
  inboundId?: string;
  status: AITriageJobStatus;
  analysis?: AnalyzeConversationResult;
  regressionCode?: string;
  githubRunUrl?: string;
  prUrl?: string;
  errorText?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateAITriageJobParams {
  tenantId: string;
  conversationId: string;
  inboundId?: string;
}

export const aiTriageAdminApi = {
  async listAnomalies(
    tenantId: string,
    params?: { limit?: number },
  ): Promise<{ anomalies: AITriageAnomaly[] }> {
    const res = await api.get("/admin/ai-triage/anomalies", {
      params: { tenantId, ...params },
    });
    return res.data;
  },

  async createJob(params: CreateAITriageJobParams): Promise<{ job: AITriageJob }> {
    const res = await api.post("/admin/ai-triage/jobs", params);
    return res.data;
  },

  async getJob(id: string): Promise<{ job: AITriageJob }> {
    const res = await api.get(`/admin/ai-triage/jobs/${id}`);
    return res.data;
  },
};
