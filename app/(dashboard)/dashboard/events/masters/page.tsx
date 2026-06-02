"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
import { EventImageImportPanel } from "@/components/events/event-image-import-panel";
import { eventsApi } from "@/lib/api/events";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

export default function EventsMastersPage() {
  const { user } = useAuth();
  const isOwner = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState<{ type: string; id: string } | null>(null);
  const [therapyName, setTherapyName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [taskName, setTaskName] = useState("");
  const [tab, setTab] = useState("therapies");

  const { data: therapies } = useQuery({
    queryKey: ["masters-therapies"],
    queryFn: () => eventsApi.listTherapies({ pageSize: 100 }),
  });
  const { data: roles } = useQuery({
    queryKey: ["masters-roles"],
    queryFn: () => eventsApi.listVolunteerRoles({ pageSize: 100 }),
  });
  const { data: tasks } = useQuery({
    queryKey: ["masters-tasks"],
    queryFn: () => eventsApi.listTasks({ pageSize: 100 }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["masters-therapies"] });
    void qc.invalidateQueries({ queryKey: ["masters-roles"] });
    void qc.invalidateQueries({ queryKey: ["masters-tasks"] });
  };

  const createTherapy = useMutation({
    mutationFn: () => eventsApi.createTherapy({ therapyName, active: true }),
    onSuccess: () => {
      toast.success("Terapi ditambahkan");
      setTherapyName("");
      invalidate();
    },
  });
  const createRole = useMutation({
    mutationFn: () => eventsApi.createVolunteerRole({ roleName, active: true }),
    onSuccess: () => {
      toast.success("Peran ditambahkan");
      setRoleName("");
      invalidate();
    },
  });
  const createTask = useMutation({
    mutationFn: () => eventsApi.createTask({ taskName, assignmentType: "PER_HOUR", active: true }),
    onSuccess: () => {
      toast.success("Tugas ditambahkan");
      setTaskName("");
      invalidate();
    },
  });

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      if (deleteId.type === "therapy") await eventsApi.deleteTherapy(deleteId.id);
      if (deleteId.type === "role") await eventsApi.deleteVolunteerRole(deleteId.id);
      if (deleteId.type === "task") await eventsApi.deleteTask(deleteId.id);
      toast.success("Dihapus");
      invalidate();
    } catch {
      toast.error("Gagal menghapus");
    }
    setDeleteId(null);
  };

  if (!isOwner) {
    return <p className="p-6">Hanya owner yang dapat mengelola master data.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        <Link href="/dashboard/events" className="text-primary underline-offset-4 hover:underline">
          ← Acara
        </Link>
      </p>
      <h1 className="text-2xl font-semibold">Master Data Acara</h1>

      <div className="flex gap-2">
        {[
          ["therapies", "Terapi"],
          ["roles", "Peran Relawan"],
          ["tasks", "Tugas"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              tab === id ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "therapies" ? (
        <div className="space-y-4">
          <EventImageImportPanel
            kind="therapies"
            title="Import terapi dari gambar"
            description="Upload screenshot daftar jenis terapi. AI mengekstrak nama terapi untuk ditambahkan ke master."
            onCommitted={invalidate}
          />
          <Card>
            <CardContent className="flex gap-2 pt-6">
              <div className="flex-1">
                <Label>Nama terapi</Label>
                <Input value={therapyName} onChange={(e) => setTherapyName(e.target.value)} />
              </div>
              <Button className="mt-6" onClick={() => createTherapy.mutate()}>
                Tambah
              </Button>
            </CardContent>
          </Card>
          {(therapies?.items ?? []).map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base">{t.therapyName}</CardTitle>
                <Button size="sm" variant="destructive" onClick={() => setDeleteId({ type: "therapy", id: t.id })}>
                  Hapus
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "roles" ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex gap-2 pt-6">
              <div className="flex-1">
                <Label>Peran</Label>
                <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} />
              </div>
              <Button className="mt-6" onClick={() => createRole.mutate()}>
                Tambah
              </Button>
            </CardContent>
          </Card>
          {(roles?.items ?? []).map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base">{r.roleName}</CardTitle>
                <Button size="sm" variant="destructive" onClick={() => setDeleteId({ type: "role", id: r.id })}>
                  Hapus
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "tasks" ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex gap-2 pt-6">
              <div className="flex-1">
                <Label>Tugas</Label>
                <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} />
              </div>
              <Button className="mt-6" onClick={() => createTask.mutate()}>
                Tambah
              </Button>
            </CardContent>
          </Card>
          {(tasks?.items ?? []).map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base">
                  {t.taskName} <span className="text-muted-foreground">({t.assignmentType})</span>
                </CardTitle>
                <Button size="sm" variant="destructive" onClick={() => setDeleteId({ type: "task", id: t.id })}>
                  Hapus
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus item?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini soft-delete (data tidak hilang permanen).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
