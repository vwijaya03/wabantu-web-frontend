"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Copy, Plus, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Textarea } from "@/components/ui/textarea";
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
import { DataTablePagination } from "@/components/events/data-table-toolbar";
import { ListSortControl } from "@/components/events/list-sort-control";
import { EventBreakFields } from "@/components/events/event-break-fields";
import { eventsApi, type EventRow } from "@/lib/api/events";
import { formatEventDateTimeRange } from "@/lib/events-format";
import { EVENT_LIST_SORT_DEFAULT, EVENT_LIST_SORT_OPTIONS } from "@/lib/events-sort";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions, hasTenantDashboardAccess } from "@/lib/api/auth";
import { tenantContextKey } from "@/lib/auth/tenant-context";
import { eventsListKey } from "@/lib/query/events-query-keys";
import { toast } from "sonner";

const STATUSES = ["DRAFT", "PUBLISHED", "CLOSED", "CANCELLED", "ARCHIVED"] as const;
const PAGE_SIZE = 50;
const ALL_STATUS = "__all__";

export default function EventsListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const tenantKey = tenantContextKey(user);
  const eventsQueryEnabled = Boolean(user && hasTenantDashboardAccess(user));
  const isOwner = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
  const [page, setPage] = useState(1);
  const [tableSort, setTableSort] = useState(EVENT_LIST_SORT_DEFAULT);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    eventName: "",
    eventDescription: "",
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

  const sortKey = `${tableSort.sortBy}:${tableSort.sortDir}`;
  const { data, isLoading } = useQuery({
    queryKey: eventsListKey(tenantKey, search, statusFilter, sortKey, page),
    queryFn: ({ signal }) =>
      eventsApi.listEvents(
        {
          q: search || undefined,
          status: statusFilter !== ALL_STATUS ? statusFilter : undefined,
          sortBy: tableSort.sortBy,
          sortDir: tableSort.sortDir,
          page,
          pageSize: PAGE_SIZE,
        },
        signal,
      ),
    enabled: eventsQueryEnabled,
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
      void qc.invalidateQueries({ queryKey: ["events", tenantKey] });
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
      void qc.invalidateQueries({ queryKey: ["events", tenantKey] });
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

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative flex-1 max-w-md min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Cari acara..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setSearch(q), setPage(1))}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setSearch(q);
            setPage(1);
          }}
        >
          Cari
        </Button>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS}>Semua status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ListSortControl
          options={EVENT_LIST_SORT_OPTIONS}
          sortBy={tableSort.sortBy}
          sortDir={tableSort.sortDir}
          onChange={(next) => {
            setTableSort(next);
            setPage(1);
          }}
        />
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
                  {formatEventDateTimeRange(ev.startDate, ev.startTime, ev.endDate, ev.endTime)}
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

      <DataTablePagination
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />

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
            <div>
              <Label>Catatan acara</Label>
              <Textarea
                rows={4}
                placeholder={
                  "Contoh:\n- Makanan tanpa minyak dan tepung, tetapi tidak vegan\n- Sambal dipisah\n- Untuk makanannya Tono, hubungi langsung orangnya"
                }
                value={form.eventDescription}
                onChange={(e) => setForm((f) => ({ ...f, eventDescription: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Mulai</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tanggal</Label>
                  <DatePicker
                    required
                    value={form.startDate}
                    onChange={(startDate) => setForm((f) => ({ ...f, startDate }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Jam</Label>
                  <TimePicker
                    value={form.startTime}
                    onChange={(startTime) => setForm((f) => ({ ...f, startTime }))}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Selesai</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tanggal</Label>
                  <DatePicker
                    required
                    value={form.endDate}
                    onChange={(endDate) => setForm((f) => ({ ...f, endDate }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Jam</Label>
                  <TimePicker
                    value={form.endTime}
                    onChange={(endTime) => setForm((f) => ({ ...f, endTime }))}
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
