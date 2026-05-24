"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { adminApi } from "@/lib/api/admin";
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
  const { data, isLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => adminApi.listTenants(),
    enabled: user?.role === "super_admin",
  });

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
      if (r.failed > 0) {
        toast.warning(
          `Migrasi: ${r.patched} berhasil, ${r.failed} gagal. Cek log API.`,
        );
        return;
      }
      toast.success(`Migrasi schema selesai (${r.patched} tenant).`);
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
            Klik &quot;Pantau&quot; untuk masuk ke konteks tenant tersebut.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading
            ? "Memuat..."
            : (data?.tenants ?? []).map((t) => (
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
                  <div className="flex items-center gap-2">
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
                  </div>
                </div>
              ))}
        </CardContent>
      </Card>
    </>
  );
}
