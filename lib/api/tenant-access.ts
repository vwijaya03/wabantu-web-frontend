import { api } from "./client";

export type AccessScope = "full" | "limited";
export type AccessRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "revoked"
  | "expired";

export interface TenantAccessRequest {
  id: string;
  requesterAccountId: string;
  requesterEmail?: string;
  requesterName?: string;
  tenantId: string;
  tenantName?: string;
  reason: string;
  requestedScope: AccessScope;
  requestedModules: string[];
  status: AccessRequestStatus;
  grantedScope?: AccessScope;
  grantedModules?: string[];
  durationHours?: number | null;
  expiresAt?: string | null;
  respondedBy?: string;
  respondedAt?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccessRequestPayload {
  tenantId: string;
  reason: string;
  requestedScope: AccessScope;
  requestedModules?: string[];
}

export interface RespondAccessRequestPayload {
  action: "approve" | "reject";
  grantedScope?: AccessScope;
  grantedModules?: string[];
  durationHours?: number | null;
  rejectReason?: string;
}

export const tenantAccessApi = {
  async listMine(params?: { tenantId?: string }): Promise<{
    requests: TenantAccessRequest[];
  }> {
    const res = await api.get("/admin/tenant-access-requests", { params });
    return res.data;
  },

  async create(
    payload: CreateAccessRequestPayload,
  ): Promise<{ request: TenantAccessRequest }> {
    const res = await api.post("/admin/tenant-access-requests", payload);
    return res.data;
  },

  async listForTenant(): Promise<{ requests: TenantAccessRequest[] }> {
    const res = await api.get("/tenant-access-requests");
    return res.data;
  },

  async respond(
    id: string,
    payload: RespondAccessRequestPayload,
  ): Promise<{ request: TenantAccessRequest }> {
    const res = await api.post(`/tenant-access-requests/${id}/respond`, payload);
    return res.data;
  },

  async revoke(id: string): Promise<{ request: TenantAccessRequest }> {
    const res = await api.post(`/tenant-access-requests/${id}/revoke`);
    return res.data;
  },
};

/** True when an approved grant is still within its expiry window. */
export function isAccessGrantActive(request: TenantAccessRequest): boolean {
  if (request.status !== "approved") return false;
  if (!request.expiresAt) return true;
  return new Date(request.expiresAt).getTime() > Date.now();
}

/** Latest actionable access state for a tenant (requester view). */
export function resolveTenantAccessState(
  requests: TenantAccessRequest[],
  tenantId: string,
): {
  status: AccessRequestStatus | "none";
  request?: TenantAccessRequest;
  canImpersonate: boolean;
} {
  const forTenant = requests
    .filter((r) => r.tenantId === tenantId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

  const activeApproved = forTenant.find(isAccessGrantActive);
  if (activeApproved) {
    return { status: "approved", request: activeApproved, canImpersonate: true };
  }

  const pending = forTenant.find((r) => r.status === "pending");
  if (pending) {
    return { status: "pending", request: pending, canImpersonate: false };
  }

  const latest = forTenant[0];
  if (!latest) {
    return { status: "none", canImpersonate: false };
  }

  return {
    status: latest.status,
    request: latest,
    canImpersonate: false,
  };
}
