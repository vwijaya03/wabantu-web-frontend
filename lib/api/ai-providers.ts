import { api } from "./client";

/**
 * Kontrak resmi: wabantu-api-go docs/API_AI_CONFIG.md §1 (branch be/h1-llm-master, admin/ai_config.go).
 * Semua endpoint superadmin-only (server cek role dari sesi).
 */

/** Fungsi yang diatur dari halaman ini (backend juga punya ocr/vision/embedding). */
export const AI_FUNCTIONS = ["chat", "intent", "memory", "payment_ocr"] as const;
export type AIFunction = (typeof AI_FUNCTIONS)[number];

export const AI_PROVIDERS = ["openai", "anthropic", "gemini"] as const;
export type AIProviderId = (typeof AI_PROVIDERS)[number];

/** Model "" = default provider. */
export const PROVIDER_DEFAULT_MODEL = "";
export const MAX_CHAIN_LINKS = 3;

export interface ChainLink {
  provider: AIProviderId;
  model: string;
  timeout_ms?: number;
}

export interface AIFunctionConfig {
  function: AIFunction;
  /** null = default global */
  tenantId: string | null;
  chain: ChainLink[];
  maxRetries: number;
}

export interface AIProviderInfo {
  id: AIProviderId;
  enabled: boolean;
  /** kredensial ada saat runtime; link yang tidak available akan dilewati */
  available: boolean;
}

export interface AIModelInfo {
  provider: AIProviderId;
  id: string;
  label: string;
  status: "supported" | "embedding_only";
  vision: boolean;
}

export interface AICatalog {
  providers: AIProviderInfo[];
  models: AIModelInfo[];
}

/** Sesuai dokumen: fungsi non-embedding hanya boleh anthropic/gemini; OpenAI tak punya adapter chat. */
export function providerAllowedFor(_fn: AIFunction, p: AIProviderId): boolean {
  return p === "anthropic" || p === "gemini";
}

/** Allowlist model untuk (fungsi, provider) dari katalog backend. payment_ocr hanya model vision. */
export function modelsFor(catalog: AICatalog | undefined, fn: AIFunction, p: AIProviderId): AIModelInfo[] {
  if (!catalog || !providerAllowedFor(fn, p)) return [];
  return catalog.models.filter(
    (m) => m.provider === p && m.status === "supported" && (fn !== "payment_ocr" || m.vision),
  );
}

export function isModelValid(catalog: AICatalog | undefined, fn: AIFunction, p: AIProviderId, model: string): boolean {
  if (!providerAllowedFor(fn, p)) return false;
  if (model === PROVIDER_DEFAULT_MODEL) return true;
  return modelsFor(catalog, fn, p).some((m) => m.id === model);
}

export function normalizeModel(catalog: AICatalog | undefined, fn: AIFunction, p: AIProviderId, model: string): string {
  return isModelValid(catalog, fn, p, model) ? model : PROVIDER_DEFAULT_MODEL;
}

export function validateChain(catalog: AICatalog | undefined, fn: AIFunction, chain: ChainLink[]): string | null {
  if (chain.length === 0) return "Provider utama wajib diisi.";
  if (chain.length > MAX_CHAIN_LINKS) return `Maksimal ${MAX_CHAIN_LINKS} link.`;
  const seen = new Set<string>();
  for (const [i, l] of chain.entries()) {
    const label = i === 0 ? "Utama" : "Fallback";
    if (!providerAllowedFor(fn, l.provider)) return `${label}: provider ${l.provider} belum didukung untuk fungsi ini.`;
    if (!isModelValid(catalog, fn, l.provider, l.model))
      return `${label}: model ${l.model} tidak diizinkan untuk provider ${l.provider}.`;
    const key = `${l.provider}|${l.model}`;
    if (seen.has(key)) return "Fallback tidak boleh sama dengan link lain.";
    seen.add(key);
    if (l.timeout_ms !== undefined && (l.timeout_ms < 0 || l.timeout_ms > 60000))
      return `${label}: timeout harus 0–60000 ms.`;
  }
  return null;
}

export const aiProvidersApi = {
  async getCatalog(): Promise<AICatalog> {
    return (await api.get<AICatalog>("/admin/ai/catalog")).data;
  },
  async listConfigs(tenantId: string | null): Promise<{ configs: AIFunctionConfig[] }> {
    const res = await api.get("/admin/ai/function-config", { params: tenantId ? { tenantId } : undefined });
    return res.data;
  },
  async saveConfig(cfg: AIFunctionConfig): Promise<AIFunctionConfig> {
    const res = await api.put<AIFunctionConfig>(`/admin/ai/function-config/${cfg.function}`, {
      tenantId: cfg.tenantId,
      chain: cfg.chain,
      maxRetries: cfg.maxRetries,
    });
    return res.data;
  },
  /** Hapus override tenant saja (global tidak bisa dihapus). */
  async deleteTenantOverride(fn: AIFunction, tenantId: string): Promise<{ deleted: boolean }> {
    return (await api.delete(`/admin/ai/function-config/${fn}`, { params: { tenantId } })).data;
  },
};
