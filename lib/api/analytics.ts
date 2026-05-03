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
  /** Calendar day in `reportingTimezone`, aligned with “hari ini” on the dashboard. */
  today: {
    inbound: number;
    aiReplies: number;
    aiCoveragePct: number;
  };
  /** IANA zone used for `today.*` (copied from business profile). */
  reportingTimezone: string;
  /** Extra KPIs for the overview cards (rolling `windowDays`). */
  overview: {
    openRatePct: number | null;
    avgFirstResponseSec: number | null;
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
