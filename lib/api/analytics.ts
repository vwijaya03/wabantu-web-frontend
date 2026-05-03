import { api } from "./client";

export interface AnalyticsOverview {
  windowDays: number;
  totals: {
    totalMessages: number;
    inboundMessages: number;
    aiReplies: number;
    humanReplies: number;
    leadsGenerated: number;
    unreadConversations: number;
  };
  kpis: {
    aiCoveragePct: number;
    handoffRatePct: number;
    conversionEstimatePct: number;
  };
  topQuestions: Array<{ question: string; count: number }>;
}

export const analyticsApi = {
  async overview(days = 30): Promise<AnalyticsOverview> {
    const res = await api.get<AnalyticsOverview>("/analytics/overview", {
      params: { days },
    });
    return res.data;
  },
};
