"use client";

import { useAdminSession } from "@/hooks/use-admin-session";
import { AdminSessionRequired } from "@/components/admin/require-admin-session";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bot, Search } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminApi, type AdminTenant } from "@/lib/api/admin";
import { toApiError } from "@/lib/api/client";
import {
  LLM_FIRST_KEY,
  LLM_FIRST_KILL_KEY,
  LLM_FIRST_SHADOW_KEY,
  llmFirstApi,
  resolveLLMFirstMode,
  type LLMFirstMode,
} from "@/lib/api/llm-first";
import { useLocale } from "@/lib/i18n/locale";

const FLAGS_KEY = ["admin-llm-first-flags"];
const MODES: LLMFirstMode[] = ["off", "shadow", "on"];

function modeVariant(mode: LLMFirstMode): "default" | "secondary" | "outline" {
  return mode === "on" ? "default" : mode === "shadow" ? "secondary" : "outline";
}

const nf = new Intl.NumberFormat("id-ID");
const usd = (v: number) => `$${v.toFixed(v < 1 ? 4 : 2)}`;
const idr = (v: number) => `Rp ${nf.format(Math.round(v))}`;

function KillSwitchCard({ enabled, loading }: { enabled: boolean; loading: boolean }) {
  const { t } = useLocale();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mut = useMutation({
    mutationFn: (value: boolean) => llmFirstApi.setKill(value),
    onSuccess: (f) => {
      void qc.invalidateQueries({ queryKey: FLAGS_KEY });
      toast.success(f.enabledGlobally ? t("LLM-first dimatikan untuk semua tenant.") : t("Kill switch dilepas."));
    },
    onError: (e) => toast.error(toApiError(e).message),
    onSettled: () => setConfirmOpen(false),
  });

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("Kill switch global")}</CardTitle>
        <CardDescription>
          {t("Flag")} <code>{LLM_FIRST_KILL_KEY}</code>: {t("bila aktif, LLM-first mati untuk semua tenant.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Badge variant={enabled ? "destructive" : "outline"}>
          {loading ? "…" : enabled ? t("AKTIF — semua tenant dimatikan") : t("Tidak aktif")}
        </Badge>
        <Button
          variant={enabled ? "outline" : "destructive"}
          disabled={loading || mut.isPending}
          onClick={() => (enabled ? mut.mutate(false) : setConfirmOpen(true))}
        >
          {enabled ? t("Lepas kill switch") : t("Aktifkan kill switch")}
        </Button>
      </CardContent>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Matikan LLM-first untuk semua tenant?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Semua tenant kembali ke pipeline lama sampai kill switch dilepas.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Batal")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => mut.mutate(true)}>{t("Ya, matikan")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function UsagePanel({ tenant }: { tenant: AdminTenant | null }) {
  const { t } = useLocale();
  const [days, setDays] = useState<7 | 30>(7);
  const q = useQuery({
    queryKey: ["admin-llm-first-usage", tenant?.id, days],
    queryFn: () => llmFirstApi.usage(tenant!.id, days),
    enabled: Boolean(tenant),
    refetchOnWindowFocus: false,
    retry: false,
  });
  const u = q.data;

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {t("Pemakaian LLM-first")}
              {tenant ? ` — ${tenant.companyName}` : ""}
            </CardTitle>
            <CardDescription>{t("Pilih tenant di tabel (tombol Lihat pemakaian).")}</CardDescription>
          </div>
          <div className="flex gap-1">
            {([7, 30] as const).map((d) => (
              <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>
                {d} {t("hari")}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!tenant ? (
          <p className="text-muted-foreground">{t("Belum ada tenant dipilih.")}</p>
        ) : q.isLoading ? (
          <p className="text-muted-foreground">{t("Memuat…")}</p>
        ) : q.isError ? (
          <p className="text-destructive">{toApiError(q.error).message}</p>
        ) : !u || u.totals.messages === 0 ? (
          <p className="text-muted-foreground">{t("Belum ada data pemakaian untuk periode ini.")}</p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label={t("Pesan")} value={nf.format(u.totals.messages)} sub={`${nf.format(u.totals.liveMessages)} live · ${nf.format(u.totals.shadowMessages)} shadow`} />
              <Stat label="Fallback" value={nf.format(u.totals.fallbacks)} />
              <Stat label="Token in / out / thoughts" value={`${nf.format(u.totals.inputTokens)} / ${nf.format(u.totals.outputTokens)} / ${nf.format(u.totals.thoughtsTokens)}`} />
              <Stat
                label={t("Estimasi biaya total")}
                value={usd(u.totals.estimatedCostUsd)}
                sub={
                  u.totals.unknownCostMessages > 0
                    ? `${nf.format(u.totals.unknownCostMessages)} ${t("pesan")}: ${t("harga belum diketahui")}`
                    : idr(u.totals.estimatedCostUsd * u.idrPerUsd)
                }
              />
            </div>
            <div className="rounded border p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {t("Rata-rata per pesan")} (1 USD = {idr(u.idrPerUsd)})
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <div>{usd(u.avgPerMessage.costUsd)} · {idr(u.avgPerMessage.costIdr)}</div>
                <div>
                  Token in/out/thoughts: {nf.format(Math.round(u.avgPerMessage.inputTokens))} /{" "}
                  {nf.format(Math.round(u.avgPerMessage.outputTokens))} /{" "}
                  {nf.format(Math.round(u.avgPerMessage.thoughtsTokens))}
                </div>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-1 pr-2">{t("Tanggal")}</th>
                    <th className="pb-1 pr-2">Mode</th>
                    <th className="pb-1 pr-2 text-right">{t("Pesan")}</th>
                    <th className="pb-1 pr-2 text-right">In</th>
                    <th className="pb-1 pr-2 text-right">Out</th>
                    <th className="pb-1 pr-2 text-right">Thoughts</th>
                    <th className="pb-1 text-right">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {(u.byDay ?? []).map((d) => (
                    <tr key={`${d.date}-${d.mode}`} className="border-t">
                      <td className="py-1 pr-2 whitespace-nowrap">{d.date}</td>
                      <td className="py-1 pr-2">{d.mode}</td>
                      <td className="py-1 pr-2 text-right">{nf.format(d.messages)}</td>
                      <td className="py-1 pr-2 text-right">{nf.format(d.inputTokens)}</td>
                      <td className="py-1 pr-2 text-right">{nf.format(d.outputTokens)}</td>
                      <td className="py-1 pr-2 text-right">{nf.format(d.thoughtsTokens)}</td>
                      <td className="py-1 text-right">
                        {usd(d.estimatedCostUsd)}
                        {d.unknownCostMessages > 0 ? (
                          <span className="ml-1 text-amber-700 dark:text-amber-400">
                            (+{d.unknownCostMessages} {t("harga belum diketahui")})
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(u.byModel ?? []).length > 0 ? (
              <div className="rounded border p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">{t("Per model")}</p>
                <ul className="space-y-0.5 text-xs">
                  {u.byModel.map((m) => (
                    <li key={m.model} className="flex justify-between gap-2">
                      <span className="font-mono">{m.model}</span>
                      <span>
                        {nf.format(m.messages)} {t("pesan")} ·{" "}
                        {m.costKnown ? usd(m.estimatedCostUsd) : t("harga belum diketahui")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export default function AdminLLMFirstPage() {
  const { t } = useLocale();
  const { isAdmin } = useAdminSession();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [selected, setSelected] = useState<AdminTenant | null>(null);
  const [confirmOn, setConfirmOn] = useState<AdminTenant | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const flagsQuery = useQuery({
    queryKey: FLAGS_KEY,
    queryFn: () => llmFirstApi.listFlags(),
    enabled: isAdmin,
    refetchOnWindowFocus: false,
  });
  const tenantsQuery = useQuery({
    queryKey: ["admin-tenants-llm-first", search, page, pageSize],
    queryFn: () => adminApi.listTenants({ q: search || undefined, page, pageSize }),
    enabled: isAdmin,
  });

  const flags = flagsQuery.data ?? [];
  const liveIds = flags.find((f) => f.key === LLM_FIRST_KEY)?.tenantIds ?? [];
  const shadowIds = flags.find((f) => f.key === LLM_FIRST_SHADOW_KEY)?.tenantIds ?? [];
  const killOn = flags.find((f) => f.key === LLM_FIRST_KILL_KEY)?.enabledGlobally ?? false;

  const tenants = tenantsQuery.data?.tenants ?? [];
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((tenantsQuery.data?.total ?? 0) / pageSize)),
    [tenantsQuery.data?.total],
  );

  const setMode = useMutation({
    mutationFn: ({ tenant, mode }: { tenant: AdminTenant; mode: LLMFirstMode }) =>
      llmFirstApi.setTenantMode(tenant.id, mode),
    onMutate: ({ tenant }) => setSavingId(tenant.id),
    onSuccess: (_r, { tenant, mode }) => {
      toast.success(`${tenant.companyName}: mode ${mode}`);
      void qc.invalidateQueries({ queryKey: FLAGS_KEY });
    },
    onError: (e) => {
      toast.error(`${t("Gagal menyimpan mode")}: ${toApiError(e).message}`);
      void qc.invalidateQueries({ queryKey: FLAGS_KEY });
    },
    onSettled: () => setSavingId(null),
  });

  if (!isAdmin) return <AdminSessionRequired />;

  const requestMode = (tenant: AdminTenant, mode: LLMFirstMode) => {
    if (mode === "on") setConfirmOn(tenant);
    else setMode.mutate({ tenant, mode });
  };

  return (
    <>
      <PageHeader
        title={t("AI LLM-first")}
        description={t("Kelola Pelayan Toko LLM-first: kill switch global, mode per tenant, dan pemakaian token/biaya.")}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/dashboard/admin">{t("← Konsol Platform")}</Link>
        </Button>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <p>
          Jangan nyalakan ai_llm_first di Encore Cloud sebelum GeminiAPIKey tersedia; di Cloud Run set chain chat ke
          gemini-3.1-flash-lite via AI Provider.
        </p>
      </div>

      {flagsQuery.isError ? (
        <p className="mb-4 text-sm text-destructive">{toApiError(flagsQuery.error).message}</p>
      ) : null}

      <KillSwitchCard enabled={killOn} loading={flagsQuery.isLoading} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="size-4" />
            Tenant ({tenantsQuery.data?.total ?? 0})
          </CardTitle>
          <CardDescription>
            {t("Perubahan flag butuh hingga 60 detik untuk berlaku (cache TTL).")} on = {LLM_FIRST_KEY} (menang atas
            shadow); shadow = {LLM_FIRST_SHADOW_KEY}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    setSearch(q.trim());
                  }
                }}
                placeholder={t("Cari tenant, email owner, atau schema…")}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                setSearch(q.trim());
              }}
            >
              {t("Cari")}
            </Button>
          </div>

          {tenantsQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("Memuat…")}</p>
          ) : tenants.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("Tenant tidak ditemukan.")}</p>
          ) : (
            tenants.map((tn) => {
              const mode = resolveLLMFirstMode(tn.id, liveIds, shadowIds);
              const busy = savingId === tn.id;
              return (
                <div
                  key={tn.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded border p-3 ${
                    selected?.id === tn.id ? "border-primary" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{tn.companyName}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{tn.schemaName}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={modeVariant(mode)}>{mode}</Badge>
                    <Select
                      value={mode}
                      disabled={flagsQuery.isLoading || flagsQuery.isError || busy}
                      onValueChange={(v) => {
                        if (v !== mode) requestMode(tn, v as LLMFirstMode);
                      }}
                    >
                      <SelectTrigger className="w-28" aria-label={`Mode ${tn.companyName}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODES.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => setSelected(tn)}>
                      {t("Lihat pemakaian")}
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          {(tenantsQuery.data?.total ?? 0) > pageSize && (
            <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
              <span>
                {t("Halaman")} {page} / {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  {t("Sebelumnya")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t("Berikutnya")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <UsagePanel tenant={selected} />

      <AlertDialog open={Boolean(confirmOn)} onOpenChange={(o) => !o && setConfirmOn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Nyalakan LLM-first untuk tenant ini?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmOn?.companyName}: {t("pipeline LLM-first akan membalas pembeli sungguhan.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Batal")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmOn) setMode.mutate({ tenant: confirmOn, mode: "on" });
                setConfirmOn(null);
              }}
            >
              {t("Ya, nyalakan")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
