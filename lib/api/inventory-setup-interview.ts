import { api } from "./client";
import type { WizardAnswers, WizardRecommendation } from "./inventory";

export interface InvSetupInterviewMessage {
  role: "user" | "assistant";
  content: string;
}

export interface InvSetupInterviewSession {
  sessionId: string;
  phase: string;
  messages: InvSetupInterviewMessage[];
  answersDraft: WizardAnswers;
  readyForRecommendation: boolean;
  tokenQuotaRemaining: number;
  tokenQuotaLimit: number;
  quotaNotice: string;
}

export interface InvSetupInterviewMessageResponse extends InvSetupInterviewSession {
  tokensUsed: number;
}

export interface InvSetupInterviewFinishResponse {
  recommendation: WizardRecommendation;
  tokensUsed?: number;
  tokenQuotaRemaining?: number;
  tokenQuotaLimit?: number;
}

export const inventorySetupInterviewApi = {
  async start(): Promise<InvSetupInterviewSession> {
    const res = await api.post<InvSetupInterviewSession>("/inventory/setup-interview/start");
    return res.data;
  },

  async get(sessionId: string): Promise<InvSetupInterviewSession> {
    const res = await api.get<InvSetupInterviewSession>(
      `/inventory/setup-interview/session/${encodeURIComponent(sessionId)}`,
    );
    return res.data;
  },

  async sendMessage(sessionId: string, message: string): Promise<InvSetupInterviewMessageResponse> {
    const res = await api.post<InvSetupInterviewMessageResponse>(
      `/inventory/setup-interview/session/${encodeURIComponent(sessionId)}/message`,
      { message },
      { timeout: 120_000 },
    );
    return res.data;
  },

  async finish(sessionId: string): Promise<InvSetupInterviewFinishResponse> {
    const res = await api.post<InvSetupInterviewFinishResponse>(
      `/inventory/setup-interview/session/${encodeURIComponent(sessionId)}/finish`,
      {},
      { timeout: 120_000 },
    );
    return res.data;
  },
};
