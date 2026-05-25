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

export interface AdminTenantListParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface MigrateTenantSchemasResult {
  patched: number;
  failed: number;
  errors?: string[];
}

export const adminApi = {
  async listTenants(params?: AdminTenantListParams): Promise<{
    tenants: AdminTenant[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const res = await api.get("/admin/tenants", { params });
    return res.data;
  },
  async updateTenantPlan(
    tenantId: string,
    planCode: "starter" | "business" | "pro",
  ): Promise<{ tenant: AdminTenant }> {
    const res = await api.put(`/admin/tenant/${tenantId}/plan`, { planCode });
    return res.data;
  },
  async deleteTenant(
    tenantId: string,
    confirmSchemaName: string,
  ): Promise<{ ok: boolean; tenantId: string; schemaName: string }> {
    const res = await api.delete(`/admin/tenant/${tenantId}`, {
      data: { confirmSchemaName },
    });
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
