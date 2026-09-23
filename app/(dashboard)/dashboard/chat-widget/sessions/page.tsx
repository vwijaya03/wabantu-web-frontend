"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, toApiError } from "@/lib/api/client";

type Session = { id: string; status: string; createdAt: string; lastMessageAt?: string };

export default function ChatWidgetSessionsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["chat-widget-sessions"],
    queryFn: () => api.get<{ items: Session[] }>("/api/v1/chat-widget/sessions").then((r) => r.data),
  });

  const handoffMut = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/chat-widget/sessions/${id}/handoff`, { reason: "staff_takeover" }),
    onSuccess: () => {
      toast.success("Sesi di-handoff ke staff");
      qc.invalidateQueries({ queryKey: ["chat-widget-sessions"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Memuat sesi…</div>;

  return (
    <>
      <PageHeader title="Sesi Chat Web" description="Ambil alih percakapan pengunjung — AI berhenti membalas setelah handoff." />
      <div className="space-y-3">
        {(data?.items ?? []).map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-center justify-between gap-4 pt-6 text-sm">
              <div>
                <div className="font-mono text-xs">{s.id}</div>
                <div className="text-muted-foreground">Status: {s.status}</div>
              </div>
              {s.status === "active" ? (
                <Button size="sm" variant="outline" onClick={() => handoffMut.mutate(s.id)} disabled={handoffMut.isPending}>
                  Handoff ke staff
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {!data?.items?.length ? <p className="text-sm text-muted-foreground">Belum ada sesi aktif.</p> : null}
      </div>
    </>
  );
}
