"use client";

import Link from "next/link";
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
import { formatBirthDateInput, parseBirthDateDdMmYyyy } from "@/lib/date-format";

const BIRTH_DATE_HINT = "Gunakan format tanggal 17/08/1993";

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
  const [birthDateError, setBirthDateError] = useState("");

  const validateBirthDate = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return BIRTH_DATE_HINT;
    if (!parseBirthDateDdMmYyyy(trimmed)) return BIRTH_DATE_HINT;
    return "";
  };

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
    mutationFn: (birthDate: string) =>
      eventsApi.postPublicRegistration(tenantSlug, eventSlug, {
        fullName: form.fullName,
        birthDate,
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
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{data.eventName}</h1>
        <p className="text-sm text-muted-foreground">
          Pendaftaran pasien terapi
          {data.location ? ` · ${data.location}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {data.startDate} — {data.endDate}
        </p>
      </div>

      {closed ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm">{data.message ?? "Pendaftaran telah ditutup."}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Form pendaftaran pasien</CardTitle>
            <CardDescription>Isi data diri Anda dengan lengkap.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const err = validateBirthDate(form.birthDate);
                setBirthDateError(err);
                if (err) return;
                const normalized = parseBirthDateDdMmYyyy(form.birthDate.trim());
                if (!normalized) return;
                registerMut.mutate(normalized);
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
                <Label htmlFor="birthDate">Tanggal lahir</Label>
                <Input
                  id="birthDate"
                  required
                  type="text"
                  inputMode="numeric"
                  placeholder="17/08/1993"
                  autoComplete="bday"
                  maxLength={10}
                  value={form.birthDate}
                  onChange={(e) => {
                    setBirthDateError("");
                    setForm((f) => ({ ...f, birthDate: formatBirthDateInput(e.target.value) }));
                  }}
                  onBlur={() => {
                    if (form.birthDate.trim()) {
                      setBirthDateError(validateBirthDate(form.birthDate));
                    }
                  }}
                  aria-invalid={!!birthDateError}
                  aria-describedby="birthDate-hint"
                />
                <p id="birthDate-hint" className="mt-1 text-xs text-muted-foreground">
                  Ketik angka saja — garis miring muncul otomatis, contoh: 17/08/1993
                </p>
                {birthDateError ? (
                  <p className="mt-1 text-sm text-destructive">{birthDateError}</p>
                ) : null}
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
                  !form.fullName.trim() ||
                  !form.birthDate.trim() ||
                  !!birthDateError ||
                  !form.therapyId ||
                  availableSlots.length === 0 ||
                  !form.preferredTime
                }
              >
                {registerMut.isPending ? "Mengirim..." : "Kirim pendaftaran"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Ingin mendaftar sebagai terapis atau relawan?{" "}
        <Link className="underline" href={`/register/${tenantSlug}/${eventSlug}/staff`}>
          Form pendaftaran staf
        </Link>
      </p>
    </main>
  );
}
