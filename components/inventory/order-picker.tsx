"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ordersApi, type Order } from "@/lib/api/orders";

function orderLabel(o: Order): string {
  const num = o.orderNumber || o.id.slice(0, 8);
  const who = o.contactDisplayName?.trim() || o.contactPhone?.trim() || "";
  return who ? `${num} · ${who}` : num;
}

export function OrderPicker({
  value,
  onChange,
  placeholder = "Cari pesanan (WB-..., nama, produk)...",
}: {
  value: Order | null;
  onChange: (o: Order | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ["orders", "picker", q],
    queryFn: () => ordersApi.list({ q, pageSize: 8 }),
    enabled: open && q.trim().length >= 1,
    staleTime: 15_000,
  });

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
        <span className="truncate font-medium">{orderLabel(value)}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Ganti
        </Button>
      </div>
    );
  }

  const results = data?.orders ?? [];

  return (
    <div className="relative">
      <Input
        value={q}
        placeholder={placeholder}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && q.trim().length >= 1 ? (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {isFetching ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Mencari...</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Tidak ada pesanan cocok.</p>
          ) : (
            results.map((o) => (
              <button
                key={o.id}
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => { e.preventDefault(); onChange(o); setQ(""); setOpen(false); }}
              >
                <span className="font-medium">{orderLabel(o)}</span>
                <span className="text-xs text-muted-foreground">{o.items.map((it) => it.name).join(", ").slice(0, 60) || "Tanpa item"}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
