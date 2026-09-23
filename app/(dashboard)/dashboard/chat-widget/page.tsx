"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toApiError } from "@/lib/api/client";
import { chatWidgetApi, type ChatWidgetConfig } from "@/lib/api/chat-widget";
import { templatesApi } from "@/lib/api/templates";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { useTenantQueryEnabled } from "@/hooks/use-tenant-query-enabled";
import { tenantQueryKey } from "@/lib/query/tenant-query-key";

export default function ChatWidgetDashboardPage() {
  const tenantKey = useTenantKey();
  const tenantReady = useTenantQueryEnabled();
  const qc = useQueryClient();
  const [form, setForm] = useState<ChatWidgetConfig | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "chat-widget-config"),
    queryFn: () => chatWidgetApi.getConfig(),
    enabled: tenantReady,
  });

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  const { data: templates } = useQuery({
    queryKey: ["templates", "chatbot"],
    queryFn: () => templatesApi.list("chatbot"),
  });

  const { data: snippet } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "chat-widget-snippet"),
    queryFn: () => chatWidgetApi.embedSnippet(),
    enabled: tenantReady,
  });

  const saveMut = useMutation({
    mutationFn: chatWidgetApi.updateConfig,
    onSuccess: (data) => {
      setForm(data);
      toast.success("Pengaturan chat widget disimpan");
      qc.invalidateQueries({ queryKey: tenantQueryKey(tenantKey, "chat-widget-config") });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  if (isLoading || !form) {
    return <div className="p-6 text-sm text-muted-foreground">Memuat pengaturan chat widget…</div>;
  }

  return (
    <>
      <PageHeader
        title="Chat Widget"
        description="Aktifkan chat embed di website Anda dan atur pesan sambutan."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan</CardTitle>
            <CardDescription>Widget publik hanya aktif jika diaktifkan di sini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">Aktifkan widget</Label>
              <Switch
                id="enabled"
                checked={form.enabled}
                onCheckedChange={(enabled) => setForm((f) => (f ? { ...f, enabled } : f))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcome">Pesan sambutan</Label>
              <Textarea
                id="welcome"
                value={form.welcomeMessage ?? ""}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, welcomeMessage: e.target.value } : f))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="persona">Nama persona</Label>
              <Input
                id="persona"
                value={form.personaName ?? ""}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, personaName: e.target.value } : f))
                }
              />
            </div>
            <Button type="button" disabled={saveMut.isPending} onClick={() => saveMut.mutate(form)}>
              Simpan
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Embed & template</CardTitle>
            <CardDescription>Salin snippet atau pilih template bawaan platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              {snippet?.html ?? "<script …>"}
            </pre>
            <ul className="space-y-2 text-sm">
              {(templates?.items ?? []).map((t) => (
                <li key={t.slug} className="flex justify-between gap-2">
                  <span>{t.title}</span>
                  <span className="text-muted-foreground">{t.slug}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
