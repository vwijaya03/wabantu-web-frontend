import { api } from "./client";

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

export const inboxApi = {
  async list(params: {
    search?: string;
    unreadOnly?: boolean;
    aiHandled?: boolean;
  } = {}): Promise<InboxConversation[]> {
    const res = await api.get<InboxConversation[]>("/inbox/conversations", { params });
    return res.data;
  },
  async messages(conversationId: string): Promise<InboxMessage[]> {
    const res = await api.get<InboxMessage[]>(
      `/inbox/conversations/${conversationId}/messages`,
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
