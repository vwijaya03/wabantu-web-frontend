"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
