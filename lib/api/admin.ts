import { api } from "./client";

export const CURRENT_SCHEMA_PATCH_VERSION = 1;

export interface AdminTenant {
  id: string;
  companyName: string;
  schemaName: string;
  planTier: string;
  isActive: boolean;
  ownerEmail?: string;
  createdAt: string;
  schemaMigratedAt?: string;
  schemaPatchVersion: number;
  isSchemaBehind: boolean;
  isSchemaMigrating: boolean;
}

export interface AdminTenantListParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface SchemaMigrationItem {
  tenantId: string;
  schemaName: string;
  ok: boolean;
  error?: string;
  schemaMigratedAt?: string;
  schemaPatchVersion?: number;
}

export interface MigrateTenantSchemasResult {
  async?: boolean;
  jobId?: string;
  enqueued?: number;
  patched: number;
  failed: number;
  errors?: string[];
  results?: SchemaMigrationItem[];
}

export interface SchemaMigrationJobSummary {
  jobId: string;
  patchVersion: number;
  status: string;
  totalCount: number;
  doneCount: number;
  failedCount: number;
  startedBy?: string;
  createdAt: string;
  completedAt?: string;
  recentErrors?: string[];
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
      params: { confirmSchemaName },
    });
    return res.data;
  },
  async migrateTenantSchemas(input?: {
    tenantIds?: string[];
    mode?: "behind" | "selected" | "";
  }): Promise<MigrateTenantSchemasResult> {
    const res = await api.post<MigrateTenantSchemasResult>(
      "/admin/migrate-tenant-schemas",
      input ?? {},
    );
    return res.data;
  },
  async getMigrateJob(jobId: string): Promise<SchemaMigrationJobSummary> {
    const res = await api.get<SchemaMigrationJobSummary>(
      `/admin/migrate-tenant-schemas/jobs/${jobId}`,
    );
    return res.data;
  },
  async listActiveMigrateJobs(): Promise<{ jobs: SchemaMigrationJobSummary[] }> {
    const res = await api.get<{ jobs: SchemaMigrationJobSummary[] }>(
      "/admin/migrate-tenant-schemas/active-jobs",
    );
    return res.data;
  },
  async cancelMigrateJob(jobId: string): Promise<SchemaMigrationJobSummary> {
    const res = await api.post<SchemaMigrationJobSummary>(
      `/admin/migrate-tenant-schemas/jobs/${jobId}/cancel`,
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
