"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  aiTriageAdminApi,
  type AITriageIncident,
  type BehaviorContract,
} from "@/lib/api/ai-triage";
import { toApiError } from "@/lib/api/client";
import { BehaviorContractCard } from "./behavior-contract-card";
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
}: {
  incident: AITriageIncident;
  onClose: () => void;
  onChanged: () => void;
}) {
  const draft = asContract(incident.draftContract) ?? asContract(incident.confirmedContract);
  const [busy, setBusy] = useState(false);

  const canDispatch = contractCanDispatchComposer(draft);
  const alreadyHasJob = Boolean(incident.behaviorJobId);

  const confirm = async () => {
    if (!draft) {
      toast.error("Contract kosong");
      return;
    }
    setBusy(true);
    try {
      const res = await aiTriageAdminApi.confirmIncident(incident.id, draft);
      if (res.behaviorJob) {
        toast.success("Composer 2.5 mulai membuat draft PR");
      } else if (alreadyHasJob) {
        toast.success("Composer sudah jalan untuk insiden ini");
      } else {
        toast.message("Dikonfirmasi — kontrak belum cukup untuk Composer");
      }
      onChanged();
      onClose();
    } catch (e) {
      toast.error(toApiError(e).message);
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
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Tutup
          </Button>
          <Button type="button" variant="outline" onClick={() => void dismiss()} disabled={busy}>
            Abaikan
          </Button>
          <Button type="button" onClick={() => void confirm()} disabled={busy || alreadyHasJob}>
            {alreadyHasJob
              ? "Composer sudah jalan"
              : canDispatch
                ? "Konfirmasi & jalankan Composer"
                : "Konfirmasi masalah"}
          </Button>
        </div>
      </div>
    </div>
  );
}
