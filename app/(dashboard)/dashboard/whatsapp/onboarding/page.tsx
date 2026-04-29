"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link2 } from "lucide-react";
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
import { PageHeader } from "@/components/dashboard/page-header";
import { toApiError } from "@/lib/api/client";
import { whatsappApi } from "@/lib/api/whatsapp";

const CHANNELS_KEY = ["whatsapp-channels"] as const;
const OAUTH_PENDING_STORAGE_KEY = "wabantu:meta-oauth-pending";

const oauthSchema = z.object({
  displayName: z.string().min(2).max(120),
  phoneNumber: z
    .string()
    .regex(/^\+?[0-9]{8,20}$/, "Format E.164 (mis. +6281234567890)"),
  metaAppId: z.string().min(5, "Meta App ID wajib diisi"),
  metaAppSecret: z.string().min(10, "Meta App Secret wajib diisi"),
  hasFacebookAccount: z.boolean().refine((v) => v, {
    message: "Konfirmasi dulu bahwa Anda punya akun Facebook aktif.",
  }),
});
type OauthFormValues = z.infer<typeof oauthSchema>;
const oauthPendingSchema = oauthSchema.pick({
  displayName: true,
  phoneNumber: true,
  hasFacebookAccount: true,
});

export default function WhatsappOnboardingPage() {
  const qc = useQueryClient();
  const { data: channels = [] } = useQuery({
    queryKey: CHANNELS_KEY,
    queryFn: whatsappApi.list,
  });
  const connectedCount = channels.filter((c) => c.status === "connected").length;
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OauthFormValues>({ resolver: zodResolver(oauthSchema) });
  const hasFacebookAccount = watch("hasFacebookAccount");
  const isProcessingOauthRef = useRef(false);

  const initOauthMut = useMutation({
    mutationFn: async (values: OauthFormValues) => {
      const res = await whatsappApi.initMetaConnect({
        redirectUri: `${window.location.origin}/dashboard/whatsapp/onboarding`,
        metaAppId: values.metaAppId,
        metaAppSecret: values.metaAppSecret,
      });
      return { res, values };
    },
    onSuccess: ({ res, values }) => {
      localStorage.setItem(
        OAUTH_PENDING_STORAGE_KEY,
        JSON.stringify({
          displayName: values.displayName,
          phoneNumber: values.phoneNumber,
          hasFacebookAccount: values.hasFacebookAccount,
          state: res.state,
        }),
      );
      window.location.assign(res.oauthUrl);
      toast.success("OAuth URL dibuat. Lanjutkan authorize di Meta.");
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const completeOauthMut = useMutation({
    mutationFn: (values: OauthFormValues & { code: string; state: string }) =>
      whatsappApi.completeMetaConnect(values),
    onSuccess: () => {
      toast.success("WhatsApp berhasil tersambung.");
      localStorage.removeItem(OAUTH_PENDING_STORAGE_KEY);
      void qc.invalidateQueries({ queryKey: CHANNELS_KEY });
      window.history.replaceState({}, "", "/dashboard/whatsapp/onboarding");
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state || isProcessingOauthRef.current) return;

    const raw = localStorage.getItem(OAUTH_PENDING_STORAGE_KEY);
    if (!raw) {
      toast.error("Data OAuth tidak ditemukan. Ulangi dari tombol Generate OAuth URL.");
      return;
    }

    let pending: unknown;
    try {
      pending = JSON.parse(raw);
    } catch {
      localStorage.removeItem(OAUTH_PENDING_STORAGE_KEY);
      toast.error("Data OAuth rusak. Ulangi proses connect.");
      return;
    }

    const parsed = oauthPendingSchema.safeParse(pending);
    if (!parsed.success) {
      localStorage.removeItem(OAUTH_PENDING_STORAGE_KEY);
      toast.error("Data connect tidak lengkap. Ulangi proses.");
      return;
    }

    const pendingState =
      typeof (pending as { state?: unknown }).state === "string"
        ? (pending as { state: string }).state
        : "";

    if (!pendingState || pendingState !== state) {
      toast.error("State OAuth tidak cocok. Ulangi proses connect.");
      return;
    }

    isProcessingOauthRef.current = true;
    completeOauthMut.mutate({
      code,
      state,
      displayName: parsed.data.displayName,
      phoneNumber: parsed.data.phoneNumber,
    });
  }, [completeOauthMut]);

  return (
    <>
      <PageHeader
        title="Onboarding WhatsApp"
        description="Panduan cepat untuk client baru agar berhasil generate OAuth URL dan connect WhatsApp."
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Langkah 1 dari 1: Connect WhatsApp
          </CardTitle>
          <CardDescription>
            Isi data sederhana, klik Generate OAuth URL, lalu login & authorize di Meta.
            Setelah kembali ke halaman ini, sistem menyambungkan otomatis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((v) => initOauthMut.mutate(v))}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Field label="Nama channel" error={errors.displayName?.message}>
              <Input placeholder="Toko Pusat" {...register("displayName")} />
            </Field>
            <Field label="Nomor WhatsApp Business" error={errors.phoneNumber?.message}>
              <Input placeholder="+6281234567890" {...register("phoneNumber")} />
            </Field>
            <Field label="Meta App ID" error={errors.metaAppId?.message}>
              <Input placeholder="1559xxxxxxxxxxx" {...register("metaAppId")} />
            </Field>
            <Field label="Meta App Secret" error={errors.metaAppSecret?.message}>
              <Input
                type="password"
                placeholder="Isi App Secret dari Meta Developer"
                {...register("metaAppSecret")}
              />
            </Field>
            <div className="sm:col-span-2 rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium">
                Sebelum lanjut, pastikan Anda punya akun Facebook aktif
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Meta OAuth selalu meminta login Facebook. Kalau belum punya,
                klik panduan pemula dulu.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    {...register("hasFacebookAccount")}
                  />
                  Saya sudah punya akun Facebook aktif
                </label>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/whatsapp/onboarding/help">
                    Panduan untuk pemula
                  </Link>
                </Button>
              </div>
              {errors.hasFacebookAccount && (
                <p className="mt-2 text-xs text-destructive">
                  {errors.hasFacebookAccount.message}
                </p>
              )}
            </div>
            <div className="sm:col-span-2 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Status saat ini: {connectedCount > 0 ? "Sudah tersambung" : "Belum tersambung"}
              </p>
              <Button
                type="submit"
                disabled={!hasFacebookAccount || initOauthMut.isPending || completeOauthMut.isPending}
              >
                {initOauthMut.isPending
                  ? "Membuat URL..."
                  : completeOauthMut.isPending
                    ? "Menyelesaikan OAuth..."
                    : "Generate OAuth URL"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
