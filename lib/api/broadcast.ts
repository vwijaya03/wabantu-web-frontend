import { api } from "./client";

export interface Campaign {
  id: string;
  name: string;
  messageBody: string;
  status: string;
  scheduledAt?: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

export const broadcastApi = {
  async list(): Promise<{ campaigns: Campaign[] }> {
    const res = await api.get("/broadcast/campaigns");
    return res.data;
  },
  async create(input: {
    name: string;
    messageBody: string;
    recipients: string[];
    scheduledAt?: string;
  }): Promise<{ campaign: Campaign }> {
    const res = await api.post("/broadcast/campaigns", input);
    return res.data;
  },
  async send(id: string): Promise<void> {
    await api.post(`/broadcast/campaigns/${id}/send`);
  },
};
