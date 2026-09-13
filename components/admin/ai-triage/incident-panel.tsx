"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BehaviorJobCard } from "@/components/admin/ai-triage/behavior-job-card";
import { IncidentReviewDialog } from "@/components/admin/ai-triage/incident-review-dialog";
import { RepairPreviewCard } from "@/components/admin/ai-triage/repair-preview-card";
import { incidentUserText } from "@/components/admin/ai-triage/incident-turn-pair";
import { aiTriageAdminApi, type AITriageIncident } from "@/lib/api/ai-triage";
import { toApiError } from "@/lib/api/client";

function resolutionLabel(inc: AITriageIncident): string {
  if (inc.reviewStatus === "needs_human_input") return "Menunggu input";
  if (inc.resolutionStatus === "fixed") return "Selesai";
  if (inc.resolutionStatus === "repair_ready") return "Repair siap";
  if (inc.behaviorJobId && inc.resolutionStatus !== "fixed") return "Composer";
  if (inc.reviewStatus === "confirmed") return "Dikonfirmasi — belum diperbaiki";
  return "Menunggu";
}

function jobInFlight(status?: string): boolean {
  return status === "fix_running" || status === "test_ready" || status === "planning";
}

export function IncidentPanel({ tenantId }: { tenantId: string }) {
  const [reviewing, setReviewing] = useState<AITriageIncident | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [channel, setChannel] = useState<string>("");
  const q = useQuery({
    queryKey: ["admin-ai-triage-incidents", tenantId, channel],
    queryFn: () =>
      aiTriageAdminApi.listIncidents({
        tenantId: tenantId || undefined,
        channel: channel || undefined,
        limit: 50,
      }),
    enabled: Boolean(tenantId),
    refetchInterval: (query) => {
      const items = query.state.data?.incidents ?? [];
      return items.some((i) => i.reviewStatus === "open") ? 5000 : false;
    },
  });

  const incidents = q.data?.incidents ?? [];
  const focused = incidents.find((i) => i.id === focusedId) ?? reviewing;
  const jobQuery = useQuery({
    queryKey: ["admin-ai-triage-behavior-job", focused?.behaviorJobId],
    queryFn: () => aiTriageAdminApi.getBehaviorJob(focused!.behaviorJobId!),
    enabled: Boolean(focused?.behaviorJobId),
    refetchInterval: (query) => (jobInFlight(query.state.data?.job.status) ? 3000 : false),
  });
  const repairQuery = useQuery({
    queryKey: ["admin-ai-triage-repair", focused?.repairPlanId],
    queryFn: () => aiTriageAdminApi.getRepairPlan(focused!.repairPlanId!),
    enabled: Boolean(focused?.repairPlanId),
  });

  const verifyMut = useMutation({
    mutationFn: (id: string) => aiTriageAdminApi.verifyBehaviorJob(id),
    onSuccess: (res) => toast.success(res.result.passed ? "Verifikasi lulus" : "Verifikasi gagal"),
    onError: (e) => toast.error(toApiError(e).message),
  });
  const retryMut = useMutation({
    mutationFn: (id: string) => aiTriageAdminApi.retryBehaviorJob(id),
    onSuccess: () => {
      toast.success("Composer di-dispatch ulang ke GitHub Actions");
      void jobQuery.refetch();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });
  const approveMut = useMutation({
    mutationFn: (id: string) => aiTriageAdminApi.approveRepair(id),
    onSuccess: () => {
      toast.success("Repair disetujui");
      void repairQuery.refetch();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });
  const applyMut = useMutation({
    mutationFn: (id: string) => aiTriageAdminApi.applyRepair(id),
    onSuccess: () => {
      toast.success("Repair diterapkan");
      void repairQuery.refetch();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const job = jobQuery.data?.job;
  const plan = repairQuery.data?.plan;
  const channels = useMemo(() => ["", "whatsapp", "web_chat", "storefront_search"], []);

  const openReview = (inc: AITriageIncident) => {
    setFocusedId(inc.id);
    setReviewing(inc);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insiden self-healing</CardTitle>
        <CardDescription>
          Konfirmasi menjalankan Composer 2.5 (draft PR). Chat WhatsApp lama tidak berubah
          sampai PR di-merge dan Encore di-deploy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {channels.map((c) => (
            <Button
              key={c || "all"}
              type="button"
              size="sm"
              variant={channel === c ? "default" : "outline"}
              onClick={() => setChannel(c)}
            >
              {c || "semua kanal"}
            </Button>
          ))}
        </div>
        {q.isError ? (
          <p className="text-sm text-destructive">{toApiError(q.error).message}</p>
        ) : q.isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat…</p>
        ) : incidents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Belum ada insiden.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Kanal</th>
                <th>Status</th>
                <th>Lane</th>
                <th>Pesan</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={inc.id} className="border-b align-top">
                  <td className="py-2">{inc.channel}</td>
                  <td>{resolutionLabel(inc)}</td>
                  <td>{inc.lane || "—"}</td>
                  <td className="max-w-[280px] py-2 text-xs whitespace-pre-wrap break-words">
                    {incidentUserText(inc) || "—"}
                  </td>
                  <td>
                    <Button type="button" size="sm" variant="outline" onClick={() => openReview(inc)}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {jobQuery.isError ? (
          <p className="text-sm text-destructive">{toApiError(jobQuery.error).message}</p>
        ) : null}
        {job && !reviewing ? (
          <BehaviorJobCard
            job={job}
            busy={retryMut.isPending || verifyMut.isPending}
            onRetry={() => retryMut.mutate(job.id)}
            onVerify={() => verifyMut.mutate(job.id)}
          />
        ) : null}
        {plan && !reviewing ? (
          <RepairPreviewCard
            plan={plan}
            busy={approveMut.isPending || applyMut.isPending}
            onApprove={() => approveMut.mutate(plan.id)}
            onApply={() => applyMut.mutate(plan.id)}
          />
        ) : null}
      </CardContent>
      {reviewing ? (
        <IncidentReviewDialog
          incident={incidents.find((i) => i.id === reviewing.id) ?? reviewing}
          onClose={() => setReviewing(null)}
          onChanged={() => void q.refetch()}
        />
      ) : null}
    </Card>
  );
}
