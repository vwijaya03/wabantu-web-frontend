import type { Order } from "@/lib/api/orders";
import type { Warehouse } from "@/lib/api/inventory";

export type OrderLineWarehouse = {
  lineId: string;
  warehouseId: string;
};

export function warehouseNameMap(warehouses: Warehouse[]): Map<string, string> {
  return new Map(warehouses.map((w) => [w.id, w.name]));
}

export function warehouseLabel(
  warehouseId: string | undefined,
  names: Map<string, string>,
  defaultWarehouseId: string,
): string {
  const id = warehouseId || defaultWarehouseId;
  if (!id) return "Belum dipilih";
  return names.get(id) ?? "Gudang tidak diketahui";
}

export function formatOrderWarehouseSummary(
  order: Order,
  names: Map<string, string>,
  defaultWarehouseId: string,
): string {
  const labels = new Set<string>();
  for (const item of order.items) {
    labels.add(warehouseLabel(item.warehouseId, names, defaultWarehouseId));
  }
  const list = [...labels].filter((l) => l !== "Belum dipilih");
  if (list.length === 0) return defaultWarehouseId ? warehouseLabel("", names, defaultWarehouseId) : "";
  return list.join(", ");
}

export function normalizeLineWarehouses<T extends OrderLineWarehouse>(
  items: T[],
  fallbackWarehouseId: string,
): T[] {
  if (!fallbackWarehouseId) return items;
  return items.map((item) => ({
    ...item,
    warehouseId: item.warehouseId || fallbackWarehouseId,
  }));
}
