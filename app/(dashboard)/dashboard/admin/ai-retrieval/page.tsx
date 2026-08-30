"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Loader2, Search } from "lucide-react";
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
import { adminApi, type AdminTenant } from "@/lib/api/admin";
import { toApiError } from "@/lib/api/client";
import { flagsApi, type RAGRolloutScope, type RetrievalMode, type TenantIndexingProgress } from "@/lib/api/flags";

const MODE_LABELS: Record<RetrievalMode, string> = {
  disabled: "Lexical (lama)",
  shadow: "Shadow RAG",
  vector: "Vector RAG (produksi)",
};

const MODE_DESCRIPTIONS: Record<RetrievalMode, string> = {
  disabled:
    "Hanya pencocokan kata kunci / lexical seperti sebelum RAG. Tidak ada embedding atau Pinecone.",
  shadow:
    "Jalankan retrieval vector secara paralel untuk observasi; jawaban ke customer tetap dari lexical.",
  vector:
    "Hybrid retrieval (BM25 + vector) aktif untuk KB dan katalog. Backfill otomatis saat diaktifkan.",
};

function modeBadgeVariant(mode: RetrievalMode): "default" | "secondary" | "outline" {
  switch (mode) {
    case "vector":
      return "default";
    case "shadow":
      return "secondary";
    default:
      return "outline";
  }
}

function IndexingProgressBar({ progress }: { progress: TenantIndexingProgress }) {
  if (progress.isComplete) {
    return (
      <p className="w-full text-xs text-muted-foreground">
        Indexing selesai · {progress.kb.indexed} KB + {progress.catalog.indexed} katalog ter-embed
      </p>
    );
  }
  return (
    <div className="w-full space-y-1">
      <div className="flex flex-wrap justify-between gap-1 text-xs text-muted-foreground">
        <span>
          Indexing {progress.percentComplete}% · outbox {progress.outboxPercentDone}%
        </span>
        <span>
          {progress.outbox.pending} antrian · {progress.kb.pending + progress.catalog.pending} entitas
          pending
          {(progress.kb.failed + progress.catalog.failed + progress.outbox.failed) > 0
            ? ` · ${progress.kb.failed + progress.catalog.failed + progress.outbox.failed} gagal`
            : ""}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary/80 transition-all"
          style={{ width: `${progress.percentComplete}%` }}
        />
      </div>
    </div>
  );
}

function TenantRetrievalRow({
  tenant,
  onUpdated,
}: {
  tenant: AdminTenant;
  onUpdated: () => void;
}) {
  const qc = useQueryClient();
  const modeQuery = useQuery({
    queryKey: ["retrieval-mode", tenant.id],
    queryFn: () => flagsApi.getRetrievalMode(tenant.id),
    staleTime: 30_000,
  });

  const [pendingMode, setPendingMode] = useState<RetrievalMode | null>(null);
  const currentMode = modeQuery.data?.mode ?? "disabled";
  const selectedMode = pendingMode ?? currentMode;
  const trackIndexing = currentMode === "shadow" || currentMode === "vector";

  const indexingQuery = useQuery({
    queryKey: ["retrieval-indexing", tenant.id],
    queryFn: () => flagsApi.getRetrievalIndexingProgress(tenant.id),
    enabled: trackIndexing,
    refetchInterval: (q) => (q.state.data?.isComplete ? false : 3000),
  });

  const saveMut = useMutation({
    mutationFn: (mode: RetrievalMode) => flagsApi.setRetrievalMode(tenant.id, mode),
    onSuccess: (r) => {
      setPendingMode(null);
      onUpdated();
      void qc.invalidateQueries({ queryKey: ["retrieval-indexing", tenant.id] });
      toast.success(
        `${tenant.companyName}: ${MODE_LABELS[r.previous]} → ${MODE_LABELS[r.mode]}` +
          (r.kbEnqueued + r.catalogEnqueued > 0
            ? ` · ${r.kbEnqueued} KB + ${r.catalogEnqueued} katalog diantrekan`
            : ""),
      );
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <div className="space-y-2 rounded border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-medium">{tenant.companyName}</p>
        <p className="text-muted-foreground">{tenant.ownerEmail || "—"}</p>
        <p className="font-mono text-xs text-muted-foreground">{tenant.schemaName}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {modeQuery.isLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <Badge variant={modeBadgeVariant(currentMode)}>{MODE_LABELS[currentMode]}</Badge>
        )}
        <Select
          value={selectedMode}
          disabled={!tenant.isActive || saveMut.isPending || modeQuery.isLoading}
          onValueChange={(v) => setPendingMode(v as RetrievalMode)}
        >
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="disabled">{MODE_LABELS.disabled}</SelectItem>
            <SelectItem value="shadow">{MODE_LABELS.shadow}</SelectItem>
            <SelectItem value="vector">{MODE_LABELS.vector}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={
            !tenant.isActive ||
            saveMut.isPending ||
            modeQuery.isLoading ||
            selectedMode === currentMode
          }
          onClick={() => saveMut.mutate(selectedMode)}
        >
          {saveMut.isPending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
      </div>
      {trackIndexing && indexingQuery.data ? (
        <IndexingProgressBar progress={indexingQuery.data} />
      ) : trackIndexing && indexingQuery.isLoading ? (
        <p className="text-xs text-muted-foreground">Memuat progress indexing…</p>
      ) : null}
    </div>
  );
}

function ObservabilityPanel() {
  const obsQuery = useQuery({
    queryKey: ["retrieval-observability"],
    queryFn: () => flagsApi.getRetrievalObservability(),
    refetchInterval: 5000,
  });
  const m = obsQuery.data?.metrics;
  if (!m) {
    return null;
  }
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Observability retrieval (proses ini)</CardTitle>
        <CardDescription>
          Counter in-process + Encore metrics. Reset saat deploy/restart instance.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border p-2">
          <p className="text-xs text-muted-foreground">Query</p>
          <p className="font-medium">{m.requests} req</p>
          <p className="text-xs text-muted-foreground">
            fallback {(m.fallbackRatio * 100).toFixed(1)}% · zero {(m.zeroHitRatio * 100).toFixed(1)}%
          </p>
        </div>
        <div className="rounded border p-2">
          <p className="text-xs text-muted-foreground">Latency</p>
          <p className="font-medium">
            p50 {m.latencyP50Ms}ms · p95 {m.latencyP95Ms}ms
          </p>
          <p className="text-xs text-muted-foreground">p99 {m.latencyP99Ms}ms</p>
        </div>
        <div className="rounded border p-2">
          <p className="text-xs text-muted-foreground">Query embed cache</p>
          <p className="font-medium">
            hit {(m.embedCacheHitRatio * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">
            {m.embedCacheHits} hit · {m.embedCacheMisses} miss
          </p>
        </div>
        <div className="rounded border p-2">
          <p className="text-xs text-muted-foreground">Indexing worker</p>
          <p className="font-medium">
            {m.indexingSuccess} ok · {m.indexingFailure} gagal
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function BulkRolloutPanel({ onJobDone }: { onJobDone: () => void }) {
  const qc = useQueryClient();
  const [rolloutMode, setRolloutMode] = useState<"shadow" | "vector">("shadow");
  const [scope, setScope] = useState<RAGRolloutScope>("lexical_only");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const activeJobsQuery = useQuery({
    queryKey: ["rag-rollout-active-jobs"],
    queryFn: () => flagsApi.listActiveRAGRolloutJobs(),
    refetchInterval: 3000,
  });

  const serverJobId =
    activeJobsQuery.data?.jobs.find(
      (j) => j.status === "pending" || j.status === "running",
    )?.jobId ?? null;
  const trackedJobId = activeJobId ?? serverJobId;

  const jobQuery = useQuery({
    queryKey: ["rag-rollout-job", trackedJobId],
    queryFn: () => flagsApi.getRAGRolloutJob(trackedJobId!),
    enabled: Boolean(trackedJobId),
    refetchInterval: trackedJobId ? 2000 : false,
  });

  const rolloutInProgress =
    Boolean(trackedJobId) &&
    (jobQuery.data?.status === "pending" || jobQuery.data?.status === "running");

  const startMut = useMutation({
    mutationFn: () =>
      flagsApi.startRAGRollout({
        mode: rolloutMode,
        scope,
        tenantDelayMs: 2000,
      }),
    onSuccess: (r) => {
      if (r.jobId) {
        setActiveJobId(r.jobId);
        void qc.invalidateQueries({ queryKey: ["rag-rollout-active-jobs"] });
        toast.info(`Rollout diantrekan (${r.enqueued} tenant)…`);
      } else {
        toast.info("Tidak ada tenant yang perlu di-rollout.");
      }
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const cancelMut = useMutation({
    mutationFn: (jobId: string) => flagsApi.cancelRAGRolloutJob(jobId),
    onSuccess: () => {
      setActiveJobId(null);
      void qc.invalidateQueries({ queryKey: ["rag-rollout-active-jobs"] });
      toast.info("Job rollout dibatalkan.");
      onJobDone();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const job = jobQuery.data;

  useEffect(() => {
    if (
      job &&
      activeJobId === job.jobId &&
      (job.status === "completed" || job.status === "cancelled")
    ) {
      const t = window.setTimeout(() => {
        setActiveJobId(null);
        onJobDone();
        if (job.status === "completed") {
          toast.success(
            `Rollout selesai: ${job.doneCount} tenant, ${job.kbEnqueuedTotal} KB + ${job.catalogEnqueuedTotal} katalog diantrekan.`,
          );
        }
      }, 500);
      return () => window.clearTimeout(t);
    }
  }, [job, activeJobId, onJobDone]);

  const progressPct =
    job && job.totalCount > 0
      ? Math.round(((job.doneCount + job.failedCount) / job.totalCount) * 100)
      : 0;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Rollout massal (aman)</CardTitle>
        <CardDescription>
          Proses per tenant via antrian async dengan jeda antar tenant. Canary: mulai dengan mode{" "}
          <strong>shadow</strong> + scope <strong>hanya lexical</strong>, pantau progress, lalu
          ulangi untuk <strong>vector</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Select
            value={rolloutMode}
            disabled={rolloutInProgress || startMut.isPending}
            onValueChange={(v) => setRolloutMode(v as "shadow" | "vector")}
          >
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shadow">Shadow RAG</SelectItem>
              <SelectItem value="vector">Vector RAG</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={scope}
            disabled={rolloutInProgress || startMut.isPending}
            onValueChange={(v) => setScope(v as RAGRolloutScope)}
          >
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lexical_only">Hanya tenant lexical</SelectItem>
              <SelectItem value="all_active">Semua tenant aktif</SelectItem>
            </SelectContent>
          </Select>
          <Button
            disabled={rolloutInProgress || startMut.isPending}
            onClick={() => startMut.mutate()}
          >
            {startMut.isPending ? "Memulai…" : "Mulai rollout"}
          </Button>
          {rolloutInProgress && job ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={cancelMut.isPending}
              onClick={() => cancelMut.mutate(job.jobId)}
            >
              Batalkan
            </Button>
          ) : null}
        </div>

        {job && trackedJobId ? (
          <div className="space-y-2 rounded border p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span>
                Job {job.jobId.slice(0, 8)}… · {job.mode} · {job.scope}
              </span>
              <Badge variant="outline">{job.status}</Badge>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-muted-foreground">
              {job.doneCount} selesai · {job.failedCount} gagal · {job.totalCount} total ·{" "}
              {job.kbEnqueuedTotal} KB + {job.catalogEnqueuedTotal} katalog diantrekan
            </p>
            {(job.recentErrors?.length ?? 0) > 0 ? (
              <ul className="list-inside list-disc text-xs text-destructive">
                {job.recentErrors!.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function AIRetrievalAdminPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-tenants-retrieval", search, page, pageSize],
    queryFn: () => adminApi.listTenants({ q: search || undefined, page, pageSize }),
    enabled: user?.role === "super_admin",
  });

  const tenants = data?.tenants ?? [];
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.total ?? 0) / pageSize)),
    [data?.total],
  );

  if (user?.role !== "super_admin") {
    return (
      <PageHeader title="AI Retrieval" description="Akses super admin diperlukan." />
    );
  }

  return (
    <>
      <PageHeader
        title="AI Retrieval (RAG)"
        description="Kelola mode retrieval per tenant — lexical, shadow, atau vector dengan backfill otomatis."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/dashboard/admin">← Konsol Platform</Link>
        </Button>
      </div>

      <Card className="mb-4 border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-4" />
            Mode retrieval
          </CardTitle>
          <CardDescription>
            Tenant baru otomatis mode <strong>vector</strong>. Mengaktifkan shadow/vector
            mengantrekan re-index semua entri KB/katalog yang belum ter-embed (sekali klik,
            tanpa aksi dari client). Pastikan schema tenant sudah di-migrasi (patch v2) lewat
            Konsol Platform jika tenant masih tertinggal.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          {(Object.keys(MODE_LABELS) as RetrievalMode[]).map((mode) => (
            <div key={mode} className="rounded border bg-background p-3">
              <p className="font-medium text-foreground">{MODE_LABELS[mode]}</p>
              <p className="mt-1 text-xs">{MODE_DESCRIPTIONS[mode]}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <BulkRolloutPanel onJobDone={() => void refetch()} />

      <ObservabilityPanel />

      <Card>
        <CardHeader>
          <CardTitle>Tenant ({data?.total ?? 0})</CardTitle>
          <CardDescription>Pilih mode retrieval dan klik Simpan. Tidak perlu cURL.</CardDescription>
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
                placeholder="Cari tenant, email owner, atau schema…"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                setSearch(q.trim());
              }}
            >
              Cari
            </Button>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Memuat…</p>
          ) : tenants.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Tenant tidak ditemukan.</p>
          ) : (
            tenants.map((t) => (
              <TenantRetrievalRow key={t.id} tenant={t} onUpdated={() => void refetch()} />
            ))
          )}

          {(data?.total ?? 0) > pageSize && (
            <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
              <span>
                Halaman {page} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
