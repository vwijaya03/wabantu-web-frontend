/** Konten bantuan modul Persediaan — bahasa owner bisnis, dipakai tombol (?). */

export type InventoryHelpTopic =
  | "overview"
  | "stock"
  | "operations"
  | "operations-adjust"
  | "operations-transfer"
  | "operations-opening"
  | "operations-revalue"
  | "purchase-orders"
  | "bills"
  | "invoices"
  | "sales-returns"
  | "movements"
  | "warehouses"
  | "items"
  | "reports"
  | "maintenance"
  | "maintenance-recalc"
  | "maintenance-backfill"
  | "maintenance-valuation"
  | "settings"
  | "settings-costing"
  | "settings-block-negative"
  | "settings-cashflow"
  | "settings-acl"
  | "setup";

export interface InventoryHelpContent {
  title: string;
  what: string;
  useCases: string[];
  howTo?: string[];
  tips?: string[];
  relatedLinks?: Array<{ label: string; href: string }>;
}

export const INVENTORY_HELP: Record<InventoryHelpTopic, InventoryHelpContent> = {
  overview: {
    title: "Modul Persediaan — gambaran umum",
    what: "Modul ini melacak berapa barang yang Anda punya, berapa harga pokoknya (HPP), dan bagaimana stok berubah saat jual, beli, atau retur. Setelah setup selesai, pesanan yang diproses otomatis memotong stok dan mencatat HPP untuk laporan laba.",
    useCases: [
      "Tahu stok real-time sebelum menerima pesanan baru",
      "Hitung margin penjualan (harga jual − HPP)",
      "Catat pembelian ke supplier dan terima barang ke gudang",
      "Lacak retur barang dari pelanggan tanpa mengacaukan HPP",
    ],
    howTo: [
      "Owner: mulai dari Setup HPP → isi saldo awal → tandai setup selesai",
      "Staff: bisa lihat stok & laporan, tidak bisa mengubah",
    ],
    relatedLinks: [
      { label: "Setup HPP", href: "/dashboard/inventory/setup" },
      { label: "Panduan lengkap (Docs)", href: "/dashboard/docs?q=INVENTORY_MODULE" },
    ],
  },
  stock: {
    title: "Halaman Stok",
    what: "Ringkasan nilai persediaan dan daftar saldo per produk per gudang. Ini adalah “berapa yang ada sekarang” — bukan riwayat mutasi (itu di Kartu Stok).",
    useCases: [
      "Cek produk yang stoknya habis sebelum promosi",
      "Lihat nilai total persediaan untuk keputusan belanja",
      "Filter per gudang bila punya lebih dari satu lokasi",
    ],
    tips: [
      "Gunakan kartu “Panduan pemula” di atas untuk tahu langkah berikutnya yang disarankan",
      "Klik nama produk untuk membuka Kartu Stok (riwayat keluar-masuk)",
      "“Tersedia” = on hand dikurangi yang sudah direservasi (jika ada)",
      "Setup belum selesai? Banner kuning mengarahkan ke wizard setup",
    ],
    relatedLinks: [
      { label: "Penyesuaian Stok", href: "/dashboard/inventory/adjustments" },
      { label: "Kartu Stok", href: "/dashboard/inventory/movements" },
    ],
  },
  operations: {
    title: "Operasi Stok",
    what: "Empat jenis dokumen stok manual — masing-masing punya halaman sendiri: Penyesuaian, Transfer, Saldo Awal, dan Revaluasi HPP. Setiap halaman punya daftar transaksi (CRUD, cari, pagination) dan form buat baru.",
    useCases: [
      "Baru aktifkan modul → Saldo Awal",
      "Opname fisik → Penyesuaian ±",
      "Pindah gudang → Transfer",
      "Koreksi HPP tanpa ubah qty → Revaluasi",
    ],
    tips: [
      "Satu jenis dokumen = satu halaman menu (tidak digabung)",
      "Bisa pilih beberapa baris lalu hapus batch (owner)",
    ],
    relatedLinks: [
      { label: "Penyesuaian", href: "/dashboard/inventory/adjustments" },
      { label: "Transfer", href: "/dashboard/inventory/transfers" },
      { label: "Saldo Awal", href: "/dashboard/inventory/opening-balance" },
      { label: "Revaluasi", href: "/dashboard/inventory/revaluations" },
    ],
  },
  "operations-adjust": {
    title: "Penyesuaian ±",
    what: "Tambah atau kurangi stok secara manual dengan alasan. Dipakai saat opname, barang rusak/hilang, atau koreksi kecil — bukan untuk penjualan/pembelian rutin.",
    useCases: [
      "Stok fisik 95, sistem 100 → kurangi 5 dengan alasan “selisih opname”",
      "Sample gratis masuk gudang → tambah dengan harga pokok perkiraan",
    ],
    tips: [
      "Pengurangan dicek stok tersedia jika blokir stok minus aktif",
      "HPP keluar dihitung otomatis sesuai metode (FIFO/LIFO/Average)",
    ],
  },
  "operations-transfer": {
    title: "Transfer antar gudang",
    what: "Memindahkan qty dari satu gudang ke gudang lain. Nilai persediaan total tidak berubah — hanya lokasi stok yang bergeser.",
    useCases: [
      "Kirim barang dari gudang pusat ke toko cabang",
      "Pindahkan stok display ke gudang penyimpanan",
    ],
    tips: ["Konfirmasi dialog menampilkan ringkasan sebelum dieksekusi"],
  },
  "operations-opening": {
    title: "Saldo Awal",
    what: "Mengisi stok pertama kali saat mulai pakai modul persediaan. Setiap baris = produk + gudang + qty + harga pokok per unit. Item otomatis mulai dilacak stoknya.",
    useCases: [
      "Migrasi dari Excel/catatan manual ke WABantu",
      "Setelah setup HPP, sebelum memproses pesanan lama (backfill)",
      "Produk baru yang sudah ada fisik di gudang sebelum ada transaksi pembelian",
    ],
    howTo: [
      "Pilih gudang (default: Gudang Utama)",
      "Tambah baris per produk: qty dan harga pokok per unit",
      "Simpan — stok langsung tercatat sebagai movement saldo awal",
    ],
    tips: [
      "Backfill pesanan gagal “stok tidak cukup”? Isi saldo awal minimal sesuai saran di Pemeliharaan",
      "Harga pokok bisa perkiraan; bisa disesuaikan lewat revaluasi nanti",
    ],
  },
  "operations-revalue": {
    title: "Revaluasi HPP",
    what: "Mengubah harga pokok rata-rata tanpa mengubah jumlah stok. Berguna bila nilai persediaan di laporan perlu diselaraskan dengan kenyataan bisnis.",
    useCases: [
      "Koreksi HPP setelah kesalahan input saldo awal",
      "Penyesuaian nilai persediaan akhir periode (dengan persetujuan owner)",
    ],
    tips: [
      "Pratinjau selisih nilai ditampilkan sebelum konfirmasi",
      "Recalculate HPP di Pemeliharaan akan membangun ulang dari riwayat — revaluasi manual bisa hilang",
    ],
  },
  "purchase-orders": {
    title: "Purchase Order (PO)",
    what: "Dokumen rencana pembelian ke supplier. PO belum menambah stok — stok baru masuk saat Anda membuat Penerimaan (Bill).",
    useCases: [
      "Catat pesanan ke supplier sebelum barang datang",
      "Terima barang bertahap (partial) — qty diterima ter-update otomatis",
      "Tutup PO bila sisa tidak jadi diterima",
    ],
    howTo: [
      "Buat PO: supplier, gudang tujuan, baris item + qty + harga beli",
      "Saat barang datang → buat Bill dan pilih PO untuk prefill sisa",
    ],
    relatedLinks: [{ label: "Penerimaan (Bill)", href: "/dashboard/inventory/bills" }],
  },
  bills: {
    title: "Penerimaan Barang (Bill)",
    what: "Mencatat barang yang benar-benar diterima dari supplier. Stok bertambah dan HPP tercatat. Bisa dari PO atau input manual.",
    useCases: [
      "Barang supplier datang → stok naik, siap dijual",
      "Terima sebagian dari PO (partial receive)",
      "Pembelian tanpa PO (langsung terima barang)",
    ],
    tips: [
      "Mode akrual (default): biaya HPP muncul saat jual, bukan saat Bill",
      "Mode cashflow: pembelian langsung jadi biaya di finance saat Bill",
    ],
    relatedLinks: [{ label: "Pengaturan mode cashflow", href: "/dashboard/inventory/settings" }],
  },
  invoices: {
    title: "Faktur Penjualan",
    what: "Dokumen faktur formal dari pesanan, dengan snapshot HPP per baris. Berguna untuk arsip penjualan dan analisis margin per transaksi.",
    useCases: [
      "Buat faktur resmi setelah pesanan selesai",
      "Lihat berapa HPP per baris pada saat penjualan",
      "Satu pesanan = satu faktur (idempotent)",
    ],
    tips: ["Pendapatan & COGS operasional tetap mengikuti alur pesanan & pengaturan finance"],
  },
  "sales-returns": {
    title: "Retur Penjualan",
    what: "Pelanggan mengembalikan barang — stok masuk kembali ke gudang dengan HPP yang sama seperti saat dijual (bukan harga beli terbaru).",
    useCases: [
      "Produk cacat / salah kirim dikembalikan pelanggan",
      "Koreksi stok setelah retur tanpa mengacaukan perhitungan HPP",
    ],
    howTo: [
      "Pilih pesanan asal",
      "Tentukan qty retur per produk (maks = yang terjual)",
      "Simpan — stok naik, COGS disesuaikan (mode akrual)",
    ],
    tips: ["Pengembalian uang ke pelanggan ditangani terpisah di modul pesanan/finance"],
  },
  movements: {
    title: "Kartu Stok (Pergerakan)",
    what: "Buku besar semua mutasi stok: jual, beli, transfer, penyesuaian, saldo awal, retur. Setiap baris menampilkan qty dan HPP transaksi.",
    useCases: [
      "Audit: kenapa stok produk X turun?",
      "Bukti pergerakan untuk opname atau diskusi tim",
      "Filter per produk atau gudang",
    ],
    tips: ["Dari halaman Stok, klik nama produk untuk langsung filter kartu stok produk tersebut"],
  },
  warehouses: {
    title: "Gudang",
    what: "Lokasi fisik penyimpanan stok. Setiap baris pesanan/pembelian bisa menunjuk gudang tertentu. Gudang Utama dibuat otomatis saat modul aktif.",
    useCases: [
      "Pisahkan stok toko offline vs gudang online",
      "Multi cabang dengan stok terpisah per lokasi",
    ],
    tips: [
      "Gudang default dipakai bila pesanan tidak menyebut gudang spesifik",
      "Gudang default tidak bisa dihapus",
    ],
  },
  items: {
    title: "Konfigurasi Item",
    what: "Pengaturan per produk katalog: apakah stok dilacak, metode HPP (override), pelacakan batch/expiry, dan komponen bundle.",
    useCases: [
      "Aktifkan lacak stok hanya untuk produk fisik (jasa tidak perlu)",
      "Produk frozen pakai FIFO, produk umum ikut default Average",
      "Paket/bundle: stok diambil dari komponen di dalamnya",
    ],
    howTo: [
      "Cari produk → aktifkan “Lacak stok”",
      "Opsional: override metode HPP per item",
      "Bundle: tentukan komponen & qty per 1 paket",
    ],
    tips: ["Mengubah metode HPP per item memicu hitung ulang HPP item tersebut"],
  },
  reports: {
    title: "Laporan Persediaan",
    what: "Ringkasan nilai persediaan dan margin penjualan (pendapatan − HPP). Bisa diekspor CSV untuk Excel atau pembukuan.",
    useCases: [
      "Review bulanan: berapa nilai stok & margin kotor",
      "Export data untuk accountant atau investor",
    ],
    relatedLinks: [{ label: "Halaman Stok", href: "/dashboard/inventory" }],
  },
  maintenance: {
    title: "Pemeliharaan Persediaan",
    what: "Alat owner untuk perbaikan data: hitung ulang HPP dari riwayat, backfill pesanan lama, dan ringkasan nilai per gudang. Bukan untuk operasi harian.",
    useCases: [
      "HPP di laporan terlihat aneh setelah banyak transaksi",
      "Baru aktifkan modul tapi sudah ada pesanan lama yang committed",
      "Cek total nilai stok per gudang",
    ],
    tips: ["Hanya owner yang bisa menjalankan pemeliharaan"],
  },
  "maintenance-recalc": {
    title: "Recalculate HPP",
    what: "Membangun ulang lapisan biaya, saldo, dan HPP dari seluruh riwayat pergerakan. Dipakai bila angka HPP tidak konsisten.",
    useCases: [
      "Setelah ganti metode HPP default",
      "Koreksi massal setelah impor data bermasalah",
    ],
    tips: [
      "Revaluasi manual tidak dipertahankan — perlu diterapkan ulang jika masih relevan",
      "Proses bisa memakan waktu bila transaksi banyak",
    ],
  },
  "maintenance-backfill": {
    title: "Backfill Pesanan Lama",
    what: "Memotong stok retroaktif untuk pesanan yang sudah committed sebelum modul persediaan aktif. Preview dulu, lalu jalankan. Gagal per pesanan tidak menghentikan yang lain.",
    useCases: [
      "Sudah jual banyak pesanan sebelum setup → stok & HPP belum tercatat",
      "Setelah isi saldo awal, selaraskan stok dengan pesanan historis",
    ],
    howTo: [
      "Klik Preview — lihat berapa pesanan & mana yang stoknya kurang",
      "Isi saldo awal untuk item yang kurang (lihat tabel saran)",
      "Jalankan backfill lagi",
    ],
    tips: [
      "Error “stok tidak cukup” = saldo awal belum cukup, bukan bug sistem",
      "Qty saran saldo awal = jumlah kekurangan semua pesanan (bukan cukup pesanan terbesar saja)",
      "Preview ribuan pesanan? Lihat ringkasan + tabel saldo awal; detail pesanan dibatasi sampel",
      "Sistem tidak otomatis menyesuaikan stok — Anda yang mengisi saldo awal",
    ],
    relatedLinks: [{ label: "Saldo Awal", href: "/dashboard/inventory/opening-balance" }],
  },
  "maintenance-valuation": {
    title: "Nilai Persediaan per Gudang",
    what: "Ringkasan read-only: total nilai stok (qty × HPP) dikelompokkan per gudang.",
    useCases: ["Snapshot cepat sebelum rapat atau tutup buku", "Bandingkan proporsi stok antar gudang"],
  },
  settings: {
    title: "Pengaturan Persediaan",
    what: "Kebijakan global modul: metode HPP default, blokir stok minus, mode pengakuan biaya pembelian, dan ringkasan hak akses.",
    useCases: [
      "Tetapkan aturan main untuk seluruh tenant",
      "Staff hanya lihat, owner kelola penuh",
    ],
    relatedLinks: [{ label: "Setup HPP", href: "/dashboard/inventory/setup" }],
  },
  "settings-costing": {
    title: "Metode HPP Default",
    what: "Menentukan cara sistem menghitung harga pokok saat barang keluar (jual). Berlaku untuk item yang tidak punya override sendiri.",
    useCases: [
      "FIFO: cocok produk kedaluwarsa / frozen (yang lama keluar dulu)",
      "Average: sederhana & stabil untuk retail umum",
      "LIFO: jarang dipakai; untuk kasus khusus fluktuasi harga",
    ],
    tips: [
      "Wizard Setup merekomendasikan metode berdasarkan profil bisnis Anda",
      "Ganti metode → pertimbangkan Recalculate di Pemeliharaan",
    ],
  },
  "settings-block-negative": {
    title: "Blokir Stok Minus",
    what: "Jika aktif, sistem menolak pesanan atau operasi yang membuat stok di bawah nol. Mencegah oversell (jual barang yang tidak ada).",
    useCases: [
      "Toko fisik: wajib aktif agar tidak janji stok yang tidak ada",
      "Pre-order / made-to-order: bisa dimatikan dengan risiko oversell",
    ],
    tips: ["Disarankan tetap aktif untuk kebanyakan bisnis retail & F&B"],
  },
  "settings-cashflow": {
    title: "Mode Cashflow (Beli = Biaya Langsung)",
    what: "Mengatur kapan biaya pembelian muncul di finance. Nonaktif (akrual, disarankan): biaya = HPP saat barang terjual. Aktif: biaya saat Bill diterima.",
    useCases: [
      "Akrual: laporan laba-rugi lebih akurat (biaya mengikuti penjualan)",
      "Cashflow: cocok bila pembukuan sederhana berbasis kas keluar saat beli",
    ],
    tips: ["Jangan aktifkan bila Anda ingin margin penjualan akurat per transaksi"],
  },
  "settings-acl": {
    title: "Hak Akses (ACL)",
    what: "Owner & Super Admin bisa mengubah stok, PO, Bill, setting, dan pemeliharaan. Staff hanya bisa melihat stok, kartu stok, dan daftar dokumen.",
    useCases: [
      "Berikan akses lihat ke kasir tanpa risiko ubah HPP",
      "Owner tetap kontrol penuh kebijakan dan koreksi data",
    ],
  },
  setup: {
    title: "Setup HPP (Wizard)",
    what: "Langkah awal mengaktifkan modul: wawancara singkat tentang bisnis Anda, rekomendasi metode HPP (FIFO/LIFO/Average), lalu terapkan & tandai setup selesai. Setelah itu pesanan mulai memotong stok.",
    useCases: [
      "Pertama kali pakai modul persediaan",
      "Ganti strategi HPP setelah paham profil bisnis",
    ],
    howTo: [
      "Jawab pertanyaan wizard (atau chat wawancara)",
      "Terapkan rekomendasi metode HPP",
      "Isi saldo awal di Operasi Stok",
      "Tandai setup selesai",
    ],
    tips: [
      "Sebelum setup selesai, pesanan tidak memotong stok",
      "Kebijakan manual (blokir minus, cashflow) di halaman Pengaturan",
    ],
    relatedLinks: [
      { label: "Pengaturan", href: "/dashboard/inventory/settings" },
      { label: "Saldo Awal", href: "/dashboard/inventory/opening-balance" },
    ],
  },
};
