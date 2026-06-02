"use client";

import { use, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { eventsApi } from "@/lib/api/events";

export default function PublicRegisterPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; eventSlug: string }>;
}) {
  const { tenantSlug, eventSlug } = use(params);
  const [form, setForm] = useState({
    fullName: "",
    birthDate: "",
    therapyId: "",
    complaint: "",
    preferredTime: "",
  });
  const [done, setDone] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-event", tenantSlug, eventSlug],
    queryFn: () => eventsApi.getPublicRegistration(tenantSlug, eventSlug),
  });

  const registrationClosed = !!data && (data.closed || !data.registrationOpen);

  const { data: slotData, isLoading: slotsLoading } = useQuery({
    queryKey: ["public-slots", tenantSlug, eventSlug, form.therapyId],
    queryFn: () => eventsApi.getPublicRegistrationSlots(tenantSlug, eventSlug, form.therapyId),
    enabled: !!form.therapyId && !!data && !registrationClosed,
  });

  const availableSlots = slotData?.items ?? [];

  const registerMut = useMutation({
    mutationFn: () =>
      eventsApi.postPublicRegistration(tenantSlug, eventSlug, {
        fullName: form.fullName,
        birthDate: form.birthDate,
        therapyId: form.therapyId,
        complaint: form.complaint,
        preferredTime: form.preferredTime,
      }),
    onSuccess: () => setDone(true),
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <p className="text-muted-foreground">Memuat...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <Card>
          <CardHeader>
            <CardTitle>Acara tidak ditemukan</CardTitle>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (data.cancelled) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <Card>
          <CardHeader>
            <CardTitle>{data.eventName}</CardTitle>
            <CardDescription>Acara dibatalkan.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <Card>
          <CardHeader>
            <CardTitle>Pendaftaran berhasil</CardTitle>
            <CardDescription>Terima kasih. Data Anda telah kami terima.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const closed = data.closed || !data.registrationOpen;

  return (
    <main className="mx-auto max-w-lg p-6">
      <Card>
        <CardHeader>
          <CardTitle>{data.eventName}</CardTitle>
          {data.eventDescription ? <CardDescription>{data.eventDescription}</CardDescription> : null}
          <p className="text-sm text-muted-foreground">
            {data.startDate} — {data.endDate}
            {data.location ? ` · ${data.location}` : ""}
          </p>
        </CardHeader>
        <CardContent>
          {closed ? (
            <p className="text-center font-medium text-amber-800">
              {data.message ?? "Pendaftaran telah ditutup."}
            </p>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                registerMut.mutate();
              }}
            >
              <div>
                <Label>Nama lengkap</Label>
                <Input
                  required
                  maxLength={200}
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tanggal lahir</Label>
                <Input
                  type="date"
                  required
                  value={form.birthDate}
                  onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Pilih terapi</Label>
                <Select
                  required
                  value={form.therapyId}
                  onValueChange={(v) => setForm((f) => ({ ...f, therapyId: v, preferredTime: "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih terapi" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.therapies.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.therapyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Keluhan</Label>
                <Textarea
                  maxLength={2000}
                  value={form.complaint}
                  onChange={(e) => setForm((f) => ({ ...f, complaint: e.target.value }))}
                />
              </div>
              <div>
                <Label>Jam terapi</Label>
                {form.therapyId && slotsLoading ? (
                  <p className="text-sm text-muted-foreground">Memuat jadwal...</p>
                ) : availableSlots.length > 0 ? (
                  <Select
                    required
                    value={form.preferredTime}
                    onValueChange={(v) => setForm((f) => ({ ...f, preferredTime: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jam yang masih tersedia" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSlots.map((s) => (
                        <SelectItem key={s.slotId} value={s.startTime}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : form.therapyId ? (
                  <p className="text-sm text-amber-800">
                    Belum ada slot tersedia untuk terapi ini. Hubungi panitia acara.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Pilih terapi dulu untuk melihat jam tersedia.</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Hanya jam yang masih ada kuota. Jika slot penuh, jam tersebut tidak muncul di daftar.
                </p>
              </div>
              {registerMut.isError ? (
                <p className="text-sm text-destructive">
                  {(registerMut.error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? "Pendaftaran gagal"}
                </p>
              ) : null}
              <Button
                type="submit"
                className="w-full"
                disabled={
                  registerMut.isPending ||
                  !form.therapyId ||
                  availableSlots.length === 0 ||
                  !form.preferredTime
                }
              >
                {registerMut.isPending ? "Mengirim..." : "Daftar"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
