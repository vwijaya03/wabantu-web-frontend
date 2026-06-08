"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ImageUp, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  eventsImageApi,
  type PatientImageDraftItem,
  type PatientImagePreview,
  type StaffImageDraftItem,
  type StaffImagePreview,
  type TherapyImageDraftItem,
  type TherapyImagePreview,
} from "@/lib/api/eventsImage";
import { usageApi } from "@/lib/api/usage";
import { toApiError } from "@/lib/api/client";
import {
  EVENT_IMAGE_ACCEPT,
  EVENT_IMAGE_MAX_BATCH_MB,
  EVENT_IMAGE_MAX_FILES,
  EVENT_IMAGE_MAX_MB,
  formatEventImageSize,
  validateEventImageFiles,
} from "@/lib/events-image-limits";
import { roleUsesTherapies } from "@/lib/events-staff";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

type ImportKind = "staff" | "patients" | "therapies";

export function EventImageImportPanel({
  kind,
  eventId,
  title,
  description,
  onCommitted,
}: {
  kind: ImportKind;
  eventId?: string;
  title: string;
  description: string;
  onCommitted: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [staffItems, setStaffItems] = useState<StaffImageDraftItem[]>([]);
  const [patientItems, setPatientItems] = useState<PatientImageDraftItem[]>([]);
  const [therapyItems, setTherapyItems] = useState<TherapyImageDraftItem[]>([]);

  const { data: usage } = useQuery({
    queryKey: ["usage-summary"],
    queryFn: () => usageApi.summary(),
  });
  const tokenQuota = useMemo(
    () => usage?.quotas.find((q) => q.eventType === "ai_token"),
    [usage],
  );
  const quotaExhausted = tokenQuota != null && tokenQuota.remaining <= 0;

  const previewMut = useMutation({
    mutationFn: async () => {
      if (kind === "staff" && eventId) return eventsImageApi.previewStaff(eventId, files);
      if (kind === "patients" && eventId) return eventsImageApi.previewPatients(eventId, files);
      return eventsImageApi.previewTherapies(files);
    },
    onSuccess: (data) => {
      setJobId(data.jobId);
      if (kind === "staff") {
        setStaffItems((data as StaffImagePreview).items.map((i) => ({ ...i })));
      } else if (kind === "patients") {
        setPatientItems((data as PatientImagePreview).items.map((i) => ({ ...i })));
      } else {
        setTherapyItems((data as TherapyImagePreview).items.map((i) => ({ ...i })));
      }
      toast.success(`Terdeteksi ${data.items.length} baris (pakai ${data.tokensUsed} token)`);
      data.warnings?.forEach((w) => toast.warning(w));
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const commitMut = useMutation({
    mutationFn: async () => {
      if (!jobId) throw new Error("Belum ada draft");
      if (kind === "staff" && eventId) return eventsImageApi.commitStaff(eventId, jobId, staffItems);
      if (kind === "patients" && eventId)
        return eventsImageApi.commitPatients(eventId, jobId, patientItems);
      return eventsImageApi.commitTherapies(jobId, therapyItems);
    },
    onSuccess: (res) => {
      toast.success(res.message);
      setFiles([]);
      setFileError(null);
      setJobId(null);
      setStaffItems([]);
      setPatientItems([]);
      setTherapyItems([]);
      onCommitted();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const applyFiles = (picked: FileList | null) => {
    if (!picked?.length) return;
    const merged = [...files, ...Array.from(picked)];
    const err = validateEventImageFiles(merged);
    setFileError(err);
    if (err) {
      toast.error(err);
      return;
    }
    setFiles(merged);
    setJobId(null);
    setStaffItems([]);
    setPatientItems([]);
    setTherapyItems([]);
  };

  const included =
    kind === "staff"
      ? staffItems.filter((i) => i.include).length
      : kind === "patients"
        ? patientItems.filter((i) => i.include).length
        : therapyItems.filter((i) => i.include).length;

  const totalBytes = files.reduce((s, f) => s + f.size, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageUp className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        {kind === "patients" ? (
          <p className="text-xs text-muted-foreground">
            Kolom <strong>Jam</strong> dari gambar diisi ke slot otomatis saat commit (slot harus sudah di-generate di tab
            Jadwal).
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {tokenQuota ? (
          <p className="text-xs text-muted-foreground">
            Sisa kuota token AI bulan ini: {tokenQuota.remaining} / {tokenQuota.limit}
          </p>
        ) : null}
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center",
            fileError && "border-destructive",
          )}
        >
          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            JPG/PNG/WEBP, maks. {EVENT_IMAGE_MAX_MB} MB/file, {EVENT_IMAGE_MAX_FILES} file, total{" "}
            {EVENT_IMAGE_MAX_BATCH_MB} MB
          </p>
          <label className="mt-3 cursor-pointer">
            <span className="text-sm font-medium text-primary underline">Pilih gambar</span>
            <input
              type="file"
              accept={EVENT_IMAGE_ACCEPT}
              multiple
              className="sr-only"
              onChange={(e) => {
                applyFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {files.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {files.map((f, idx) => (
              <li key={`${f.name}-${idx}`} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {f.name} ({formatEventImageSize(f.size)})
                </span>
                <Button type="button" size="icon" variant="ghost" onClick={() => {
                  const next = files.filter((_, i) => i !== idx);
                  setFiles(next);
                  setFileError(next.length ? validateEventImageFiles(next) : null);
                  setJobId(null);
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
            <li className="text-xs text-muted-foreground">Total: {formatEventImageSize(totalBytes)}</li>
          </ul>
        ) : null}
        {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!files.length || !!fileError || previewMut.isPending || quotaExhausted}
            onClick={() => previewMut.mutate()}
          >
            {previewMut.isPending ? "Memproses AI..." : "Baca gambar (AI)"}
          </Button>
          {jobId ? (
            <Button
              type="button"
              disabled={included === 0 || commitMut.isPending}
              onClick={() => commitMut.mutate()}
            >
              {commitMut.isPending ? "Menyimpan..." : `Simpan (${included})`}
            </Button>
          ) : null}
        </div>
        {kind === "staff" && staffItems.length > 0 ? (
          <div className="space-y-2 overflow-x-auto">
            {staffItems.map((row, idx) => (
              <div key={idx} className="grid min-w-[720px] grid-cols-7 gap-2 border-b pb-2 text-sm">
                <label className="col-span-1 flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) =>
                      setStaffItems((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, include: e.target.checked } : r)),
                      )
                    }
                  />
                </label>
                <Input
                  className="col-span-2"
                  value={row.fullName}
                  onChange={(e) =>
                    setStaffItems((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, fullName: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  value={row.role}
                  placeholder="terapis / relawan"
                  onChange={(e) =>
                    setStaffItems((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, role: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  value={(row.therapyNames ?? []).join(", ")}
                  placeholder={
                    roleUsesTherapies(row.role)
                      ? "Terapi (pisah koma)"
                      : "Terapi (jika terapis/shijie/daoshi/fashi)"
                  }
                  onChange={(e) =>
                    setStaffItems((prev) =>
                      prev.map((r, i) =>
                        i === idx
                          ? {
                              ...r,
                              therapyNames: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            }
                          : r,
                      ),
                    )
                  }
                />
                <Input
                  value={row.attendanceLabel ?? ""}
                  placeholder="Kehadiran"
                  onChange={(e) =>
                    setStaffItems((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, attendanceLabel: e.target.value } : r)),
                    )
                  }
                />
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={row.isPencatat}
                    onChange={(e) =>
                      setStaffItems((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, isPencatat: e.target.checked } : r)),
                      )
                    }
                  />
                  Pencatat
                </label>
              </div>
            ))}
          </div>
        ) : null}
        {kind === "patients" && patientItems.length > 0 ? (
          <div className="space-y-2 overflow-x-auto">
            {patientItems.map((row, idx) => (
              <div key={idx} className="grid min-w-[720px] grid-cols-6 gap-2 border-b pb-2 text-sm">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) =>
                      setPatientItems((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, include: e.target.checked } : r)),
                      )
                    }
                  />
                </label>
                <Input
                  value={row.fullName}
                  onChange={(e) =>
                    setPatientItems((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, fullName: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  type="date"
                  value={row.birthDate}
                  onChange={(e) =>
                    setPatientItems((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, birthDate: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  value={row.therapyName}
                  onChange={(e) =>
                    setPatientItems((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, therapyName: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  value={row.complaint ?? ""}
                  placeholder="Keluhan"
                  onChange={(e) =>
                    setPatientItems((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, complaint: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  value={row.preferredTime ?? ""}
                  placeholder="Jam preferensi"
                  onChange={(e) =>
                    setPatientItems((prev) =>
                      prev.map((r, i) =>
                        i === idx ? { ...r, preferredTime: e.target.value } : r,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
        ) : null}
        {kind === "therapies" && therapyItems.length > 0 ? (
          <div className="space-y-2">
            {therapyItems.map((row, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2 border-b pb-2 text-sm">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) =>
                      setTherapyItems((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, include: e.target.checked } : r)),
                      )
                    }
                  />
                </label>
                <Input
                  value={row.therapyName}
                  onChange={(e) =>
                    setTherapyItems((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, therapyName: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  value={row.description ?? ""}
                  placeholder="Deskripsi"
                  onChange={(e) =>
                    setTherapyItems((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r)),
                    )
                  }
                />
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
