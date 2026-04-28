"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/dashboard/page-header";
import { businessApi, type BusinessProfile } from "@/lib/api/business";
import { toApiError } from "@/lib/api/client";

const PROFILE_KEY = ["business-profile"] as const;

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
});
type FormValues = z.infer<typeof schema>;

export default function AiSettingsPage() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: businessApi.get,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tone: "friendly",
      aiEnabled: true,
      businessName: "",
    },
  });

  // Hydrate the form once the profile arrives. Wrapped in useEffect with
  // a stable dependency on the profile object so React Compiler is happy.
  useEffect(() => {
    if (profile) reset(toFormValues(profile));
  }, [profile, reset]);

  const saveMut = useMutation({
    mutationFn: businessApi.update,
    onSuccess: (updated) => {
      reset(toFormValues(updated));
      qc.setQueryData(PROFILE_KEY, updated);
      toast.success("Profil disimpan");
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const aiEnabled = watch("aiEnabled");
  const tone = watch("tone");

  return (
    <>
      <PageHeader
        title="AI Settings"
        description="Info bisnis ini dipakai AI sebagai konteks saat membalas pelanggan."
      />

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
            <CardTitle>Profil bisnis</CardTitle>
            <CardDescription>
              Semakin lengkap, semakin akurat jawaban AI.
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
          <Button
            type="submit"
            disabled={saveMut.isPending || isLoading}
          >
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
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function toFormValues(p: BusinessProfile): FormValues {
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
  };
}
