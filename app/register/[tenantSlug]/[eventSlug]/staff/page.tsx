"use client";

import { use, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
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
import { TherapyMultiPick } from "@/components/events/therapy-multi-pick";
import { eventsApi } from "@/lib/api/events";
import { roleUsesTherapies, STAFF_ROLES } from "@/lib/events-staff";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

export default function PublicStaffRegisterPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; eventSlug: string }>;
}) {
  const { tenantSlug, eventSlug } = use(params);
  const [form, setForm] = useState({
    fullName: "",
    role: "terapis",
    therapyIds: [] as string[],
    volunteerRoleId: "",
    phone: "",
    notes: "",
  });
  const [done, setDone] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-staff-event", tenantSlug, eventSlug],
    queryFn: () => eventsApi.getPublicStaffRegistration(tenantSlug, eventSlug),
  });

  const registrationClosed = !!data && (data.closed || !data.registrationOpen);

  const registerMut = useMutation({
    mutationFn: () =>
      eventsApi.postPublicStaffRegistration(tenantSlug, eventSlug, {
        fullName: form.fullName,
        role: form.role,
        therapyIds: roleUsesTherapies(form.role) ? form.therapyIds : undefined,
        volunteerRoleId: form.role === "relawan" ? form.volunteerRoleId : undefined,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => setDone(true),
    onError: (e) => toast.error(toApiError(e).message),
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
            <CardDescription>
              Terima kasih. Data Anda sebagai staf/relawan telah kami terima. Tim penyelenggara akan menghubungi Anda
              jika diperlukan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href={`/register/${tenantSlug}/${eventSlug}`}>Kembali ke pendaftaran pasien</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{data.eventName}</h1>
        <p className="text-sm text-muted-foreground">Pendaftaran terapis, relawan, dan petugas acara</p>
      </div>

      {registrationClosed ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm">{data.message ?? "Pendaftaran telah ditutup."}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Form pendaftaran staf</CardTitle>
            <CardDescription>Isi data diri Anda dengan lengkap.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div>
              <Label>Nama lengkap</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Peran</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {roleUsesTherapies(form.role) ? (
              <div>
                <Label>Terapi yang Anda kuasai</Label>
                <TherapyMultiPick
                  therapies={data.therapies}
                  selected={form.therapyIds}
                  onChange={(ids) => setForm((f) => ({ ...f, therapyIds: ids }))}
                />
              </div>
            ) : null}
            {form.role === "relawan" ? (
              <div>
                <Label>Peran relawan</Label>
                <Select
                  value={form.volunteerRoleId}
                  onValueChange={(v) => setForm((f) => ({ ...f, volunteerRoleId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih peran" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.volunteerRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.roleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div>
              <Label>Nomor telepon (opsional)</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Catatan (opsional)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <Button
              className="w-full"
              disabled={
                registerMut.isPending ||
                !form.fullName.trim() ||
                (roleUsesTherapies(form.role) && form.therapyIds.length === 0) ||
                (form.role === "relawan" && !form.volunteerRoleId)
              }
              onClick={() => registerMut.mutate()}
            >
              {registerMut.isPending ? "Mengirim…" : "Kirim pendaftaran"}
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Ingin mendaftar sebagai pasien?{" "}
        <Link className="underline" href={`/register/${tenantSlug}/${eventSlug}`}>
          Form pendaftaran pasien
        </Link>
      </p>
    </main>
  );
}
