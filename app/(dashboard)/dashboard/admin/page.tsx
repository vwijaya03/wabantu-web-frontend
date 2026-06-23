"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { adminApi, type AdminTenant } from "@/lib/api/admin";
import { isPlatformOperatorHome } from "@/lib/api/auth";
import { toApiError } from "@/lib/api/client";
import { resetTenantScopedQueries } from "@/lib/query/platform-console";
import { toast } from "sonner";

export default function AdminPage() {
  const { user, refresh } = useAuth();
  const router = useRouter();
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
  const { data, isLoading } = useQuery({
    queryKey: ["admin-tenants", search, page, pageSize],
    queryFn: () => adminApi.listTenants({ q: search || undefined, page, pageSize }),
    enabled: user?.role === "super_admin",
  });
  const tenants = data?.tenants ?? [];
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.total ?? 0) / pageSize)),
    [data?.total],
  );

  const impMut = useMutation({
    mutationFn: (tenantId: string) => adminApi.impersonate(tenantId),
    onSuccess: async () => {
      await refresh();
      resetTenantScopedQueries(qc);
      toast.success("Memantau tenant — mode internal aktif");
      router.replace("/dashboard");
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const migrateMut = useMutation({
    mutationFn: () => adminApi.migrateTenantSchemas(),
    onSuccess: (r) => {
      setMigrateErrors(r.errors ?? []);
      if (r.failed > 0) {
        toast.warning(
          `Migrasi: ${r.patched} berhasil, ${r.failed} gagal.`,
        );
        return;
      }
      setMigrateErrors([]);
      toast.success(`Migrasi schema selesai (${r.patched} tenant).`);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

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
              konteks tenant. Klik <strong>Pantau</strong> pada salah satu tenant di
              bawah, lalu buka menu yang diinginkan.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/dashboard/admin/ai-activity">Log aktivitas AI →</Link>
        </Button>
        <Button
          variant="secondary"
          disabled={migrateMut.isPending}
          onClick={() => migrateMut.mutate()}
        >
          {migrateMut.isPending ? "Memigrasi schema…" : "Migrasi schema tenant"}
        </Button>
      </div>
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
              Anda login tanpa tenant bisnis. Pilih tenant di bawah untuk
              memantau inbox, katalog, dan pengaturan mereka (mode baca/operasional).
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Tenant ({data?.total ?? 0})</CardTitle>
          <CardDescription>
            Cari tenant, ubah paket, pantau, atau hapus permanen schema tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
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
                  <div>
                    <p className="font-medium">{t.companyName}</p>
                    <p className="text-muted-foreground">
                      {t.ownerEmail || "—"}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {t.schemaName}
                    </p>
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
                      disabled={impMut.isPending || !t.isActive}
                      onClick={() => impMut.mutate(t.id)}
                    >
                      Pantau
                    </Button>
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
