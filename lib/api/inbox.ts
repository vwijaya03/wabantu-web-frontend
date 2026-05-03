import { api } from "./client";

export const INBOX_UNREAD_QUERY_KEY = ["inbox-unread-summary"] as const;

export interface InboxConversation {
  id: string;
  status: "open" | "pending" | "closed" | "snoozed";
  aiHandled: boolean;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  assignedToName: string | null;
  handoffReason: string | null;
  contact: {
    id: string;
    displayName: string | null;
    phoneNumber: string;
    tags: string[];
  };
  channel: {
    id: string;
    displayName: string;
    phoneNumber: string;
  };
}

export interface InboxMessage {
  id: string;
  conversationId: string;
  externalId: string | null;
  direction: "in" | "out";
  author: "contact" | "ai" | "human" | "system";
  type: "text" | "image" | "audio" | "video" | "document" | "location";
  body: string | null;
  status: "sent" | "delivered" | "read" | "failed";
  createdAt: string;
}

export interface InboxConversationsPage {
  items: InboxConversation[];
  nextCursor: string | null;
}

export interface InboxMessagesPage {
  messages: InboxMessage[];
  /** Keyset (base64url JSON: `{ createdAt, id }`) for older messages; preferred. */
  nextCursor: string | null;
  /** Set only if the request used `offset` instead of `cursor`. */
  nextOffset: number | null;
}

export interface InboxUnreadSummary {
  totalUnreadMessages: number;
}

export const inboxApi = {
  async unreadSummary(): Promise<InboxUnreadSummary> {
    const res = await api.get<InboxUnreadSummary>("/inbox/unread-summary");
    return res.data;
  },

  async listPage(params: {
    search?: string;
    unreadOnly?: boolean;
    aiHandled?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<InboxConversationsPage> {
    const res = await api.get<InboxConversationsPage>("/inbox/conversations", {
      params: {
        search: params.search || undefined,
        unreadOnly: params.unreadOnly,
        aiHandled: params.aiHandled,
        limit: params.limit,
        cursor: params.cursor,
      },
    });
    return res.data;
  },

  async messagesPage(
    conversationId: string,
    params: { limit?: number; offset?: number; cursor?: string },
  ): Promise<InboxMessagesPage> {
    const res = await api.get<InboxMessagesPage>(
      `/inbox/conversations/${conversationId}/messages`,
      {
        params: {
          limit: params.limit,
          offset: params.offset,
          cursor: params.cursor,
        },
      },
    );
    return res.data;
  },

  async markAsRead(conversationId: string): Promise<void> {
    await api.patch(`/inbox/conversations/${conversationId}/read`);
  },

  async handoff(conversationId: string, reason?: string): Promise<void> {
    await api.post(`/inbox/conversations/${conversationId}/handoff`, { reason });
  },

  async resumeAi(conversationId: string): Promise<void> {
    await api.post(`/inbox/conversations/${conversationId}/ai-resume`);
  },

  async sendMessage(conversationId: string, body: string): Promise<void> {
    await api.post(`/inbox/conversations/${conversationId}/messages`, { body });
  },
};
