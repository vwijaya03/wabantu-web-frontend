"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Plug, XCircle } from "lucide-react";
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

const schema = z.object({
  displayName: z.string().min(2).max(120),
  phoneNumber: z
    .string()
    .regex(/^\+?[0-9]{8,20}$/, "Format E.164 (mis. +6281234567890)"),
  metaPhoneNumberId: z.string().min(4).max(64),
  accessToken: z.string().min(20),
  metaWabaId: z.string().min(0).max(64).optional(),
});
type FormValues = z.infer<typeof schema>;

export default function WhatsappPage() {
  const qc = useQueryClient();
  const { data: channels = [], isLoading } = useQuery({
    queryKey: CHANNELS_KEY,
    queryFn: whatsappApi.list,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const connectMut = useMutation({
    mutationFn: (values: FormValues) =>
      whatsappApi.connect({ provider: "meta_cloud", ...values }),
    onSuccess: () => {
      reset();
      toast.success("Channel tersambung");
      void qc.invalidateQueries({ queryKey: CHANNELS_KEY });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const disconnectMut = useMutation({
    mutationFn: (id: string) => whatsappApi.disconnect(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CHANNELS_KEY });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  return (
    <>
      <PageHeader
        title="WhatsApp"
        description="Kelola koneksi nomor WhatsApp bisnis Anda."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-primary" />
            Hubungkan via Meta Cloud API
          </CardTitle>
          <CardDescription>
            Dapatkan access token & phone_number_id dari{" "}
            <a
              href="https://business.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Meta Business Manager
            </a>
            . Token kami simpan terenkripsi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((v) => connectMut.mutate(v))}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Field label="Nama channel" error={errors.displayName?.message}>
              <Input placeholder="Toko Pusat" {...register("displayName")} />
            </Field>
            <Field label="Nomor WhatsApp" error={errors.phoneNumber?.message}>
              <Input
                placeholder="+6281234567890"
                {...register("phoneNumber")}
              />
            </Field>
            <Field
              label="Phone Number ID (Meta)"
              error={errors.metaPhoneNumberId?.message}
            >
              <Input
                placeholder="1234567890..."
                {...register("metaPhoneNumberId")}
              />
            </Field>
            <Field label="WABA ID (opsional)" error={errors.metaWabaId?.message}>
              <Input placeholder="..." {...register("metaWabaId")} />
            </Field>
            <Field
              label="Access Token"
              className="sm:col-span-2"
              error={errors.accessToken?.message}
            >
              <Input
                type="password"
                placeholder="EAAG..."
                {...register("accessToken")}
              />
            </Field>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={connectMut.isPending}>
                {connectMut.isPending ? "Menyambungkan..." : "Connect"}
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
