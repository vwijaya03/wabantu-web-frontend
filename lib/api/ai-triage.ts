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
  priorTurns?: string[];
  turnIndex?: number;
}

export interface TriageRegressionFailure {
  caseName: string;
  gotPath: string;
  wantPath: string;
  replyPreview?: string;
}

export interface TriageFixHints {
  likelyFiles: string[];
  catalogSource: string;
  testUsesFixture: string;
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
  regressionFailures?: TriageRegressionFailure[];
  fixHints?: TriageFixHints;
  cursorAgentId?: string;
  cursorFixGithubRunUrl?: string;
}

export type AITriageJobStatus =
  | "pending"
  | "running"
  | "pr_ready"
  | "pr_ready_needs_fix"
  | "fix_running"
  | "failed";

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

  async requestAiFix(id: string): Promise<{ job: AITriageJob }> {
    const res = await api.post(`/admin/ai-triage/jobs/${id}/ai-fix`);
    return res.data;
  },

  async createLLMScan(params: CreateAITriageLLMScanParams): Promise<{ scan: AITriageLLMScan }> {
    const res = await api.post("/admin/ai-triage/llm-scans", params);
    return res.data;
  },

  async getLLMScan(id: string): Promise<{ scan: AITriageLLMScan }> {
    const res = await api.get(`/admin/ai-triage/llm-scans/${id}`);
    return res.data;
  },

  async listReports(params?: {
    tenantId?: string;
    status?: AITriageReportStatus | "";
    limit?: number;
  }): Promise<{ reports: AITriageReport[] }> {
    const res = await api.get("/admin/ai-triage/reports", { params });
    return res.data;
  },

  async getReport(id: string): Promise<{ report: AITriageReport }> {
    const res = await api.get(`/admin/ai-triage/reports/${id}`);
    return res.data;
  },

  async updateReport(
    id: string,
    params: { status: "confirmed" | "dismissed"; reviewNote?: string },
  ): Promise<{ report: AITriageReport }> {
    const res = await api.patch(`/admin/ai-triage/reports/${id}`, params);
    return res.data;
  },
};

export type AITriageReportStatus = "open" | "confirmed" | "dismissed";

export interface AITriageReport {
  id: string;
  tenantId: string;
  tenantSchema: string;
  conversationId: string;
  inboundId?: string;
  outboundMessageId: string;
  userText?: string;
  replyText?: string;
  path?: string;
  category: string;
  reporterNote?: string;
  status: AITriageReportStatus;
  reportedBy: string;
  reporterRole: string;
  judgeFlagged?: boolean;
  judgeCategory?: string;
  judgeReason?: string;
  reviewedBy?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  tenantName?: string;
}

export type AITriageLLMScanStatus = "pending" | "running" | "done" | "failed";

export interface AITriageLLMFinding {
  id: string;
  conversationId: string;
  inboundId: string;
  userText?: string;
  replyText?: string;
  path?: string;
  flagged: boolean;
  severity?: string;
  category?: string;
  reason?: string;
  inboundAt: string;
}

export interface AITriageLLMScan {
  id: string;
  tenantId: string;
  tenantSchema: string;
  conversationId?: string;
  from: string;
  to: string;
  status: AITriageLLMScanStatus;
  turnsChecked: number;
  findingsCount: number;
  inputTokens: number;
  outputTokens: number;
  errorText?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  findings?: AITriageLLMFinding[];
}

export interface CreateAITriageLLMScanParams {
  tenantId: string;
  from: string;
  to: string;
  conversationId?: string;
}
