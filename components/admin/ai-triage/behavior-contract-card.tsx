"use client";

import { Badge } from "@/components/ui/badge";
import type { BehaviorContract } from "@/lib/api/ai-triage";

export function BehaviorContractCard({
  contract,
  title,
}: {
  contract?: BehaviorContract | null;
  title?: string;
}) {
  if (!contract) {
    return <p className="text-sm text-muted-foreground">Belum ada behavior contract.</p>;
  }
  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{title ?? "Expected behavior"}</p>
        <Badge variant="outline">{contract.lane}</Badge>
        <Badge variant="secondary">{contract.channel}</Badge>
        {contract.degradedMode ? <Badge variant="outline">{contract.degradedMode}</Badge> : null}
      </div>
      {contract.clarification ? (
        <p className="text-muted-foreground">{contract.clarification}</p>
      ) : null}
      {contract.assertions.wantPath ? (
        <p>
          Path: <code>{contract.assertions.wantPath}</code>
        </p>
      ) : null}
      {contract.assertions.needCustomerInput ? (
        <p className="text-amber-700">Menunggu input pelanggan — jangan menebak varian.</p>
      ) : null}
    </div>
  );
}
