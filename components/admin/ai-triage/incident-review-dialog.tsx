"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  aiTriageAdminApi,
  type AITriageIncident,
  type BehaviorContract,
} from "@/lib/api/ai-triage";
import { toApiError } from "@/lib/api/client";
import { BehaviorContractCard } from "./behavior-contract-card";
import { BehaviorJobCard } from "./behavior-job-card";
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

function jobInFlight(status?: string): boolean {
  return status === "fix_running" || status === "test_ready" || status === "planning";
}

export function IncidentReviewDialog({
  incident,
  onClose,
  onChanged,
}: {
  incident: AITriageIncident;
  onClose: () => void;
  onChanged: () => void;
}) {
  const draft = asContract(incident.draftContract) ?? asContract(incident.confirmedContract);
  const [busy, setBusy] = useState(false);

  const jobQuery = useQuery({
    queryKey: ["admin-ai-triage-behavior-job", incident.behaviorJobId],
    queryFn: () => aiTriageAdminApi.getBehaviorJob(incident.behaviorJobId!),
    enabled: Boolean(incident.behaviorJobId),
    refetchInterval: (q) => (jobInFlight(q.state.data?.job.status) ? 3000 : false),
  });
  const job = jobQuery.data?.job;
  const canDispatch = contractCanDispatchComposer(draft);
  const inFlight = jobInFlight(job?.status);

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
      if (res.behaviorJob) {
        toast.success("Composer di-dispatch ke GitHub Actions");
      } else {
        toast.message("Dikonfirmasi — kontrak belum cukup untuk Composer");
      }
      onChanged();
      onClose();
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
      toast.success("Insiden diabaikan");
      onChanged();
      onClose();
    } catch (e) {
      toast.error(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const showConfirm = !job;
  const confirmDisabled = busy || inFlight || retryMut.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background p-4 shadow-lg">
        <h2 className="text-lg font-semibold">
          {canDispatch ? "Jalankan Composer 2.5" : "Konfirmasi masalah"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kanal {incident.channel}
          {incident.degradedMode ? ` · ${incident.degradedMode}` : ""}. Composer membuat draft PR;
          chat WhatsApp lama tidak berubah sampai PR di-merge dan di-deploy.
        </p>
        <div className="mt-3">
          <IncidentTurnPair incident={incident} />
        </div>
        <div className="mt-3">
          <BehaviorContractCard contract={draft} />
        </div>
        {jobQuery.isError ? (
          <p className="mt-3 text-sm text-destructive">{toApiError(jobQuery.error).message}</p>
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
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Tutup
          </Button>
          <Button type="button" variant="outline" onClick={() => void dismiss()} disabled={busy}>
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
