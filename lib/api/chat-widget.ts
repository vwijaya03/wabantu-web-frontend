import axios from "axios";
import { api } from "@/lib/api/client";
import { env } from "@/lib/env";

export type ChatWidgetConfig = {
  enabled: boolean;
  welcomeMessage?: string;
  personaName?: string;
  position: string;
  locale: string;
  allowedDomains: string[];
  customTokens?: Record<string, unknown>;
  updatedAt?: string;
};

export type PublicChatConfig = {
  enabled: boolean;
  welcomeMessage?: string;
  personaName?: string;
  position: string;
  locale: string;
  tokens?: Record<string, unknown>;
};

export type ChatSession = {
  sessionId: string;
  visitorToken: string;
  welcomeMessage?: string;
};

export type ChatMessage = {
  id: string;
  role: string;
  body: string;
  contentType: string;
  createdAt: string;
};

const publicApi = axios.create({
  baseURL: env.apiUrl,
  timeout: 30_000,
});

export const chatWidgetApi = {
  getConfig() {
    return api.get<ChatWidgetConfig>("/api/v1/chat-widget/config").then((r) => r.data);
  },
  updateConfig(body: Partial<ChatWidgetConfig> & { enabled: boolean }) {
    return api.put<ChatWidgetConfig>("/api/v1/chat-widget/config", body).then((r) => r.data);
  },
  embedSnippet() {
    return api.get<{ html: string }>("/api/v1/chat-widget/embed-snippet").then((r) => r.data);
  },
  publicConfig(tenantSlug: string) {
    return publicApi
      .get<PublicChatConfig>(`/api/v1/public/chat/${tenantSlug}/config`)
      .then((r) => r.data);
  },
  createSession(tenantSlug: string) {
    return publicApi
      .post<ChatSession>(`/api/v1/public/chat/${tenantSlug}/sessions`)
      .then((r) => r.data);
  },
  postMessage(tenantSlug: string, sessionId: string, body: string, visitorToken: string, clientMessageId?: string) {
    return publicApi
      .post<{ visitor: { id: string }; reply: ChatMessage }>(
        `/api/v1/public/chat/${tenantSlug}/sessions/${sessionId}/messages`,
        { body, visitorToken, clientMessageId },
      )
      .then((r) => r.data);
  },
  listMessages(tenantSlug: string, sessionId: string, visitorToken: string) {
    return publicApi
      .get<{ items: ChatMessage[] }>(
        `/api/v1/public/chat/${tenantSlug}/sessions/${sessionId}/messages`,
        { params: { visitorToken } },
      )
      .then((r) => r.data);
  },
};
