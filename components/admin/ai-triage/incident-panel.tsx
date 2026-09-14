"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BehaviorJobCard } from "@/components/admin/ai-triage/behavior-job-card";
import {
  BEHAVIOR_FIX_ACTIONS_URL,
  channelLabel,
  incidentComposerBadgeVariant,
  incidentComposerLabel,
  jobInFlight,
  laneLabel,
} from "@/components/admin/ai-triage/behavior-job-status";
import { IncidentReviewDialog } from "@/components/admin/ai-triage/incident-review-dialog";
import { RepairPreviewCard } from "@/components/admin/ai-triage/repair-preview-card";
import { incidentUserText } from "@/components/admin/ai-triage/incident-turn-pair";
import { aiTriageAdminApi, type AITriageIncident } from "@/lib/api/ai-triage";
import { toApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const CHANNELS = ["", "whatsapp", "web_chat", "storefront_search"] as const;

function pickJobIncident(incidents: AITriageIncident[], focusedId: string | null, reviewing: AITriageIncident | null) {
  return (
    incidents.find((i) => i.id === focusedId) ??
    reviewing ??
    incidents.find((i) => i.behaviorJobStatus === "failed") ??
    incidents.find((i) => jobInFlight(i.behaviorJobStatus)) ??
    incidents.find((i) => i.behaviorJobId)
  );
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
      if (items.some((i) => i.reviewStatus === "open")) return 5000;
      if (items.some((i) => jobInFlight(i.behaviorJobStatus))) return 5000;
      return false;
    },
  });

  const incidents = q.data?.incidents ?? [];
  const focused = pickJobIncident(incidents, focusedId, reviewing);
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
      void q.refetch();
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
  const channels = useMemo(() => CHANNELS, []);

  const openReview = (inc: AITriageIncident) => {
    setFocusedId(inc.id);
    setReviewing(inc);
  };

  const showJobFor = (inc: AITriageIncident) => focused?.id === inc.id && Boolean(inc.behaviorJobId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insiden self-healing</CardTitle>
        <CardDescription>
          Konfirmasi menjalankan Composer 2.5 (draft PR). Chat WhatsApp lama tidak berubah
          sampai PR di-merge dan Encore di-deploy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {channels.map((c) => (
            <Button
              key={c || "all"}
              type="button"
              size="sm"
              variant={channel === c ? "secondary" : "ghost"}
              className="h-7 rounded-md px-3 text-xs"
              onClick={() => setChannel(c)}
            >
              {channelLabel(c)}
            </Button>
          ))}
        </div>
        {q.isError ? (
          <p className="text-sm text-destructive">{toApiError(q.error).message}</p>
        ) : q.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : incidents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Belum ada insiden.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {incidents.map((inc) => {
              const label = incidentComposerLabel(inc);
              const selected = focused?.id === inc.id;
              const lane = laneLabel(inc.lane);
              return (
                <div
                  key={inc.id}
                  className={cn("px-3 py-3", selected ? "bg-muted/40" : "hover:bg-muted/20")}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 space-y-2 text-left"
                      onClick={() => setFocusedId(inc.id)}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">{channelLabel(inc.channel)}</Badge>
                        <Badge variant={incidentComposerBadgeVariant(inc)}>{label}</Badge>
                        {lane ? <Badge variant="secondary">{lane}</Badge> : null}
                      </div>
                      <p className="line-clamp-2 text-sm leading-relaxed">
                        {incidentUserText(inc) || "Tanpa teks pesan"}
                      </p>
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => openReview(inc)}
                    >
                      Review
                    </Button>
                  </div>
                  {showJobFor(inc) ? (
                    <div className="mt-3 space-y-2">
                      {jobQuery.isError ? (
                        <div className="space-y-2 rounded-md border-l-2 border-l-destructive bg-destructive/5 px-3 py-3 text-sm">
                          <p className="font-medium text-destructive">Composer gagal dimuat</p>
                          <p className="text-destructive">{toApiError(jobQuery.error).message}</p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => retryMut.mutate(inc.behaviorJobId!)}
                              disabled={retryMut.isPending}
                            >
                              Coba Composer lagi
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <a href={BEHAVIOR_FIX_ACTIONS_URL} target="_blank" rel="noreferrer">
                                Buka GitHub Actions
                              </a>
                            </Button>
                          </div>
                        </div>
                      ) : null}
                      {job && focused?.id === inc.id ? (
                        <BehaviorJobCard
                          job={job}
                          busy={retryMut.isPending || verifyMut.isPending}
                          onRetry={() => retryMut.mutate(job.id)}
                          onVerify={() => verifyMut.mutate(job.id)}
                        />
                      ) : jobQuery.isFetching ? (
                        <Skeleton className="h-20 w-full" />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        {plan && focused && !reviewing ? (
          <>
            <Separator />
            <RepairPreviewCard
              plan={plan}
              busy={approveMut.isPending || applyMut.isPending}
              onApprove={() => approveMut.mutate(plan.id)}
              onApply={() => applyMut.mutate(plan.id)}
            />
          </>
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
