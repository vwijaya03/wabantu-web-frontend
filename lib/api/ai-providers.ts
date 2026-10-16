import { adminApi as api } from "./admin-client";

/**
 * Kontrak resmi: wabantu-api-go docs/API_AI_CONFIG.md §1 (branch be/h1-llm-master, admin/ai_config.go).
 * Semua endpoint superadmin-only (server cek role dari sesi).
 */

/** Fungsi yang diatur dari halaman ini (backend juga punya ocr/vision). */
export const AI_FUNCTIONS = ["chat", "intent", "memory", "payment_ocr", "embedding"] as const;
export type AIFunction = (typeof AI_FUNCTIONS)[number];

export const AI_PROVIDERS = ["openai", "anthropic", "gemini"] as const;
export type AIProviderId = (typeof AI_PROVIDERS)[number];

/** Model "" = default provider. */
export const PROVIDER_DEFAULT_MODEL = "";
export const MAX_CHAIN_LINKS = 3;
/** Embedding: satu model aktif per namespace (tanpa fallback lintas model). */
export const EMBEDDING_FUNCTION: AIFunction = "embedding";
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

export interface ChainLink {
  provider: AIProviderId;
  model: string;
  timeout_ms?: number;
}

export interface AIReindexInfo {
  tenants: number;
  /** inline = satu tenant; background = global, diproses bertahap di server */
  mode: "inline" | "background";
  fromModel: string;
  toModel: string;
  progressHint: string;
  queuedTenantId?: string;
}

export interface AIFunctionConfig {
  function: AIFunction;
  /** null = default global */
  tenantId: string | null;
  chain: ChainLink[];
  maxRetries: number;
  /** Hanya di respons PUT embedding yang mengganti model. */
  reindex?: AIReindexInfo;
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

/**
 * Sesuai dokumen: fungsi non-embedding hanya boleh anthropic/gemini (OpenAI tak punya adapter chat);
 * embedding hanya openai/gemini.
 */
export function providerAllowedFor(fn: AIFunction, p: AIProviderId): boolean {
  if (fn === EMBEDDING_FUNCTION) return p === "openai" || p === "gemini";
  return p === "anthropic" || p === "gemini";
}

/** Embedding tidak punya "default provider" untuk Gemini: model wajib eksplisit. */
export function allowsDefaultModel(fn: AIFunction, p: AIProviderId): boolean {
  return fn !== EMBEDDING_FUNCTION || p === "openai";
}

/**
 * Allowlist model untuk (fungsi, provider) dari katalog backend. payment_ocr hanya model vision;
 * embedding hanya model `embedding_only`.
 */
export function modelsFor(catalog: AICatalog | undefined, fn: AIFunction, p: AIProviderId): AIModelInfo[] {
  if (!catalog || !providerAllowedFor(fn, p)) return [];
  const wantStatus = fn === EMBEDDING_FUNCTION ? "embedding_only" : "supported";
  return catalog.models.filter(
    (m) => m.provider === p && m.status === wantStatus && (fn !== "payment_ocr" || m.vision),
  );
}

export function isModelValid(catalog: AICatalog | undefined, fn: AIFunction, p: AIProviderId, model: string): boolean {
  if (!providerAllowedFor(fn, p)) return false;
  if (model === PROVIDER_DEFAULT_MODEL) return allowsDefaultModel(fn, p);
  return modelsFor(catalog, fn, p).some((m) => m.id === model);
}

export function normalizeModel(catalog: AICatalog | undefined, fn: AIFunction, p: AIProviderId, model: string): string {
  if (isModelValid(catalog, fn, p, model)) return model;
  if (!allowsDefaultModel(fn, p)) return modelsFor(catalog, fn, p)[0]?.id ?? PROVIDER_DEFAULT_MODEL;
  return PROVIDER_DEFAULT_MODEL;
}

/** Id model efektif untuk perbandingan (OpenAI "" = text-embedding-3-small). */
export function effectiveEmbeddingModel(link: ChainLink | undefined): string {
  if (!link) return DEFAULT_EMBEDDING_MODEL;
  if (link.model) return link.model;
  return link.provider === "openai" ? DEFAULT_EMBEDDING_MODEL : "";
}

/** Apakah menyimpan `next` menggantikan model embedding yang aktif di `current`. */
export function embeddingModelChanged(current: ChainLink | undefined, next: ChainLink | undefined): boolean {
  return effectiveEmbeddingModel(current) !== effectiveEmbeddingModel(next);
}

export function validateChain(catalog: AICatalog | undefined, fn: AIFunction, chain: ChainLink[]): string | null {
  if (chain.length === 0) return "Provider utama wajib diisi.";
  if (fn === EMBEDDING_FUNCTION && chain.length !== 1) return "Embedding hanya boleh satu model (tanpa fallback).";
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
  /** `confirmReindex` wajib bila model embedding berganti (backend: 412 tanpa konfirmasi). */
  async saveConfig(cfg: AIFunctionConfig, opts?: { confirmReindex?: boolean }): Promise<AIFunctionConfig> {
    const res = await api.put<AIFunctionConfig>(`/admin/ai/function-config/${cfg.function}`, {
      tenantId: cfg.tenantId,
      chain: cfg.chain,
      maxRetries: cfg.maxRetries,
      ...(opts?.confirmReindex ? { confirmReindex: true } : {}),
    });
    return res.data;
  },
  /** Hapus override tenant saja (global tidak bisa dihapus). */
  async deleteTenantOverride(
    fn: AIFunction,
    tenantId: string,
    opts?: { confirmReindex?: boolean },
  ): Promise<{ deleted: boolean; reindex?: AIReindexInfo }> {
    return (
      await api.delete(`/admin/ai/function-config/${fn}`, {
        params: { tenantId, ...(opts?.confirmReindex ? { confirmReindex: true } : {}) },
      })
    ).data;
  },
};
