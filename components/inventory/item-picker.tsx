"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { catalogApi } from "@/lib/api/catalog";
import { cn } from "@/lib/utils";

export interface PickedItem {
  id: string;
  name: string;
  externalCode: string;
}

export function ItemPicker({
  value,
  onChange,
  placeholder = "Cari produk (nama / kode)...",
}: {
  value: PickedItem | null;
  onChange: (item: PickedItem | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ["catalog", "picker", q],
    queryFn: () => catalogApi.list({ q, pageSize: 8, activeOnly: true }),
    enabled: open && q.trim().length >= 1,
    staleTime: 30_000,
  });

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium">{value.name}</p>
          {value.externalCode ? <p className="truncate text-xs text-muted-foreground">{value.externalCode}</p> : null}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Ganti
        </Button>
      </div>
    );
  }

  const results = data?.items ?? [];

  return (
    <div className="relative">
      <Input
        value={q}
        placeholder={placeholder}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && q.trim().length >= 1 ? (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {isFetching ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Mencari...</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Tidak ada produk cocok.</p>
          ) : (
            results.map((it) => (
              <button
                key={it.id}
                type="button"
                className={cn(
                  "flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange({ id: it.id, name: it.name, externalCode: it.externalCode });
                  setQ("");
                  setOpen(false);
                }}
              >
                <span className="font-medium">{it.name}</span>
                {it.externalCode ? <span className="text-xs text-muted-foreground">{it.externalCode}</span> : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
