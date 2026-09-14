"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { RefreshCw, Trash2 } from "lucide-react";
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
  incidentHoldHint,
  jobInFlight,
  laneLabel,
} from "@/components/admin/ai-triage/behavior-job-status";
import { IncidentReviewDialog } from "@/components/admin/ai-triage/incident-review-dialog";
import { RepairPreviewCard } from "@/components/admin/ai-triage/repair-preview-card";
import { incidentUserText } from "@/components/admin/ai-triage/incident-turn-pair";
import { aiTriageAdminApi, isTriageUUID, type AITriageIncident } from "@/lib/api/ai-triage";
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
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const q = useQuery({
    queryKey: ["admin-ai-triage-incidents", tenantId, channel],
    queryFn: () =>
      aiTriageAdminApi.listIncidents({
        tenantId: tenantId || undefined,
        channel: channel || undefined,
        limit: 50,
      }),
    enabled: Boolean(tenantId),
    refetchOnWindowFocus: false,
  });

  const incidents = q.data?.incidents ?? [];
  const selectedIds = incidents.filter((i) => selected[i.id]).map((i) => i.id);
  const focused = pickJobIncident(incidents, focusedId, reviewing);
  const jobQuery = useQuery({
    queryKey: ["admin-ai-triage-behavior-job", focused?.behaviorJobId],
    queryFn: () => aiTriageAdminApi.getBehaviorJob(focused!.behaviorJobId!),
    enabled: isTriageUUID(focused?.behaviorJobId),
    refetchOnWindowFocus: false,
  });
  const repairQuery = useQuery({
    queryKey: ["admin-ai-triage-repair", focused?.repairPlanId],
    queryFn: () => aiTriageAdminApi.getRepairPlan(focused!.repairPlanId!),
    enabled: isTriageUUID(focused?.repairPlanId),
    refetchOnWindowFocus: false,
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
  const deleteMut = useMutation({
    mutationFn: (ids: string[]) => aiTriageAdminApi.deleteIncidents(ids),
    onSuccess: (res, ids) => {
      toast.success(`${res.deleted} insiden dihapus`);
      setSelected({});
      if (focusedId && ids.includes(focusedId)) setFocusedId(null);
      if (reviewing && ids.includes(reviewing.id)) setReviewing(null);
      void q.refetch();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const job = jobQuery.data?.job;
  const plan = repairQuery.data?.plan;
  const channels = useMemo(() => CHANNELS, []);

  const askDelete = (ids: string[]) => {
    if (ids.length === 0 || deleteMut.isPending) return;
    const msg =
      ids.length === 1 ? "Hapus insiden ini dari antrian?" : `Hapus ${ids.length} insiden terpilih?`;
    if (!window.confirm(msg)) return;
    deleteMut.mutate(ids);
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openReview = (inc: AITriageIncident) => {
    setFocusedId(inc.id);
    setReviewing(inc);
  };

  const showJobFor = (inc: AITriageIncident) => focused?.id === inc.id && Boolean(inc.behaviorJobId);
  const refreshing = q.isFetching || jobQuery.isFetching || repairQuery.isFetching;
  const refresh = () => {
    void q.refetch();
    if (isTriageUUID(focused?.behaviorJobId)) void jobQuery.refetch();
    if (isTriageUUID(focused?.repairPlanId)) void repairQuery.refetch();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Insiden self-healing</CardTitle>
          <CardDescription>
            Konfirmasi menjalankan Composer 2.5 (draft PR). Chat WhatsApp lama tidak berubah
            sampai PR di-merge dan Encore di-deploy.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => askDelete(selectedIds)}
              disabled={deleteMut.isPending}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Hapus {selectedIds.length}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("mr-2 h-3.5 w-3.5", refreshing && "animate-spin")} />
            Perbarui
          </Button>
        </div>
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
              const rowFocused = focused?.id === inc.id;
              const lane = laneLabel(inc.lane);
              const hold = incidentHoldHint(inc);
              const dismissed = inc.reviewStatus === "dismissed";
              return (
                <div
                  key={inc.id}
                  className={cn(
                    "px-3 py-3",
                    rowFocused ? "bg-muted/40" : "hover:bg-muted/20",
                    dismissed && "opacity-70",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0"
                      checked={Boolean(selected[inc.id])}
                      onChange={() => toggleSelected(inc.id)}
                      aria-label="Pilih insiden"
                    />
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
                      {hold ? (
                        <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-400">{hold}</p>
                      ) : null}
                    </button>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openReview(inc)}
                      >
                        Review
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={deleteMut.isPending}
                        onClick={() => askDelete([inc.id])}
                      >
                        Hapus
                      </Button>
                    </div>
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
          onDelete={(id) => askDelete([id])}
        />
      ) : null}
    </Card>
  );
}
