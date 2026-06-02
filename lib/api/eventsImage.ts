import { validateEventImageFiles } from "@/lib/events-image-limits";
import { api } from "./client";

export interface StaffImageDraftItem {
  fullName: string;
  role: string;
  therapyNames?: string[];
  volunteerRoleName?: string;
  isPencatat: boolean;
  attendanceLabel?: string;
  include: boolean;
}

export interface PatientImageDraftItem {
  fullName: string;
  birthDate: string;
  therapyName: string;
  complaint?: string;
  preferredTime?: string;
  include: boolean;
}

export interface TherapyImageDraftItem {
  therapyName: string;
  description?: string;
  include: boolean;
}

export interface EventImagePreviewMeta {
  jobId: string;
  imagesProcessed?: number;
  warnings?: string[];
  inputTokens: number;
  outputTokens: number;
  tokensUsed: number;
  tokenQuotaRemaining: number;
  tokenQuotaLimit: number;
  quotaNotice?: string;
}

export interface StaffImagePreview extends EventImagePreviewMeta {
  items: StaffImageDraftItem[];
}

export interface PatientImagePreview extends EventImagePreviewMeta {
  items: PatientImageDraftItem[];
}

export interface TherapyImagePreview extends EventImagePreviewMeta {
  items: TherapyImageDraftItem[];
}

export interface EventImageCommitResult {
  jobId: string;
  savedCount: number;
  skippedCount: number;
  message: string;
}

function previewTimeout(files: File[]) {
  return Math.min(300_000, 90_000 + files.length * 45_000);
}

export const eventsImageApi = {
  previewStaff(eventId: string, files: File[]): Promise<StaffImagePreview> {
    const err = validateEventImageFiles(files);
    if (err) throw new Error(err);
    const form = new FormData();
    for (const f of files) form.append("files", f);
    return api
      .post(`/events/detail/${eventId}/people/import-image/preview`, form, {
        timeout: previewTimeout(files),
      })
      .then((r) => r.data);
  },

  commitStaff(
    eventId: string,
    jobId: string,
    items: StaffImageDraftItem[],
  ): Promise<EventImageCommitResult> {
    return api
      .post(`/events/detail/${eventId}/people/import-image/draft/${jobId}/commit`, { items })
      .then((r) => r.data);
  },

  previewPatients(eventId: string, files: File[]): Promise<PatientImagePreview> {
    const err = validateEventImageFiles(files);
    if (err) throw new Error(err);
    const form = new FormData();
    for (const f of files) form.append("files", f);
    return api
      .post(`/events/detail/${eventId}/patients/import-image/preview`, form, {
        timeout: previewTimeout(files),
      })
      .then((r) => r.data);
  },

  commitPatients(
    eventId: string,
    jobId: string,
    items: PatientImageDraftItem[],
  ): Promise<EventImageCommitResult> {
    return api
      .post(`/events/detail/${eventId}/patients/import-image/draft/${jobId}/commit`, { items })
      .then((r) => r.data);
  },

  previewTherapies(files: File[]): Promise<TherapyImagePreview> {
    const err = validateEventImageFiles(files);
    if (err) throw new Error(err);
    const form = new FormData();
    for (const f of files) form.append("files", f);
    return api
      .post("/events/masters/therapies/import-image/preview", form, {
        timeout: previewTimeout(files),
      })
      .then((r) => r.data);
  },

  commitTherapies(jobId: string, items: TherapyImageDraftItem[]): Promise<EventImageCommitResult> {
    return api
      .post(`/events/masters/therapies/import-image/draft/${jobId}/commit`, { items })
      .then((r) => r.data);
  },
};
