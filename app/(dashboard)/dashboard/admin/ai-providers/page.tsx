"use client";

import { useAdminSession } from "@/hooks/use-admin-session";
import { AdminSessionRequired } from "@/components/admin/require-admin-session";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/dashboard/page-header";
import { adminApi } from "@/lib/api/admin";
import { toApiError } from "@/lib/api/client";
import { useLocale } from "@/lib/i18n/locale";
import {
  AI_FUNCTIONS,
  AI_PROVIDERS,
  PROVIDER_DEFAULT_MODEL,
  aiProvidersApi,
  modelsFor,
  normalizeModel,
  providerAllowedFor,
  validateChain,
  type AICatalog,
  type AIFunction,
  type AIFunctionConfig,
  type AIProviderId,
  type ChainLink,
} from "@/lib/api/ai-providers";

const GLOBAL = "__global__";
const DEFAULT_MODEL_VALUE = "__default__";
const NO_FALLBACK = "__none__";

const FUNCTION_LABELS: Record<AIFunction, { title: string; desc: string }> = {
  chat: { title: "Chat (balasan otomatis)", desc: "Membalas pesan pembeli/reseller." },
  intent: { title: "Intent", desc: "Klasifikasi maksud pesan." },
  memory: { title: "Memory", desc: "Ringkasan percakapan & memori pelanggan." },
  payment_ocr: { title: "OCR Bukti Transfer", desc: "Membaca bukti transfer (vision)." },
};

const PROVIDER_LABELS: Record<AIProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
};

/** Fungsi tanpa baris config memakai default kode backend: Anthropic, model default (API_AI_CONFIG.md §1). */
function codeDefault(fn: AIFunction, tenantId: string | null): AIFunctionConfig {
  return { function: fn, tenantId, chain: [{ provider: "anthropic", model: PROVIDER_DEFAULT_MODEL }], maxRetries: 1 };
}

function LinkEditor({
  label,
  link,
  fn,
  catalog,
  onChange,
}: {
  label: string;
  link: ChainLink;
  fn: AIFunction;
  catalog: AICatalog;
  onChange: (l: ChainLink) => void;
}) {
  const { t } = useLocale();
  const models = modelsFor(catalog, fn, link.provider);
  const info = catalog.providers.find((p) => p.id === link.provider);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="space-y-1">
        <Label>{label} — provider</Label>
        <Select
          value={link.provider}
          onValueChange={(v) => {
            const provider = v as AIProviderId;
            onChange({ ...link, provider, model: normalizeModel(catalog, fn, provider, link.model) });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AI_PROVIDERS.map((p) => (
              <SelectItem key={p} value={p} disabled={!providerAllowedFor(fn, p)}>
                {PROVIDER_LABELS[p]}
                {providerAllowedFor(fn, p) ? "" : " (belum didukung untuk fungsi ini)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {info && (!info.enabled || !info.available) && (
          <p className="text-xs text-amber-600">
            {!info.enabled ? "Provider dinonaktifkan" : "Kredensial belum terpasang"} — link ini akan dilewati saat runtime.
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Label>{label} — model</Label>
        <Select
          value={link.model === PROVIDER_DEFAULT_MODEL ? DEFAULT_MODEL_VALUE : link.model}
          onValueChange={(v) =>
            onChange({ ...link, model: v === DEFAULT_MODEL_VALUE ? PROVIDER_DEFAULT_MODEL : v })
          }
          disabled={!providerAllowedFor(fn, link.provider)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_MODEL_VALUE}>{t("Default provider")}</SelectItem>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function FunctionCard({
  fn,
  initial,
  isOverride,
  backendReady,
  tenantId,
  catalog,
}: {
  catalog: AICatalog;
  fn: AIFunction;
  initial: AIFunctionConfig;
  isOverride: boolean;
  backendReady: boolean;
  tenantId: string | null;
}) {
  const { t } = useLocale();
  const qc = useQueryClient();
  const [cfg, setCfg] = useState<AIFunctionConfig>(initial);

  const error = validateChain(catalog, fn, cfg.chain);
  const primary = cfg.chain[0];
  const fallback = cfg.chain[1];

  const saveMut = useMutation({
    mutationFn: () => aiProvidersApi.saveConfig({ ...cfg, tenantId }),
    onSuccess: () => {
      toast.success(`Konfigurasi ${FUNCTION_LABELS[fn].title} disimpan`);
      void qc.invalidateQueries({ queryKey: ["admin", "ai-providers"] });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });
  const resetMut = useMutation({
    mutationFn: () => aiProvidersApi.deleteTenantOverride(fn, tenantId as string),
    onSuccess: () => {
      toast.success(t("Override tenant dihapus, kembali ke default global"));
      void qc.invalidateQueries({ queryKey: ["admin", "ai-providers"] });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  return (
    <Card className={error ? "border-destructive/50" : undefined}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{FUNCTION_LABELS[fn].title}</CardTitle>
          <Badge variant="outline">{fn}</Badge>
          {tenantId && (
            <Badge variant={isOverride ? "default" : "secondary"}>
              {isOverride ? "Override tenant" : "Ikut default global"}
            </Badge>
          )}
        </div>
        <CardDescription>{FUNCTION_LABELS[fn].desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LinkEditor
          label="Utama"
          fn={fn}
          catalog={catalog}
          link={primary}
          onChange={(l) => setCfg({ ...cfg, chain: [l, ...cfg.chain.slice(1)] })}
        />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Fallback</Label>
            <Select
              value={fallback ? "on" : NO_FALLBACK}
              onValueChange={(v) =>
                setCfg({
                  ...cfg,
                  chain:
                    v === NO_FALLBACK
                      ? [primary]
                      : [primary, { provider: primary.provider === "anthropic" ? "gemini" : "anthropic", model: PROVIDER_DEFAULT_MODEL }],
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FALLBACK}>{t("Tanpa fallback")}</SelectItem>
                <SelectItem value="on">{t("Pakai fallback")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {fallback && (
            <LinkEditor
              label="Fallback"
              fn={fn}
              catalog={catalog}
              link={fallback}
              onChange={(l) => setCfg({ ...cfg, chain: [primary, l] })}
            />
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          onClick={() => saveMut.mutate()}
          disabled={Boolean(error) || !backendReady || saveMut.isPending}
        >
          {saveMut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Simpan
        </Button>
        {tenantId && isOverride && (
          <Button variant="outline" className="ml-2" onClick={() => resetMut.mutate()} disabled={resetMut.isPending}>
            Hapus override
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function AIProvidersPage() {
  const { t } = useLocale();
  const { isAdmin } = useAdminSession();
  const [tenantSel, setTenantSel] = useState<string>(GLOBAL);
  const tenantId = tenantSel === GLOBAL ? null : tenantSel;

  const tenantsQuery = useQuery({
    queryKey: ["admin", "tenants", "ai-providers"],
    queryFn: () => adminApi.listTenants({ pageSize: 100 }),
    enabled: isAdmin,
  });

  const catalogQuery = useQuery({
    queryKey: ["admin", "ai-providers", "catalog"],
    queryFn: aiProvidersApi.getCatalog,
    enabled: isAdmin,
    retry: false,
  });

  const configsQuery = useQuery({
    queryKey: ["admin", "ai-providers", tenantId],
    queryFn: () => aiProvidersApi.listConfigs(tenantId),
    enabled: isAdmin,
    retry: false,
  });

  if (!isAdmin) {
    return <AdminSessionRequired />;
  }

  const backendReady = configsQuery.isSuccess && catalogQuery.isSuccess;
  const loadError = configsQuery.error ?? catalogQuery.error;
  const configs = configsQuery.data?.configs ?? [];

  const resolve = (fn: AIFunction): { cfg: AIFunctionConfig; isOverride: boolean } => {
    const own = configs.find((c) => c.function === fn && (c.tenantId ?? null) === tenantId);
    if (own) return { cfg: own, isOverride: tenantId !== null };
    const global = configs.find((c) => c.function === fn && c.tenantId == null);
    return { cfg: global ?? codeDefault(fn, tenantId), isOverride: false };
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t("AI Providers")}
        description={t("Pilih provider, model, dan fallback per fungsi AI. Perubahan berlaku tanpa redeploy (cache backend ≤30 detik).")}
      />

      {loadError && (
        <Card className="border-amber-500/50">
          <CardContent className="flex gap-2 pt-6 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Gagal memuat konfigurasi AI dari backend ({toApiError(loadError).message}). Endpoint belum
              tersedia di backend yang terhubung, atau Anda tidak punya akses. Pengeditan dinonaktifkan.
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cakupan</CardTitle>
          <CardDescription>
            Default global berlaku untuk semua tenant, kecuali tenant punya override sendiri.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={tenantSel} onValueChange={setTenantSel}>
            <SelectTrigger className="w-full sm:w-96">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GLOBAL}>{t("Default global (semua tenant)")}</SelectItem>
              {(tenantsQuery.data?.tenants ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {configsQuery.isLoading || catalogQuery.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : !backendReady || !catalogQuery.data ? null : (
        <div className="grid gap-4 lg:grid-cols-2">
          {AI_FUNCTIONS.map((fn) => {
            const { cfg, isOverride } = resolve(fn);
            return (
              <FunctionCard
                key={`${fn}-${tenantSel}-${configsQuery.dataUpdatedAt}`}
                fn={fn}
                initial={cfg}
                isOverride={isOverride}
                backendReady={backendReady}
                tenantId={tenantId}
                catalog={catalogQuery.data}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
