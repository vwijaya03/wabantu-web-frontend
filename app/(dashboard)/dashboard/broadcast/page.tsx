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

export default function BroadcastPage() {
  const { hasBroadcast } = usePlan();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [phones, setPhones] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["broadcast"],
    queryFn: () => broadcastApi.list(),
    enabled: hasBroadcast,
  });

  const createMut = useMutation({
    mutationFn: () =>
      broadcastApi.create({
        name,
        messageBody: body,
        recipients: phones.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      toast.success("Kampanye dibuat");
      setName("");
      setBody("");
      setPhones("");
      void qc.invalidateQueries({ queryKey: ["broadcast"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  if (!hasBroadcast) {
    return (
      <PageHeader
        title="Broadcast"
        description="Upgrade ke paket Business atau Pro untuk broadcast WhatsApp."
      />
    );
  }

  return (
    <>
      <PageHeader title="Broadcast" description="Kirim pesan massal ke kontak." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kampanye baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Nama</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Pesan</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
            </div>
            <div>
              <Label>Nomor (pisah koma/baris)</Label>
              <Textarea value={phones} onChange={(e) => setPhones(e.target.value)} rows={3} />
            </div>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              Buat kampanye
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Riwayat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : (
              (data?.campaigns ?? []).map((c) => (
                <div key={c.id} className="rounded border p-3 text-sm">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-muted-foreground">
                    {c.status} · {c.sentCount}/{c.totalRecipients} terkirim
                  </p>
                  {c.status === "draft" || c.status === "queued" ? (
                    <Button
                      size="sm"
                      className="mt-2"
                      variant="outline"
                      onClick={() =>
                        broadcastApi.send(c.id).then(() => {
                          toast.success("Broadcast dikirim");
                          void qc.invalidateQueries({ queryKey: ["broadcast"] });
                        })
                      }
                    >
                      Kirim sekarang
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
