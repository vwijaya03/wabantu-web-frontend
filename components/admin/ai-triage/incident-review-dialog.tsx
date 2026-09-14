"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  aiTriageAdminApi,
  isTriageUUID,
  type AITriageIncident,
  type BehaviorContract,
} from "@/lib/api/ai-triage";
import { toApiError } from "@/lib/api/client";
import { BehaviorContractCard } from "./behavior-contract-card";
import { BehaviorJobCard } from "./behavior-job-card";
import { BEHAVIOR_FIX_ACTIONS_URL, confirmHoldToast, incidentHoldHint, jobInFlight } from "./behavior-job-status";
import { IncidentTurnPair } from "./incident-turn-pair";

function asContract(raw: unknown): BehaviorContract | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as BehaviorContract;
}

function contractCanDispatchComposer(c?: BehaviorContract | null): boolean {
  if (!c?.assertions || c.assertions.needCustomerInput) return false;
  const a = c.assertions;
  if (c.lane === "buyerflow" || c.lane === "draft_order") {
    return Boolean(a.wantPath || (a.cartInclude && a.cartInclude.length > 0));
  }
  if (c.lane === "grounded_content") {
    return Boolean(
      (a.replyContains && a.replyContains.length > 0) ||
        (a.replyExcludes && a.replyExcludes.length > 0),
    );
  }
  return Boolean(a.wantPath);
}

export function IncidentReviewDialog({
  incident,
  onClose,
  onChanged,
  onDelete,
}: {
  incident: AITriageIncident;
  onClose: () => void;
  onChanged: () => void;
  onDelete?: (id: string) => void;
}) {
  const draft = asContract(incident.draftContract) ?? asContract(incident.confirmedContract);
  const [busy, setBusy] = useState(false);

  const jobQuery = useQuery({
    queryKey: ["admin-ai-triage-behavior-job", incident.behaviorJobId],
    queryFn: () => aiTriageAdminApi.getBehaviorJob(incident.behaviorJobId!),
    enabled: isTriageUUID(incident.behaviorJobId),
    refetchOnWindowFocus: false,
  });
  const job = jobQuery.data?.job;
  const canDispatch = contractCanDispatchComposer(draft);
  const inFlight = jobInFlight(job?.status);
  const hold = incidentHoldHint(incident);

  const retryMut = useMutation({
    mutationFn: () => aiTriageAdminApi.retryBehaviorJob(incident.behaviorJobId!),
    onSuccess: () => {
      toast.success("Composer di-dispatch ulang ke GitHub Actions");
      void jobQuery.refetch();
      onChanged();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });
  const verifyMut = useMutation({
    mutationFn: () => aiTriageAdminApi.verifyBehaviorJob(incident.behaviorJobId!),
    onSuccess: (res) => toast.success(res.result.passed ? "Verifikasi lulus" : "Verifikasi gagal"),
    onError: (e) => toast.error(toApiError(e).message),
  });

  const confirm = async () => {
    if (!draft) {
      toast.error("Contract kosong");
      return;
    }
    if (job) {
      toast.message("Composer untuk insiden ini sudah ada — pakai Coba Composer lagi jika gagal");
      return;
    }
    setBusy(true);
    try {
      const res = await aiTriageAdminApi.confirmIncident(incident.id, draft);
      onChanged();
      if (res.behaviorJob) {
        toast.success(confirmHoldToast(res.holdReason, true));
        onClose();
      } else {
        toast.message(confirmHoldToast(res.holdReason, false));
      }
    } catch (e) {
      toast.error(toApiError(e).message);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async () => {
    setBusy(true);
    try {
      await aiTriageAdminApi.dismissIncident(incident.id);
      toast.success("Insiden diabaikan — tetap di daftar, badge Diabaikan");
      onChanged();
      onClose();
    } catch (e) {
      toast.error(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const showConfirm = !job && incident.reviewStatus === "open";
  const confirmDisabled = busy || inFlight || retryMut.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background p-4 shadow-lg">
        <h2 className="text-lg font-semibold">
          {hold ? "Tidak ke Composer (aman)" : canDispatch ? "Jalankan Composer 2.5" : "Konfirmasi masalah"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kanal {incident.channel}
          {incident.degradedMode ? ` · ${incident.degradedMode}` : ""}.
          {hold ? "" : " Composer membuat draft PR; chat WhatsApp lama tidak berubah sampai PR di-merge dan di-deploy."}
        </p>
        <div className="mt-3">
          <IncidentTurnPair incident={incident} />
        </div>
        <div className="mt-3">
          <BehaviorContractCard contract={draft} />
        </div>
        {hold ? (
          <p className="mt-3 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
            {hold}
          </p>
        ) : null}
        {jobQuery.isError ? (
          <div className="mt-3 space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="font-medium text-destructive">Composer gagal dimuat</p>
            <p className="text-destructive">{toApiError(jobQuery.error).message}</p>
            <div className="flex flex-wrap gap-2">
              {incident.behaviorJobId ? (
                <Button type="button" size="sm" onClick={() => retryMut.mutate()} disabled={busy || retryMut.isPending}>
                  Coba Composer lagi
                </Button>
              ) : null}
              <Button size="sm" variant="outline" asChild>
                <a href={BEHAVIOR_FIX_ACTIONS_URL} target="_blank" rel="noreferrer">
                  Buka GitHub Actions
                </a>
              </Button>
            </div>
          </div>
        ) : null}
        {job ? (
          <div className="mt-3">
            <BehaviorJobCard
              job={job}
              busy={busy || retryMut.isPending || verifyMut.isPending}
              onRetry={incident.behaviorJobId ? () => retryMut.mutate() : undefined}
              onVerify={incident.behaviorJobId ? () => verifyMut.mutate() : undefined}
            />
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {onDelete ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => onDelete(incident.id)}
              disabled={busy}
            >
              Hapus
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Tutup
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void dismiss()}
            disabled={busy || incident.reviewStatus === "dismissed"}
          >
            Abaikan
          </Button>
          {showConfirm ? (
            <Button type="button" onClick={() => void confirm()} disabled={confirmDisabled}>
              {inFlight
                ? "Composer sedang dispatch"
                : canDispatch
                  ? "Konfirmasi & jalankan Composer"
                  : "Konfirmasi masalah"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
