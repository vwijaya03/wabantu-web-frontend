"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { EventExportJobsPanel } from "@/components/events/event-export-jobs-panel";
import { EventImageImportPanel } from "@/components/events/event-image-import-panel";
import { DataTablePagination, DataTableToolbar } from "@/components/events/data-table-toolbar";
import { TherapyMultiPick } from "@/components/events/therapy-multi-pick";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { eventsApi, type EventPerson } from "@/lib/api/events";
import { toApiError } from "@/lib/api/client";
import {
  personTypeToRole,
  roleUsesTherapies,
  STAFF_ROLES,
  staffRoleLabel,
} from "@/lib/events-staff";
import { toast } from "sonner";

const PAGE_SIZE = 20;
const ATTENDANCE = ["PRESENT", "PARTIAL", "ABSENT"] as const;
const ALL_ROLES = "__all__";

const ROLE_TO_TYPE: Record<string, string> = {
  terapis: "THERAPIST",
  relawan: "VOLUNTEER",
  shijie: "SHIJIE",
  daoshi: "DAOSHI",
  fashi: "FASHI",
};

type StaffForm = {
  rosterId: string;
  fullName: string;
  role: string;
  attendanceStatus: string;
  therapyIds: string[];
  volunteerRoleId: string;
  isPencatat: boolean;
  saveToRoster: boolean;
  arrivalTime: string;
  departureTime: string;
  availableFrom: string;
  availableUntil: string;
};

const emptyForm = (): StaffForm => ({
  rosterId: "",
  fullName: "",
  role: "terapis",
  attendanceStatus: "PRESENT",
  therapyIds: [],
  volunteerRoleId: "",
  isPencatat: false,
  saveToRoster: true,
  arrivalTime: "",
  departureTime: "",
  availableFrom: "",
  availableUntil: "",
});

function personToForm(p: EventPerson): StaffForm {
  return {
    rosterId: "",
    fullName: p.fullName,
    role: p.role ?? personTypeToRole(p.personType),
    attendanceStatus: p.attendanceStatus || "PRESENT",
    therapyIds: p.therapyIds ?? (p.therapyId ? [p.therapyId] : []),
    volunteerRoleId: p.volunteerRoleId ?? "",
    isPencatat: p.isPencatat ?? false,
    saveToRoster: true,
    arrivalTime: p.arrivalTime?.slice(0, 5) ?? "",
    departureTime: p.departureTime?.slice(0, 5) ?? "",
    availableFrom: p.availableFrom?.slice(0, 5) ?? "",
    availableUntil: p.availableUntil?.slice(0, 5) ?? "",
  };
}

function StaffFormFields({
  form,
  setForm,
  therapies,
  roles,
  roster,
  showRosterPick,
}: {
  form: StaffForm;
  setForm: React.Dispatch<React.SetStateAction<StaffForm>>;
  therapies: { id: string; therapyName: string }[];
  roles: { id: string; roleName: string }[];
  roster: { id: string; fullName: string; role?: string; therapyNames?: string[] }[];
  showRosterPick: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {showRosterPick && roster.length > 0 ? (
        <div className="sm:col-span-2">
          <Label>Pilih dari roster staf</Label>
          <Select
            value={form.rosterId || "__none__"}
            onValueChange={(v) => {
              if (v === "__none__") {
                setForm((f) => ({ ...f, rosterId: "" }));
                return;
              }
              const entry = roster.find((r) => r.id === v);
              if (!entry) return;
              setForm((f) => ({
                ...f,
                rosterId: v,
                fullName: entry.fullName,
                role: entry.role ?? f.role,
              }));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Ketik manual atau pilih roster" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Input manual —</SelectItem>
              {roster.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.fullName}
                  {r.therapyNames?.length ? ` (${r.therapyNames.join(", ")})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <Label>Nama</Label>
        <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
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
      <div>
        <Label>Kehadiran</Label>
        <Select
          value={form.attendanceStatus}
          onValueChange={(v) => setForm((f) => ({ ...f, attendanceStatus: v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ATTENDANCE.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {roleUsesTherapies(form.role) ? (
        <>
          <div className="sm:col-span-2">
            <Label>Terapi</Label>
            <TherapyMultiPick
              therapies={therapies}
              selected={form.therapyIds}
              onChange={(therapyIds) => setForm((f) => ({ ...f, therapyIds }))}
            />
          </div>
          <div>
            <Label>Tersedia dari</Label>
            <Input type="time" value={form.availableFrom} onChange={(e) => setForm((f) => ({ ...f, availableFrom: e.target.value }))} />
          </div>
          <div>
            <Label>Tersedia sampai</Label>
            <Input type="time" value={form.availableUntil} onChange={(e) => setForm((f) => ({ ...f, availableUntil: e.target.value }))} />
          </div>
        </>
      ) : null}
      {form.role === "relawan" ? (
        <>
          <div>
            <Label>Peran relawan</Label>
            <Select value={form.volunteerRoleId} onValueChange={(v) => setForm((f) => ({ ...f, volunteerRoleId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.roleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isPencatat}
                onChange={(e) => setForm((f) => ({ ...f, isPencatat: e.target.checked }))}
              />
              Pencatat
            </label>
          </div>
        </>
      ) : null}
      <div>
        <Label>Datang</Label>
        <Input type="time" value={form.arrivalTime} onChange={(e) => setForm((f) => ({ ...f, arrivalTime: e.target.value }))} />
      </div>
      <div>
        <Label>Pulang</Label>
        <Input type="time" value={form.departureTime} onChange={(e) => setForm((f) => ({ ...f, departureTime: e.target.value }))} />
      </div>
      <div className="sm:col-span-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.saveToRoster}
            onChange={(e) => setForm((f) => ({ ...f, saveToRoster: e.target.checked }))}
          />
          Simpan ke roster staf (untuk acara berikutnya)
        </label>
      </div>
    </div>
  );
}

function buildPayload(form: StaffForm, editing: boolean) {
  return {
    rosterId: !editing && form.rosterId ? form.rosterId : undefined,
    saveToRoster: form.saveToRoster,
    fullName: form.fullName,
    role: form.role,
    attendanceStatus: form.attendanceStatus,
    therapyIds: roleUsesTherapies(form.role) ? form.therapyIds : undefined,
    volunteerRoleId: form.role === "relawan" ? form.volunteerRoleId || undefined : undefined,
    isPencatat: form.role === "relawan" ? form.isPencatat : undefined,
    arrivalTime: form.arrivalTime || undefined,
    departureTime: form.departureTime || undefined,
    availableFrom: form.availableFrom || undefined,
    availableUntil: form.availableUntil || undefined,
  };
}

export function EventStaffTab({
  eventId,
  canEdit,
  therapies,
  roles,
}: {
  eventId: string;
  canEdit: boolean;
  therapies: { id: string; therapyName: string }[];
  roles: { id: string; roleName: string }[];
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(ALL_ROLES);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventPerson | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<EventPerson | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const personType = roleFilter !== ALL_ROLES ? ROLE_TO_TYPE[roleFilter] : undefined;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["event-people", eventId, search, roleFilter, page],
    queryFn: () =>
      eventsApi.listPeople(eventId, {
        q: search || undefined,
        personType,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const { data: rosterData } = useQuery({
    queryKey: ["event-staff-roster"],
    queryFn: () => eventsApi.listStaffRoster(),
  });
  const roster = rosterData?.items ?? [];

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["event-people", eventId] });
    void qc.invalidateQueries({ queryKey: ["event-dashboard", eventId] });
  };

  const importRosterMut = useMutation({
    mutationFn: () => eventsApi.importStaffRoster(eventId),
    onSuccess: (res) => {
      toast.success(`${res.added} staf ditambahkan${res.skipped ? `, ${res.skipped} sudah ada` : ""}`);
      invalidate();
      void qc.invalidateQueries({ queryKey: ["event-staff-roster"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const syncRosterMut = useMutation({
    mutationFn: () => eventsApi.syncStaffRosterFromEvent(eventId),
    onSuccess: (res) => {
      toast.success(`${res.upserted} staf disimpan ke roster`);
      void qc.invalidateQueries({ queryKey: ["event-staff-roster"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const saveMut = useMutation({
    mutationFn: () =>
      editing
        ? eventsApi.updatePerson(eventId, editing.id, buildPayload(form, true))
        : eventsApi.createPerson(eventId, buildPayload(form, false)),
    onSuccess: () => {
      toast.success(editing ? "Staf diperbarui" : "Staf ditambahkan");
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      invalidate();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => eventsApi.deletePerson(eventId, id),
    onSuccess: () => {
      toast.success("Staf dihapus");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const deleteBulkMut = useMutation({
    mutationFn: (ids: string[]) => eventsApi.deletePeopleBulk(eventId, ids),
    onSuccess: (res) => {
      const msg =
        res.failed > 0
          ? `${res.deleted} staf dihapus, ${res.failed} gagal`
          : `${res.deleted} staf dihapus`;
      toast.success(msg);
      setSelectedIds(new Set());
      setBulkDeleteConfirmOpen(false);
      invalidate();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const startExport = (kind: "staff_sheet" | "staff_list") => {
    void eventsApi
      .createExportJob(eventId, { kind, format: "xlsx" })
      .then(() => {
        toast.success("Export masuk antrian — lihat Riwayat export di bawah");
        void qc.invalidateQueries({ queryKey: ["event-export-jobs", eventId] });
      })
      .catch((e) => toast.error(toApiError(e).message));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (p: EventPerson) => {
    setEditing(p);
    setForm(personToForm(p));
    setDialogOpen(true);
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const visibleIds = items.map((p) => p.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const toggleSelectVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="mt-4 space-y-4">
      {canEdit ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={importRosterMut.isPending || roster.length === 0}
              onClick={() => importRosterMut.mutate()}
            >
              Muat semua dari roster ({roster.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={syncRosterMut.isPending || total === 0}
              onClick={() => syncRosterMut.mutate()}
            >
              Simpan staf acara ini ke roster
            </Button>
          </div>
        </>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="text-base">Daftar staf</CardTitle>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <EventImageImportPanel
                presentation="dialog"
                kind="staff"
                eventId={eventId}
                title="Import staf dari gambar"
                description="Upload screenshot daftar staf/relawan."
                onCommitted={invalidate}
              />
            ) : null}
            <Button size="sm" variant="outline" onClick={() => startExport("staff_list")}>
              <Download className="mr-1 h-4 w-4" />
              Daftar staf (Excel)
            </Button>
            <Button size="sm" variant="outline" onClick={() => startExport("staff_sheet")}>
              <Download className="mr-1 h-4 w-4" />
              Lembar operasional
            </Button>
            {canEdit ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" /> Tambah staf
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <DataTableToolbar
            searchValue={q}
            onSearchChange={setQ}
            onSearchSubmit={() => {
              setSearch(q);
              setPage(1);
            }}
            searchPlaceholder="Cari nama staf..."
          >
            <div className="w-full sm:w-48">
              <Label className="sr-only">Filter peran</Label>
              <Select
                value={roleFilter}
                onValueChange={(v) => {
                  setRoleFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua peran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ROLES}>Semua peran</SelectItem>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DataTableToolbar>

          {canEdit && selectedIds.size > 0 ? (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span>{selectedIds.size} staf dipilih</span>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteBulkMut.isPending}
                onClick={() => setBulkDeleteConfirmOpen(true)}
              >
                Hapus terpilih
              </Button>
            </div>
          ) : null}

          {isError ? (
            <p className="text-sm text-destructive">Gagal memuat: {toApiError(error).message}</p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {canEdit ? (
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectVisible}
                          aria-label="Pilih semua staf di halaman ini"
                        />
                      </TableHead>
                    ) : null}
                    <TableHead>Nama</TableHead>
                    <TableHead>Peran</TableHead>
                    <TableHead>Terapi</TableHead>
                    <TableHead>Kehadiran</TableHead>
                    <TableHead>Jam</TableHead>
                    <TableHead>Terdaftar</TableHead>
                    {canEdit ? <TableHead className="text-right">Aksi</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 8 : 6} className="h-24 text-center text-muted-foreground">
                        Tidak ada data staf.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((p) => (
                      <TableRow key={p.id}>
                        {canEdit ? (
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(p.id)}
                              onChange={() => toggleSelected(p.id)}
                              aria-label={`Pilih staf ${p.fullName}`}
                            />
                          </TableCell>
                        ) : null}
                        <TableCell className="font-medium">{p.fullName}</TableCell>
                        <TableCell>{staffRoleLabel(personTypeToRole(p.personType))}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {(p.therapyNames ?? []).join(", ") || "—"}
                          {p.isPencatat ? " · Pencatat" : ""}
                        </TableCell>
                        <TableCell>{p.attendanceStatus}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.arrivalTime?.slice(0, 5) ?? "—"}
                          {p.departureTime ? ` – ${p.departureTime.slice(0, 5)}` : ""}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.createdAt ? new Date(p.createdAt).toLocaleString("id-ID") : "—"}
                        </TableCell>
                        {canEdit ? (
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(p)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <DataTablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <EventExportJobsPanel eventId={eventId} kinds={["staff_sheet", "staff_list"]} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit staf" : "Tambah staf"}</DialogTitle>
            <DialogDescription>
              {editing ? "Perbarui data staf acara ini." : "Tambahkan staf baru ke acara ini."}
            </DialogDescription>
          </DialogHeader>
          <StaffFormFields
            form={form}
            setForm={setForm}
            therapies={therapies}
            roles={roles}
            roster={roster}
            showRosterPick={!editing}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button disabled={saveMut.isPending || !form.fullName.trim()} onClick={() => saveMut.mutate()}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus staf?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.fullName} akan dihapus dari acara ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus staf terpilih?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.size} staf akan dihapus dari acara ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteBulkMut.isPending}
              onClick={() => deleteBulkMut.mutate(Array.from(selectedIds))}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
