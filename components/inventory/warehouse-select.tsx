"use client";

import { useQuery } from "@tanstack/react-query";
import { inventoryApi } from "@/lib/api/inventory";

export function WarehouseSelect({
  value,
  onChange,
  exclude,
  placeholder = "Pilih gudang...",
  className,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  exclude?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { data } = useQuery({
    queryKey: ["inventory", "warehouses", "all"],
    queryFn: () => inventoryApi.listWarehouses({ all: true }),
    staleTime: 60_000,
  });
  const warehouses = (data?.warehouses ?? []).filter((w) => w.id !== exclude && !w.isDeleted && w.isActive);
  return (
    <select
      className={
        className ?? "h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      }
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {warehouses.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name}
          {w.isDefault ? " (default)" : ""}
        </option>
      ))}
    </select>
  );
}
