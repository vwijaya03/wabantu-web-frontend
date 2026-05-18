import { api } from "./client";

export interface AdminTenant {
  id: string;
  companyName: string;
  schemaName: string;
  planTier: string;
  isActive: boolean;
  ownerEmail?: string;
  createdAt: string;
}

export const adminApi = {
  async listTenants(): Promise<{ tenants: AdminTenant[]; total: number }> {
    const res = await api.get("/admin/tenants");
    return res.data;
  },
  async impersonate(tenantId: string): Promise<{ token: string; expiresAt: string }> {
    const res = await api.post(`/admin/impersonate/${tenantId}`);
    return res.data;
  },
  async stopImpersonation(): Promise<void> {
    await api.post("/admin/stop-impersonation");
  },
};
