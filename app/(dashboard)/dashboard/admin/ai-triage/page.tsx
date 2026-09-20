"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Flag, Loader2, RefreshCw, Sparkles } from "lucide-react";
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
  type AITriageLLMScanStatus,
  type AITriageReportStatus,
} from "@/lib/api/ai-triage";
import { toApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const TRIAGE_TABS = ["insiden", "ai-review", "laporan"] as const;
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
  return "insiden";
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

export default function AdminAITriagePage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTriageTab(searchParams.get("tab"));

  const [tenantId, setTenantId] = useState(searchParams.get("tenantId") ?? "");
  const [scanFrom, setScanFrom] = useState(defaultScanWindow().from);
  const [scanTo, setScanTo] = useState(defaultScanWindow().to);
  const [scanConversationId, setScanConversationId] = useState("");
  const [activeLLMScanId, setActiveLLMScanId] = useState<string | null>(null);
  const [llmShowOnlyFlagged, setLlmShowOnlyFlagged] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState<AITriageReportStatus | "all">("open");

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => adminApi.listTenants(),
    enabled: user?.role === "super_admin",
  });

  const tenants = useMemo(() => tenantsData?.tenants ?? [], [tenantsData?.tenants]);
  const effectiveTenantId = tenantId || user?.tenant?.id || tenants[0]?.id || "";

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === effectiveTenantId),
    [tenants, effectiveTenantId],
  );

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

  const setTab = (id: TriageTabId) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", id);
    router.replace(`?${next.toString()}`, { scroll: false });
  };

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
        title="AI Triage"
        description="Halaman ini hanya untuk super admin platform."
      />
    );
  }

  return (
    <>
      <PageHeader
        title="AI Triage"
        description="Self-healing: konfirmasi insiden, Composer membuat draft PR. AI Review dan Laporan hanya mengisi antrian Insiden."
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
            ["ai-review", "AI Review"],
            ["laporan", "Laporan"],
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

      {tab === "ai-review" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Review (LLM judge)
            </CardTitle>
            <CardDescription>
              Pindai pasangan pesan masuk + balasan AI dalam rentang waktu (maks. 6 jam, 30 turn).
              Temuan flagged masuk tab Insiden. Tidak men-dispatch Composer.
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
                {llmScanData.scan.status === "done" ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={!llmShowOnlyFlagged ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setLlmShowOnlyFlagged(false)}
                      >
                        Semua turn ({allFindings.length})
                      </Button>
                      <Button
                        type="button"
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
              Dari tombol Lapor di Inbox. Hapus chat tenant tidak menghapus laporan. Buka Insiden
              untuk kontrak Composer — bukan loop routing.
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
                              disabled={openIncidentMut.isPending}
                              onClick={() => openIncidentMut.mutate(row.id)}
                            >
                              Buka Insiden
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
    </>
  );
}
