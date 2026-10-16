"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/dashboard/page-header";
import { broadcastApi } from "@/lib/api/broadcast";
import { usePlan } from "@/hooks/use-plan";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { useTenantQueryEnabled } from "@/hooks/use-tenant-query-enabled";
import { invalidateTenantQueries, tenantQueryKey } from "@/lib/query/tenant-query-key";
import { useLocale } from "@/lib/i18n/locale";

export default function BroadcastPage() {
  const { t } = useLocale();
  const { hasBroadcast } = usePlan();
  const qc = useQueryClient();
  const tenantKey = useTenantKey();
  const tenantReady = useTenantQueryEnabled();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [phones, setPhones] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "broadcast"),
    queryFn: () => broadcastApi.list(),
    enabled: hasBroadcast && tenantReady,
  });

  const createMut = useMutation({
    mutationFn: () =>
      broadcastApi.create({
        name,
        messageBody: body,
        recipients: phones.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      toast.success(t("Kampanye dibuat"));
      setName("");
      setBody("");
      setPhones("");
      invalidateTenantQueries(qc, tenantKey, "broadcast");
    },
    onError: (e) => toast.error(t(toApiError(e).message)),
  });

  if (!hasBroadcast) {
    return (
      <PageHeader
        title={t("Broadcast")}
        description={t("Upgrade ke paket Business atau Pro untuk broadcast WhatsApp.")}
      />
    );
  }

  return (
    <>
      <PageHeader title={t("Broadcast")} description={t("Kirim pesan massal ke kontak.")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("Kampanye baru")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>{t("Nama")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>{t("Pesan")}</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
            </div>
            <div>
              <Label>{t("Nomor (pisah koma/baris)")}</Label>
              <Textarea value={phones} onChange={(e) => setPhones(e.target.value)} rows={3} />
            </div>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              {t("Buat kampanye")}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("Riwayat")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t("Memuat…")}</p>
            ) : (
              (data?.campaigns ?? []).map((c) => (
                <div key={c.id} className="rounded border p-3 text-sm">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-muted-foreground">
                    {c.status} · {t("{sent}/{total} terkirim", { sent: c.sentCount, total: c.totalRecipients })}
                  </p>
                  {c.status === "draft" || c.status === "queued" ? (
                    <Button
                      size="sm"
                      className="mt-2"
                      variant="outline"
                      onClick={() =>
                        broadcastApi.send(c.id).then(() => {
                          toast.success(t("Broadcast dikirim"));
                          invalidateTenantQueries(qc, tenantKey, "broadcast");
                        })
                      }
                    >
                      {t("Kirim sekarang")}
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
