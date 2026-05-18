"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/dashboard/page-header";
import { workflowApi } from "@/lib/api/workflow";
import { usePlan } from "@/hooks/use-plan";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

export default function WorkflowPage() {
  const { hasWorkflow } = usePlan();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [reply, setReply] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["workflows"], queryFn: () => workflowApi.list(), enabled: hasWorkflow });
  const createMut = useMutation({
    mutationFn: () => workflowApi.create({ name, triggerValue: trigger, actionType: "send_reply", actionPayload: { replyText: reply } }),
    onSuccess: () => { toast.success("Rule dibuat"); void qc.invalidateQueries({ queryKey: ["workflows"] }); },
    onError: (e) => toast.error(toApiError(e).message),
  });
  if (!hasWorkflow) return <PageHeader title="Workflow" description="Tersedia di paket Business/Pro." />;
  return (
    <>
      <PageHeader title="Workflow" description="Automasi rule-based (mis. kata kunci booking)." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Rule baru</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Nama</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Jika pesan mengandung</Label><Input value={trigger} onChange={(e) => setTrigger(e.target.value)} /></div>
            <div><Label>Balasan otomatis</Label><Input value={reply} onChange={(e) => setReply(e.target.value)} /></div>
            <Button onClick={() => createMut.mutate()}>Simpan</Button>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Rules aktif</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? "Memuat..." : (data?.rules ?? []).map((r) => (
              <div key={r.id} className="rounded border p-3 text-sm"><p className="font-medium">{r.name}</p><p className="text-muted-foreground">{r.triggerType}: {r.triggerValue}</p></div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
