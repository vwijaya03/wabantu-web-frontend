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

export interface MigrateTenantSchemasResult {
  patched: number;
  failed: number;
  errors?: string[];
}

export const adminApi = {
  async listTenants(): Promise<{ tenants: AdminTenant[]; total: number }> {
    const res = await api.get("/admin/tenants");
    return res.data;
  },
  async migrateTenantSchemas(): Promise<MigrateTenantSchemasResult> {
    const res = await api.post<MigrateTenantSchemasResult>(
      "/admin/migrate-tenant-schemas",
    );
    return res.data;
  },
  async impersonate(tenantId: string): Promise<{ ok: boolean; tenant: AdminTenant }> {
    const res = await api.post(`/admin/impersonate/${tenantId}`);
    return res.data;
  },
  async stopImpersonation(): Promise<{ ok: boolean; message: string }> {
    const res = await api.post("/admin/stop-impersonation");
    return res.data;
  },
};
