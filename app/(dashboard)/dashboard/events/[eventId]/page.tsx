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
import { useEventDateFormat } from "@/components/events/events-i18n";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { useTenantQueryEnabled } from "@/hooks/use-tenant-query-enabled";
import { toApiError } from "@/lib/api/errors";
import { isCrossTenantEventApiError } from "@/lib/api/tenant-context-error";
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
import { useLocale } from "@/lib/i18n/locale";

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
  const { t } = useLocale();
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
      toast.error(t("Gagal menyalin link"));
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
          label: t("Pasien"),
          path: patientPath,
          copyMessage: t("Link pendaftaran pasien disalin"),
          canOpen: published,
        },
        {
          key: "staff",
          label: t("Terapis & relawan"),
          path: staffPath,
          copyMessage: t("Link pendaftaran staf disalin"),
          canOpen: published,
        },
        ...(published && monitorPath
          ? [
              {
                key: "monitor",
                label: t("Pantau staf"),
                path: monitorPath,
                copyMessage: t("Link pantau staf disalin"),
                canOpen: true,
              },
            ]
          : []),
        ...(published && jadwalPath
          ? [
              {
                key: "jadwal",
                label: t("Jadwal pasien"),
                path: jadwalPath,
                copyMessage: t("Link jadwal pasien disalin"),
                canOpen: true,
              },
            ]
          : []),
      ]
    : [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("Link publik")}</CardTitle>
        {tenantSlug ? (
          <CardDescription>
            {tenantSlug} / {eventSlug}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!tenantSlug ? (
          <p className="text-amber-800 dark:text-amber-200">
            {t(
              "Slug toko tidak terdeteksi. Pastikan Anda login sebagai owner toko (bukan hanya konsol platform tanpa impersonate).",
            )}
          </p>
        ) : null}
        {tenantSlug && !published ? (
          <p className="text-amber-800 dark:text-amber-200">
            {t(
              "Acara masih berstatus {status}. Ubah ke PUBLISHED lewat Edit acara agar pasien bisa mendaftar lewat link ini.",
              { status },
            )}
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
                    <Copy className="size-3.5" />{t("Salin")}</Button>
                  {row.canOpen ? (
                    <Button size="sm" variant="secondary" asChild>
                      <Link href={row.path} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-3.5" />{t("Buka")}</Link>
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {linkRows.length > 0 ? (
          <p className="text-xs text-muted-foreground">{t("Salin menyalin URL penuh ke clipboard — URL tidak ditampilkan sebagai teks panjang.")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { t } = useLocale();
  const { formatEventDateTimeRange } = useEventDateFormat();
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
      toast.success(t("{count} slot dibuat", { count: r.created }));
      r.warnings?.forEach((w) => toast.warning(w));
      void qc.invalidateQueries({ queryKey: eventSchedulePrefix(tenantKey, eventId) });
    },
    onError: () => toast.error(t("Gagal generate slot")),
  });
  const deleteSlotMut = useMutation({
    mutationFn: (slotId: string) => eventsApi.deleteSlot(eventId, slotId),
    onSuccess: () => {
      toast.success(t("Slot dihapus"));
      void qc.invalidateQueries({ queryKey: eventSchedulePrefix(tenantKey, eventId) });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Gagal menghapus slot"),
  });
  const deleteSlotsBulkMut = useMutation({
    mutationFn: (slotIds: string[]) => eventsApi.deleteSlotsBulk(eventId, slotIds),
    onSuccess: (res) => {
      toast.success(
        res.blocked
          ? t("{deleted} slot dihapus, {blocked} gagal", {
              deleted: res.deleted,
              blocked: res.blocked,
            })
          : t("{deleted} slot dihapus", { deleted: res.deleted }),
      );
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
      toast.success(t("Acara diperbarui"));
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
      toast.success(t("Acara dihapus"));
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- tujuan hardcoded; full reload disengaja setelah hapus acara agar cache React Query acara yang sudah dihapus ikut dibuang.
      window.location.href = "/dashboard/events";
    },
    onError: () => toast.error(t("Gagal menghapus")),
  });

  const duplicateMut = useMutation({
    mutationFn: () => eventsApi.duplicateEvent(eventId),
    onSuccess: (res) => {
      toast.success(
        t(
          "Acara disalin: {staff} staf, {patients} pasien, {settings} pengaturan terapi",
          {
            staff: res.peopleCopied,
            patients: res.patientsCopied,
            settings: res.therapySettingsCopied,
          },
        ),
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
    const crossTenant = isCrossTenantEventApiError(eventLoadErr);
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-destructive">{apiErr.message || t("Gagal memuat acara")}</p>
        {crossTenant ? (
          <p className="text-sm text-muted-foreground">
            {t(
              "Gunakan tombol Pantau di konsol platform untuk tenant yang benar, lalu buka acara lagi dari daftar acara tenant tersebut.",
            )}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {crossTenant ? (
            <Button asChild size="sm">
              <Link href="/dashboard/admin">{t("Buka konsol platform")}</Link>
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => void refetchEvent()}>{t("Coba lagi")}</Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/events">← {t("Daftar acara")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (eventPending || !event) {
    return <p className="p-6 text-muted-foreground">{t("Memuat acara...")}</p>;
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
          ← {t("Daftar acara")}
        </Link>
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{event.eventName}</h1>
          <p className="text-sm text-muted-foreground">
            {formatEventDateTimeRange(event.startDate, event.startTime, event.endDate, event.endTime)}
            {" · "}
            {t("Status:")} {event.status}
            {archived ? ` · ${t("Hanya baca")}` : ""}
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
                <Copy className="mr-1 h-4 w-4" />{t("Duplikat")}</Button>
              {!archived ? (
                <Button variant="outline" size="sm" onClick={openEdit}>
                  <Pencil className="mr-1 h-4 w-4" />{t("Edit acara")}</Button>
              ) : null}
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-1 h-4 w-4" />{t("Hapus")}</Button>
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
          ["dashboard", t("Dashboard")],
          [
            "patients",
            `${t("Pasien")}${dashboard?.patientsRegistered != null ? ` (${dashboard.patientsRegistered})` : ""}`,
          ],
          [
            "people",
            `${t("Staf")}${dashboard?.uniquePeopleCount != null ? ` (${dashboard.uniquePeopleCount})` : ""}`,
          ],
          ["assignments", t("Penugasan")],
          ["therapy", t("Pengaturan Terapi")],
          ["schedule", t("Jadwal")],
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
            <p className="mb-2 text-sm text-muted-foreground">{t("Memuat ringkasan...")}</p>
          )}
          {dashboard ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t("Terdaftar")}</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{dashboard.patientsRegistered}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t("Selesai")}</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{dashboard.patientsCompleted}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t("Unik (konsumsi)")}</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{dashboard.mealConsumptionCount}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t("Terapis")}</CardTitle>
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
          <p className="mt-2 text-xs text-muted-foreground">{t("Kelola daftar lengkap di tab")}<button type="button" className="underline" onClick={() => setTab("people")}>{t("Staf")}</button>.
          </p>
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle>{t("Kapasitas terapi")}</CardTitle>
              <p className="text-xs font-normal text-muted-foreground">{t("Terdaftar / total kapasitas (jumlah slot yang sudah di-generate, atau pengaturan terapi)")}</p>
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
                <p className="text-sm text-muted-foreground">{t("Belum ada terapi dikonfigurasi.")}</p>
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
            <p className="mb-2 text-sm text-muted-foreground">{t("Memuat pengaturan terapi...")}</p>
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
            <p className="mb-2 text-sm text-muted-foreground">{t("Memuat jadwal...")}</p>
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
            <DialogTitle>{t("Edit acara")}</DialogTitle>
            <DialogDescription>{t("Ubah nama, tanggal, jam, catatan acara, pesanan catering, dan status.")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <div>
              <Label>{t("Nama")}</Label>
              <Input
                value={editForm.eventName ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, eventName: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t("Lokasi")}</Label>
              <Input
                value={editForm.location ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t("Catatan acara")}</Label>
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
              <Label>{t("Pesanan Catering")}</Label>
              <p className="mb-1 text-xs text-muted-foreground">{t("Teks yang disimpan dari panel Pesanan Catering (dashboard) — siap disalin ke WhatsApp vendor.")}</p>
              <Textarea
                rows={5}
                placeholder={t("Belum ada pesan. Buat lewat panel Pesanan Catering di tab Dashboard, atau ketik di sini.")}
                value={editForm.cateringOrderNotes ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, cateringOrderNotes: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{t("Mulai")}</Label>
                <DatePicker
                  value={editForm.startDate ?? ""}
                  onChange={(startDate) => setEditForm((f) => ({ ...f, startDate }))}
                />
              </div>
              <div>
                <Label>{t("Selesai")}</Label>
                <DatePicker
                  value={editForm.endDate ?? ""}
                  onChange={(endDate) => setEditForm((f) => ({ ...f, endDate }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{t("Jam mulai")}</Label>
                <TimePicker
                  value={editForm.startTime?.slice(0, 5) ?? ""}
                  onChange={(startTime) => setEditForm((f) => ({ ...f, startTime }))}
                />
              </div>
              <div>
                <Label>{t("Jam selesai")}</Label>
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
              <Label>{t("Status")}</Label>
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
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t("Batal")}</Button>
            <Button onClick={() => updateEventMut.mutate()} disabled={updateEventMut.isPending}>{t("Simpan")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Hapus acara?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Acara {name} akan dihapus (soft delete). Tindakan ini tidak dapat dibatalkan dari UI.", {
                name: event.eventName,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Batal")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteEventMut.mutate()}>{t("Hapus")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}