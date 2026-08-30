"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/page-header";
import { TenantAccessActionButton } from "@/components/dashboard/tenant-access-action-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { adminApi, CURRENT_SCHEMA_PATCH_VERSION, type AdminTenant } from "@/lib/api/admin";
import { isPlatformOperatorHome } from "@/lib/api/auth";
import { toApiError } from "@/lib/api/client";
import {
  resolveTenantAccessState,
  tenantAccessApi,
} from "@/lib/api/tenant-access";
import { toast } from "sonner";

export default function AdminPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const needTenantHint = searchParams.get("needTenant") === "1";
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [deleteTarget, setDeleteTarget] = useState<AdminTenant | null>(null);
  const [confirmSchema, setConfirmSchema] = useState("");
  const [migrateErrors, setMigrateErrors] = useState<string[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [selectedTenantIds, setSelectedTenantIds] = useState<Set<string>>(new Set());
  const { data, isLoading } = useQuery({
    queryKey: ["admin-tenants", search, page, pageSize],
    queryFn: () => adminApi.listTenants({ q: search || undefined, page, pageSize }),
    enabled: user?.role === "super_admin",
  });
  const { data: accessRequestsData } = useQuery({
    queryKey: ["admin-access-requests"],
    queryFn: () => tenantAccessApi.listMine(),
    enabled: user?.role === "super_admin",
    staleTime: 30_000,
  });
  const accessRequests = accessRequestsData?.requests ?? [];
  const tenants = data?.tenants ?? [];
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.total ?? 0) / pageSize)),
    [data?.total],
  );

  const activeMigrateJobsQuery = useQuery({
    queryKey: ["admin-migrate-jobs-active"],
    queryFn: () => adminApi.listActiveMigrateJobs(),
    enabled: user?.role === "super_admin",
    refetchInterval: (query) => {
      const jobs = query.state.data?.jobs ?? [];
      const hasActive = jobs.some(
        (j) => j.status === "pending" || j.status === "running",
      );
      return hasActive ? 2000 : false;
    },
  });

  const serverActiveJobId =
    activeMigrateJobsQuery.data?.jobs.find(
      (j) => j.status === "pending" || j.status === "running",
    )?.jobId ?? null;
  const trackedJobId = activeJobId ?? serverActiveJobId;

  const pollMigrateJobUntilDone = async (jobId: string) => {
    try {
      for (;;) {
        const job = await adminApi.getMigrateJob(jobId);
        qc.setQueryData(["admin-migrate-job", jobId], job);
        if (job.status === "completed" || job.status === "cancelled") {
          await qc.invalidateQueries({ queryKey: ["admin-tenants"] });
          await qc.invalidateQueries({ queryKey: ["admin-migrate-jobs-active"] });
          if (job.status === "cancelled") {
            setMigrateErrors([]);
            toast.info(`Migrasi dibatalkan (${job.doneCount} selesai/dilewati).`);
          } else if (job.failedCount > 0) {
            setMigrateErrors(job.recentErrors ?? []);
            toast.warning(
              `Migrasi selesai: ${job.doneCount} berhasil, ${job.failedCount} gagal.`,
            );
          } else {
            setMigrateErrors([]);
            toast.success(`Migrasi selesai (${job.doneCount} tenant).`);
          }
          setActiveJobId(null);
          setSelectedTenantIds(new Set());
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (e) {
      toast.error(toApiError(e).message);
      setActiveJobId(null);
    }
  };

  const migrateMut = useMutation({
    mutationFn: (input?: { tenantIds?: string[]; mode?: "behind" | "selected" | "" }) =>
      adminApi.migrateTenantSchemas(input),
    onSuccess: (r) => {
      if (r.async && r.jobId) {
        setMigrateErrors([]);
        setActiveJobId(r.jobId);
        void qc.invalidateQueries({ queryKey: ["admin-migrate-jobs-active"] });
        toast.info(`Migrasi di antrian (${r.enqueued ?? 0} tenant)…`);
        void pollMigrateJobUntilDone(r.jobId);
        return;
      }
      setMigrateErrors(r.errors ?? []);
      void qc.invalidateQueries({ queryKey: ["admin-tenants"] });
      if (r.failed > 0) {
        toast.warning(`Migrasi: ${r.patched} berhasil, ${r.failed} gagal.`);
        return;
      }
      setMigrateErrors([]);
      setSelectedTenantIds(new Set());
      toast.success(`Migrasi schema selesai (${r.patched} tenant).`);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const migrationInProgress =
    migrateMut.isPending || Boolean(trackedJobId);

  const migrateJobQuery = useQuery({
    queryKey: ["admin-migrate-job", trackedJobId],
    queryFn: () => adminApi.getMigrateJob(trackedJobId!),
    enabled: Boolean(trackedJobId),
  });

  const cancelMigrateMut = useMutation({
    mutationFn: (jobId: string) => adminApi.cancelMigrateJob(jobId),
    onSuccess: (job) => {
      qc.setQueryData(["admin-migrate-job", job.jobId], job);
      void qc.invalidateQueries({ queryKey: ["admin-migrate-jobs-active"] });
      void qc.invalidateQueries({ queryKey: ["admin-tenants"] });
      setActiveJobId(null);
      setMigrateErrors([]);
      toast.info(`Job migrasi dibatalkan (${job.doneCount} selesai/dilewati).`);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const toggleTenantSelected = (id: string) => {
    setSelectedTenantIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelectedTenantIds(new Set(tenants.map((t) => t.id)));
  };

  const clearSelection = () => setSelectedTenantIds(new Set());

  function formatSchemaMigratedAt(value?: string) {
    if (!value) return "Belum pernah";
    return new Date(value).toLocaleString("id-ID");
  }

  const planMut = useMutation({
    mutationFn: ({ tenantId, planCode }: { tenantId: string; planCode: "starter" | "business" | "pro" }) =>
      adminApi.updateTenantPlan(tenantId, planCode),
    onSuccess: (r) => {
      toast.success(`Paket ${r.tenant.companyName} menjadi ${r.tenant.planTier}`);
      void qc.invalidateQueries({ queryKey: ["admin-tenants"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const deleteMut = useMutation({
    mutationFn: ({ tenantId, schemaName }: { tenantId: string; schemaName: string }) =>
      adminApi.deleteTenant(tenantId, schemaName),
    onSuccess: (r) => {
      toast.success(`Tenant dihapus dan schema ${r.schemaName} sudah di-drop`);
      setDeleteTarget(null);
      setConfirmSchema("");
      void qc.invalidateQueries({ queryKey: ["admin-tenants"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  if (user?.role !== "super_admin") {
    return (
      <PageHeader
        title="Admin"
        description="Akses super admin diperlukan."
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Konsol Platform"
        description="Internal WABantu — pantau tenant klien tanpa mendaftar toko."
      />
      {needTenantHint && isPlatformOperatorHome(user) && (
        <Card className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pilih tenant untuk melanjutkan</CardTitle>
            <CardDescription>
              Menu Workflow, Cabang, Inbox, dan fitur operasional lain membutuhkan
              konteks tenant. Minta akses lalu klik <strong>Pantau</strong> setelah
              disetujui owner, atau buka menu yang diinginkan.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/dashboard/admin/ai-activity">Log aktivitas AI →</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/admin/ai-triage">AI Triage Loop →</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/admin/ai-retrieval">AI Retrieval (RAG) →</Link>
        </Button>
        <Button
          variant="secondary"
          disabled={migrationInProgress}
          onClick={() => migrateMut.mutate({ mode: "behind" })}
        >
          {trackedJobId ? "Migrasi berjalan…" : "Migrasi tenant tertinggal"}
        </Button>
        <Button
          variant="outline"
          disabled={migrationInProgress}
          onClick={() => migrateMut.mutate(undefined)}
        >
          Migrasi semua tenant
        </Button>
        <Button
          variant="outline"
          disabled={migrationInProgress || selectedTenantIds.size === 0}
          onClick={() =>
            migrateMut.mutate({
              tenantIds: Array.from(selectedTenantIds),
              mode: "selected",
            })
          }
        >
          Migrasi terpilih ({selectedTenantIds.size})
        </Button>
        {selectedTenantIds.size > 0 ? (
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Bersihkan pilihan
          </Button>
        ) : null}
      </div>
      {trackedJobId && migrateJobQuery.data ? (
        <Card className="mb-4 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Progress migrasi schema</CardTitle>
            <CardDescription>
              Job {migrateJobQuery.data.jobId.slice(0, 8)}… — patch v
              {migrateJobQuery.data.patchVersion}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${
                    migrateJobQuery.data.totalCount > 0
                      ? Math.round(
                          ((migrateJobQuery.data.doneCount +
                            migrateJobQuery.data.failedCount) /
                            migrateJobQuery.data.totalCount) *
                            100,
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {migrateJobQuery.data.doneCount} selesai · {migrateJobQuery.data.failedCount}{" "}
              gagal · {migrateJobQuery.data.totalCount} total · status:{" "}
              {migrateJobQuery.data.status}
            </p>
            {(migrateJobQuery.data.status === "pending" ||
              migrateJobQuery.data.status === "running") && (
              <Button
                variant="destructive"
                size="sm"
                disabled={cancelMigrateMut.isPending}
                onClick={() => cancelMigrateMut.mutate(migrateJobQuery.data.jobId)}
              >
                {cancelMigrateMut.isPending ? "Membatalkan…" : "Batalkan migrasi"}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}
      {migrateErrors.length > 0 ? (
        <Card className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Migrasi schema gagal sebagian</CardTitle>
            <CardDescription>
              Di Encore Cloud, jalankan dulu{" "}
              <code className="text-xs">./scripts/apply-inventory-schema-cloud.sh staging</code>{" "}
              dari folder api-go (role admin DB), lalu klik Migrasi schema tenant lagi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {migrateErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      {isPlatformOperatorHome(user) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Akun operator internal</CardTitle>
            <CardDescription>
              Anda login tanpa tenant bisnis. Minta akses ke tenant di bawah; setelah
              disetujui owner, klik Pantau untuk memantau inbox, katalog, dan pengaturan
              mereka.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Tenant ({data?.total ?? 0})</CardTitle>
          <CardDescription>
            Cari tenant, ubah paket, minta akses / pantau (setelah disetujui owner),
            migrasi schema, atau hapus permanen schema tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {tenants.length > 0 ? (
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Button type="button" variant="ghost" size="sm" onClick={selectAllOnPage}>
                Pilih semua di halaman ini
              </Button>
            </div>
          ) : null}
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  setSearch(q.trim());
                }
              }}
              placeholder="Cari nama tenant, email owner, atau schema..."
            />
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                setSearch(q.trim());
              }}
            >
              Cari
            </Button>
            {search && (
              <Button
                variant="ghost"
                onClick={() => {
                  setQ("");
                  setSearch("");
                  setPage(1);
                }}
              >
                Reset
              </Button>
            )}
          </div>
          {isLoading ? (
            "Memuat..."
          ) : tenants.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Tenant tidak ditemukan.
            </p>
          ) : (
            tenants.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 rounded border"
                      checked={selectedTenantIds.has(t.id)}
                      onChange={() => toggleTenantSelected(t.id)}
                      aria-label={`Pilih ${t.companyName}`}
                    />
                    <div className="min-w-0">
                    <p className="font-medium">{t.companyName}</p>
                    <p className="text-muted-foreground">
                      {t.ownerEmail || "—"}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {t.schemaName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Migrasi terakhir: {formatSchemaMigratedAt(t.schemaMigratedAt)} · patch v
                      {t.schemaPatchVersion ?? 0}
                      {t.isSchemaBehind ? (
                        <Badge variant="outline" className="ml-2 text-amber-700">
                          Tertinggal (v{CURRENT_SCHEMA_PATCH_VERSION})
                        </Badge>
                      ) : null}
                    </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={t.planTier}
                      disabled={planMut.isPending || !t.isActive}
                      onValueChange={(planCode) =>
                        planMut.mutate({
                          tenantId: t.id,
                          planCode: planCode as "starter" | "business" | "pro",
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge variant={t.isActive ? "default" : "secondary"}>
                      {t.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={migrationInProgress || !t.isActive || t.isSchemaMigrating}
                      onClick={() =>
                        migrateMut.mutate({ tenantIds: [t.id], mode: "selected" })
                      }
                    >
                      {t.isSchemaMigrating ? "Migrasi…" : "Migrasi"}
                    </Button>
                    <TenantAccessActionButton
                      tenant={t}
                      accessState={resolveTenantAccessState(accessRequests, t.id)}
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deleteMut.isPending}
                      onClick={() => {
                        setDeleteTarget(t);
                        setConfirmSchema("");
                      }}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
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
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus tenant permanen?</DialogTitle>
            <DialogDescription>
              Aksi ini akan menjalankan <code>DROP SCHEMA CASCADE</code> untuk tenant{" "}
              <strong>{deleteTarget?.companyName}</strong>. Semua data inbox, katalog,
              billing tenant, finance, dan konfigurasi di schema tersebut akan hilang.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Ketik nama schema untuk konfirmasi:
              <span className="ml-1 font-mono text-foreground">{deleteTarget?.schemaName}</span>
            </p>
            <Input
              value={confirmSchema}
              onChange={(e) => setConfirmSchema(e.target.value)}
              placeholder={deleteTarget?.schemaName}
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={
                deleteMut.isPending ||
                !deleteTarget ||
                confirmSchema.trim() !== deleteTarget.schemaName
              }
              onClick={() =>
                deleteTarget &&
                deleteMut.mutate({
                  tenantId: deleteTarget.id,
                  schemaName: confirmSchema.trim(),
                })
              }
            >
              {deleteMut.isPending ? "Menghapus..." : "Hapus permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
