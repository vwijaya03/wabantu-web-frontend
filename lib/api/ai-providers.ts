import { api } from "./client";

/**
 * Kontrak AI provider config.
 *
 * Sumber kebenaran: wabantu-api-go branch be/h1-llm-master
 *  - system/migrations/25_ai_provider_config.up.sql  (tabel ai_providers, ai_function_config)
 *  - system/migrations/26_ai_payment_ocr_seed.up.sql (fungsi payment_ocr + seed Gemini)
 *  - shared/llm/config.go (ChainLink: provider, model, timeout_ms; "" = model default provider)
 *  - ai/models.go (katalog model Anthropic)
 *  - shared/llm/gemini.go (default model Gemini: gemini-2.5-flash)
 *
 * TODO(BE): backend BELUM punya endpoint admin untuk membaca/menulis ai_function_config.
 * Path di bawah adalah USULAN (belum ada di backend) dan akan 404 sampai BE menambahkannya.
 */
export const AI_CONFIG_ENDPOINT_PROPOSED = "/admin/ai/function-config";

export const AI_FUNCTIONS = ["chat", "intent", "memory", "payment_ocr"] as const;
export type AIFunction = (typeof AI_FUNCTIONS)[number];

export const AI_PROVIDERS = ["openai", "anthropic", "gemini"] as const;
export type AIProviderId = (typeof AI_PROVIDERS)[number];

/** Model "" berarti default provider (perilaku legacy di backend). */
export const PROVIDER_DEFAULT_MODEL = "";

export interface ChainLink {
  provider: AIProviderId;
  model: string;
  timeout_ms?: number;
}

export interface AIFunctionConfig {
  function: AIFunction;
  /** null = default global */
  tenantId: string | null;
  /** chain[0] = utama, chain[1] = fallback (opsional) */
  chain: ChainLink[];
  maxRetries: number;
}

export interface AIModelOption {
  id: string;
  label: string;
  status: "active" | "legacy";
}

/**
 * Katalog model per provider, disalin dari konstanta backend (bukan dari API):
 * GET /api/v1/ai/models hanya mengembalikan model Anthropic dan tanpa info provider/vision.
 * Model berstatus "retired" di backend sengaja tidak ditampilkan.
 * OpenAI: backend belum mendaftarkan provider chat OpenAI (hanya embedding), jadi kosong.
 */
export const MODEL_CATALOG: Record<AIProviderId, AIModelOption[]> = {
  anthropic: [
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", status: "active" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", status: "active" },
    { id: "claude-opus-4-7", label: "Claude Opus 4.7", status: "legacy" },
    { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5", status: "legacy" },
  ],
  gemini: [{ id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", status: "active" }],
  openai: [],
};

/** Provider yang didukung backend untuk fungsi-fungsi ini (OpenAI belum ada adapter chat). */
export function providerSupported(p: AIProviderId): boolean {
  return p !== "openai";
}

export function isModelValidForProvider(provider: AIProviderId, model: string): boolean {
  if (!providerSupported(provider)) return false;
  if (model === PROVIDER_DEFAULT_MODEL) return true;
  return MODEL_CATALOG[provider].some((m) => m.id === model);
}

/** Saat provider diganti: pertahankan model bila masih valid, kalau tidak reset ke default provider. */
export function normalizeModel(provider: AIProviderId, model: string): string {
  return isModelValidForProvider(provider, model) ? model : PROVIDER_DEFAULT_MODEL;
}

export function validateChain(chain: ChainLink[]): string | null {
  if (chain.length === 0) return "Provider utama wajib diisi.";
  for (const [i, l] of chain.entries()) {
    const label = i === 0 ? "Utama" : "Fallback";
    if (!providerSupported(l.provider)) return `${label}: provider ${l.provider} belum didukung backend.`;
    if (!isModelValidForProvider(l.provider, l.model))
      return `${label}: model ${l.model} bukan milik provider ${l.provider}.`;
  }
  if (chain.length > 1 && chain[0].provider === chain[1].provider && chain[0].model === chain[1].model)
    return "Fallback tidak boleh sama dengan provider utama.";
  return null;
}

export const aiProvidersApi = {
  /** USULAN — endpoint belum ada di backend. */
  async listConfigs(tenantId: string | null): Promise<{ configs: AIFunctionConfig[] }> {
    const res = await api.get(AI_CONFIG_ENDPOINT_PROPOSED, {
      params: tenantId ? { tenantId } : undefined,
    });
    return res.data;
  },
  /** USULAN — endpoint belum ada di backend. */
  async saveConfig(cfg: AIFunctionConfig): Promise<{ config: AIFunctionConfig }> {
    const res = await api.put(`${AI_CONFIG_ENDPOINT_PROPOSED}/${cfg.function}`, cfg);
    return res.data;
  },
  /** USULAN — hapus override tenant (kembali ke default global). */
  async deleteTenantOverride(fn: AIFunction, tenantId: string): Promise<void> {
    await api.delete(`${AI_CONFIG_ENDPOINT_PROPOSED}/${fn}`, { params: { tenantId } });
  },
};
