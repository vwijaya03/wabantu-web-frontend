"use client";

import { Button } from "@/components/ui/button";
import type { AITriageBehaviorJob } from "@/lib/api/ai-triage";

function canRetryBehaviorJob(job: AITriageBehaviorJob): boolean {
  if (job.attemptCount >= 2) return false;
  return job.status === "failed" || job.status === "pr_ready";
}

function statusLabel(status: string): string {
  switch (status) {
    case "failed":
      return "Composer gagal";
    case "fix_running":
    case "test_ready":
      return "Composer sedang jalan";
    case "pr_ready":
      return "Draft PR siap";
    case "already_fixed":
      return "Tes sudah hijau di master";
    case "verified":
      return "Verifikasi lulus";
    default:
      return status;
  }
}

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
  const retry = canRetryBehaviorJob(job);
  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <p>
        {statusLabel(job.status)}
        {job.prUrl ? (
          <>
            {" "}
            ·{" "}
            <a className="underline" href={job.prUrl} target="_blank" rel="noreferrer">
              Draft PR
            </a>
          </>
        ) : null}
        {job.githubRunUrl ? (
          <>
            {" "}
            ·{" "}
            <a className="underline" href={job.githubRunUrl} target="_blank" rel="noreferrer">
              GitHub Actions
            </a>
          </>
        ) : null}
      </p>
      {job.errorText ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive whitespace-pre-wrap break-words">
          {job.errorText}
        </p>
      ) : null}
      {job.expectedRevision ? <p className="text-muted-foreground">Revision: {job.expectedRevision}</p> : null}
      <div className="flex flex-wrap gap-2">
        {retry && onRetry ? (
          <Button type="button" size="sm" onClick={onRetry} disabled={busy}>
            Coba Composer lagi
          </Button>
        ) : null}
        {onVerify ? (
          <Button type="button" size="sm" variant="outline" onClick={onVerify} disabled={busy}>
            Verifikasi fix kode
          </Button>
        ) : null}
      </div>
    </div>
  );
}
