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
  /** Penjelasan langkah demi langkah untuk halaman panduan lengkap. */
  details?: string[];
};

export const INVENTORY_GUIDE_INTRO =
  "Modul persediaan WABantu melacak stok, menghitung HPP, dan menyinkronkan pesanan. Ikuti urutan di bawah sekali saat pertama kali — setelah itu cukup operasikan sehari-hari dari menu Persediaan.";

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
      details: [
        "Buka menu Persediaan → Setup HPP.",
        "Jawab pertanyaan wizard (bisa pakai tombol jawaban cepat) atau langsung pilih metode HPP.",
        "Baca rekomendasi metode — rata-rata paling sederhana untuk pemula.",
        "Terapkan rekomendasi lalu tandai setup selesai.",
        "Setelah ini, pesanan yang diproses bisa memotong stok otomatis.",
      ],
    },
    {
      id: "warehouse",
      order: 2,
      title: "Pastikan gudang siap",
      description:
        "Setiap stok tercatat per lokasi. Tenant baru biasanya sudah punya gudang default — tambah lagi bila punya cabang.",
      href: "/dashboard/inventory/warehouses",
      done: warehouseCount > 0,
      details: [
        "Buka Persediaan → Gudang.",
        "Pastikan ada minimal satu gudang aktif (biasanya “Utama”).",
        "Tambah gudang baru jika stok disimpan di lokasi berbeda (toko, gudang pusat, cabang).",
        "Tandai satu gudang sebagai default bila perlu.",
      ],
    },
    {
      id: "track-items",
      order: 3,
      title: "Aktifkan pelacakan stok per produk",
      description:
        "Pilih item katalog yang stoknya ingin dilacak. Item tanpa pelacakan tidak memotong stok saat pesanan diproses.",
      href: "/dashboard/inventory/items",
      done: stockRowCount > 0,
      details: [
        "Buka Persediaan → Konfigurasi Item.",
        "Cari produk dari katalog yang ingin dilacak stoknya.",
        "Aktifkan pelacakan stok (track stock) untuk item tersebut.",
        "Opsional: override metode HPP per item jika berbeda dari default tenant.",
        "Produk bundle: stok dihitung dari komponen anak — pastikan komponen juga dilacak.",
      ],
    },
    {
      id: "opening",
      order: 4,
      title: "Isi saldo awal stok",
      description:
        "Catat qty dan HPP awal per produk. Tanpa ini, laporan nilai persediaan akan kosong meski modul sudah aktif.",
      href: "/dashboard/inventory/opening-balance",
      done: stockRowCount > 0,
      details: [
        "Buka Persediaan → Saldo Awal.",
        "Tambah baris per produk: pilih SKU, gudang, qty, dan HPP per unit.",
        "Bisa unggah banyak baris sekaligus dalam satu dokumen saldo awal.",
        "Setelah disimpan, cek halaman Stok — nilai persediaan harus terisi.",
      ],
    },
    {
      id: "orders",
      order: 5,
      title: "Pahami alur pesanan & stok",
      description:
        "Pesanan Sedang diproses / Dalam pengiriman / Selesai otomatis memotong stok. Pastikan baris pesanan terhubung ke item katalog.",
      href: "/dashboard/orders",
      done: setupCompleted && stockRowCount > 0,
      details: [
        "Saat membuat pesanan, pilih item dari katalog (bukan nama bebas tanpa SKU).",
        "Status Draft belum memotong stok.",
        "Status Sedang diproses, Dalam pengiriman, atau Selesai memotong stok (committed).",
        "Jika stok tidak cukup dan blokir stok minus aktif, sistem menolak perubahan status.",
        "Cek Pergerakan Stok untuk melihat riwayat keluar masuk per produk.",
      ],
    },
    {
      id: "purchase",
      order: 6,
      title: "Catat pembelian (opsional)",
      description: "PO untuk rencana beli → Penerimaan saat barang datang agar stok & HPP naik otomatis.",
      href: "/dashboard/inventory/purchase-orders",
      done: false,
      optional: true,
      details: [
        "Buat Pembelian (PO) sebagai rencana — belum menambah stok.",
        "Saat barang datang, buat Penerimaan (Bill) dari PO atau langsung.",
        "Penerimaan menambah stok dan memperbarui HPP sesuai metode yang dipilih.",
        "Opsional: hubungkan dengan modul Finance jika pembelian dicatat sebagai biaya.",
      ],
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
      details: [
        "Buka Persediaan → Pemeliharaan → Backfill Pesanan Lama.",
        "Klik Preview untuk melihat berapa pesanan yang belum sinkron.",
        "Pastikan stok cukup (atau isi saldo awal) sebelum menjalankan backfill.",
        "Jalankan backfill untuk memotong stok retroaktif + mencatat COGS.",
      ],
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
