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

  const confirm = async () => {
    if (!draft) {
      toast.error("Contract kosong");
      return;
    }
    setBusy(true);
    try {
      await aiTriageAdminApi.confirmIncident(incident.id, draft);
      toast.success("Masalah dikonfirmasi — belum diperbaiki");
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
        <h2 className="text-lg font-semibold">Konfirmasi masalah — belum diperbaiki</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kanal {incident.channel}
          {incident.degradedMode ? ` · ${incident.degradedMode}` : ""}. Confirm tidak berarti
          sudah fixed.
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
          <Button type="button" onClick={() => void confirm()} disabled={busy}>
            Konfirmasi masalah
          </Button>
        </div>
      </div>
    </div>
  );
}
