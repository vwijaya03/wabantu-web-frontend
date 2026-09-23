"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toApiError } from "@/lib/api/client";
import { storefrontApi, type StoreConfig } from "@/lib/api/storefront";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { useTenantQueryEnabled } from "@/hooks/use-tenant-query-enabled";
import { tenantQueryKey } from "@/lib/query/tenant-query-key";

export default function StorefrontDashboardPage() {
  const tenantKey = useTenantKey();
  const tenantReady = useTenantQueryEnabled();
  const qc = useQueryClient();
  const [edited, setEdited] = useState<StoreConfig | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "storefront-config"),
    queryFn: () => storefrontApi.getConfig(),
    enabled: tenantReady,
  });

  const form = edited ?? data ?? { enabled: false };

  const saveMut = useMutation({
    mutationFn: storefrontApi.updateConfig,
    onSuccess: () => {
      setEdited(null);
      toast.success("Pengaturan toko disimpan");
      qc.invalidateQueries({ queryKey: tenantQueryKey(tenantKey, "storefront-config") });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Memuat…</div>;

  return (
    <>
      <PageHeader title="Toko Online" description="Aktifkan storefront publik di /toko/[slug]" />
      <Card>
        <CardHeader><CardTitle>Pengaturan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Aktifkan toko</Label>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setEdited((f) => ({ ...(f ?? data ?? { enabled: false }), enabled: e.target.checked }))}
              aria-label="Aktifkan toko"
            />
          </div>
          <div className="space-y-2">
            <Label>Judul toko</Label>
            <Input value={form.storeTitle ?? ""} onChange={(e) => setEdited((f) => ({ ...(f ?? data ?? { enabled: false }), storeTitle: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => setEdited((f) => ({ ...(f ?? data ?? { enabled: false }), description: e.target.value }))} />
          </div>
          <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Simpan</Button>
        </CardContent>
      </Card>
    </>
  );
}
