"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Link2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
});
type OauthFormValues = z.infer<typeof oauthSchema>;

export default function WhatsappPage() {
  const qc = useQueryClient();
  const { data: channels = [], isLoading } = useQuery({
    queryKey: CHANNELS_KEY,
    queryFn: whatsappApi.list,
  });
  const {
    register: registerOauth,
    handleSubmit: handleSubmitOauth,
    reset: resetOauth,
    formState: { errors: oauthErrors },
  } = useForm<OauthFormValues>({ resolver: zodResolver(oauthSchema) });
  const isProcessingOauthRef = useRef(false);

  const disconnectMut = useMutation({
    mutationFn: (id: string) => whatsappApi.disconnect(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CHANNELS_KEY });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const initOauthMut = useMutation({
    mutationFn: async (values: OauthFormValues) => {
      const res = await whatsappApi.initMetaConnect({
        redirectUri: `${window.location.origin}/dashboard/whatsapp`,
      });
      return { res, values };
    },
    onSuccess: ({ res, values }) => {
      localStorage.setItem(
        OAUTH_PENDING_STORAGE_KEY,
        JSON.stringify({ ...values, state: res.state }),
      );
      window.location.assign(res.oauthUrl);
      toast.success("OAuth URL dibuat. Selesaikan izin di Meta.");
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const completeOauthMut = useMutation({
    mutationFn: (values: OauthFormValues & { code: string; state: string }) =>
      whatsappApi.completeMetaConnect(values),
    onSuccess: () => {
      toast.success("Channel tersambung via OAuth");
      localStorage.removeItem(OAUTH_PENDING_STORAGE_KEY);
      resetOauth();
      void qc.invalidateQueries({ queryKey: CHANNELS_KEY });
      window.history.replaceState({}, "", "/dashboard/whatsapp");
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
      toast.error(
        "Data OAuth tidak ditemukan. Ulangi dari tombol Generate OAuth URL.",
      );
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

    const parsed = oauthSchema.safeParse(pending);
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
      ...parsed.data,
    });
  }, [completeOauthMut]);

  return (
    <>
      <PageHeader
        title="WhatsApp"
        description="Hubungkan nomor WhatsApp bisnis lewat OAuth resmi Meta."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Connect WhatsApp (OAuth Meta)
          </CardTitle>
          <CardDescription>
            Satu-satunya metode koneksi: isi data channel, generate OAuth URL,
            authorize di Meta, lalu sistem auto-complete saat redirect kembali.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmitOauth((v) => initOauthMut.mutate(v))}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Field label="Nama channel" error={oauthErrors.displayName?.message}>
              <Input placeholder="Toko Pusat" {...registerOauth("displayName")} />
            </Field>
            <Field
              label="Nomor WhatsApp Business"
              error={oauthErrors.phoneNumber?.message}
            >
              <Input placeholder="+6281234567890" {...registerOauth("phoneNumber")} />
            </Field>
            <div className="sm:col-span-2 flex justify-end">
              <Button
                type="submit"
                disabled={initOauthMut.isPending || completeOauthMut.isPending}
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

      <Card>
        <CardHeader>
          <CardTitle>Channel terhubung</CardTitle>
          <CardDescription>{channels.length} nomor</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Memuat...
            </p>
          ) : channels.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada nomor terhubung.
            </p>
          ) : (
            <ul className="space-y-3">
              {channels.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{c.displayName}</p>
                      {c.status === "connected" ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <XCircle className="h-3 w-3" /> {c.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {c.phoneNumber} · provider: {c.provider}
                    </p>
                    {c.lastError && (
                      <p className="mt-1 text-xs text-destructive">
                        {c.lastError}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => disconnectMut.mutate(c.id)}
                  >
                    Disconnect
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
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
