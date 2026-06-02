"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { EventImageImportPanel } from "@/components/events/event-image-import-panel";
import { DataTablePagination, DataTableToolbar } from "@/components/events/data-table-toolbar";
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
import { ContactPicker } from "@/components/events/contact-picker";
import type { Contact } from "@/lib/api/contacts";
import { EventExportJobsPanel } from "@/components/events/event-export-jobs-panel";
import { eventsApi, EVENTS_MAX_PATIENT_EXPORT_ROWS, type Patient } from "@/lib/api/events";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

const PAGE_SIZE = 20;
const ALL = "__all__";

type PatientForm = {
  fullName: string;
  birthDate: string;
  therapyId: string;
  complaint: string;
  preferredTime: string;
  reservationStatus: string;
};

const emptyPatientForm = (): PatientForm => ({
  fullName: "",
  birthDate: "",
  therapyId: "",
  complaint: "",
  preferredTime: "",
  reservationStatus: "CONFIRMED",
});

function patientToForm(p: Patient): PatientForm {
  return {
    fullName: p.fullName,
    birthDate: p.birthDate,
    therapyId: p.therapyId,
    complaint: p.complaint ?? "",
    preferredTime: p.preferredTime?.slice(0, 5) ?? "",
    reservationStatus: p.reservationStatus,
  };
}

export function EventPatientsTab({
  eventId,
  canEdit,
  therapies,
}: {
  eventId: string;
  canEdit: boolean;
  therapies: { id: string; therapyName: string }[];
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [therapyFilter, setTherapyFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [slotDate, setSlotDate] = useState("");
  const [hasSlot, setHasSlot] = useState(ALL);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState<PatientForm>(emptyPatientForm());
  const [contactId, setContactId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

  const filters = {
    q: search || undefined,
    therapyId: therapyFilter !== ALL ? therapyFilter : undefined,
    status: statusFilter !== ALL ? statusFilter : undefined,
    slotDate: slotDate || undefined,
    hasSlot: hasSlot !== ALL ? hasSlot : undefined,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["event-patients", eventId, filters, page],
    queryFn: () => eventsApi.listPatients(eventId, { ...filters, page, pageSize: PAGE_SIZE }),
  });

  const exportTooMany = (data?.total ?? 0) > EVENTS_MAX_PATIENT_EXPORT_ROWS;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["event-patients", eventId] });
    void qc.invalidateQueries({ queryKey: ["event-dashboard", eventId] });
    void qc.invalidateQueries({ queryKey: ["event-schedule", eventId] });
  };

  const saveMut = useMutation({
    mutationFn: () =>
      editing
        ? eventsApi.updatePatient(eventId, editing.id, {
            fullName: form.fullName,
            birthDate: form.birthDate,
            therapyId: form.therapyId,
            complaint: form.complaint || undefined,
            preferredTime: form.preferredTime || undefined,
            reservationStatus: form.reservationStatus,
          })
        : eventsApi.createPatient(eventId, {
            contactId: contactId || undefined,
            fullName: form.fullName,
            birthDate: form.birthDate,
            therapyId: form.therapyId,
            complaint: form.complaint || undefined,
            preferredTime: form.preferredTime || undefined,
          }),
    onSuccess: () => {
      toast.success(editing ? "Pasien diperbarui" : "Pasien ditambahkan");
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyPatientForm());
      setContactId(null);
      invalidate();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => eventsApi.deletePatient(eventId, id),
    onSuccess: () => {
      toast.success("Pasien dihapus");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const exportMut = useMutation({
    mutationFn: () =>
      eventsApi.createExportJob(eventId, {
        kind: "patients_pdf",
        format: "pdf",
        filters,
      }),
    onSuccess: () => {
      toast.success("Export dimulai — lihat Riwayat export di bawah, lalu unduh saat selesai");
      void qc.invalidateQueries({ queryKey: ["event-export-jobs", eventId] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="mt-4 space-y-4">
      {canEdit ? (
        <EventImageImportPanel
          kind="patients"
          eventId={eventId}
          title="Import pasien dari gambar"
          description="Upload screenshot daftar pasien."
          onCommitted={invalidate}
        />
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="text-base">Daftar pasien</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={exportMut.isPending || exportTooMany}
              onClick={() => exportMut.mutate()}
            >
              <Download className="mr-1 h-4 w-4" />
              {exportMut.isPending ? "Memulai…" : "Export PDF"}
            </Button>
            {canEdit ? (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setForm(emptyPatientForm());
                  setContactId(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Tambah pasien
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
            searchPlaceholder="Cari nama pasien..."
          >
            <Select value={therapyFilter} onValueChange={(v) => { setTherapyFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Terapi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua terapi</SelectItem>
                {therapies.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.therapyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua status</SelectItem>
                {["CONFIRMED", "COMPLETED", "CANCELLED"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" className="w-full sm:w-36" value={slotDate} onChange={(e) => { setSlotDate(e.target.value); setPage(1); }} />
            <Select value={hasSlot} onValueChange={(v) => { setHasSlot(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Slot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua slot</SelectItem>
                <SelectItem value="true">Ada slot</SelectItem>
                <SelectItem value="false">Belum slot</SelectItem>
              </SelectContent>
            </Select>
          </DataTableToolbar>

          {exportTooMany ? (
            <p className="text-xs text-amber-700">
              Terlalu banyak hasil ({total}). Persempit filter untuk export (maks. {EVENTS_MAX_PATIENT_EXPORT_ROWS}).
            </p>
          ) : null}

          {isError ? (
            <p className="text-sm text-destructive">{toApiError(error).message}</p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Tgl lahir</TableHead>
                    <TableHead>Terapi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Keluhan</TableHead>
                    {canEdit ? <TableHead className="text-right">Aksi</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 7 : 6} className="h-24 text-center text-muted-foreground">
                        Tidak ada pasien.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.fullName}</TableCell>
                        <TableCell>{p.birthDate}</TableCell>
                        <TableCell>{p.therapyName ?? "—"}</TableCell>
                        <TableCell>{p.reservationStatus}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.slotLabel || "—"}</TableCell>
                        <TableCell className="max-w-[160px] truncate text-muted-foreground">{p.complaint || "—"}</TableCell>
                        {canEdit ? (
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setForm(patientToForm(p)); setDialogOpen(true); }}>
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

      <EventExportJobsPanel eventId={eventId} kinds={["patients_pdf"]} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit pasien" : "Tambah pasien"}</DialogTitle>
            <DialogDescription>
              {editing ? "Perbarui data pasien terdaftar." : "Daftarkan pasien secara manual oleh admin."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {!editing ? (
              <ContactPicker
                value={contactId}
                disabled={!canEdit}
                onSelect={(c: Contact | null) => {
                  setContactId(c?.id ?? null);
                  if (c) {
                    setForm((f) => ({
                      ...f,
                      fullName: c.displayName?.trim() || c.phoneNumber,
                      birthDate: c.birthDate?.slice(0, 10) ?? f.birthDate,
                      complaint: f.complaint || c.notes?.trim() || "",
                    }));
                  }
                }}
              />
            ) : null}
            <div>
              <Label>Nama lengkap</Label>
              <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div>
              <Label>Tanggal lahir</Label>
              <Input type="date" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
            </div>
            <div>
              <Label>Terapi</Label>
              <Select value={form.therapyId} onValueChange={(v) => setForm((f) => ({ ...f, therapyId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih terapi" />
                </SelectTrigger>
                <SelectContent>
                  {therapies.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.therapyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editing ? (
              <div>
                <Label>Status</Label>
                <Select value={form.reservationStatus} onValueChange={(v) => setForm((f) => ({ ...f, reservationStatus: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["CONFIRMED", "COMPLETED", "CANCELLED"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div>
              <Label>Keluhan</Label>
              <Input value={form.complaint} onChange={(e) => setForm((f) => ({ ...f, complaint: e.target.value }))} />
            </div>
            <div>
              <Label>Jam preferensi</Label>
              <Input type="time" value={form.preferredTime} onChange={(e) => setForm((f) => ({ ...f, preferredTime: e.target.value }))} />
              <p className="text-xs text-muted-foreground">
                Kolom <strong>Slot</strong> terisi otomatis jika slot sudah di-generate (tab Jadwal) dan jam ini cocok dengan slot tersedia. Simpan ulang pasien jika slot baru dibuat.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={
                saveMut.isPending ||
                !form.therapyId ||
                (!editing && !contactId && (!form.fullName.trim() || !form.birthDate)) ||
                (!!editing && (!form.fullName.trim() || !form.birthDate))
              }
              onClick={() => saveMut.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pasien?</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget?.fullName} akan dihapus dari acara.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
