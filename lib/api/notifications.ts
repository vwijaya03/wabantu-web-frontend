import { api } from "./client";

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  linkPath?: string;
  readAt?: string | null;
  createdAt: string;
}

export const notificationsApi = {
  async list(): Promise<{
    notifications: AppNotification[];
    unreadCount: number;
  }> {
    const res = await api.get("/notifications");
    return res.data;
  },

  async markRead(id: string): Promise<{ ok: boolean }> {
    const res = await api.post(`/notifications/${id}/read`);
    return res.data;
  },
};
