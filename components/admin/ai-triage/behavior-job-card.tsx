"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AITriageBehaviorJob } from "@/lib/api/ai-triage";
import { cn } from "@/lib/utils";
import {
  canRetryBehaviorJob,
  canVerifyBehaviorJob,
  composerActionsUrl,
  composerErrorText,
  composerStatusLabel,
  jobInFlight,
  behaviorJobStuck,
} from "@/components/admin/ai-triage/behavior-job-status";

export function BehaviorJobCard({
  job,
  busy,
  onRetry,
  onVerify,
}: {
  job: AITriageBehaviorJob;
  busy?: boolean;
  onRetry?: () => void;
  onVerify?: () => void;
}) {
  const stuck = behaviorJobStuck(job);
  const failed = job.status === "failed" || stuck;
  const retry = canRetryBehaviorJob(job);
  const verify = canVerifyBehaviorJob(job);
  const errorText = composerErrorText(job);
  const actionsUrl = composerActionsUrl(job);
  const running = jobInFlight(job.status) && !stuck;

  return (
    <div
      className={cn(
        "space-y-3 rounded-md px-3 py-3 text-sm",
        failed ? "border-l-2 border-l-destructive bg-destructive/5" : "border-l-2 border-l-border bg-muted/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={failed ? "destructive" : running ? "warning" : "secondary"}>
          {composerStatusLabel(job)}
        </Badge>
        {job.prUrl ? (
          <Button variant="link" size="sm" className="h-auto px-0" asChild>
            <a href={job.prUrl} target="_blank" rel="noreferrer">
              Draft PR
              <ExternalLink className="size-3" />
            </a>
          </Button>
        ) : null}
        <Button variant="link" size="sm" className="h-auto px-0 text-muted-foreground" asChild>
          <a href={actionsUrl} target="_blank" rel="noreferrer">
            GitHub Actions
            <ExternalLink className="size-3" />
          </a>
        </Button>
      </div>
      {errorText ? <p className="text-destructive whitespace-pre-wrap break-words">{errorText}</p> : null}
      {running ? (
        <p className="text-muted-foreground">
          Biasanya 5–45 menit. Kalau Actions merah, status di sini berubah jadi gagal.
        </p>
      ) : null}
      {job.expectedRevision ? (
        <p className="text-xs text-muted-foreground">Revision {job.expectedRevision}</p>
      ) : null}
      {retry || verify ? (
        <div className="flex flex-wrap gap-2">
          {retry && onRetry ? (
            <Button type="button" size="sm" onClick={onRetry} disabled={busy}>
              Coba Composer lagi
            </Button>
          ) : null}
          {verify && onVerify ? (
            <Button type="button" size="sm" variant="outline" onClick={onVerify} disabled={busy}>
              Verifikasi fix kode
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
