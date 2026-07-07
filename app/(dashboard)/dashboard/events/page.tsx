"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Copy, Plus, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/dashboard/page-header";
import { EventBreakFields } from "@/components/events/event-break-fields";
import { eventsApi, type EventRow } from "@/lib/api/events";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { toast } from "sonner";

const STATUSES = ["DRAFT", "PUBLISHED", "CLOSED", "CANCELLED", "ARCHIVED"] as const;

export default function EventsListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isOwner = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    eventName: "",
    startDate: "",
    endDate: "",
    startTime: "09:00",
    endTime: "17:00",
    status: "DRAFT" as EventRow["status"],
    importStaffFromRoster: true,
    hasBreak: false,
    breakStartTime: "11:30",
    breakEndTime: "13:00",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["events", search],
    queryFn: () => eventsApi.listEvents({ q: search || undefined, page: 1, pageSize: 50 }),
  });

  const createMut = useMutation({
    mutationFn: () => {
      const { hasBreak, breakStartTime, breakEndTime, ...rest } = form;
      return eventsApi.createEvent({
        ...rest,
        breakStartTime: hasBreak ? breakStartTime : "",
        breakEndTime: hasBreak ? breakEndTime : "",
      });
    },
    onSuccess: () => {
      toast.success("Acara dibuat");
      void qc.invalidateQueries({ queryKey: ["events"] });
      setOpen(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Gagal membuat acara"),
  });

  const duplicateMut = useMutation({
    mutationFn: (id: string) => eventsApi.duplicateEvent(id),
    onSuccess: (res) => {
      toast.success(
        `Disalin: ${res.peopleCopied} staf, ${res.patientsCopied} pasien`,
      );
      void qc.invalidateQueries({ queryKey: ["events"] });
      router.push(`/dashboard/events/${res.event.id}`);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Gagal menduplikasi"),
  });

  const tenantSlug = user?.tenant?.slug ?? user?.impersonation?.tenant?.slug;

  return (
    <>
      <PageHeader
        title="Acara & Terapi"
        description="Kelola acara pelayanan, staf, jadwal pasien, dan pendaftaran publik."
        actions={
          isOwner ? (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard/events/masters">Master Data</Link>
              </Button>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Acara Baru
              </Button>
            </div>
          ) : null
        }
      />

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Cari acara..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(q)}
          />
        </div>
        <Button variant="secondary" onClick={() => setSearch(q)}>
          Cari
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(data?.items ?? []).map((ev) => (
            <Card key={ev.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">
                    <Link href={`/dashboard/events/${ev.id}`} className="hover:underline">
                      {ev.eventName}
                    </Link>
                  </CardTitle>
                  <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs">{ev.status}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {ev.startDate} — {ev.endDate} · {ev.startTime}–{ev.endTime}
                </p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-sm">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/events/${ev.id}`}>Kelola</Link>
                </Button>
                {isOwner ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={duplicateMut.isPending}
                    onClick={() => duplicateMut.mutate(ev.id)}
                  >
                    <Copy className="mr-1 h-3 w-3" /> Duplikat
                  </Button>
                ) : null}
                {tenantSlug && ev.status === "PUBLISHED" ? (
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/register/${tenantSlug}/${ev.eventSlug}`} target="_blank">
                      <ExternalLink className="mr-1 h-3 w-3" /> Pendaftaran publik
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acara baru</DialogTitle>
            <DialogDescription>
              Pengaturan terapi otomatis dibuat. Staf dari roster dapat diimpor sekaligus.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama acara</Label>
              <Input
                value={form.eventName}
                onChange={(e) => setForm((f) => ({ ...f, eventName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Mulai</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tanggal</Label>
                  <Input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Jam</Label>
                  <Input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Selesai</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tanggal</Label>
                  <Input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Jam</Label>
                  <Input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <EventBreakFields
              enabled={form.hasBreak}
              breakStartTime={form.breakStartTime}
              breakEndTime={form.breakEndTime}
              onEnabledChange={(hasBreak) => setForm((f) => ({ ...f, hasBreak }))}
              onBreakStartChange={(breakStartTime) => setForm((f) => ({ ...f, breakStartTime }))}
              onBreakEndChange={(breakEndTime) => setForm((f) => ({ ...f, breakEndTime }))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.importStaffFromRoster}
                onChange={(e) => setForm((f) => ({ ...f, importStaffFromRoster: e.target.checked }))}
              />
              Import staf dari roster (tim tetap, tanpa isi ulang)
            </label>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as EventRow["status"] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!form.eventName.trim() || !form.startDate || !form.endDate) {
                  toast.error("Nama acara dan tanggal wajib diisi");
                  return;
                }
                createMut.mutate();
              }}
              disabled={createMut.isPending}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
