import { api } from "./client";

export type TenantReadiness = {
  ready: boolean;
  baseProvisioned: boolean;
  cloudReady: boolean;
  patchVersion: number;
  patchCurrent: number;
  migrating: boolean;
};

export const tenantApi = {
  async readiness(signal?: AbortSignal): Promise<TenantReadiness> {
    const res = await api.get<TenantReadiness>("/tenant/readiness", { signal });
    return res.data;
  },
};
