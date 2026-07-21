"use client";

import { useQuery } from "@tanstack/react-query";
import { inventoryApi } from "@/lib/api/inventory";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { tenantQueryKey } from "@/lib/query/tenant-query-key";

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
  const tenantKey = useTenantKey();
  const { data } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "inventory", "warehouses", "all"),
    queryFn: ({ signal }) => inventoryApi.listWarehouses({ all: true }, signal),
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
