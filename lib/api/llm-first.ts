import { adminApi as adminHttp } from "./admin-client";

export const LLM_FIRST_KEY = "ai_llm_first";
export const LLM_FIRST_SHADOW_KEY = "ai_llm_first_shadow";
export const LLM_FIRST_KILL_KEY = "ai_llm_first_kill";

export const LLM_FIRST_FLAG_DESCRIPTIONS: Record<string, string> = {
  [LLM_FIRST_KEY]: "Pelayan Toko LLM-first: pipeline menjawab pembeli (per tenant)",
  [LLM_FIRST_SHADOW_KEY]: "LLM-first shadow: jalankan pipeline, log saja, tidak kirim balasan",
  [LLM_FIRST_KILL_KEY]: "Kill switch LLM-first (enabled_globally=true matikan semua)",
};

export type LLMFirstMode = "off" | "shadow" | "on";

export interface FeatureFlag {
  key: string;
  enabledGlobally: boolean;
  tenantIds: string[];
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LLMFirstUsageTotals {
  messages: number;
  liveMessages: number;
  shadowMessages: number;
  fallbacks: number;
  inputTokens: number;
  outputTokens: number;
  thoughtsTokens: number;
  estimatedCostUsd: number;
  unknownCostMessages: number;
}

export interface LLMFirstUsageAvg {
  inputTokens: number;
  outputTokens: number;
  thoughtsTokens: number;
  costUsd: number;
  costIdr: number;
}

export interface LLMFirstUsageDay {
  date: string;
  mode: string;
  messages: number;
  inputTokens: number;
  outputTokens: number;
  thoughtsTokens: number;
  estimatedCostUsd: number;
  unknownCostMessages: number;
}

export interface LLMFirstUsageModel {
  model: string;
  messages: number;
  estimatedCostUsd: number;
  costKnown: boolean;
}

export interface LLMFirstUsage {
  tenantId: string;
  days: number;
  totals: LLMFirstUsageTotals;
  avgPerMessage: LLMFirstUsageAvg;
  byDay: LLMFirstUsageDay[];
  byModel: LLMFirstUsageModel[];
  idrPerUsd: number;
}

/** Mode efektif tenant: `on` menang atas `shadow`. */
export function resolveLLMFirstMode(
  tenantId: string,
  liveIds: readonly string[],
  shadowIds: readonly string[],
): LLMFirstMode {
  if (liveIds.includes(tenantId)) return "on";
  if (shadowIds.includes(tenantId)) return "shadow";
  return "off";
}

/** Hitung daftar tenantIds baru untuk kedua flag (tenant dikeluarkan lalu ditambahkan ke yang sesuai). */
export function applyLLMFirstMode(
  tenantId: string,
  mode: LLMFirstMode,
  liveIds: readonly string[],
  shadowIds: readonly string[],
): { live: string[]; shadow: string[] } {
  const live = liveIds.filter((id) => id !== tenantId);
  const shadow = shadowIds.filter((id) => id !== tenantId);
  if (mode === "on") live.push(tenantId);
  if (mode === "shadow") shadow.push(tenantId);
  return { live, shadow };
}

function normalize(f: FeatureFlag): FeatureFlag {
  return { ...f, tenantIds: f.tenantIds ?? [] };
}

export const llmFirstApi = {
  async listFlags(): Promise<FeatureFlag[]> {
    const res = await adminHttp.get<{ flags: FeatureFlag[] }>("/flags");
    return (res.data?.flags ?? []).map(normalize);
  },
  async createFlag(key: string): Promise<FeatureFlag> {
    const res = await adminHttp.post<FeatureFlag>("/flags", {
      key,
      enabledGlobally: false,
      tenantIds: [],
      description: LLM_FIRST_FLAG_DESCRIPTIONS[key] ?? "",
    });
    return normalize(res.data);
  },
  /** Ambil flag; buat dulu bila belum ada. */
  async ensureFlag(key: string, flags: FeatureFlag[]): Promise<FeatureFlag> {
    const found = flags.find((f) => f.key === key);
    if (found) return found;
    return llmFirstApi.createFlag(key);
  },
  async patchTenantIds(key: string, tenantIds: string[]): Promise<FeatureFlag> {
    const res = await adminHttp.patch<FeatureFlag>(`/flags/${encodeURIComponent(key)}`, { tenantIds });
    return normalize(res.data);
  },
  async setKill(enabledGlobally: boolean): Promise<FeatureFlag> {
    const flags = await llmFirstApi.listFlags();
    const existing = flags.find((f) => f.key === LLM_FIRST_KILL_KEY);
    if (!existing) {
      const res = await adminHttp.post<FeatureFlag>("/flags", {
        key: LLM_FIRST_KILL_KEY,
        enabledGlobally,
        tenantIds: [],
        description: LLM_FIRST_FLAG_DESCRIPTIONS[LLM_FIRST_KILL_KEY],
      });
      return normalize(res.data);
    }
    const res = await adminHttp.patch<FeatureFlag>(`/flags/${encodeURIComponent(LLM_FIRST_KILL_KEY)}`, {
      enabledGlobally,
    });
    return normalize(res.data);
  },
  /**
   * Read-modify-write kedua flag: re-fetch dulu agar tidak menimpa perubahan lain,
   * lalu PATCH hanya flag yang daftarnya berubah.
   */
  async setTenantMode(tenantId: string, mode: LLMFirstMode): Promise<{ live: string[]; shadow: string[] }> {
    const flags = await llmFirstApi.listFlags();
    const liveFlag = await llmFirstApi.ensureFlag(LLM_FIRST_KEY, flags);
    const shadowFlag = await llmFirstApi.ensureFlag(LLM_FIRST_SHADOW_KEY, flags);
    const next = applyLLMFirstMode(tenantId, mode, liveFlag.tenantIds, shadowFlag.tenantIds);
    const changed = (a: string[], b: string[]) => a.length !== b.length || a.some((id, i) => id !== b[i]);
    // Shadow dulu bila menuju `on` tidak penting: `on` menang; urutan aman untuk kedua arah.
    if (changed(shadowFlag.tenantIds, next.shadow)) await llmFirstApi.patchTenantIds(LLM_FIRST_SHADOW_KEY, next.shadow);
    if (changed(liveFlag.tenantIds, next.live)) await llmFirstApi.patchTenantIds(LLM_FIRST_KEY, next.live);
    return next;
  },
  async usage(tenantId: string, days: 7 | 30): Promise<LLMFirstUsage | null> {
    try {
      const res = await adminHttp.get<LLMFirstUsage>("/admin/ai/llm-first/usage", {
        params: { tenantId, days },
      });
      return res.data ?? null;
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      throw e;
    }
  },
};
