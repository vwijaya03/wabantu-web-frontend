import { api } from "./client";

export type InboxReportCategory =
  | "wrong_answer"
  | "bug"
  | "rude"
  | "off_topic"
  | "other";

export type AITriageReportStatus = "open" | "confirmed" | "dismissed";

export interface InboxMessageReport {
  id: string;
  tenantId: string;
  tenantSchema: string;
  conversationId: string;
  inboundId?: string;
  outboundMessageId: string;
  userText?: string;
  replyText?: string;
  path?: string;
  category: InboxReportCategory;
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

export const inboxReportApi = {
  async getMessageReport(messageId: string): Promise<{ reported: boolean; reportId?: string }> {
    const res = await api.get(`/inbox/messages/${messageId}/report`);
    return res.data;
  },

  async reportMessage(
    messageId: string,
    params: { category: InboxReportCategory; reporterNote?: string },
  ): Promise<{ report: InboxMessageReport }> {
    const res = await api.post(`/inbox/messages/${messageId}/report`, params);
    return res.data;
  },
};

export const REPORT_CATEGORY_OPTIONS: { value: InboxReportCategory; label: string }[] = [
  { value: "wrong_answer", label: "Jawaban salah" },
  { value: "bug", label: "Bug sistem" },
  { value: "rude", label: "Tidak sopan" },
  { value: "off_topic", label: "Off-topic" },
  { value: "other", label: "Lainnya" },
];
