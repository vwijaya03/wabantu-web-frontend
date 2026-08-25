"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { toApiError } from "@/lib/api/client";
import { whatsappApi } from "@/lib/api/whatsapp";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { useTenantQueryEnabled } from "@/hooks/use-tenant-query-enabled";
import { invalidateTenantQueries, tenantQueryKey } from "@/lib/query/tenant-query-key";

export default function WhatsappPage() {
  const qc = useQueryClient();
  const tenantKey = useTenantKey();
  const tenantReady = useTenantQueryEnabled();
  const { data: channels = [], isLoading } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "whatsapp-channels"),
    queryFn: whatsappApi.list,
    enabled: tenantReady,
  });

  const disconnectMut = useMutation({
    mutationFn: (id: string) => whatsappApi.disconnect(id),
    onSuccess: () => {
      invalidateTenantQueries(qc, tenantKey, "whatsapp-channels");
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  return (
    <>
      <PageHeader
        title="WhatsApp"
        description="Kelola channel WhatsApp yang sudah tersambung."
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Channel terhubung</CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/whatsapp/onboarding">Connect / Reconnect</Link>
            </Button>
          </div>
          <CardDescription>
            {channels.length} nomor · untuk client baru gunakan onboarding OAuth.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Memuat...
            </p>
          ) : channels.length === 0 ? (
            <div className="space-y-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Belum ada nomor terhubung.
              </p>
              <Button asChild>
                <Link href="/dashboard/whatsapp/onboarding">
                  Mulai onboarding WhatsApp
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {channels.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{c.displayName}</p>
                      {c.status === "connected" ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <XCircle className="h-3 w-3" /> {c.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {c.phoneNumber} · provider: {c.provider}
                    </p>
                    {c.lastError && (
                      <p className="mt-1 text-xs text-destructive">
                        {c.lastError}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {c.status === "connected" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnectMut.mutate(c.id)}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button asChild size="sm">
                        <Link href="/dashboard/whatsapp/onboarding">Reconnect</Link>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
