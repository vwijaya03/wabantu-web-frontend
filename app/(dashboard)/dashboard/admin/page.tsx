"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { adminApi } from "@/lib/api/admin";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

export default function AdminPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["admin-tenants"], queryFn: () => adminApi.listTenants(), enabled: user?.role === "super_admin" });
  const impMut = useMutation({
    mutationFn: (tenantId: string) => adminApi.impersonate(tenantId),
    onSuccess: () => { toast.success("Impersonation token diterbitkan — gunakan untuk debug"); },
    onError: (e) => toast.error(toApiError(e).message),
  });
  if (user?.role !== "super_admin") return <PageHeader title="Admin" description="Akses super admin diperlukan." />;
  return (
    <>
      <PageHeader title="Super Admin" description="Kelola tenant dan impersonation." />
      <Card>
        <CardHeader><CardTitle>Tenant ({data?.total ?? 0})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? "Memuat..." : (data?.tenants ?? []).map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded border p-3 text-sm">
              <div><p className="font-medium">{t.companyName}</p><p className="text-muted-foreground">{t.ownerEmail} · {t.schemaName}</p></div>
              <Button size="sm" variant="outline" onClick={() => impMut.mutate(t.id)}>Impersonate</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
