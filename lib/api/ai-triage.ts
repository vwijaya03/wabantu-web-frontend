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

export interface TriageSimulatorSnapshot {
  tenantSchema?: string;
  profile: {
    businessName: string;
    tone?: string | null;
    aiEnabled?: boolean;
  };
  catalog: Array<{
    id: string;
    externalCode?: string;
    name: string;
    sellPrice?: number;
    sellUnit?: string;
  }>;
  kb?: Array<{
    question: string;
    answer: string;
    category?: string | null;
  }>;
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
  simulatorSnapshot?: TriageSimulatorSnapshot;
  cursorAgentId?: string;
  cursorFixGithubRunUrl?: string;
  cursorFixAttempts?: number;
  verifyFailures?: TriageRegressionFailure[];
  verifyNote?: string;
  verifyUsedLiveCatalog?: boolean;
  verifyPassed?: boolean;
}

export type AITriageJobStatus =
  | "pending"
  | "running"
  | "pr_ready"
  | "pr_ready_needs_fix"
  | "fix_running"
  | "failed"
  | "verified";

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
  force?: boolean;
}

export interface VerifyAITriageJobResponse {
  job: AITriageJob;
  passed: boolean;
  failures?: TriageRegressionFailure[];
  reportsResolved: number;
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

  async verifyJob(id: string): Promise<VerifyAITriageJobResponse> {
    const res = await api.post(`/admin/ai-triage/jobs/${id}/verify`);
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

  async listIncidents(params?: {
    tenantId?: string;
    channel?: string;
    status?: string;
    limit?: number;
  }): Promise<{ incidents: AITriageIncident[] }> {
    const res = await api.get("/admin/ai-triage/incidents", { params });
    return res.data;
  },

  async getIncident(id: string): Promise<{ incident: AITriageIncident }> {
    const res = await api.get(`/admin/ai-triage/incidents/${id}`);
    return res.data;
  },

  async confirmIncident(
    id: string,
    contract: BehaviorContract,
  ): Promise<{ incident: AITriageIncident; behaviorJob?: AITriageBehaviorJob }> {
    const res = await api.post(`/admin/ai-triage/incidents/${id}/confirm`, { contract });
    return res.data;
  },

  async dismissIncident(id: string, note?: string): Promise<{ incident: AITriageIncident }> {
    const res = await api.post(`/admin/ai-triage/incidents/${id}/dismiss`, { note });
    return res.data;
  },

  async getBehaviorJob(id: string): Promise<{ job: AITriageBehaviorJob }> {
    const res = await api.get(`/admin/ai-triage/behavior-jobs/${id}`);
    return res.data;
  },

  async retryBehaviorJob(id: string): Promise<{ job: AITriageBehaviorJob }> {
    const res = await api.post(`/admin/ai-triage/behavior-jobs/${id}/retry`);
    return res.data;
  },

  async verifyBehaviorJob(id: string): Promise<{
    job: AITriageBehaviorJob;
    result: { passed: boolean; deployedRevision?: string; failures?: string[] };
  }> {
    const res = await api.post(`/admin/ai-triage/behavior-jobs/${id}/verify`);
    return res.data;
  },

  async dryRunRepair(
    incidentId: string,
    params: { operation: string; targetOrderId?: string; items?: unknown[] },
  ): Promise<{ plan: AITriageRepairPlan }> {
    const res = await api.post(`/admin/ai-triage/incidents/${incidentId}/repair/dry-run`, params);
    return res.data;
  },

  async getRepairPlan(id: string): Promise<{ plan: AITriageRepairPlan }> {
    const res = await api.get(`/admin/ai-triage/repair-plans/${id}`);
    return res.data;
  },

  async approveRepair(id: string): Promise<{ plan: AITriageRepairPlan }> {
    const res = await api.post(`/admin/ai-triage/repair-plans/${id}/approve`);
    return res.data;
  },

  async applyRepair(id: string): Promise<{ plan: AITriageRepairPlan }> {
    const res = await api.post(`/admin/ai-triage/repair-plans/${id}/apply`);
    return res.data;
  },
};

export type AITriageReportStatus = "open" | "confirmed" | "dismissed" | "resolved";

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
  resolvedByJobId?: string;
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

export type AITriageChannel = "whatsapp" | "web_chat" | "storefront_search";
export type AITriageIncidentReview = "open" | "confirmed" | "dismissed" | "needs_human_input";
export type AITriageBehaviorJobStatus =
  | "planning"
  | "needs_human_input"
  | "needs_customer_input"
  | "test_ready"
  | "fix_running"
  | "pr_ready"
  | "already_fixed"
  | "verify_pending"
  | "verified"
  | "failed";

export interface AITriageIncident {
  id: string;
  tenantId: string;
  tenantSchema: string;
  channel: AITriageChannel;
  fingerprint: string;
  reviewStatus: AITriageIncidentReview;
  resolutionStatus: string;
  lane?: string;
  degradedMode?: string;
  evidenceVersion: number;
  draftContract?: unknown;
  confirmedContract?: unknown;
  behaviorJobId?: string;
  repairPlanId?: string;
  createdAt: string;
  updatedAt: string;
  sources?: Array<{ sourceType: string; sourceId: string; channel: string }>;
}

export interface AITriageBehaviorJob {
  id: string;
  incidentId: string;
  status: AITriageBehaviorJobStatus;
  lane: string;
  channel: string;
  targetRepo: string;
  prUrl?: string;
  githubRunUrl?: string;
  expectedRevision?: string;
  attemptCount: number;
  errorText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AITriageRepairPlan {
  id: string;
  incidentId: string;
  operation: string;
  status: string;
  blockReasons?: string[];
  beforeJson?: unknown;
  afterJson?: unknown;
  beforeHash: string;
  afterHash: string;
  createdAt: string;
}

export interface BehaviorContract {
  version: number;
  lane: string;
  channel: string;
  degradedMode?: string;
  clarification?: string;
  assertions: {
    wantPath?: string;
    cartInclude?: Array<{ nameContains?: string; qty?: number }>;
    cartExclude?: string[];
    replyContains?: string[];
    replyExcludes?: string[];
    needCustomerInput?: boolean;
  };
}
