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

const EMPTY_WIZARD_ANSWERS: WizardAnswers = {
  perishable: false,
  needBatchTracking: false,
  highVolumeUniform: false,
  priceVolatile: false,
  usesExpiryDates: false,
  seasonalStock: false,
  businessType: "",
  productDescription: "",
  stockTurnover: "",
  priceTrend: "",
  ownerNotes: "",
};

/** Encore may nest embedded Go structs — unwrap to a flat session payload. */
function unwrapInvSetupPayload(data: Record<string, unknown>): Record<string, unknown> {
  const nested =
    data.invSetupInterviewStartResponse ??
    data.InvSetupInterviewStartResponse;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return { ...(nested as Record<string, unknown>), tokensUsed: data.tokensUsed };
  }
  return data;
}

export function normalizeInvSetupSession(
  data: Partial<InvSetupInterviewSession> & { sessionId?: string },
): InvSetupInterviewSession {
  const raw = unwrapInvSetupPayload(data as unknown as Record<string, unknown>);
  const sessionId = String(raw.sessionId ?? data.sessionId ?? "");
  const messages = (raw.messages ?? data.messages) as InvSetupInterviewMessage[] | undefined;

  return {
    sessionId,
    phase: String(raw.phase ?? data.phase ?? "intro"),
    messages: Array.isArray(messages) ? messages : [],
    answersDraft: (raw.answersDraft as WizardAnswers | undefined) ?? data.answersDraft ?? EMPTY_WIZARD_ANSWERS,
    readyForRecommendation: Boolean(raw.readyForRecommendation ?? data.readyForRecommendation),
    tokenQuotaRemaining: Number(raw.tokenQuotaRemaining ?? data.tokenQuotaRemaining ?? 0),
    tokenQuotaLimit: Number(raw.tokenQuotaLimit ?? data.tokenQuotaLimit ?? 0),
    quotaNotice: String(raw.quotaNotice ?? data.quotaNotice ?? ""),
  };
}

export function mergeInvSetupSession(
  prev: InvSetupInterviewSession | null,
  data: Partial<InvSetupInterviewMessageResponse>,
): InvSetupInterviewSession {
  const incoming = normalizeInvSetupSession(data);
  if (!prev) return incoming;

  const prevNorm = normalizeInvSetupSession(prev);
  return {
    ...incoming,
    sessionId: incoming.sessionId || prevNorm.sessionId,
    messages: incoming.messages.length > 0 ? incoming.messages : prevNorm.messages,
    answersDraft: incoming.answersDraft.businessType || incoming.answersDraft.productDescription
      ? incoming.answersDraft
      : prevNorm.answersDraft,
  };
}

export const inventorySetupInterviewApi = {
  async start(): Promise<InvSetupInterviewSession> {
    const res = await api.post<InvSetupInterviewSession>("/inventory/setup-interview/start");
    return normalizeInvSetupSession(res.data);
  },

  async get(sessionId: string): Promise<InvSetupInterviewSession> {
    const res = await api.get<InvSetupInterviewSession>(
      `/inventory/setup-interview/session/${encodeURIComponent(sessionId)}`,
    );
    return normalizeInvSetupSession(res.data);
  },

  async sendMessage(sessionId: string, message: string): Promise<InvSetupInterviewMessageResponse> {
    const res = await api.post<InvSetupInterviewMessageResponse>(
      `/inventory/setup-interview/session/${encodeURIComponent(sessionId)}/message`,
      { message },
      { timeout: 120_000 },
    );
    return {
      ...normalizeInvSetupSession(res.data),
      tokensUsed: Number(res.data.tokensUsed ?? 0),
    };
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
