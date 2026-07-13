"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, ExternalLink, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { adminApi } from "@/lib/api/admin";
import {
  aiTriageAdminApi,
  type AITriageAnomaly,
  type AITriageJob,
  type AITriageJobStatus,
} from "@/lib/api/ai-triage";
import { toApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const TRIAGE_TABS = ["mencurigakan", "investigasi"] as const;
type TriageTabId = (typeof TRIAGE_TABS)[number];

function parseTriageTab(value: string | null): TriageTabId {
  if (value && TRIAGE_TABS.includes(value as TriageTabId)) {
    return value as TriageTabId;
  }
  return "mencurigakan";
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function jobStatusLabel(status: AITriageJobStatus): string {
  switch (status) {
    case "pending":
      return "Menunggu";
    case "running":
      return "Berjalan";
    case "pr_ready":
      return "PR siap";
    case "failed":
      return "Gagal";
    default:
      return status;
  }
}

function jobStatusVariant(status: AITriageJobStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "pr_ready":
      return "default";
    case "failed":
      return "destructive";
    case "running":
      return "secondary";
    default:
      return "outline";
  }
}

function isJobActive(status: AITriageJobStatus): boolean {
  return status === "pending" || status === "running";
}

function CopyableMono({ value, label }: { value: string; label: string }) {
  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} disalin`);
    } catch {
      toast.error("Gagal menyalin");
    }
  };
  return (
    <div className="flex items-start gap-1">
      <code className="max-w-[240px] break-all text-[11px] leading-snug">{value}</code>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={copy}
        title={`Salin ${label}`}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

function JobStatusPanel({ job }: { job: AITriageJob }) {
  const analysis = job.analysis;
  const deterministicMismatches =
    analysis?.mismatches?.filter((m) => !m.skipped && m.actualPath !== m.expectedPath) ?? [];

  return (
    <Card className="mt-6 border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Status loop triage</CardTitle>
          <Badge variant={jobStatusVariant(job.status)}>{jobStatusLabel(job.status)}</Badge>
        </div>
        <CardDescription>
          Job <CopyableMono value={job.id} label="Job ID" />
          {isJobActive(job.status) ? " — memperbarui otomatis setiap 3 detik" : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {analysis ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded border px-3 py-2">
              <p className="text-xs text-muted-foreground">Pesan dimuat</p>
              <p className="font-medium">{analysis.messagesLoaded}</p>
            </div>
            <div className="rounded border px-3 py-2">
              <p className="text-xs text-muted-foreground">Turn dicek</p>
              <p className="font-medium">{analysis.turnsChecked}</p>
            </div>
            <div className="rounded border px-3 py-2">
              <p className="text-xs text-muted-foreground">Turn dilewati</p>
              <p className="font-medium">{analysis.turnsSkipped}</p>
            </div>
            <div className="rounded border px-3 py-2">
              <p className="text-xs text-muted-foreground">Mismatch deterministik</p>
              <p className="font-medium">
                {analysis.hasDeterministicMismatch ? "Ya" : "Tidak"}
                {deterministicMismatches.length > 0
                  ? ` (${deterministicMismatches.length})`
                  : null}
              </p>
            </div>
          </div>
        ) : null}

        {job.errorText ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
            {job.errorText}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {job.githubRunUrl ? (
            <Button variant="outline" size="sm" asChild>
              <a href={job.githubRunUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                GitHub Actions
              </a>
            </Button>
          ) : null}
          {job.prUrl ? (
            <Button size="sm" asChild>
              <a href={job.prUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Buka draft PR
              </a>
            </Button>
          ) : null}
        </div>

        {deterministicMismatches.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Detail mismatch</p>
            {deterministicMismatches.slice(0, 5).map((m) => (
              <div key={m.inboundId} className="rounded border px-3 py-2 text-xs">
                <CopyableMono value={m.inboundId} label="Inbound ID" />
                <p className="mt-1 whitespace-pre-wrap break-words">{m.userText || "—"}</p>
                <p className="mt-1">
                  <Badge variant="outline" className="mr-1">
                    {m.actualPath || "—"}
                  </Badge>
                  →
                  <Badge variant="secondary" className="ml-1">
                    {m.expectedPath || "—"}
                  </Badge>
                </p>
              </div>
            ))}
            {deterministicMismatches.length > 5 ? (
              <p className="text-xs text-muted-foreground">
                +{deterministicMismatches.length - 5} mismatch lainnya
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function AdminAITriagePage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTriageTab(searchParams.get("tab"));

  const [tenantId, setTenantId] = useState(searchParams.get("tenantId") ?? "");
  const [conversationId, setConversationId] = useState(searchParams.get("conversationId") ?? "");
  const [inboundId, setInboundId] = useState(searchParams.get("inboundId") ?? "");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => adminApi.listTenants(),
    enabled: user?.role === "super_admin",
  });

  const tenants = useMemo(() => tenantsData?.tenants ?? [], [tenantsData?.tenants]);
  const effectiveTenantId =
    tenantId || user?.tenant?.id || tenants[0]?.id || "";

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === effectiveTenantId),
    [tenants, effectiveTenantId],
  );

  const { data: anomaliesData, isLoading: anomaliesLoading } = useQuery({
    queryKey: ["admin-ai-triage-anomalies", effectiveTenantId],
    queryFn: () => aiTriageAdminApi.listAnomalies(effectiveTenantId, { limit: 50 }),
    enabled: user?.role === "super_admin" && Boolean(effectiveTenantId),
  });

  const { data: jobData } = useQuery({
    queryKey: ["admin-ai-triage-job", activeJobId],
    queryFn: () => aiTriageAdminApi.getJob(activeJobId!),
    enabled: user?.role === "super_admin" && Boolean(activeJobId),
    refetchInterval: (query) => {
      const status = query.state.data?.job.status;
      return status && isJobActive(status) ? 3000 : false;
    },
  });

  const createJobMut = useMutation({
    mutationFn: aiTriageAdminApi.createJob,
    onSuccess: (res) => {
      setActiveJobId(res.job.id);
      toast.success("Loop triage dimulai");
    },
    onError: (e) => {
      const err = toApiError(e);
      if (err.code === "resource_exhausted") {
        toast.error("Antrian penuh — maks. 3 job triage bersamaan");
        return;
      }
      toast.error(err.message);
    },
  });

  const setTab = (id: TriageTabId) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", id);
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  const runLoop = (params: { conversationId: string; inboundId?: string }) => {
    if (!effectiveTenantId) {
      toast.error("Pilih tenant terlebih dahulu");
      return;
    }
    if (!params.conversationId.trim()) {
      toast.error("conversationId wajib diisi");
      return;
    }
    createJobMut.mutate({
      tenantId: effectiveTenantId,
      conversationId: params.conversationId.trim(),
      inboundId: params.inboundId?.trim() || undefined,
    });
  };

  const runLoopFromAnomaly = (row: AITriageAnomaly) => {
    if (!row.conversationId) {
      toast.error("Baris ini tidak punya conversationId");
      return;
    }
    runLoop({
      conversationId: row.conversationId,
      inboundId: row.inboundId,
    });
  };

  const loopBusy =
    createJobMut.isPending ||
    (jobData?.job != null && isJobActive(jobData.job.status));

  if (user?.role !== "super_admin") {
    return (
      <PageHeader
        title="AI Triage Loop"
        description="Halaman ini hanya untuk super admin platform."
      />
    );
  }

  return (
    <>
      <PageHeader
        title="AI Triage Loop"
        description="Internal — investigasi routing AI, generate regression test, dan draft PR otomatis."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Tenant</p>
          <Select
            value={effectiveTenantId}
            onValueChange={setTenantId}
            disabled={tenantsLoading || tenants.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/admin/ai-activity">Log aktivitas AI</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/admin">← Konsol platform</Link>
        </Button>
      </div>

      {selectedTenant ? (
        <p className="mb-4 font-mono text-xs text-muted-foreground">
          {selectedTenant.schemaName} · {selectedTenant.ownerEmail || "—"}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["mencurigakan", "Mencurigakan"],
            ["investigasi", "Investigasi"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              tab === id ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "mencurigakan" ? (
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas AI terbaru</CardTitle>
            <CardDescription>
              Event ai_activity 1 jam terakhir per tenant. Tombol loop hanya untuk baris dengan
              path deterministik (reviewSuggested).
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {anomaliesLoading ? (
              <p className="text-sm text-muted-foreground">Memuat…</p>
            ) : (anomaliesData?.anomalies ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Belum ada aktivitas AI 1 jam terakhir untuk tenant ini.
              </p>
            ) : (
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Waktu</th>
                    <th className="pb-2 pr-3 font-medium">Pesan masuk</th>
                    <th className="pb-2 pr-3 font-medium">Path</th>
                    <th className="pb-2 pr-3 font-medium">Reason</th>
                    <th className="pb-2 pr-3 font-medium">Conversation ID</th>
                    <th className="pb-2 pr-3 font-medium">Inbound ID</th>
                    <th className="pb-2 pr-3 font-medium">Review</th>
                    <th className="pb-2 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(anomaliesData?.anomalies ?? []).map((row, i) => (
                    <tr key={`${row.createdAt}-${row.inboundId ?? i}`} className="border-b border-border/60 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs">
                        {formatTime(row.createdAt)}
                      </td>
                      <td className="py-2 pr-3 max-w-[280px] text-xs whitespace-pre-wrap break-words">
                        {row.userText || (
                          <span className="text-muted-foreground italic">Tidak tersedia</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline">{row.path || "—"}</Badge>
                      </td>
                      <td className="py-2 pr-3 max-w-[160px] text-xs text-muted-foreground whitespace-pre-wrap break-words">
                        {row.reason || "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <CopyableMono value={row.conversationId ?? ""} label="Conversation ID" />
                      </td>
                      <td className="py-2 pr-3">
                        <CopyableMono value={row.inboundId ?? ""} label="Inbound ID" />
                      </td>
                      <td className="py-2 pr-3">
                        {row.reviewSuggested ? (
                          <Badge variant="secondary">Perlu review</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">LLM</span>
                        )}
                      </td>
                      <td className="py-2">
                        {row.reviewSuggested && row.conversationId ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loopBusy}
                            onClick={() => runLoopFromAnomaly(row)}
                          >
                            {createJobMut.isPending ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Play className="mr-1 h-3.5 w-3.5" />
                            )}
                            Jalankan loop
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "investigasi" ? (
        <Card>
          <CardHeader>
            <CardTitle>Investigasi manual</CardTitle>
            <CardDescription>
              Masukkan conversationId (wajib) dan inboundId opsional untuk fokus pada pesan masuk
              tertentu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-lg">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Conversation ID</p>
              <Input
                value={conversationId}
                onChange={(e) => setConversationId(e.target.value)}
                placeholder="UUID percakapan"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Inbound ID (opsional)
              </p>
              <Input
                value={inboundId}
                onChange={(e) => setInboundId(e.target.value)}
                placeholder="UUID pesan masuk — anchor window"
                className="font-mono text-sm"
              />
            </div>
            <Button
              disabled={loopBusy || !conversationId.trim()}
              onClick={() => runLoop({ conversationId, inboundId })}
            >
              {createJobMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Jalankan loop
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {jobData?.job ? <JobStatusPanel job={jobData.job} /> : null}
    </>
  );
}
