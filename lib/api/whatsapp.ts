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

export interface ConnectChannelInput {
  provider: "meta_cloud" | "baileys";
  displayName: string;
  phoneNumber: string;
  accessToken?: string;
  metaPhoneNumberId?: string;
  metaWabaId?: string;
}

export const whatsappApi = {
  async list(): Promise<WhatsappChannel[]> {
    const res = await api.get<WhatsappChannel[]>("/whatsapp/channels");
    return res.data;
  },
  async connect(input: ConnectChannelInput): Promise<WhatsappChannel> {
    const res = await api.post<WhatsappChannel>("/whatsapp/channels", input);
    return res.data;
  },
  async disconnect(id: string): Promise<WhatsappChannel> {
    const res = await api.delete<WhatsappChannel>(`/whatsapp/channels/${id}`);
    return res.data;
  },
};
