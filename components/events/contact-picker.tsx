"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { contactsApi, type Contact } from "@/lib/api/contacts";
import { formatEventDateId } from "@/lib/events-format";
import { cn } from "@/lib/utils";

export function ContactPicker({
  value,
  onSelect,
  disabled,
}: {
  value: string | null;
  onSelect: (contact: Contact | null) => void;
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["contacts-picker", search],
    queryFn: () => contactsApi.list({ q: search || undefined, page: 1, pageSize: 20 }),
    enabled: search.length >= 1,
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-2">
      <Label>Dari kontak (opsional)</Label>
      <div className="flex gap-2">
        <Input
          placeholder="Cari nama atau nomor..."
          value={q}
          disabled={disabled}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setSearch(q);
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" disabled={disabled} onClick={() => setSearch(q)}>
          <Search className="h-4 w-4" />
        </Button>
      </div>
      {value ? (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span>Kontak dipilih</span>
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onSelect(null)}>
            Hapus pilihan
          </Button>
        </div>
      ) : null}
      {search && (
        <ul className="max-h-40 overflow-y-auto rounded-md border">
          {isLoading ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Memuat...</li>
          ) : items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Tidak ada kontak.</li>
          ) : (
            items.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={disabled}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-muted",
                    value === c.id && "bg-muted font-medium",
                  )}
                  onClick={() => {
                    onSelect(c);
                    setSearch("");
                    setQ("");
                  }}
                >
                  <span className="font-medium">{c.displayName || c.phoneNumber}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {c.phoneNumber}
                    {c.birthDate ? ` · ${formatEventDateId(c.birthDate)}` : ""}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Tanggal lahir diambil dari kontak jika sudah diisi di menu Contacts.
      </p>
    </div>
  );
}
