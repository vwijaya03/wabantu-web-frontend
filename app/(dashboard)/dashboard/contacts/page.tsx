"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, PlusCircle, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/dashboard/page-header";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { contactsApi, type Contact } from "@/lib/api/contacts";
import { priceTypesApi } from "@/lib/api/price-types";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { useTenantQueryEnabled } from "@/hooks/use-tenant-query-enabled";
import { invalidateTenantQueries, tenantQueryKey } from "@/lib/query/tenant-query-key";

const pageSize = 25;

const CONTACT_STATUSES = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

type ContactForm = {
  phoneNumber: string;
  displayName: string;
  birthDate: string;
  notes: string;
  status: string;
  priceTypeId: string;
  tags: string;
};

const emptyForm: ContactForm = {
  phoneNumber: "",
  displayName: "",
  birthDate: "",
  notes: "",
  status: "active",
  priceTypeId: "",
  tags: "",
};

export default function ContactsPage() {
  const qc = useQueryClient();
  const tenantKey = useTenantKey();
  const tenantReady = useTenantQueryEnabled();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ContactForm>(emptyForm);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [editForm, setEditForm] = useState<ContactForm>(emptyForm);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState("active");
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "contacts", search, page, pageSize),
    queryFn: ({ signal }) => contactsApi.list({ q: search || undefined, page, pageSize }, signal),
    enabled: tenantReady,
  });
  const { data: priceTypesData } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "price-types", "contacts-form"),
    queryFn: ({ signal }) => priceTypesApi.list({ pageSize: 50 }, signal),
    enabled: tenantReady,
  });
  const priceTypes = (priceTypesData?.items ?? []).filter((pt) => pt.isActive);
  const defaultPriceType = useMemo(
    () => priceTypes.find((pt) => pt.isDefault) ?? priceTypes[0],
    [priceTypes],
  );
  const priceTypeLabelById = useMemo(
    () => new Map(priceTypes.map((pt) => [pt.id, pt.label])),
    [priceTypes],
  );

  const contacts = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  const invalidateContacts = () => {
    invalidateTenantQueries(qc, tenantKey, "contacts");
  };

  const createMut = useMutation({
    mutationFn: () => contactsApi.create(toCreatePayload(createForm)),
    onSuccess: () => {
      toast.success("Kontak ditambahkan");
      setCreateForm(emptyForm);
      setCreateOpen(false);
      setPage(1);
      invalidateContacts();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const updateMut = useMutation({
    mutationFn: () => contactsApi.update(editContact!.id, toUpdatePayload(editForm)),
    onSuccess: () => {
      toast.success("Kontak diperbarui");
      setEditContact(null);
      invalidateContacts();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => contactsApi.remove(id),
    onSuccess: () => {
      toast.success("Kontak dihapus");
      invalidateContacts();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });
  const batchStatusMut = useMutation({
    mutationFn: () => contactsApi.batchUpdateStatus({ ids: Array.from(selectedIds), status: batchStatus }),
    onSuccess: (res) => {
      toast.success(`${res.updated} kontak diperbarui`);
      setSelectedIds(new Set());
      invalidateContacts();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });
  const batchDeleteMut = useMutation({
    mutationFn: () => contactsApi.batchDelete(Array.from(selectedIds)),
    onSuccess: (res) => {
      toast.success(`${res.deleted} kontak dihapus`);
      setSelectedIds(new Set());
      invalidateContacts();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const runSearch = () => {
    setSearch(q.trim());
    setPage(1);
    setSelectedIds(new Set());
  };

  const visibleIds = contacts.map((contact) => contact.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
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

  const openEdit = (contact: Contact) => {
    setEditContact(contact);
    setEditForm({
      phoneNumber: contact.phoneNumber,
      displayName: contact.displayName ?? "",
      birthDate: contact.birthDate?.slice(0, 10) ?? "",
      notes: contact.notes ?? "",
      status: contact.status || "active",
      priceTypeId: contact.priceTypeId ?? "",
      tags: contact.tags.join(", "),
    });
  };

  return (
    <RequireTenantDashboard>
    <>
      <PageHeader
        title="Contacts"
        description="Kelola kontak customer WhatsApp dengan search dan pagination."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusCircle className="h-4 w-4" /> Tambah Kontak
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Daftar kontak ({total})</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Data dibatasi {pageSize} kontak per halaman agar tidak memanjang saat data besar.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative min-w-0 lg:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runSearch();
                  }}
                  placeholder="Cari nama, nomor, tag..."
                />
              </div>
              <Button variant="secondary" onClick={runSearch}>
                Cari
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.size > 0 && (
            <div className="mb-4 flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span>{selectedIds.size} kontak dipilih</span>
              <div className="flex gap-2">
                <Select value={batchStatus} onValueChange={setBatchStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button disabled={batchStatusMut.isPending} onClick={() => batchStatusMut.mutate()}>
                  Update Status
                </Button>
                <Button
                  variant="destructive"
                  disabled={batchDeleteMut.isPending}
                  onClick={() => setBatchDeleteOpen(true)}
                >
                  Hapus Batch
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Memuat contacts...
            </div>
          ) : contacts.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              Belum ada kontak yang cocok.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[40px_minmax(220px,1fr)_120px_140px_180px_160px_120px] gap-3 border-b bg-muted/60 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground max-lg:hidden">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectVisible} aria-label="Pilih semua kontak" />
                <span>Kontak</span>
                <span>Status</span>
                <span>Tipe harga</span>
                <span>Catatan</span>
                <span>Tag</span>
                <span className="text-right">Aksi</span>
              </div>
              <div className="max-h-[640px] divide-y overflow-auto">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[40px_minmax(220px,1fr)_120px_140px_180px_160px_120px] lg:items-center"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 lg:mt-0"
                      checked={selectedIds.has(contact.id)}
                      onChange={() => toggleSelected(contact.id)}
                      aria-label={`Pilih kontak ${contact.phoneNumber}`}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{contact.displayName || "Tanpa nama"}</p>
                      <p className="text-xs text-muted-foreground">{contact.phoneNumber}</p>
                    </div>
                    <Badge variant={contact.status === "active" ? "success" : "destructive"}>
                      {contact.status === "active" ? "Aktif" : "Nonaktif"}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {contact.priceTypeId
                        ? priceTypeLabelById.get(contact.priceTypeId) ?? "Kustom"
                        : defaultPriceType?.label ?? "Harga umum"}
                    </p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{contact.notes || "-"}</p>
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.length === 0 ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        contact.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="flex justify-start gap-1 lg:justify-end">
                      <Button variant="outline" size="sm" onClick={() => openEdit(contact)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteContactId(contact.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">
              {total === 0
                ? "0 kontak"
                : `Menampilkan ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} dari ${total} kontak`}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Kontak</DialogTitle>
            <DialogDescription>Kontak juga otomatis dibuat saat customer chat ke WhatsApp.</DialogDescription>
          </DialogHeader>
          <ContactFormFields
            form={createForm}
            setForm={setCreateForm}
            priceTypes={priceTypes}
            defaultPriceTypeId={defaultPriceType?.id}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => createMut.mutate()} disabled={!createForm.phoneNumber.trim() || createMut.isPending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editContact} onOpenChange={(open) => !open && setEditContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Kontak</DialogTitle>
            <DialogDescription>Ubah nama, catatan, dan tag kontak.</DialogDescription>
          </DialogHeader>
          <ContactFormFields
            form={editForm}
            setForm={setEditForm}
            isEdit
            priceTypes={priceTypes}
            defaultPriceTypeId={defaultPriceType?.id}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditContact(null)}>
              Batal
            </Button>
            <Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        title={`Hapus ${selectedIds.size} kontak?`}
        description="Kontak terpilih akan dihapus permanen."
        confirmLabel="Hapus"
        destructive
        loading={batchDeleteMut.isPending}
        onConfirm={() => batchDeleteMut.mutate()}
      />

      <ConfirmDialog
        open={!!deleteContactId}
        onOpenChange={(open) => !open && setDeleteContactId(null)}
        title="Hapus kontak?"
        description="Kontak akan dihapus permanen dari daftar."
        confirmLabel="Hapus"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (deleteContactId) deleteMut.mutate(deleteContactId);
          setDeleteContactId(null);
        }}
      />
    </>
    </RequireTenantDashboard>
  );
}

function ContactFormFields({
  form,
  setForm,
  isEdit,
  priceTypes,
  defaultPriceTypeId,
}: {
  form: ContactForm;
  setForm: (form: ContactForm) => void;
  isEdit?: boolean;
  priceTypes: Array<{ id: string; label: string; isDefault: boolean }>;
  defaultPriceTypeId?: string;
}) {
  const update = (patch: Partial<ContactForm>) => setForm({ ...form, ...patch });
  const selectValue = form.priceTypeId || defaultPriceTypeId || "";
  return (
    <div className="space-y-3">
      <div>
        <Label>Nomor WhatsApp</Label>
        <Input
          value={form.phoneNumber}
          onChange={(e) => update({ phoneNumber: e.target.value })}
          disabled={isEdit}
          placeholder="62812..."
        />
      </div>
      <div>
        <Label>Nama</Label>
        <Input value={form.displayName} onChange={(e) => update({ displayName: e.target.value })} />
      </div>
      <div>
        <Label>Tanggal lahir</Label>
        <DatePicker value={form.birthDate} onChange={(birthDate) => update({ birthDate })} />
        <p className="mt-1 text-xs text-muted-foreground">Dipakai saat mendaftarkan pasien acara dari kontak ini.</p>
      </div>
      <div>
        <Label>Tipe harga</Label>
        <Select
          value={selectValue}
          onValueChange={(value) =>
            update({
              priceTypeId: defaultPriceTypeId && value === defaultPriceTypeId ? "" : value,
            })
          }
          disabled={priceTypes.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={priceTypes.length === 0 ? "Muat tipe harga…" : "Pilih tipe harga"} />
          </SelectTrigger>
          <SelectContent>
            {priceTypes.map((pt) => (
              <SelectItem key={pt.id} value={pt.id}>
                {pt.label}
                {pt.isDefault ? " (default)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          Dipakai saat membuat pesanan untuk kontak ini (mis. reseller).
        </p>
      </div>
      <div>
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(status) => update({ status })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTACT_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Tag</Label>
        <Input value={form.tags} onChange={(e) => update({ tags: e.target.value })} placeholder="vip, repeat buyer" />
        <p className="mt-1 text-xs text-muted-foreground">Pisahkan beberapa tag dengan koma.</p>
      </div>
      <div>
        <Label>Catatan</Label>
        <Textarea value={form.notes} onChange={(e) => update({ notes: e.target.value })} rows={3} />
      </div>
    </div>
  );
}

function toCreatePayload(form: ContactForm) {
  return {
    phoneNumber: form.phoneNumber.trim(),
    displayName: optionalString(form.displayName),
    birthDate: optionalString(form.birthDate),
    notes: optionalString(form.notes),
    status: form.status,
    priceTypeId: optionalString(form.priceTypeId),
    tags: parseTags(form.tags),
  };
}

function toUpdatePayload(form: ContactForm) {
  return {
    displayName: optionalString(form.displayName),
    birthDate: optionalString(form.birthDate),
    notes: optionalString(form.notes),
    status: form.status,
    priceTypeId: form.priceTypeId.trim() === "" ? null : form.priceTypeId.trim(),
    tags: parseTags(form.tags),
  };
}

function optionalString(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
