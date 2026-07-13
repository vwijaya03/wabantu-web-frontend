"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Loader2, Play, Sparkles } from "lucide-react";
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
  type AITriageLLMFinding,
  type AITriageLLMScanStatus,
} from "@/lib/api/ai-triage";
import { toApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const TRIAGE_TABS = ["mencurigakan", "ai-review", "investigasi"] as const;
type TriageTabId = (typeof TRIAGE_TABS)[number];

function formatDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultScanWindow(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 60 * 60 * 1000);
  return { from: formatDatetimeLocal(from), to: formatDatetimeLocal(to) };
}

function toRFC3339(dtLocal: string): string {
  return new Date(dtLocal).toISOString();
}

function llmScanStatusLabel(status: AITriageLLMScanStatus): string {
  switch (status) {
    case "pending":
      return "Menunggu";
    case "running":
      return "Memindai";
    case "done":
      return "Selesai";
    case "failed":
      return "Gagal";
    default:
      return status;
  }
}

function severityVariant(severity?: string): "default" | "secondary" | "destructive" | "outline" {
  switch (severity?.toLowerCase()) {
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    default:
      return "outline";
  }
}

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

function truncateId(id: string, len = 8): string {
  if (id.length <= len) return id;
  return `${id.slice(0, len)}…`;
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
          Job <span className="font-mono">{truncateId(job.id, 12)}</span>
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
                <p className="font-mono text-muted-foreground">{truncateId(m.inboundId, 12)}</p>
                <p className="mt-1 line-clamp-2">{m.userText || "—"}</p>
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
  const [scanFrom, setScanFrom] = useState(defaultScanWindow().from);
  const [scanTo, setScanTo] = useState(defaultScanWindow().to);
  const [scanConversationId, setScanConversationId] = useState("");
  const [activeLLMScanId, setActiveLLMScanId] = useState<string | null>(null);

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

  const { data: llmScanData } = useQuery({
    queryKey: ["admin-ai-triage-llm-scan", activeLLMScanId],
    queryFn: () => aiTriageAdminApi.getLLMScan(activeLLMScanId!),
    enabled: user?.role === "super_admin" && Boolean(activeLLMScanId),
    refetchInterval: (query) => {
      const status = query.state.data?.scan.status;
      return status === "pending" || status === "running" ? 3000 : false;
    },
  });

  const createLLMScanMut = useMutation({
    mutationFn: aiTriageAdminApi.createLLMScan,
    onSuccess: (res) => {
      setActiveLLMScanId(res.scan.id);
      toast.success("Scan AI dimulai");
    },
    onError: (e) => {
      const err = toApiError(e);
      if (err.code === "resource_exhausted") {
        toast.error("Antrian scan penuh — maks. 2 bersamaan");
        return;
      }
      toast.error(err.message);
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

  const llmScanBusy =
    createLLMScanMut.isPending ||
    (llmScanData?.scan != null &&
      (llmScanData.scan.status === "pending" || llmScanData.scan.status === "running"));

  const flaggedFindings =
    llmScanData?.scan.findings?.filter((f) => f.flagged) ?? [];

  const runLLMScan = () => {
    if (!effectiveTenantId) {
      toast.error("Pilih tenant terlebih dahulu");
      return;
    }
    if (!scanFrom || !scanTo) {
      toast.error("Isi rentang waktu");
      return;
    }
    createLLMScanMut.mutate({
      tenantId: effectiveTenantId,
      from: toRFC3339(scanFrom),
      to: toRFC3339(scanTo),
      conversationId: scanConversationId.trim() || undefined,
    });
  };

  const runLoopFromFinding = (f: AITriageLLMFinding) => {
    runLoop({
      conversationId: f.conversationId,
      inboundId: f.inboundId,
    });
  };

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
            ["ai-review", "AI Review"],
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
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Waktu</th>
                    <th className="pb-2 pr-3 font-medium">Path</th>
                    <th className="pb-2 pr-3 font-medium">Reason</th>
                    <th className="pb-2 pr-3 font-medium">Conversation</th>
                    <th className="pb-2 pr-3 font-medium">Inbound</th>
                    <th className="pb-2 pr-3 font-medium">Review</th>
                    <th className="pb-2 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(anomaliesData?.anomalies ?? []).map((row, i) => (
                    <tr key={`${row.createdAt}-${row.inboundId ?? i}`} className="border-b border-border/60">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs">
                        {formatTime(row.createdAt)}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline">{row.path || "—"}</Badge>
                      </td>
                      <td className="py-2 pr-3 max-w-[200px] truncate text-xs text-muted-foreground">
                        {row.reason || "—"}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {row.conversationId ? truncateId(row.conversationId, 12) : "—"}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {row.inboundId ? truncateId(row.inboundId, 12) : "—"}
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

      {tab === "ai-review" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Review (LLM judge)
            </CardTitle>
            <CardDescription>
              Pindai pasangan pesan masuk + balasan AI dalam rentang waktu (maks. 6 jam, 30 turn).
              Haiku menilai apakah balasan bermasalah — tidak menggantikan loop routing deterministik.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Dari</p>
                <input
                  type="datetime-local"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={scanFrom}
                  onChange={(e) => setScanFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Sampai</p>
                <input
                  type="datetime-local"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={scanTo}
                  onChange={(e) => setScanTo(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Conversation ID (opsional)
                </p>
                <Input
                  value={scanConversationId}
                  onChange={(e) => setScanConversationId(e.target.value)}
                  placeholder="Batasi ke satu percakapan"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <Button disabled={llmScanBusy} onClick={runLLMScan}>
              {createLLMScanMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Scan dengan AI
            </Button>

            {llmScanData?.scan ? (
              <div className="rounded-md border p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">Status scan:</span>
                  <Badge variant="outline">{llmScanStatusLabel(llmScanData.scan.status)}</Badge>
                  <span className="text-muted-foreground">
                    {llmScanData.scan.turnsChecked} turn · {llmScanData.scan.findingsCount} flagged
                    · {llmScanData.scan.inputTokens + llmScanData.scan.outputTokens} token
                  </span>
                </div>
                {llmScanData.scan.errorText ? (
                  <p className="text-sm text-destructive">{llmScanData.scan.errorText}</p>
                ) : null}
                {llmScanData.scan.status === "done" && flaggedFindings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Tidak ada balasan yang diflag bermasalah pada rentang ini.
                  </p>
                ) : null}
                {flaggedFindings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="pb-2 pr-3 font-medium">Waktu</th>
                          <th className="pb-2 pr-3 font-medium">Severity</th>
                          <th className="pb-2 pr-3 font-medium">Pesan masuk</th>
                          <th className="pb-2 pr-3 font-medium">Balasan AI</th>
                          <th className="pb-2 pr-3 font-medium">Alasan</th>
                          <th className="pb-2 font-medium">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flaggedFindings.map((f) => (
                          <tr key={f.id} className="border-b border-border/60 align-top">
                            <td className="py-2 pr-3 text-xs whitespace-nowrap">
                              {formatTime(f.inboundAt)}
                            </td>
                            <td className="py-2 pr-3">
                              <Badge variant={severityVariant(f.severity)}>
                                {f.severity || "—"} · {f.category || "—"}
                              </Badge>
                            </td>
                            <td className="py-2 pr-3 max-w-[200px] text-xs whitespace-pre-wrap break-words">
                              {f.userText || "—"}
                            </td>
                            <td className="py-2 pr-3 max-w-[240px] text-xs whitespace-pre-wrap break-words">
                              {f.replyText || "—"}
                            </td>
                            <td className="py-2 pr-3 max-w-[200px] text-xs text-muted-foreground">
                              {f.reason || "—"}
                            </td>
                            <td className="py-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={loopBusy}
                                onClick={() => runLoopFromFinding(f)}
                              >
                                <Play className="mr-1 h-3.5 w-3.5" />
                                Jalankan loop
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}
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
