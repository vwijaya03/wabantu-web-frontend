import { api } from "./client";

export interface WhatsappChannel {
  id: string;
  provider: "meta_cloud" | "baileys";
  displayName: string;
  phoneNumber: string;
  metaPhoneNumberId: string | null;
  metaWabaId: string | null;
  status: "connected" | "disconnected" | "error" | "pending";
  lastError: string | null;
  connectedAt: string | null;
}

export interface MetaConnectInitInput {
  redirectUri: string;
}

export interface MetaConnectInitResult {
  state: string;
  oauthUrl: string;
  expiresInSeconds: number;
}

export interface MetaConnectCallbackInput {
  code: string;
  state: string;
  displayName: string;
  phoneNumber: string;
  metaPhoneNumberId?: string;
  metaWabaId?: string;
}

export const whatsappApi = {
  async list(): Promise<WhatsappChannel[]> {
    const res = await api.get<WhatsappChannel[]>("/whatsapp/channels");
    return res.data;
  },
  async initMetaConnect(
    input: MetaConnectInitInput,
  ): Promise<MetaConnectInitResult> {
    const res = await api.post<MetaConnectInitResult>(
      "/whatsapp/meta/connect/init",
      input,
    );
    return res.data;
  },
  async completeMetaConnect(
    input: MetaConnectCallbackInput,
  ): Promise<WhatsappChannel> {
    const res = await api.post<WhatsappChannel>(
      "/whatsapp/meta/connect/callback",
      input,
    );
    return res.data;
  },
  async disconnect(id: string): Promise<WhatsappChannel> {
    const res = await api.delete<WhatsappChannel>(`/whatsapp/channels/${id}`);
    return res.data;
  },
};
