"use client";

import { Button } from "@/components/ui/button";
import type { AITriageBehaviorJob } from "@/lib/api/ai-triage";
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
      className={
        failed
          ? "space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
          : "space-y-2 rounded-md border p-3 text-sm"
      }
    >
      <p className={failed ? "font-medium text-destructive" : undefined}>
        {composerStatusLabel(job)}
        {job.prUrl ? (
          <>
            {" "}
            ·{" "}
            <a className="underline" href={job.prUrl} target="_blank" rel="noreferrer">
              Draft PR
            </a>
          </>
        ) : null}
        {" "}
        ·{" "}
        <a className="underline" href={actionsUrl} target="_blank" rel="noreferrer">
          GitHub Actions
        </a>
      </p>
      {errorText ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive whitespace-pre-wrap break-words">
          {errorText}
        </p>
      ) : null}
      {running ? (
        <p className="text-muted-foreground">
          Biasanya 5–45 menit. Kalau GitHub Actions merah, status di sini harus berubah jadi gagal —
          jangan menunggu tanpa membuka Actions.
        </p>
      ) : null}
      {job.expectedRevision ? <p className="text-muted-foreground">Revision: {job.expectedRevision}</p> : null}
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
    </div>
  );
}
