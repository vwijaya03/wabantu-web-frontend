"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Copy, ExternalLink, Flag, Loader2, Play, RefreshCw, Sparkles, Wand2 } from "lucide-react";
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
import { IncidentPanel } from "@/components/admin/ai-triage/incident-panel";
import { adminApi } from "@/lib/api/admin";
import {
  aiTriageAdminApi,
  type AITriageJob,
  type AITriageJobStatus,
  type AITriageLLMScanStatus,
  type AITriageReportStatus,
} from "@/lib/api/ai-triage";
import { toApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const TRIAGE_TABS = ["insiden", "mencurigakan", "ai-review", "laporan", "investigasi"] as const;
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

function reportCategoryLabel(category?: string): string {
  switch (category) {
    case "wrong_answer":
      return "Jawaban salah";
    case "bug":
      return "Bug";
    case "rude":
      return "Tidak sopan";
    case "off_topic":
      return "Off-topic";
    case "other":
      return "Lainnya";
    default:
      return category || "—";
  }
}

function reportStatusLabel(status: AITriageReportStatus): string {
  switch (status) {
    case "open":
      return "Menunggu";
    case "confirmed":
      return "Dikonfirmasi";
    case "dismissed":
      return "Diabaikan";
    case "resolved":
      return "Selesai";
    default:
      return status;
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
    case "pr_ready_needs_fix":
      return "PR perlu fix";
    case "fix_running":
      return "Fix AI berjalan";
    case "failed":
      return "Gagal";
    case "verified":
      return "Terverifikasi";
    default:
      return status;
  }
}

function jobStatusVariant(status: AITriageJobStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "pr_ready":
      return "default";
    case "verified":
      return "default";
    case "pr_ready_needs_fix":
      return "secondary";
    case "fix_running":
      return "secondary";
    case "failed":
      return "destructive";
    case "running":
      return "secondary";
    default:
      return "outline";
  }
}

function isJobActive(status: AITriageJobStatus): boolean {
  return status === "pending" || status === "running" || status === "fix_running";
}

function canVerifyJob(job: AITriageJob): boolean {
  return job.status === "pr_ready" || job.status === "pr_ready_needs_fix" || job.status === "verified";
}

function parseForensicJobId(message: string): string | null {
  const match = message.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
  return match?.[0] ?? null;
}

function canRequestAiFix(job: AITriageJob): boolean {
  if (job.status === "fix_running") return false;
  if (job.status !== "pr_ready_needs_fix" && job.status !== "failed") return false;
  const analysis = job.analysis;
  if (!analysis) return false;
  if ((analysis.cursorFixAttempts ?? 0) >= 2) return false;
  const mismatches = analysis.mismatches?.filter(
    (m) => !m.skipped && m.expectedPath && m.userText,
  );
  if ((mismatches?.length ?? 0) > 0) return true;
  return (analysis.regressionFailures?.length ?? 0) > 0;
}

function groupByConversationId<T extends { conversationId?: string }>(
  items: T[],
): { conversationId: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const id = item.conversationId?.trim();
    if (!id) continue;
    const arr = map.get(id) ?? [];
    arr.push(item);
    map.set(id, arr);
  }
  return Array.from(map.entries()).map(([conversationId, grouped]) => ({
    conversationId,
    items: grouped,
  }));
}

function isNonDeterministicReportPath(path?: string): boolean {
  return path === "llm" || path === "llm_grounded" || path === "llm_tools";
}

function regressionCaseCount(
  mismatches: { skipped?: boolean; actualPath?: string; expectedPath?: string; userText?: string }[],
): number {
  return mismatches.filter(
    (m) => !m.skipped && Boolean(m.expectedPath) && Boolean(m.userText),
  ).length;
}

function ConversationLoopBar({
  groups,
  itemLabel,
  busy,
  pending,
  onRun,
  helpText,
}: {
  groups: { conversationId: string; items: unknown[] }[];
  itemLabel: string;
  busy: boolean;
  pending: boolean;
  onRun: (conversationId: string) => void;
  helpText?: string;
}) {
  if (groups.length === 0) return null;
  return (
    <div className="mb-4 space-y-2 rounded-md border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">
        Loop routing per percakapan ({groups.length} percakapan)
      </p>
      {helpText ? (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <Button
            key={g.conversationId}
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onRun(g.conversationId)}
          >
            {pending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="mr-1 h-3.5 w-3.5" />
            )}
            Jalankan loop ({g.items.length} {itemLabel})
          </Button>
        ))}
      </div>
    </div>
  );
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
    <span className="inline-flex items-start gap-1 align-top">
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
    </span>
  );
}

function JobStatusPanel({
  job,
  onRefresh,
  isRefreshing,
  onAiFix,
  aiFixPending,
  onVerify,
  verifyPending,
}: {
  job: AITriageJob;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onAiFix?: () => void;
  aiFixPending?: boolean;
  onVerify?: () => void;
  verifyPending?: boolean;
}) {
  const analysis = job.analysis;
  const focusId = job.inboundId || analysis?.focusInboundId;
  const focusedMismatch = focusId
    ? analysis?.mismatches?.find((m) => m.inboundId === focusId)
    : undefined;
  const deterministicMismatches =
    analysis?.mismatches?.filter((m) => !m.skipped && m.actualPath !== m.expectedPath) ?? [];
  const regressionFailures = analysis?.regressionFailures ?? [];
  const verifyFailures = analysis?.verifyFailures ?? [];
  const regressionCases = analysis ? regressionCaseCount(analysis.mismatches ?? []) : 0;
  const showAiFix = canRequestAiFix(job);
  const showVerify = Boolean(onVerify) && canVerifyJob(job);

  return (
    <Card className="mt-6 border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Status loop triage</CardTitle>
            <Badge variant={jobStatusVariant(job.status)}>{jobStatusLabel(job.status)}</Badge>
          </div>
          {onRefresh ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
              )}
              Perbarui
            </Button>
          ) : null}
        </div>
        <CardDescription>
          Job <CopyableMono value={job.id} label="Job ID" />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {analysis ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
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
            <div className="rounded border px-3 py-2">
              <p className="text-xs text-muted-foreground">Regression case</p>
              <p className="font-medium">{regressionCases}</p>
            </div>
          </div>
        ) : null}

        {focusedMismatch ? (
          <div className="rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
            <p className="font-medium">Turn yang diminta</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{focusedMismatch.userText || "—"}</p>
            <p className="mt-1">
              Path: <Badge variant="outline">{focusedMismatch.actualPath || "—"}</Badge>
              {focusedMismatch.skipped ? (
                <span className="ml-2 text-amber-800 dark:text-amber-200">
                  dilewati ({focusedMismatch.skipReason || "skipped"})
                </span>
              ) : null}
            </p>
            {focusedMismatch.skipped && focusedMismatch.skipReason === "non_deterministic_path" ? (
              <p className="mt-2 text-amber-900 dark:text-amber-100">
                Loop routing tidak menilai isi katalog/SKU. Buka tab Insiden untuk pasangan pesan
                ini.
              </p>
            ) : null}
          </div>
        ) : null}

        {analysis && regressionCases === 0 ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-100">
            Tidak ada routing mismatch deterministik — loop tidak menghasilkan regression test.
            Nol mismatch forensic bukan bukti fix: sukses = Verifikasi fix hijau.
          </p>
        ) : null}

        {deterministicMismatches.length > 0 ? (
          <p className="rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sky-950 dark:text-sky-100">
            Ini path WhatsApp lama vs simulator sekarang. Merge tidak mengubah history. Sukses =
            Verifikasi fix hijau.
          </p>
        ) : null}

        {analysis?.verifyNote ? (
          <p className="rounded-md border px-3 py-2 text-muted-foreground">{analysis.verifyNote}</p>
        ) : null}

        {analysis?.verifyPassed === true ? (
          <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-emerald-900 dark:text-emerald-100">
            Simulator deployed cocok dengan golden wantPath.
            {analysis.verifyUsedLiveCatalog ? " Snapshot katalog job kosong — memakai katalog live." : ""}
          </p>
        ) : null}

        {analysis?.verifyPassed === false ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
            Verifikasi gagal — simulator belum mengembalikan wantPath. Jangan jalankan loop forensic baru.
          </p>
        ) : null}

        {job.errorText ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
            {job.errorText}
          </p>
        ) : null}

        {(job.status === "pr_ready" || job.status === "pr_ready_needs_fix") && !job.prUrl ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-100">
            Label &quot;PR siap&quot; adalah status internal job — GitHub Pull Request belum dibuat.
            Buka GitHub Actions untuk melihat branch <code className="text-[11px]">fix/ai-triage-*</code>.
          </p>
        ) : null}

        {(analysis?.cursorFixAttempts ?? 0) >= 2 &&
        (job.status === "pr_ready_needs_fix" || job.status === "failed") ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-100">
            Fix dengan AI sudah dicoba {analysis?.cursorFixAttempts ?? 0}× — lanjutkan patch manual di
            draft PR.
          </p>
        ) : null}

        {(analysis?.cursorFixAttempts ?? 0) > 0 && (analysis?.cursorFixAttempts ?? 0) < 2 ? (
          <p className="text-xs text-muted-foreground">
            Fix AI: {analysis?.cursorFixAttempts ?? 0}/2 percobaan digunakan (best-effort).
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {showVerify ? (
            <Button size="sm" disabled={verifyPending} onClick={onVerify}>
              {verifyPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
              )}
              Verifikasi fix
            </Button>
          ) : null}
          {showAiFix && onAiFix ? (
            <Button size="sm" disabled={aiFixPending} onClick={onAiFix}>
              {aiFixPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-3.5 w-3.5" />
              )}
              Fix dengan AI
            </Button>
          ) : null}
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
          {analysis?.cursorFixGithubRunUrl ? (
            <Button variant="outline" size="sm" asChild>
              <a href={analysis.cursorFixGithubRunUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Cursor fix run
              </a>
            </Button>
          ) : null}
        </div>

        {analysis?.cursorAgentId ? (
          <div className="text-xs text-muted-foreground">
            Cursor agent: <CopyableMono value={analysis.cursorAgentId} label="Agent ID" />
          </div>
        ) : null}

        {analysis?.fixHints ? (
          <p className="text-xs text-muted-foreground">
            File target: {analysis.fixHints.likelyFiles.join(", ")} · catalog:{" "}
            {analysis.fixHints.catalogSource} · test: {analysis.fixHints.testUsesFixture}
          </p>
        ) : null}

        {regressionFailures.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Regression gagal ({regressionFailures.length})
            </p>
            {regressionFailures.slice(0, 8).map((f) => (
              <div key={f.caseName} className="rounded border px-3 py-2 text-xs">
                <p className="font-mono font-medium">{f.caseName}</p>
                <p className="mt-1">
                  <Badge variant="outline" className="mr-1">
                    {f.gotPath}
                  </Badge>
                  →
                  <Badge variant="secondary" className="ml-1">
                    {f.wantPath}
                  </Badge>
                </p>
                {f.replyPreview ? (
                  <p className="mt-1 text-muted-foreground line-clamp-2">{f.replyPreview}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {verifyFailures.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Verifikasi gagal ({verifyFailures.length})
            </p>
            {verifyFailures.slice(0, 8).map((f) => (
              <div key={`verify-${f.caseName}`} className="rounded border px-3 py-2 text-xs">
                <p className="font-mono font-medium">{f.caseName}</p>
                <p className="mt-1">
                  <Badge variant="outline" className="mr-1">
                    {f.gotPath}
                  </Badge>
                  →
                  <Badge variant="secondary" className="ml-1">
                    {f.wantPath}
                  </Badge>
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {deterministicMismatches.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Detail mismatch forensic (history WA vs sim)
            </p>
            {deterministicMismatches.slice(0, 5).map((m) => (
              <div key={m.inboundId} className="rounded border px-3 py-2 text-xs">
                <CopyableMono value={m.inboundId} label="Inbound ID" />
                <p className="mt-1 whitespace-pre-wrap break-words">{m.userText || "—"}</p>
                {m.priorTurns && m.priorTurns.length > 0 ? (
                  <p className="mt-1 text-muted-foreground">
                    Konteks: {m.priorTurns.length} turn sebelumnya
                  </p>
                ) : null}
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
  const [llmShowOnlyFlagged, setLlmShowOnlyFlagged] = useState(false);
  const [investigateFocusOneTurn, setInvestigateFocusOneTurn] = useState(false);
  const [forceForensic, setForceForensic] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState<AITriageReportStatus | "all">("open");

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

  const {
    data: anomaliesData,
    isLoading: anomaliesLoading,
    isFetching: anomaliesFetching,
    refetch: refetchAnomalies,
  } = useQuery({
    queryKey: ["admin-ai-triage-anomalies", effectiveTenantId],
    queryFn: () => aiTriageAdminApi.listAnomalies(effectiveTenantId, { limit: 50 }),
    enabled: user?.role === "super_admin" && Boolean(effectiveTenantId),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: reportsData, isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ["admin-ai-triage-reports", effectiveTenantId, reportStatusFilter],
    queryFn: () =>
      aiTriageAdminApi.listReports({
        tenantId: effectiveTenantId || undefined,
        status: reportStatusFilter === "all" ? "" : reportStatusFilter,
        limit: 50,
      }),
    enabled: user?.role === "super_admin" && tab === "laporan",
  });

  const updateReportMut = useMutation({
    mutationFn: ({
      id,
      status,
      reviewNote,
    }: {
      id: string;
      status: "confirmed" | "dismissed";
      reviewNote?: string;
    }) => aiTriageAdminApi.updateReport(id, { status, reviewNote }),
    onSuccess: () => {
      toast.success("Status laporan diperbarui");
      void refetchReports();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const openIncidentMut = useMutation({
    mutationFn: (id: string) => aiTriageAdminApi.openIncidentFromReport(id),
    onSuccess: () => {
      toast.success("Insiden menampilkan pasangan laporan ini");
      setTab("insiden");
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const {
    data: jobData,
    refetch: refetchJob,
    isFetching: isJobFetching,
  } = useQuery({
    queryKey: ["admin-ai-triage-job", activeJobId],
    queryFn: () => aiTriageAdminApi.getJob(activeJobId!),
    enabled: user?.role === "super_admin" && Boolean(activeJobId),
  });

  const {
    data: llmScanData,
    refetch: refetchLLMScan,
    isFetching: isLLMScanFetching,
  } = useQuery({
    queryKey: ["admin-ai-triage-llm-scan", activeLLMScanId],
    queryFn: () => aiTriageAdminApi.getLLMScan(activeLLMScanId!),
    enabled: user?.role === "super_admin" && Boolean(activeLLMScanId),
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
      const existingId = parseForensicJobId(err.message);
      if (existingId) {
        setActiveJobId(existingId);
        toast.error(err.message);
        return;
      }
      toast.error(err.message);
    },
  });

  const aiFixMut = useMutation({
    mutationFn: aiTriageAdminApi.requestAiFix,
    onSuccess: (res) => {
      setActiveJobId(res.job.id);
      toast.success("Fix AI (Composer 2.5) dimulai via GitHub Actions");
    },
    onError: (e) => {
      const err = toApiError(e);
      if (err.code === "resource_exhausted") {
        toast.error("Antrian penuh — tunggu job lain selesai");
        return;
      }
      toast.error(err.message);
    },
  });

  const verifyJobMut = useMutation({
    mutationFn: aiTriageAdminApi.verifyJob,
    onSuccess: (res) => {
      setActiveJobId(res.job.id);
      void refetchJob();
      void refetchReports();
      if (res.passed) {
        toast.success(
          res.reportsResolved > 0
            ? `Verifikasi lulus — ${res.reportsResolved} laporan diselesaikan`
            : "Verifikasi lulus",
        );
        return;
      }
      toast.error("Verifikasi gagal — simulator belum cocok dengan wantPath");
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const setTab = (id: TriageTabId) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", id);
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  const runLoopForConversation = (conversationId: string) => {
    runLoop({ conversationId });
  };

  const investigateReport = (row: {
    id: string;
    conversationId?: string;
    inboundId?: string;
    path?: string;
    userText?: string;
  }) => {
    if (isNonDeterministicReportPath(row.path)) {
      openIncidentMut.mutate(row.id);
      return;
    }
    if (!row.conversationId?.trim()) {
      toast.error("conversationId kosong");
      return;
    }
    if (!row.inboundId?.trim()) {
      toast.error("inboundId kosong — jangan loop seluruh percakapan dari laporan");
      return;
    }
    setConversationId(row.conversationId);
    setInboundId(row.inboundId);
    setInvestigateFocusOneTurn(true);
    runLoop({ conversationId: row.conversationId, inboundId: row.inboundId });
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
      force: forceForensic || undefined,
    });
  };

  const reviewableAnomalies = useMemo(
    () =>
      (anomaliesData?.anomalies ?? []).filter(
        (row) => row.reviewSuggested && Boolean(row.conversationId?.trim()),
      ),
    [anomaliesData?.anomalies],
  );
  const anomalyConversationGroups = useMemo(
    () => groupByConversationId(reviewableAnomalies),
    [reviewableAnomalies],
  );

  const loopBusy =
    createJobMut.isPending ||
    (jobData?.job != null && isJobActive(jobData.job.status));

  const llmScanBusy =
    createLLMScanMut.isPending ||
    (llmScanData?.scan != null &&
      (llmScanData.scan.status === "pending" || llmScanData.scan.status === "running"));

  const flaggedFindings = useMemo(
    () => llmScanData?.scan.findings?.filter((f) => f.flagged) ?? [],
    [llmScanData?.scan.findings],
  );
  const allFindings = llmScanData?.scan.findings ?? [];
  const displayedFindings = llmShowOnlyFlagged ? flaggedFindings : allFindings;

  const flaggedConversationGroups = useMemo(
    () => groupByConversationId(flaggedFindings),
    [flaggedFindings],
  );

  const runLLMScan = () => {
    if (!effectiveTenantId) {
      toast.error("Pilih tenant terlebih dahulu");
      return;
    }
    if (!scanFrom) {
      toast.error("Isi rentang waktu dari");
      return;
    }
    const nowTo = formatDatetimeLocal(new Date());
    setScanTo(nowTo);
    createLLMScanMut.mutate({
      tenantId: effectiveTenantId,
      from: toRFC3339(scanFrom),
      to: toRFC3339(nowTo),
      conversationId: scanConversationId.trim() || undefined,
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
            ["insiden", "Insiden"],
            ["mencurigakan", "Mencurigakan"],
            ["ai-review", "AI Review"],
            ["laporan", "Laporan"],
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

      {tab === "insiden" ? <IncidentPanel tenantId={effectiveTenantId} /> : null}

      {tab === "mencurigakan" ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Aktivitas AI terbaru</CardTitle>
              <CardDescription>
                Data tab ini datang dari GET /api/v1/admin/ai-triage/anomalies — log tenant{" "}
                <code className="text-[11px]">usage_event</code> (ai_activity, inbound_autoreply, 1 jam)
                yang pesan masuknya masih ada. Bukan dari request RSC halaman (
                <code className="text-[11px]">?tab=mencurigakan&amp;_rsc=</code>
                ). Hapus chat tanpa menghapus percakapan yang masih hidup → baris itu tetap
                muncul. Log judge AI Review dan pesan yang sudah dihapus tidak ditampilkan.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!effectiveTenantId || anomaliesFetching}
              onClick={() => void refetchAnomalies()}
            >
              {anomaliesFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Segarkan
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {anomaliesLoading ? (
              <p className="text-sm text-muted-foreground">Memuat…</p>
            ) : (anomaliesData?.anomalies ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada inbound_autoreply 1 jam terakhir yang pesan masuknya masih ada.
                Hapus percakapan di tenant, lalu Segarkan. Log usage_event tanpa baris message
                tidak ditampilkan.
              </p>
            ) : (
              <>
                <ConversationLoopBar
                  groups={anomalyConversationGroups}
                  itemLabel="baris"
                  busy={loopBusy}
                  pending={createJobMut.isPending}
                  onRun={runLoopForConversation}
                />
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Waktu</th>
                    <th className="pb-2 pr-3 font-medium">Pesan masuk</th>
                    <th className="pb-2 pr-3 font-medium">Path</th>
                    <th className="pb-2 pr-3 font-medium">Reason</th>
                    <th className="pb-2 pr-3 font-medium">Conversation ID</th>
                    <th className="pb-2 pr-3 font-medium">Inbound ID</th>
                    <th className="pb-2 font-medium">Review</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
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
              Haiku menilai apakah balasan bermasalah. Loop routing memeriksa path deterministik
              seluruh percakapan — bukan memperbaiki isi balasan LLM (harga salah, hallucination).
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
                <p className="text-xs text-muted-foreground">
                  Otomatis di-set ke waktu sekarang saat scan dimulai.
                </p>
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
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">Status scan:</span>
                    <Badge variant="outline">{llmScanStatusLabel(llmScanData.scan.status)}</Badge>
                    <span className="text-muted-foreground">
                      {llmScanData.scan.turnsChecked} turn · {llmScanData.scan.findingsCount} flagged
                      · {llmScanData.scan.inputTokens + llmScanData.scan.outputTokens} token
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void refetchLLMScan()}
                    disabled={isLLMScanFetching}
                  >
                    {isLLMScanFetching ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    )}
                    Perbarui
                  </Button>
                </div>
                {llmScanData.scan.errorText ? (
                  <p className="text-sm text-destructive">{llmScanData.scan.errorText}</p>
                ) : null}
                {llmScanData.scan.status === "done" && allFindings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Tidak ada turn AI dalam rentang ini.
                  </p>
                ) : null}
                {llmScanData.scan.status === "done" &&
                allFindings.length > 0 &&
                flaggedFindings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {allFindings.length} turn dipindai — tidak ada yang diflag bermasalah.
                  </p>
                ) : null}
                {allFindings.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant={llmShowOnlyFlagged ? "outline" : "secondary"}
                        size="sm"
                        onClick={() => setLlmShowOnlyFlagged(false)}
                      >
                        Semua turn ({allFindings.length})
                      </Button>
                      <Button
                        variant={llmShowOnlyFlagged ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setLlmShowOnlyFlagged(true)}
                      >
                        Hanya flagged ({flaggedFindings.length})
                      </Button>
                    </div>
                    {displayedFindings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Tidak ada baris flagged — gunakan &quot;Semua turn&quot; untuk melihat hasil
                        penuh.
                      </p>
                    ) : (
                  <div className="space-y-3">
                    <ConversationLoopBar
                      groups={flaggedConversationGroups}
                      itemLabel="flagged"
                      busy={loopBusy}
                      pending={createJobMut.isPending}
                      onRun={runLoopForConversation}
                      helpText="Satu loop menganalisis semua turn routing dalam percakapan. Tidak memperbaiki isi balasan yang diflag LLM judge."
                    />
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[880px] text-left text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="pb-2 pr-3 font-medium">Waktu</th>
                          <th className="pb-2 pr-3 font-medium">Status</th>
                          <th className="pb-2 pr-3 font-medium">Severity</th>
                          <th className="pb-2 pr-3 font-medium">Pesan masuk</th>
                          <th className="pb-2 pr-3 font-medium">Balasan AI</th>
                          <th className="pb-2 font-medium">Alasan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedFindings.map((f) => (
                          <tr
                            key={f.id}
                            className={cn(
                              "border-b border-border/60 align-top",
                              f.flagged && "bg-destructive/5",
                            )}
                          >
                            <td className="py-2 pr-3 text-xs whitespace-nowrap">
                              {formatTime(f.inboundAt)}
                            </td>
                            <td className="py-2 pr-3">
                              <Badge variant={f.flagged ? "destructive" : "outline"}>
                                {f.flagged ? "Flagged" : "OK"}
                              </Badge>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "laporan" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Laporan balasan AI
            </CardTitle>
            <CardDescription>
              Tabel <code className="text-[11px]">ai_triage_report</code> di database system — terpisah
              dari pesan tenant. Hapus chat tidak menghapus laporan. Investigasi terikat inbound yang
              dilaporkan: path <code className="text-[11px]">llm_grounded</code> / LLM ke tab Insiden,
              bukan loop seluruh percakapan (itu menampilkan turn routing lain di thread yang sama).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["open", "Menunggu"],
                  ["confirmed", "Dikonfirmasi"],
                  ["dismissed", "Diabaikan"],
                  ["resolved", "Selesai"],
                  ["all", "Semua"],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  variant={reportStatusFilter === id ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setReportStatusFilter(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
            {reportsLoading ? (
              <p className="text-sm text-muted-foreground">Memuat…</p>
            ) : (reportsData?.reports ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada laporan untuk filter ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Waktu</th>
                      <th className="pb-2 pr-3 font-medium">Tenant</th>
                      <th className="pb-2 pr-3 font-medium">Kategori</th>
                      <th className="pb-2 pr-3 font-medium">Status</th>
                      <th className="pb-2 pr-3 font-medium">Pesan masuk</th>
                      <th className="pb-2 pr-3 font-medium">Balasan AI</th>
                      <th className="pb-2 pr-3 font-medium">Judge</th>
                      <th className="pb-2 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportsData?.reports ?? []).map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          "border-b border-border/60 align-top",
                          row.status === "open" && "bg-destructive/5",
                        )}
                      >
                        <td className="py-2 pr-3 text-xs whitespace-nowrap">
                          {formatTime(row.createdAt)}
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          {row.tenantName || row.tenantSchema}
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          {reportCategoryLabel(row.category)}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant={row.status === "open" ? "destructive" : "outline"}>
                            {reportStatusLabel(row.status)}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 max-w-[180px] text-xs whitespace-pre-wrap break-words">
                          {row.userText || "—"}
                        </td>
                        <td className="py-2 pr-3 max-w-[200px] text-xs whitespace-pre-wrap break-words">
                          {row.replyText || "—"}
                        </td>
                        <td className="py-2 pr-3 max-w-[160px] text-xs text-muted-foreground">
                          {row.judgeFlagged == null
                            ? "Memproses…"
                            : row.judgeFlagged
                              ? `${row.judgeCategory || "flagged"}`
                              : "OK"}
                          {row.judgeReason ? (
                            <span className="block text-[10px] opacity-80">{row.judgeReason}</span>
                          ) : null}
                        </td>
                        <td className="py-2 space-y-1">
                          <div className="flex flex-col gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loopBusy || openIncidentMut.isPending}
                            onClick={() => investigateReport(row)}
                          >
                            {isNonDeterministicReportPath(row.path)
                              ? "Buka Insiden"
                              : "Loop turn ini"}
                          </Button>
                          {row.status === "open" ? (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={updateReportMut.isPending}
                                onClick={() =>
                                  updateReportMut.mutate({ id: row.id, status: "confirmed" })
                                }
                              >
                                Konfirmasi
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={updateReportMut.isPending}
                                onClick={() =>
                                  updateReportMut.mutate({ id: row.id, status: "dismissed" })
                                }
                              >
                                Abaikan
                              </Button>
                            </>
                          ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "investigasi" ? (
        <Card>
          <CardHeader>
            <CardTitle>Investigasi manual</CardTitle>
            <CardDescription>
              Masukkan conversationId (wajib). Secara default loop menganalisis seluruh percakapan.
              Centang &quot;Hanya turn ini&quot; untuk fokus pada satu pesan masuk (debug). Job kedua
              untuk percakapan yang sama ditolak kecuali Paksa loop baru.
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
                disabled={!investigateFocusOneTurn}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={investigateFocusOneTurn}
                onChange={(e) => setInvestigateFocusOneTurn(e.target.checked)}
              />
              Hanya turn ini (fokus satu inbound)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={forceForensic}
                onChange={(e) => setForceForensic(e.target.checked)}
              />
              Paksa loop baru (force) — hanya jika ada bug baru di thread yang sama
            </label>
            <Button
              disabled={loopBusy || !conversationId.trim()}
              onClick={() =>
                runLoop({
                  conversationId,
                  inboundId: investigateFocusOneTurn ? inboundId : undefined,
                })
              }
            >
              {createJobMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {investigateFocusOneTurn ? "Jalankan loop (1 turn)" : "Jalankan loop percakapan"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {jobData?.job ? (
        <JobStatusPanel
          job={jobData.job}
          onRefresh={() => void refetchJob()}
          isRefreshing={isJobFetching}
          onAiFix={
            canRequestAiFix(jobData.job)
              ? () => aiFixMut.mutate(jobData.job.id)
              : undefined
          }
          aiFixPending={aiFixMut.isPending}
          onVerify={
            canVerifyJob(jobData.job) ? () => verifyJobMut.mutate(jobData.job.id) : undefined
          }
          verifyPending={verifyJobMut.isPending}
        />
      ) : null}
    </>
  );
}
