/** Langkah panduan pemula di halaman Stok — urutan disarankan untuk owner baru. */

export type InventoryGuideStep = {
  id: string;
  order: number;
  title: string;
  description: string;
  href: string;
  done: boolean;
  /** Langkah opsional (mis. backfill pesanan lama). */
  optional?: boolean;
};

export function buildInventoryGuideSteps(input: {
  setupCompleted: boolean;
  warehouseCount: number;
  stockRowCount: number;
}): InventoryGuideStep[] {
  const { setupCompleted, warehouseCount, stockRowCount } = input;

  return [
    {
      id: "setup",
      order: 1,
      title: "Aktifkan modul & pilih metode HPP",
      description:
        "Wizard singkat menentukan cara menghitung harga pokok (rata-rata, FIFO, atau LIFO) dan kebijakan stok minus.",
      href: "/dashboard/inventory/setup",
      done: setupCompleted,
    },
    {
      id: "warehouse",
      order: 2,
      title: "Pastikan gudang siap",
      description:
        "Setiap stok tercatat per lokasi. Tenant baru biasanya sudah punya gudang default — tambah lagi bila punya cabang.",
      href: "/dashboard/inventory/warehouses",
      done: warehouseCount > 0,
    },
    {
      id: "track-items",
      order: 3,
      title: "Aktifkan pelacakan stok per produk",
      description:
        "Pilih item katalog yang stoknya ingin dilacak. Item tanpa pelacakan tidak memotong stok saat pesanan diproses.",
      href: "/dashboard/inventory/items",
      done: stockRowCount > 0,
    },
    {
      id: "opening",
      order: 4,
      title: "Isi saldo awal stok",
      description:
        "Catat qty dan HPP awal per produk. Tanpa ini, laporan nilai persediaan akan kosong meski modul sudah aktif.",
      href: "/dashboard/inventory/opening-balance",
      done: stockRowCount > 0,
    },
    {
      id: "orders",
      order: 5,
      title: "Pahami alur pesanan & stok",
      description:
        "Pesanan Sedang diproses / Dalam pengiriman / Selesai otomatis memotong stok. Pastikan baris pesanan terhubung ke item katalog.",
      href: "/dashboard/orders",
      done: setupCompleted && stockRowCount > 0,
    },
    {
      id: "purchase",
      order: 6,
      title: "Catat pembelian (opsional)",
      description: "PO untuk rencana beli → Penerimaan saat barang datang agar stok & HPP naik otomatis.",
      href: "/dashboard/inventory/purchase-orders",
      done: false,
      optional: true,
    },
    {
      id: "backfill",
      order: 7,
      title: "Sinkronkan pesanan lama (jika perlu)",
      description:
        "Pesanan committed sebelum modul aktif belum memotong stok — jalankan backfill di Pemeliharaan.",
      href: "/dashboard/inventory/maintenance",
      done: false,
      optional: true,
    },
  ].sort((a, b) => a.order - b.order);
}

/** True when required (non-optional) steps are all done. */
export function inventoryGuideComplete(steps: InventoryGuideStep[]): boolean {
  return steps.filter((s) => !s.optional).every((s) => s.done);
}

/** Next recommended action for the owner. */
export function nextInventoryGuideStep(steps: InventoryGuideStep[]): InventoryGuideStep | undefined {
  return steps.find((s) => !s.done && !s.optional);
}
