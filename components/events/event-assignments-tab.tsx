"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { eventsApi, type Assignment } from "@/lib/api/events";
import { staffRoleLabel, personTypeToRole } from "@/lib/events-staff";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

const PAGE_SIZE = 20;

type AssignmentForm = {
  taskId: string;
  personId: string;
  startTime: string;
  endTime: string;
  sessionName: string;
};

const emptyAssignmentForm = (): AssignmentForm => ({
  taskId: "",
  personId: "",
  startTime: "",
  endTime: "",
  sessionName: "",
});

function assignmentToForm(a: Assignment): AssignmentForm {
  return {
    taskId: a.taskId,
    personId: a.personId,
    startTime: a.startTime?.slice(0, 5) ?? "",
    endTime: a.endTime?.slice(0, 5) ?? "",
    sessionName: a.sessionName ?? "",
  };
}

function formatTime(t?: string) {
  if (!t) return "—";
  return t.slice(0, 5);
}

export function EventAssignmentsTab({
  eventId,
  canEdit,
}: {
  eventId: string;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const { data: peopleData } = useQuery({
    queryKey: ["event-people", eventId, "picker"],
    queryFn: () => eventsApi.listPeople(eventId, { page: 1, pageSize: 500 }),
  });
  const { data: tasksData } = useQuery({
    queryKey: ["event-tasks-master"],
    queryFn: () => eventsApi.listTasks({ pageSize: 100 }),
  });
  const people = peopleData?.items ?? [];
  const tasks = tasksData?.items ?? [];
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [form, setForm] = useState<AssignmentForm>(emptyAssignmentForm());
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["event-assignments", eventId, search, page],
    queryFn: () =>
      eventsApi.listAssignments(eventId, { q: search || undefined, page, pageSize: PAGE_SIZE }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["event-assignments", eventId] });
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const body = {
        taskId: form.taskId,
        personId: form.personId,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        sessionName: form.sessionName || undefined,
      };
      return editing
        ? eventsApi.updateAssignment(eventId, editing.id, body)
        : eventsApi.createAssignment(eventId, body);
    },
    onSuccess: () => {
      toast.success(editing ? "Penugasan diperbarui" : "Penugasan ditambahkan");
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyAssignmentForm());
      invalidate();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => eventsApi.deleteAssignment(eventId, id),
    onSuccess: () => {
      toast.success("Penugasan dihapus");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="text-base">Daftar penugasan</CardTitle>
          {canEdit ? (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setForm(emptyAssignmentForm());
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Tambah penugasan
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <DataTableToolbar
            searchValue={q}
            onSearchChange={setQ}
            onSearchSubmit={() => {
              setSearch(q);
              setPage(1);
            }}
            searchPlaceholder="Cari tugas atau nama staf..."
          />

          {isError ? (
            <p className="text-sm text-destructive">{toApiError(error).message}</p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tugas</TableHead>
                    <TableHead>Staf</TableHead>
                    <TableHead>Jam</TableHead>
                    <TableHead>Sesi</TableHead>
                    {canEdit ? <TableHead className="text-right">Aksi</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 5 : 4} className="h-24 text-center text-muted-foreground">
                        Tidak ada penugasan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.taskName}</TableCell>
                        <TableCell>{a.personName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTime(a.startTime)} – {formatTime(a.endTime)}
                        </TableCell>
                        <TableCell>{a.sessionName || "—"}</TableCell>
                        {canEdit ? (
                          <TableCell className="text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditing(a);
                                setForm(assignmentToForm(a));
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(a)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit penugasan" : "Tambah penugasan"}</DialogTitle>
            <DialogDescription>
              {editing ? "Ubah tugas, staf, atau jam penugasan." : "Tetapkan staf ke tugas acara."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Tugas</Label>
              <Select value={form.taskId} onValueChange={(v) => setForm((f) => ({ ...f, taskId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tugas" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.taskName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Staf</Label>
              <Select value={form.personId} onValueChange={(v) => setForm((f) => ({ ...f, personId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih staf" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.fullName} ({staffRoleLabel(personTypeToRole(p.personType))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jam mulai</Label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <Label>Jam selesai</Label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
            </div>
            <div>
              <Label>Sesi (opsional)</Label>
              <Input value={form.sessionName} onChange={(e) => setForm((f) => ({ ...f, sessionName: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={saveMut.isPending || !form.taskId || !form.personId}
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
            <AlertDialogTitle>Hapus penugasan?</AlertDialogTitle>
            <AlertDialogDescription>
              Penugasan {deleteTarget?.taskName} — {deleteTarget?.personName} akan dihapus.
            </AlertDialogDescription>
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
