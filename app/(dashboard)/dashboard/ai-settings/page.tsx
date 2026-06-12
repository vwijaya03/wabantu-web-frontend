"use client";

import Link from "next/link";
import { useLayoutEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProfileAiAssistButton } from "@/components/dashboard/profile-ai-assist-button";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { businessApi, type BusinessProfile } from "@/lib/api/business";
import { toApiError } from "@/lib/api/client";
import { formatQueryError } from "@/lib/api/rate-limit";
import {
  DEFAULT_REPORTING_TIMEZONE_UI,
  isReportingTimezoneId,
  REPORTING_TIMEZONE_GROUPS,
  REPORTING_TIMEZONE_IDS,
  reportingTimezoneSelectLabel,
  reportingTimezoneTriggerLabel,
} from "@/lib/reporting-timezones";

const PROFILE_KEY = ["business-profile"] as const;

const reportingTimezoneEnum = z.enum(
  REPORTING_TIMEZONE_IDS as unknown as [string, ...string[]],
);

const schema = z.object({
  businessName: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  openingHours: z.string().max(500).optional().nullable(),
  productsServices: z.string().max(2000).optional().nullable(),
  basePricing: z.string().max(500).optional().nullable(),
  deliveryArea: z.string().max(500).optional().nullable(),
  greetingTemplate: z.string().max(2000).optional().nullable(),
  tone: z.enum(["friendly", "formal", "casual"]),
  aiEnabled: z.boolean(),
  reportingTimezone: reportingTimezoneEnum,
});
type FormValues = z.infer<typeof schema>;

export default function AiSettingsPage() {
  const { data: profile, isPending, isError, error, refetch } = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: businessApi.get,
  });

  return (
    <>
      <PageHeader
        title="AI Settings"
        description="Info bisnis ini dipakai AI sebagai konteks saat membalas pelanggan."
      />
      {isPending ? (
        <p className="text-sm text-muted-foreground">Memuat profil…</p>
      ) : isError || !profile ? (
        <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-sm font-medium text-destructive">
            {isError ? formatQueryError(error).title : "Profil bisnis tidak ditemukan"}
          </p>
          <p className="text-sm text-muted-foreground">
            {isError
              ? formatQueryError(error).detail
              : "Profil bisnis tidak bisa dimuat. Coba muat ulang halaman."}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void refetch()}
          >
            Coba lagi
          </Button>
        </div>
      ) : (
        <AiSettingsForm profile={profile} />
      )}
    </>
  );
}

function AiSettingsForm({ profile }: { profile: BusinessProfile }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canAiAssist = canPerformOwnerActions(user);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(profile),
  });

  useLayoutEffect(() => {
    reset(toFormValues(profile));
  }, [profile, reset]);

  const saveMut = useMutation({
    mutationFn: businessApi.update,
    onSuccess: (updated) => {
      qc.setQueryData(PROFILE_KEY, updated);
      toast.success("Profil disimpan");
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const aiEnabled = useWatch({ control, name: "aiEnabled" });
  const tone = useWatch({ control, name: "tone" });
  const description = useWatch({ control, name: "description" });
  const productsServices = useWatch({ control, name: "productsServices" });

  return (
    <>
      <form
        onSubmit={handleSubmit((v) => saveMut.mutate(v))}
        className="space-y-6"
        noValidate
      >
        <Card>
          <CardHeader>
            <CardTitle>Status AI</CardTitle>
            <CardDescription>
              Saat dimatikan, semua chat masuk akan diteruskan ke owner/staff.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">AI auto-reply</p>
              <p className="text-xs text-muted-foreground">
                {aiEnabled ? "Aktif" : "Nonaktif"}
              </p>
            </div>
            <Button
              type="button"
              variant={aiEnabled ? "outline" : "default"}
              onClick={() =>
                setValue("aiEnabled", !aiEnabled, { shouldDirty: true })
              }
            >
              {aiEnabled ? "Matikan" : "Aktifkan"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zona waktu laporan</CardTitle>
            <CardDescription>
              Menentukan batas &quot;hari ini&quot; untuk statistik dashboard (pesan
              masuk hari ini, dll.). Offset UTC menyesuaikan DST jika zona
              memakainya.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Field
              label="Zona waktu bisnis"
              error={errors.reportingTimezone?.message}
            >
              <Controller
                name="reportingTimezone"
                control={control}
                render={({ field }) => (
                  <Select
                    key={`tz-${profile?.id ?? "pending"}-${profile?.reportingTimezone ?? "pending"}`}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="reporting-timezone"
                      className="w-full max-w-md"
                      aria-invalid={Boolean(errors.reportingTimezone)}
                    >
                      <SelectValue placeholder="Pilih zona waktu">
                        {field.value
                          ? isReportingTimezoneId(field.value)
                            ? reportingTimezoneTriggerLabel(field.value)
                            : field.value
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      {REPORTING_TIMEZONE_GROUPS.map((group) => (
                        <SelectGroup key={group.label}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.zones.map((z) => (
                            <SelectItem key={z.id} value={z.id}>
                              {reportingTimezoneSelectLabel(z.id, z.label)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Daftar mengikuti identifier IANA (tzdb). Backend dan query analitik
              memakai zona yang sama.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profil bisnis</CardTitle>
            <CardDescription>
              Semakin lengkap, semakin akurat jawaban AI. Butuh FAQ juga?{" "}
              <Link
                href="/dashboard/knowledge-base/setup"
                className="text-primary underline-offset-4 hover:underline"
              >
                Setup lengkap dengan wawancara AI
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nama bisnis"
              error={errors.businessName?.message}
              className="sm:col-span-2"
            >
              <Input {...register("businessName")} />
            </Field>
            <Field
              label="Deskripsi singkat"
              error={errors.description?.message}
              className="sm:col-span-2"
              action={
                canAiAssist ? (
                  <ProfileAiAssistButton
                    field="description"
                    label="Deskripsi singkat"
                    currentValue={description ?? undefined}
                    onApply={(text) =>
                      setValue("description", text, { shouldDirty: true })
                    }
                  />
                ) : null
              }
            >
              <Textarea
                rows={3}
                placeholder="Toko makanan rumahan, melayani pesanan harian..."
                {...register("description")}
              />
            </Field>
            <Field label="Alamat" error={errors.address?.message}>
              <Input
                placeholder="Jl. Mawar No. 12, Jakarta Selatan"
                {...register("address")}
              />
            </Field>
            <Field label="Jam buka" error={errors.openingHours?.message}>
              <Input
                placeholder="Senin–Sabtu 09:00–21:00"
                {...register("openingHours")}
              />
            </Field>
            <Field
              label="Produk / jasa"
              error={errors.productsServices?.message}
              className="sm:col-span-2"
              action={
                canAiAssist ? (
                  <ProfileAiAssistButton
                    field="productsServices"
                    label="Produk / jasa"
                    currentValue={productsServices ?? undefined}
                    onApply={(text) =>
                      setValue("productsServices", text, { shouldDirty: true })
                    }
                  />
                ) : null
              }
            >
              <Textarea
                rows={3}
                placeholder="Nasi kotak, paket family, prasmanan, catering harian..."
                {...register("productsServices")}
              />
            </Field>
            <Field label="Harga dasar" error={errors.basePricing?.message}>
              <Input
                placeholder="Mulai Rp 25.000 / porsi"
                {...register("basePricing")}
              />
            </Field>
            <Field label="Area pengiriman" error={errors.deliveryArea?.message}>
              <Input
                placeholder="Jaksel & Jakpus, COD tersedia"
                {...register("deliveryArea")}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gaya bahasa AI</CardTitle>
            <CardDescription>
              Pilih nada bicara yang sesuai dengan brand Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["friendly", "casual", "formal"] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={tone === t ? "default" : "outline"}
                  onClick={() => setValue("tone", t, { shouldDirty: true })}
                >
                  {t === "friendly"
                    ? "Ramah"
                    : t === "casual"
                      ? "Santai"
                      : "Formal"}
                </Button>
              ))}
            </div>
            <Field
              label="Template sapaan (opsional)"
              error={errors.greetingTemplate?.message}
            >
              <Textarea
                rows={3}
                placeholder="Halo kak! Terima kasih sudah chat ke {bisnis}. Ada yang bisa kami bantu?"
                {...register("greetingTemplate")}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={saveMut.isPending}>
            {saveMut.isPending ? "Menyimpan..." : "Simpan perubahan"}
          </Button>
        </div>
      </form>
    </>
  );
}

function Field({
  label,
  error,
  children,
  className,
  action,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{label}</Label>
        {action}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function toFormValues(p: BusinessProfile): FormValues {
  const tzRaw =
    typeof p.reportingTimezone === "string" ? p.reportingTimezone.trim() : "";
  return {
    businessName: p.businessName,
    description: p.description ?? "",
    address: p.address ?? "",
    openingHours: p.openingHours ?? "",
    productsServices: p.productsServices ?? "",
    basePricing: p.basePricing ?? "",
    deliveryArea: p.deliveryArea ?? "",
    greetingTemplate: p.greetingTemplate ?? "",
    tone: p.tone,
    aiEnabled: p.aiEnabled,
    reportingTimezone: isReportingTimezoneId(tzRaw)
      ? tzRaw
      : DEFAULT_REPORTING_TIMEZONE_UI,
  };
}
