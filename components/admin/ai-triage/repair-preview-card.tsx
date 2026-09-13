"use client";

import { Button } from "@/components/ui/button";
import type { AITriageRepairPlan } from "@/lib/api/ai-triage";

export function RepairPreviewCard({
  plan,
  onApprove,
  onApply,
  busy,
}: {
  plan: AITriageRepairPlan;
  onApprove: () => void;
  onApply: () => void;
  busy?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-md border p-3 text-sm">
      <p className="font-medium">Pratinjau — belum mengubah database</p>
      <p>
        Operasi <code>{plan.operation}</code> · status {plan.status}
      </p>
      {plan.blockReasons && plan.blockReasons.length > 0 ? (
        <p className="text-destructive">Diblokir: {plan.blockReasons.join(", ")}</p>
      ) : null}
      <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
        {JSON.stringify({ before: plan.beforeJson, after: plan.afterJson }, null, 2)}
      </pre>
      <p className="text-muted-foreground">
        Pesan WhatsApp dan transcript web chat lama tidak ditulis ulang. Cart Redis storefront
        tidak diubah.
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={busy || plan.status !== "draft"} onClick={onApprove}>
          Setujui
        </Button>
        <Button type="button" disabled={busy || plan.status !== "approved"} onClick={onApply}>
          Terapkan
        </Button>
      </div>
    </div>
  );
}
