import type { AITriageBehaviorJob, AITriageIncident } from "@/lib/api/ai-triage";

export const BEHAVIOR_FIX_ACTIONS_URL =
  "https://github.com/vwijaya03/wabantu-api-go/actions/workflows/ai-triage-behavior-fix.yml";

const STUCK_NO_CALLBACK_MS = 3 * 60 * 1000;
const STUCK_WITH_CALLBACK_MS = 50 * 60 * 1000;

export const STUCK_COMPOSER_MESSAGE =
  "GitHub Actions tidak mengembalikan hasil. Buka GitHub Actions, lalu Coba Composer lagi.";

export function jobInFlight(status?: string): boolean {
  return status === "fix_running" || status === "test_ready" || status === "planning";
}

export function behaviorJobStuck(
  job: Pick<AITriageBehaviorJob, "status" | "githubRunUrl" | "updatedAt">,
  now = Date.now(),
): boolean {
  if (!jobInFlight(job.status)) return false;
  const updated = new Date(job.updatedAt).getTime();
  if (!Number.isFinite(updated)) return false;
  const age = now - updated;
  if (!job.githubRunUrl?.trim()) return age >= STUCK_NO_CALLBACK_MS;
  return age >= STUCK_WITH_CALLBACK_MS;
}

export function incidentComposerStuck(inc: AITriageIncident, now = Date.now()): boolean {
  if (!inc.behaviorJobId || !jobInFlight(inc.behaviorJobStatus)) return false;
  const updated = inc.behaviorJobUpdatedAt ? new Date(inc.behaviorJobUpdatedAt).getTime() : NaN;
  if (!Number.isFinite(updated)) return jobInFlight(inc.behaviorJobStatus) && !inc.behaviorJobRunUrl;
  return behaviorJobStuck(
    {
      status: inc.behaviorJobStatus ?? "fix_running",
      githubRunUrl: inc.behaviorJobRunUrl,
      updatedAt: new Date(updated).toISOString(),
    },
    now,
  );
}

export function canRetryBehaviorJob(job: AITriageBehaviorJob, now = Date.now()): boolean {
  if (job.attemptCount >= 2) return false;
  if (job.status === "failed" || job.status === "pr_ready") return true;
  return behaviorJobStuck(job, now);
}

export function canVerifyBehaviorJob(job: AITriageBehaviorJob): boolean {
  return job.status === "pr_ready" || job.status === "already_fixed" || job.status === "verified";
}

export function composerActionsUrl(job?: Pick<AITriageBehaviorJob, "githubRunUrl"> | null): string {
  return job?.githubRunUrl?.trim() || BEHAVIOR_FIX_ACTIONS_URL;
}

export function composerStatusLabel(job: AITriageBehaviorJob, now = Date.now()): string {
  if (job.status === "failed" || behaviorJobStuck(job, now)) return "Composer gagal";
  switch (job.status) {
    case "fix_running":
    case "test_ready":
    case "planning":
      return "Composer sedang jalan";
    case "pr_ready":
      return "Draft PR siap";
    case "already_fixed":
      return "Tes sudah hijau di master";
    case "verified":
      return "Verifikasi lulus";
    default:
      return job.status;
  }
}

export function incidentComposerBadgeVariant(
  inc: AITriageIncident,
  now = Date.now(),
): "destructive" | "warning" | "success" | "secondary" | "outline" {
  const label = incidentComposerLabel(inc, now);
  if (label === "Composer gagal") return "destructive";
  if (label === "Composer jalan" || label === "Composer") return "warning";
  if (label === "Draft PR" || label === "Tes hijau" || label === "Terverifikasi" || label === "Selesai") {
    return "success";
  }
  if (label === "Repair siap" || label.startsWith("Tunggu ")) return "warning";
  return "secondary";
}

export function channelLabel(channel: string): string {
  switch (channel) {
    case "whatsapp":
      return "WhatsApp";
    case "web_chat":
      return "Web chat";
    case "storefront_search":
      return "Storefront";
    default:
      return channel || "Semua";
  }
}

export function laneLabel(lane?: string): string {
  if (!lane) return "";
  return lane.replaceAll("_", " ");
}

function contractFromIncident(inc: AITriageIncident): { needCustomerInput?: boolean; clarification?: string } | null {
  const raw = inc.confirmedContract ?? inc.draftContract;
  if (!raw || typeof raw !== "object") return null;
  const c = raw as { assertions?: { needCustomerInput?: boolean }; clarification?: string };
  return { needCustomerInput: c.assertions?.needCustomerInput, clarification: c.clarification };
}

export function incidentNeedsCustomerInput(inc: AITriageIncident): boolean {
  if (inc.resolutionStatus === "needs_customer_input") return true;
  return Boolean(contractFromIncident(inc)?.needCustomerInput);
}

/** Kenapa Composer tidak jalan setelah konfirmasi (fail-closed = aman). */
export function incidentHoldHint(inc: AITriageIncident): string | null {
  if (incidentNeedsCustomerInput(inc) || inc.reviewStatus === "needs_human_input") {
    if (incidentNeedsCustomerInput(inc)) {
      const extra = contractFromIncident(inc)?.clarification?.trim();
      return extra
        ? `Aman: Composer tidak dijalankan. ${extra} Menunggu pembeli pilih SKU di chat — bukan klik superadmin.`
        : "Aman: jangan menebak varian. Composer tidak dijalankan. Menunggu pembeli pilih SKU di WhatsApp, bukan klik superadmin.";
    }
    if (inc.reviewStatus === "needs_human_input") {
      return "Aman: kontrak belum bisa diuji. Composer tidak dijalankan. Lengkapi invariant (path/keranjang/teks) atau abaikan.";
    }
  }
  return null;
}

export function confirmHoldToast(holdReason?: string, dispatched?: boolean): string {
  if (dispatched) return "Composer di-dispatch ke GitHub Actions";
  switch (holdReason) {
    case "need_customer_input":
      return "Dikonfirmasi. Aman: jangan tebak varian. Menunggu pembeli di WhatsApp — Composer tidak dijalankan.";
    case "lane_fail_closed":
      return "Dikonfirmasi. Lane fail-closed — Composer tidak dijalankan.";
    case "contract_not_deterministic":
      return "Dikonfirmasi. Kontrak belum deterministik — Composer tidak dijalankan.";
    default:
      return "Dikonfirmasi — Composer tidak dijalankan (bukan bug; menunggu input yang tepat).";
  }
}

export function incidentComposerLabel(inc: AITriageIncident, now = Date.now()): string {
  if (incidentNeedsCustomerInput(inc)) return "Tunggu pembeli";
  if (inc.reviewStatus === "needs_human_input") return "Tunggu kontrak";
  if (inc.resolutionStatus === "fixed") return "Selesai";
  if (inc.resolutionStatus === "repair_ready") return "Repair siap";
  if (inc.behaviorJobStatus === "failed" || incidentComposerStuck(inc, now)) return "Composer gagal";
  if (inc.behaviorJobStatus === "pr_ready") return "Draft PR";
  if (inc.behaviorJobStatus === "already_fixed") return "Tes hijau";
  if (inc.behaviorJobStatus === "verified") return "Terverifikasi";
  if (jobInFlight(inc.behaviorJobStatus)) return "Composer jalan";
  if (inc.behaviorJobId && inc.resolutionStatus !== "fixed") return "Composer";
  if (inc.reviewStatus === "confirmed") return "Dikonfirmasi — belum diperbaiki";
  return "Perlu review";
}

export function composerErrorText(job: AITriageBehaviorJob, now = Date.now()): string | null {
  if (job.errorText?.trim()) return job.errorText.trim();
  if (job.status === "failed" || behaviorJobStuck(job, now)) return STUCK_COMPOSER_MESSAGE;
  return null;
}
