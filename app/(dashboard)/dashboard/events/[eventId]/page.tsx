"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { EventAssignmentsTab } from "@/components/events/event-assignments-tab";
import { EventPatientsTab } from "@/components/events/event-patients-tab";
import { EventStaffTab } from "@/components/events/event-staff-tab";
import { EventScheduleTab } from "@/components/events/event-schedule-tab";
import { EventTherapySettingsTab } from "@/components/events/event-therapy-settings-tab";
import { EventBreakFields } from "@/components/events/event-break-fields";
import { EventCateringOrderPanel } from "@/components/events/event-catering-order-panel";
import { EventExportJobsPanel } from "@/components/events/event-export-jobs-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { eventsApi, type EventRow } from "@/lib/api/events";
import { formatEventDateTimeRange } from "@/lib/events-format";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { useTenantQueryEnabled } from "@/hooks/use-tenant-query-enabled";
import { toApiError } from "@/lib/api/errors";
import { tenantContextKey } from "@/lib/auth/tenant-context";
import {
  eventDetailKey,
  eventDashboardKey,
  eventRolesMasterKey,
  eventScheduleKey,
  eventSchedulePrefix,
  eventTherapiesMasterKey,
  eventTherapySettingsKey,
} from "@/lib/query/events-query-keys";
import { toast } from "sonner";

const STATUSES = ["DRAFT", "PUBLISHED", "CLOSED", "CANCELLED", "ARCHIVED"] as const;

const EVENT_TABS = [
  "dashboard",
  "patients",
  "people",
  "assignments",
  "therapy",
  "schedule",
] as const;

type EventTabId = (typeof EVENT_TABS)[number];

function parseEventTab(value: string | null): EventTabId {
  if (value && EVENT_TABS.includes(value as EventTabId)) {
    return value as EventTabId;
  }
  return "dashboard";
}

function EventPublicRegistrationCard({
  tenantSlug,
  eventSlug,
  status,
}: {
  tenantSlug?: string;
  eventSlug: string;
  status: string;
}) {
  const patientPath = tenantSlug ? `/register/${tenantSlug}/${eventSlug}` : "";
  const staffPath = tenantSlug ? `/register/${tenantSlug}/${eventSlug}/staff` : "";
  const monitorPath = tenantSlug ? `/monitor/${tenantSlug}/${eventSlug}` : "";
  const jadwalPath = tenantSlug ? `/jadwal/${tenantSlug}/${eventSlug}` : "";
  const published = status === "PUBLISHED";

  const copyLink = async (path: string, label: string) => {
    if (!path) return;
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(label);
    } catch {
      toast.error("Gagal menyalin link");
    }
  };

  type PublicLinkRow = {
    key: string;
    label: string;
    path: string;
    copyMessage: string;
    canOpen: boolean;
  };

  const linkRows: PublicLinkRow[] = patientPath
    ? [
        {
          key: "patient",
          label: "Pasien",
          path: patientPath,
          copyMessage: "Link pendaftaran pasien disalin",
          canOpen: published,
        },
        {
          key: "staff",
          label: "Terapis & relawan",
          path: staffPath,
          copyMessage: "Link pendaftaran staf disalin",
          canOpen: published,
        },
        ...(published && monitorPath
          ? [
              {
                key: "monitor",
                label: "Pantau staf",
                path: monitorPath,
                copyMessage: "Link pantau staf disalin",
                canOpen: true,
              },
            ]
          : []),
        ...(published && jadwalPath
          ? [
              {
                key: "jadwal",
                label: "Jadwal pasien",
                path: jadwalPath,
                copyMessage: "Link jadwal pasien disalin",
                canOpen: true,
              },
            ]
          : []),
      ]
    : [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Link publik</CardTitle>
        {tenantSlug ? (
          <CardDescription>
            {tenantSlug} / {eventSlug}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!tenantSlug ? (
          <p className="text-amber-800 dark:text-amber-200">
            Slug toko tidak terdeteksi. Pastikan Anda login sebagai owner toko (bukan hanya konsol
            platform tanpa impersonate).
          </p>
        ) : null}
        {tenantSlug && !published ? (
          <p className="text-amber-800 dark:text-amber-200">
            Acara masih berstatus <strong>{status}</strong>. Ubah ke <strong>PUBLISHED</strong> lewat
            &quot;Edit acara&quot; agar pasien bisa mendaftar lewat link ini.
          </p>
        ) : null}
        {linkRows.length > 0 ? (
          <ul className="divide-y divide-border rounded-md border border-border">
            {linkRows.map((row) => (
              <li
                key={row.key}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:flex-nowrap"
              >
                <span className="min-w-0 font-medium text-foreground">{row.label}</span>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void copyLink(row.path, row.copyMessage)}
                  >
                    <Copy className="size-3.5" />
                    Salin
                  </Button>
                  {row.canOpen ? (
                    <Button size="sm" variant="secondary" asChild>
                      <Link href={row.path} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-3.5" />
                        Buka
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {linkRows.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Salin menyalin URL penuh ke clipboard — URL tidak ditampilkan sebagai teks panjang.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseEventTab(searchParams.get("tab"));
  const { user } = useAuth();
  const tenantKey = tenantContextKey(user);
  const tenantReady = useTenantQueryEnabled();
  const eventQueriesEnabled = Boolean(eventId && tenantReady);
  const isOwner = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<EventRow>>({});
  const [editHasBreak, setEditHasBreak] = useState(false);

  const setTab = (id: EventTabId) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", id);
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  const [scheduleTherapy, setScheduleTherapy] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);

  const tabNeedsDashboard = tab === "dashboard";
  const tabNeedsSchedule = tab === "schedule";
  const tabNeedsTherapySettings = tab === "therapy";
  const tabNeedsTherapies = tab === "patients" || tab === "people" || tab === "schedule";
  const tabNeedsRoles = tab === "people";

  const {
    data: event,
    isError: eventLoadError,
    error: eventLoadErr,
    isPending: eventPending,
    refetch: refetchEvent,
  } = useQuery({
    queryKey: eventDetailKey(tenantKey, eventId),
    queryFn: ({ signal }) => eventsApi.getEvent(eventId, signal),
    enabled: eventQueriesEnabled,
  });
  const { data: dashboard, isPending: dashboardPending } = useQuery({
    queryKey: eventDashboardKey(tenantKey, eventId),
    queryFn: ({ signal }) => eventsApi.getDashboard(eventId, signal),
    enabled: eventQueriesEnabled && tabNeedsDashboard,
  });

  const { data: schedule, isPending: schedulePending } = useQuery({
    queryKey: eventScheduleKey(tenantKey, eventId, scheduleTherapy, scheduleDate),
    queryFn: ({ signal }) =>
      eventsApi.getSchedule(
        eventId,
        {
          therapyId: scheduleTherapy || undefined,
          date: scheduleDate || undefined,
        },
        signal,
      ),
    enabled: eventQueriesEnabled && tabNeedsSchedule,
  });
  const { data: therapySettings, isPending: therapySettingsPending } = useQuery({
    queryKey: eventTherapySettingsKey(tenantKey, eventId),
    queryFn: () => eventsApi.listEventTherapySettings(eventId),
    enabled: eventQueriesEnabled && tabNeedsTherapySettings,
  });
  const { data: therapies } = useQuery({
    queryKey: eventTherapiesMasterKey(tenantKey),
    queryFn: () => eventsApi.listTherapies({ activeOnly: true, pageSize: 100 }),
    enabled: eventQueriesEnabled && tabNeedsTherapies,
  });
  const { data: roles } = useQuery({
    queryKey: eventRolesMasterKey(tenantKey),
    queryFn: () => eventsApi.listVolunteerRoles({ pageSize: 100 }),
    enabled: eventQueriesEnabled && tabNeedsRoles,
  });

  const archived = event?.status === "ARCHIVED";

  const genSlotsMut = useMutation({
    mutationFn: (therapyId: string) => eventsApi.generateSlots(eventId, therapyId),
    onSuccess: (r) => {
      toast.success(`${r.created} slot dibuat`);
      r.warnings?.forEach((w) => toast.warning(w));
      void qc.invalidateQueries({ queryKey: eventSchedulePrefix(tenantKey, eventId) });
    },
    onError: () => toast.error("Gagal generate slot"),
  });
  const deleteSlotMut = useMutation({
    mutationFn: (slotId: string) => eventsApi.deleteSlot(eventId, slotId),
    onSuccess: () => {
      toast.success("Slot dihapus");
      void qc.invalidateQueries({ queryKey: eventSchedulePrefix(tenantKey, eventId) });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Gagal menghapus slot"),
  });
  const deleteSlotsBulkMut = useMutation({
    mutationFn: (slotIds: string[]) => eventsApi.deleteSlotsBulk(eventId, slotIds),
    onSuccess: (res) => {
      toast.success(`${res.deleted} slot dihapus${res.blocked ? `, ${res.blocked} gagal` : ""}`);
      if (res.errors?.length) {
        toast.error(res.errors.slice(0, 2).join(" | "));
      }
      setSelectedSlotIds([]);
      void qc.invalidateQueries({ queryKey: eventSchedulePrefix(tenantKey, eventId) });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Gagal hapus slot terpilih"),
  });

  const updateEventMut = useMutation({
    mutationFn: () =>
      eventsApi.updateEvent(eventId, {
        ...editForm,
        // Pastikan field terpisah tidak hilang saat partial form state.
        eventDescription: editForm.eventDescription ?? "",
        cateringOrderNotes: editForm.cateringOrderNotes ?? "",
        breakStartTime: editHasBreak ? editForm.breakStartTime : "",
        breakEndTime: editHasBreak ? editForm.breakEndTime : "",
      } as EventRow),
    onSuccess: () => {
      toast.success("Acara diperbarui");
      void qc.invalidateQueries({ queryKey: eventDetailKey(tenantKey, eventId) });
      void qc.invalidateQueries({ queryKey: ["events", tenantKey] });
      setEditOpen(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Gagal"),
  });

  const deleteEventMut = useMutation({
    mutationFn: () => eventsApi.deleteEvent(eventId),
    onSuccess: () => {
      toast.success("Acara dihapus");
      window.location.href = "/dashboard/events";
    },
    onError: () => toast.error("Gagal menghapus"),
  });

  const duplicateMut = useMutation({
    mutationFn: () => eventsApi.duplicateEvent(eventId),
    onSuccess: (res) => {
      toast.success(
        `Acara disalin: ${res.peopleCopied} staf, ${res.patientsCopied} pasien, ${res.therapySettingsCopied} pengaturan terapi`,
      );
      router.push(`/dashboard/events/${res.event.id}`);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Gagal menduplikasi acara"),
  });

  const tenantSlug = user?.tenant?.slug ?? user?.impersonation?.tenant?.slug;
  const visibleSlotIds = new Set((schedule?.slots ?? []).map((s) => s.id));
  const visibleSelectedSlotIds = selectedSlotIds.filter((id) => visibleSlotIds.has(id));

  if (eventLoadError) {
    const apiErr = toApiError(eventLoadErr);
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-destructive">{apiErr.message || "Gagal memuat acara"}</p>
        <Button variant="outline" size="sm" onClick={() => void refetchEvent()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  if (eventPending || !event) {
    return <p className="p-6 text-muted-foreground">Memuat acara...</p>;
  }

  const openEdit = () => {
    setEditForm({
      ...event,
      breakStartTime: event.breakStartTime?.slice(0, 5) ?? "11:30",
      breakEndTime: event.breakEndTime?.slice(0, 5) ?? "13:00",
    });
    setEditHasBreak(Boolean(event.breakStartTime && event.breakEndTime));
    setEditOpen(true);
  };

  return (
    <div className="space-y-4 p-1">
      <p className="text-sm">
        <Link href="/dashboard/events" className="text-primary underline-offset-4 hover:underline">
          ← Daftar acara
        </Link>
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{event.eventName}</h1>
          <p className="text-sm text-muted-foreground">
            {formatEventDateTimeRange(event.startDate, event.startTime, event.endDate, event.endTime)}
            {" · "}Status: {event.status}
            {archived ? " · Hanya baca" : ""}
          </p>
          {event.eventDescription?.trim() ? (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {event.eventDescription.trim()}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {isOwner ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={duplicateMut.isPending}
                onClick={() => duplicateMut.mutate()}
              >
                <Copy className="mr-1 h-4 w-4" /> Duplikat
              </Button>
              {!archived ? (
                <Button variant="outline" size="sm" onClick={openEdit}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit acara
                </Button>
              ) : null}
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-1 h-4 w-4" /> Hapus
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {isOwner ? (
        <EventPublicRegistrationCard
          tenantSlug={tenantSlug}
          eventSlug={event.eventSlug}
          status={event.status}
        />
      ) : null}

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {[
          ["dashboard", "Dashboard"],
          [
            "patients",
            `Pasien${dashboard?.patientsRegistered != null ? ` (${dashboard.patientsRegistered})` : ""}`,
          ],
          [
            "people",
            `Staf${dashboard?.uniquePeopleCount != null ? ` (${dashboard.uniquePeopleCount})` : ""}`,
          ],
          ["assignments", "Penugasan"],
          ["therapy", "Pengaturan Terapi"],
          ["schedule", "Jadwal"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              tab === id ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
            onClick={() => setTab(id as EventTabId)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" ? (
        <div className="mt-4">
          {dashboardPending && (
            <p className="mb-2 text-sm text-muted-foreground">Memuat ringkasan...</p>
          )}
          {dashboard ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Terdaftar</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{dashboard.patientsRegistered}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Selesai</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{dashboard.patientsCompleted}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Unik (konsumsi)</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{dashboard.mealConsumptionCount}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Terapis</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">
                  {(dashboard.peopleByType.THERAPIST ?? 0) +
                    (dashboard.peopleByType.SHIJIE ?? 0) +
                    (dashboard.peopleByType.DAOSHI ?? 0) +
                    (dashboard.peopleByType.FASHI ?? 0)}
                </CardContent>
              </Card>
            </div>
          ) : null}
          {isOwner ? (
            <EventCateringOrderPanel
              eventId={eventId}
              event={event}
              tenantKey={tenantKey}
              disabled={archived}
            />
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Kelola daftar lengkap di tab <button type="button" className="underline" onClick={() => setTab("people")}>Staf</button>.
          </p>
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle>Kapasitas terapi</CardTitle>
              <p className="text-xs font-normal text-muted-foreground">
                Terdaftar / total kapasitas (jumlah slot yang sudah di-generate, atau pengaturan terapi)
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {(dashboard?.therapyCapacity ?? []).map((t) => (
                <div key={t.therapyId} className="flex justify-between text-sm">
                  <span>{t.therapyName}</span>
                  <span>
                    {t.current} / {t.max}
                  </span>
                </div>
              ))}
              {(dashboard?.therapyCapacity ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada terapi dikonfigurasi.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "patients" ? (
        <EventPatientsTab
          eventId={eventId}
          canEdit={isOwner && !archived}
          therapies={therapies?.items ?? []}
        />
      ) : null}

      {tab === "people" ? (
        <EventStaffTab
          eventId={eventId}
          canEdit={isOwner && !archived}
          therapies={therapies?.items ?? []}
          roles={roles?.items ?? []}
        />
      ) : null}

      {tab === "assignments" ? (
        <EventAssignmentsTab eventId={eventId} canEdit={isOwner && !archived} />
      ) : null}

      {tab === "therapy" ? (
        <div className="mt-4">
          {therapySettingsPending ? (
            <p className="mb-2 text-sm text-muted-foreground">Memuat pengaturan terapi...</p>
          ) : null}
          <EventTherapySettingsTab
            eventId={eventId}
            canEdit={isOwner && !archived}
            settings={therapySettings?.items ?? []}
            eventBreak={
              event?.breakStartTime && event?.breakEndTime
                ? {
                    start: event.breakStartTime.slice(0, 5),
                    end: event.breakEndTime.slice(0, 5),
                  }
                : undefined
            }
            onSaved={() => {
              void qc.invalidateQueries({ queryKey: eventTherapySettingsKey(tenantKey, eventId) });
            }}
          />
        </div>
      ) : null}

      {tab === "schedule" ? (
        <div className="mt-4">
          {schedulePending ? (
            <p className="mb-2 text-sm text-muted-foreground">Memuat jadwal...</p>
          ) : null}
          <EventScheduleTab
          canEdit={isOwner && !archived}
          therapies={therapies?.items ?? []}
          scheduleTherapy={scheduleTherapy}
          onScheduleTherapyChange={setScheduleTherapy}
          scheduleDate={scheduleDate}
          onScheduleDateChange={setScheduleDate}
          slots={schedule?.slots ?? []}
          patients={schedule?.patients ?? []}
          selectedSlotIds={visibleSelectedSlotIds}
          onSelectedSlotIdsChange={(ids) => setSelectedSlotIds(ids)}
          onGenerateSlots={(therapyId) => genSlotsMut.mutate(therapyId)}
          onDeleteSlot={(slotId) => deleteSlotMut.mutate(slotId)}
          onDeleteSlotsBulk={(ids) => deleteSlotsBulkMut.mutate(ids)}
          genSlotsPending={genSlotsMut.isPending}
          deleteSlotPending={deleteSlotMut.isPending}
          deleteBulkPending={deleteSlotsBulkMut.isPending}
        />
        </div>
      ) : null}

      <EventExportJobsPanel eventId={eventId} className="mt-6" />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit acara</DialogTitle>
            <DialogDescription>
              Ubah nama, tanggal, jam, catatan acara, pesanan catering, dan status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <div>
              <Label>Nama</Label>
              <Input
                value={editForm.eventName ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, eventName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Lokasi</Label>
              <Input
                value={editForm.location ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div>
              <Label>Catatan acara</Label>
              <p className="mb-1 text-xs text-muted-foreground">
                Catatan internal (diet, kontak, dll.) — tampil di header acara. Beda dari pesanan catering ke
                vendor.
              </p>
              <Textarea
                rows={4}
                placeholder={
                  "Contoh:\n- Makanan tanpa minyak dan tepung, tetapi tidak vegan\n- Sambal dipisah\n- Untuk makanannya Tono, hubungi langsung orangnya"
                }
                value={editForm.eventDescription ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, eventDescription: e.target.value }))}
              />
            </div>
            <div>
              <Label>Pesanan Catering</Label>
              <p className="mb-1 text-xs text-muted-foreground">
                Teks yang disimpan dari panel Pesanan Catering (dashboard) — siap disalin ke WhatsApp vendor.
              </p>
              <Textarea
                rows={5}
                placeholder="Belum ada pesan. Buat lewat panel Pesanan Catering di tab Dashboard, atau ketik di sini."
                value={editForm.cateringOrderNotes ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, cateringOrderNotes: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Mulai</Label>
                <DatePicker
                  value={editForm.startDate ?? ""}
                  onChange={(startDate) => setEditForm((f) => ({ ...f, startDate }))}
                />
              </div>
              <div>
                <Label>Selesai</Label>
                <DatePicker
                  value={editForm.endDate ?? ""}
                  onChange={(endDate) => setEditForm((f) => ({ ...f, endDate }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Jam mulai</Label>
                <TimePicker
                  value={editForm.startTime?.slice(0, 5) ?? ""}
                  onChange={(startTime) => setEditForm((f) => ({ ...f, startTime }))}
                />
              </div>
              <div>
                <Label>Jam selesai</Label>
                <TimePicker
                  value={editForm.endTime?.slice(0, 5) ?? ""}
                  onChange={(endTime) => setEditForm((f) => ({ ...f, endTime }))}
                />
              </div>
            </div>
            <EventBreakFields
              enabled={editHasBreak}
              breakStartTime={editForm.breakStartTime?.slice(0, 5) ?? "11:30"}
              breakEndTime={editForm.breakEndTime?.slice(0, 5) ?? "13:00"}
              onEnabledChange={setEditHasBreak}
              onBreakStartChange={(breakStartTime) => setEditForm((f) => ({ ...f, breakStartTime }))}
              onBreakEndChange={(breakEndTime) => setEditForm((f) => ({ ...f, breakEndTime }))}
            />
            <div>
              <Label>Status</Label>
              <Select
                value={editForm.status ?? "DRAFT"}
                onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as EventRow["status"] }))}
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
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => updateEventMut.mutate()} disabled={updateEventMut.isPending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus acara?</AlertDialogTitle>
            <AlertDialogDescription>
              Acara &quot;{event.eventName}&quot; akan dihapus (soft delete). Tindakan ini tidak dapat dibatalkan dari
              UI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteEventMut.mutate()}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
