"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toApiError } from "@/lib/api/client";
import { api } from "@/lib/api/client";
import { templatesApi } from "@/lib/api/templates";

type Installed = { kind: string; slug: string; version: string; surface: string };

export default function TemplateMarketplacePage() {
  const qc = useQueryClient();
  const { data: catalog } = useQuery({ queryKey: ["templates"], queryFn: () => templatesApi.list() });
  const { data: installed } = useQuery({
    queryKey: ["templates-installed"],
    queryFn: () => api.get<{ items: Installed[] }>("/api/v1/tenant/templates/installed").then((r) => r.data),
  });

  const installMut = useMutation({
    mutationFn: (slug: string) => api.post(`/api/v1/tenant/templates/${slug}/install`),
    onSuccess: () => {
      toast.success("Template terpasang");
      qc.invalidateQueries({ queryKey: ["templates-installed"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <>
      <PageHeader title="Template Marketplace" description="Pasang tema chat dan toko bawaan platform." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Katalog</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(catalog?.items ?? []).map((t) => (
              <div key={t.slug} className="flex items-center justify-between gap-2 text-sm">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-muted-foreground">{t.kind} · {t.slug}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => installMut.mutate(t.slug)} disabled={installMut.isPending}>
                  Pasang
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Terpasang</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(installed?.items ?? []).map((t) => (
              <div key={t.surface}>{t.surface}: {t.slug} v{t.version}</div>
            ))}
            {!installed?.items?.length ? <p className="text-muted-foreground">Belum ada template aktif.</p> : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
