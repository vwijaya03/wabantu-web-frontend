import { api } from "./client";

export interface SetupInterviewMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SetupInterviewProfileDraft {
  businessName?: string | null;
  description?: string | null;
  address?: string | null;
  openingHours?: string | null;
  productsServices?: string | null;
  basePricing?: string | null;
  deliveryArea?: string | null;
}

export interface SetupInterviewFAQDraft {
  question: string;
  answer: string;
  category?: string;
  include: boolean;
}

export interface SetupInterviewSession {
  sessionId: string;
  phase: string;
  messages: SetupInterviewMessage[];
  profileDraft: SetupInterviewProfileDraft;
  faqDrafts: SetupInterviewFAQDraft[];
  readyForReview: boolean;
  tokenQuotaRemaining: number;
  tokenQuotaLimit: number;
  quotaNotice: string;
}

export interface SetupInterviewMessageResponse extends SetupInterviewSession {
  tokensUsed: number;
}

export interface SetupInterviewPublishInput {
  profile?: Partial<SetupInterviewProfileDraft & { tone?: string; greetingTemplate?: string }>;
  faq: Array<{
    question: string;
    answer: string;
    category?: string;
    include: boolean;
  }>;
}

export interface SetupInterviewPublishResult {
  profileUpdated: boolean;
  faqPublished: number;
  faqSkipped: number;
  message: string;
}

export const setupInterviewApi = {
  async start(): Promise<SetupInterviewSession> {
    const res = await api.post<SetupInterviewSession>("/business/setup-interview/start");
    return res.data;
  },

  async get(sessionId: string): Promise<SetupInterviewSession> {
    const res = await api.get<SetupInterviewSession>(
      `/business/setup-interview/session/${encodeURIComponent(sessionId)}`,
    );
    return res.data;
  },

  async sendMessage(sessionId: string, message: string): Promise<SetupInterviewMessageResponse> {
    const res = await api.post<SetupInterviewMessageResponse>(
      `/business/setup-interview/session/${encodeURIComponent(sessionId)}/message`,
      { message },
      { timeout: 120_000 },
    );
    return res.data;
  },

  async publish(
    sessionId: string,
    input: SetupInterviewPublishInput,
  ): Promise<SetupInterviewPublishResult> {
    const res = await api.post<SetupInterviewPublishResult>(
      `/business/setup-interview/session/${encodeURIComponent(sessionId)}/publish`,
      input,
    );
    return res.data;
  },
};
