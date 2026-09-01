import { api } from "./client";

export interface WhatsappChannel {
  id: string;
  provider: "meta_cloud" | "baileys";
  displayName: string;
  phoneNumber: string;
  metaPhoneNumberId: string | null;
  metaWabaId: string | null;
  metaAppId: string | null;
  status: "connected" | "disconnected" | "error" | "pending";
  lastError: string | null;
  connectedAt: string | null;
}

export interface MetaConnectInitInput {
  redirectUri: string;
  metaAppId: string;
  metaAppSecret: string;
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

interface ListChannelsResponse {
  items: WhatsappChannel[];
}

export const whatsappApi = {
  async list(): Promise<WhatsappChannel[]> {
    const res = await api.get<ListChannelsResponse | WhatsappChannel[]>(
      "/whatsapp/channels",
    );
    const data = res.data;
    return Array.isArray(data) ? data : data.items;
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
  async removePermanent(id: string): Promise<{ id: string; message: string }> {
    const res = await api.delete<{ id: string; message: string }>(
      `/whatsapp/channels/${id}/permanent`,
    );
    return res.data;
  },
};
