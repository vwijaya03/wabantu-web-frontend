# Persediaan & HPP — Panduan Lengkap Owner Bisnis

Panduan ini menjelaskan **seluruh fitur modul Persediaan** di WABantu: untuk apa,
kapan dipakai, dan alur bisnis yang disarankan. Ditujukan untuk **owner bisnis**,
admin toko, dan tim operasional — bukan dokumentasi teknis developer.

Dokumentasi teknis API & database: [`../api-go/docs/INVENTORY_MODULE.md`](../api-go/docs/INVENTORY_MODULE.md).

Di aplikasi, setiap halaman Persediaan punya tombol **(?)** di samping judul untuk
ringkasan cepat. Panduan ini adalah versi lengkapnya.

---

## 1. Apa yang dimaksud modul ini?

Modul Persediaan membantu Anda:

| Kebutuhan bisnis | Fitur yang mendukung |
|------------------|----------------------|
| Tahu berapa stok sekarang | Halaman **Stok**, **Kartu Stok** |
| Tahu berapa modal per barang (HPP) | Metode HPP, **Laporan** margin |
| Beli dari supplier | **PO** → **Penerimaan (Bill)** |
| Jual ke pelanggan | Integrasi **Pesanan** (otomatis potong stok) |
| Barang dikembalikan | **Retur Penjualan** |
| Koreksi / opname / pindah gudang | **Operasi Stok** |
| Aktivasi pertama kali | **Setup HPP** + **Saldo Awal** |

**HPP** (Harga Pokok Penjualan) = biaya modal per unit barang yang terjual. **Margin** =
harga jual − HPP. Tanpa HPP yang benar, laporan laba tidak bisa dipercaya.

---

## 2. Menu & navigasi

Sidebar grup **Persediaan**:

| Menu | Halaman | Untuk apa? |
|------|---------|------------|
| **Stok** | `/dashboard/inventory` | Lihat saldo & nilai persediaan sekarang |
| **Operasi Stok** | `.../operations` | Penyesuaian, transfer, saldo awal, revaluasi |
| **Pembelian (PO)** | `.../purchase-orders` | Rencana beli ke supplier |
| **Penerimaan** | `.../bills` | Barang datang → stok masuk |
| **Faktur** | `.../invoices` | Faktur formal dari pesanan + HPP per baris |
| **Retur** | `.../sales-returns` | Barang kembali dari pelanggan |
| **Pergerakan** | `.../movements` | Kartu stok — semua riwayat mutasi |
| **Gudang** | `.../warehouses` | Kelola lokasi penyimpanan |
| **Konfigurasi Item** | `.../items` | Lacak stok, HPP per item, bundle |
| **Laporan** | `.../reports` | Nilai persediaan & margin, export CSV |
| **Pemeliharaan** | `.../maintenance` | Recalculate, backfill pesanan lama |
| **Pengaturan** | `.../settings` | Kebijakan global & hak akses |
| **Setup HPP** | `.../setup` | Wizard aktivasi modul |

---

## 3. Langkah pertama (checklist owner)

### 3.1 Sebelum pesanan memotong stok

1. **Setup HPP** (`/dashboard/inventory/setup`)
   - Jawab wizard / wawancara singkat tentang bisnis Anda
   - Terapkan rekomendasi metode HPP (FIFO / LIFO / Average)
   - **Tandai setup selesai** — mulai titik ini pesanan committed memotong stok

2. **Gudang** — cek **Gudang Utama** (otomatis ada). Tambah gudang bila multi lokasi.

3. **Konfigurasi Item** — aktifkan **Lacak stok** untuk produk fisik yang ingin dilacak.

4. **Saldo Awal** (`Operasi Stok → Saldo Awal`) — isi qty & harga pokok per produk yang
   sudah ada di gudang **sebelum** modul aktif.

5. **Backfill** (opsional, `Pemeliharaan`) — jika sudah ada pesanan lama yang selesai
   sebelum setup, jalankan backfill setelah saldo awal cukup.

### 3.2 Setelah aktif

- Pesanan berstatus *diproses / dikirim / selesai / dibayar / dikonfirmasi* → stok keluar otomatis
- Pesanan *dibatalkan* → stok kembali otomatis
- Badge **"Stok kurang"** di halaman Pesanan jika stok tidak cukup (bila blokir minus aktif)

---

## 4. Metode HPP — pilih yang cocok

| Metode | Cara kerja (sederhana) | Cocok untuk |
|--------|------------------------|-------------|
| **FIFO** | Barang masuk paling dulu keluar dulu | Frozen food, produk kedaluwarsa, batch |
| **Average** | Rata-rata tertimbang semua pembelian | Retail umum, volume tinggi, harga stabil |
| **LIFO** | Barang masuk terakhir keluar dulu | Kasus khusus (jarang dipakai UKM) |

- **Default tenant** di Pengaturan; bisa **override per item** di Konfigurasi Item
- Ganti metode → pertimbangkan **Recalculate HPP** di Pemeliharaan

Wizard Setup merekomendasikan metode berdasarkan jawaban Anda (perishable, batch, volatilitas harga, dll.).

---

## 5. Pengaturan penting

### 5.1 Blokir stok minus (disarankan: **aktif**)

- **Aktif**: pesanan ditolak jika stok tidak cukup → mencegah oversell
- **Nonaktif**: stok boleh minus (risiko janji barang yang tidak ada)

### 5.2 Mode cashflow vs akrual

| | Mode akrual (default, disarankan) | Mode cashflow |
|---|-----------------------------------|---------------|
| Saat terima barang (Bill) | Nilai persediaan naik, **tanpa** biaya langsung | Biaya langsung tercatat |
| Saat jual | **HPP / COGS** tercatat | Tidak ada COGS terpisah |
| Laporan laba | Lebih akurat per penjualan | Lebih mirip “kas keluar saat beli” |

Kebanyakan bisnis retail & F&B sebaiknya pakai **akrual (cashflow nonaktif)**.

### 5.3 Hak akses

| Peran | Bisa apa |
|-------|----------|
| **Owner / Super Admin** | Semua: ubah stok, PO, Bill, setting, pemeliharaan |
| **Staff** | Lihat stok, kartu stok, daftar PO/Bill/faktur — **tidak bisa mengubah** |

---

## 6. Fitur per halaman (detail & use case)

### 6.1 Stok (`/dashboard/inventory`)

**Fungsi:** KPI nilai persediaan, jumlah baris, produk habis; tabel saldo per produk × gudang.

**Use case:**
- Cek stok sebelum promo WhatsApp
- Lihat HPP/unit dan nilai total per baris
- Filter gudang untuk cabang tertentu

**Kolom penting:**
- **On hand** = qty fisik di sistem
- **Tersedia** = on hand − reserved (jika ada)
- **HPP/unit** = harga pokok rata-rata saat ini
- **Nilai** = on hand × HPP

---

### 6.2 Operasi Stok (`/dashboard/inventory/operations`)

Empat tab:

#### Penyesuaian ±
- **Untuk:** opname, barang rusak/hilang, koreksi kecil
- **Bukan untuk:** penjualan (otomatis dari pesanan) atau pembelian (dari Bill)
- Wajib **alasan** saat kurangi stok (audit)

#### Transfer
- **Untuk:** pindah qty antar gudang tanpa mengubah nilai total persediaan
- Contoh: pusat → toko cabang

#### Saldo Awal
- **Untuk:** mengisi stok pertama kali / migrasi dari catatan manual
- Setiap baris: produk + gudang + qty + harga pokok
- Item otomatis mulai **lacak stok**
- **Edit transaksi lama:** modal `StockTransactionEditDialog` — header tetap, isi scroll; tombol tutup (X) tidak ikut scroll (`DialogContent` tanpa `overflow-y-auto` di root). Setiap baris saldo awal ditampilkan sebagai kartu terpisah.

> Detail UI katalog: [CATALOG_MODULE.md](./CATALOG_MODULE.md)

#### Revaluasi HPP
- **Untuk:** ubah HPP tanpa ubah qty (koreksi nilai persediaan)
- Ada pratinjau selisih sebelum simpan

---

### 6.3 Purchase Order (`/dashboard/inventory/purchase-orders`)

**Fungsi:** dokumen **rencana** beli — **belum** menambah stok.

**Alur:** Buat PO → supplier kirim barang → buat **Bill** (penerimaan)

**Status:** Terbuka → Sebagian diterima → Diterima penuh / Tutup / Batal

**Use case:** catat komitmen beli, terima bertahap (partial receive)

---

### 6.4 Penerimaan / Bill (`/dashboard/inventory/bills`)

**Fungsi:** barang **benar-benar diterima** → stok **bertambah**, HPP tercatat.

- Bisa dari PO (prefill sisa) atau manual
- Per baris: gudang, qty, harga beli, batch/expiry (jika diaktifkan)

---

### 6.5 Faktur (`/dashboard/inventory/invoices`)

**Fungsi:** faktur formal `WINV-...` dari pesanan dengan snapshot HPP per baris.

**Use case:** arsip penjualan, analisis margin per transaksi. Satu pesanan = satu faktur.

---

### 6.6 Retur Penjualan (`/dashboard/inventory/sales-returns`)

**Fungsi:** pelanggan kembalikan barang → stok masuk dengan **HPP asli saat dijual**.

**Use case:** produk cacat, salah kirim, retur toko

**Validasi:** qty retur ≤ qty yang pernah terjual

**Catatan:** pengembalian **uang** ke pelanggan ditangani terpisah (pesanan/finance).

---

### 6.7 Kartu Stok / Pergerakan (`/dashboard/inventory/movements`)

**Fungsi:** buku besar semua mutasi — jual, beli, transfer, penyesuaian, saldo awal, retur.

**Use case:** audit “kenapa stok turun?”, bukti untuk opname

Filter: produk, gudang, tipe movement

---

### 6.8 Gudang (`/dashboard/inventory/warehouses`)

**Fungsi:** kelola lokasi stok. **Gudang Utama** otomatis dibuat.

- Default dipakai bila pesanan tidak menyebut gudang
- Gudang default tidak bisa dihapus

---

### 6.9 Konfigurasi Item (`/dashboard/inventory/items`)

Per produk katalog:

| Setting | Fungsi |
|---------|--------|
| **Lacak stok** | Ikut dipotong saat pesanan (wajib untuk produk fisik) |
| **Metode HPP** | Ikut default atau override FIFO/LIFO/Average |
| **Batch / expiry / serial** | Pelacakan tambahan |
| **Bundle** | Paket jual — stok diambil dari komponen di dalamnya |

**Bundle:** parent tidak punya stok sendiri; sistem mengambil stok dari SKU anak.

---

### 6.10 Laporan (`/dashboard/inventory/reports`)

- Nilai persediaan
- Margin penjualan (revenue − HPP)
- Export **CSV** untuk Excel / accountant

---

### 6.11 Pemeliharaan (`/dashboard/inventory/maintenance`) — owner only

#### Recalculate HPP
- Bangun ulang HPP dari riwayat movement
- Pakai bila angka HPP “kacau”
- **Revaluasi manual tidak dipertahankan** setelah recalculate

#### Backfill Pesanan Lama
- Potong stok **retroaktif** untuk pesanan committed sebelum modul aktif
- **Preview dulu** → lihat detail kekurangan stok per pesanan
- Jika gagal “stok tidak cukup”: isi **saldo awal** (sistem menampilkan saran qty minimal), lalu ulangi
- **Tidak ada penyesuaian otomatis** — Anda yang mengisi saldo awal (aman untuk audit)

#### Nilai per Gudang
- Ringkasan read-only nilai stok per gudang

---

### 6.12 Setup HPP (`/dashboard/inventory/setup`)

Wizard + wawancara AI (dengan fallback aturan) untuk:
1. Memahami profil bisnis (frozen, retail, volatilitas harga, dll.)
2. Rekomendasi metode HPP
3. Terapkan & aktivasi modul

**Gate aktivasi:** wawancara selesai + rekomendasi diterapkan sebelum “Setup selesai”.

Kebijakan manual (blokir minus, cashflow) di **Pengaturan** — dipisahkan dari wizard.

---

## 7. Integrasi dengan Pesanan

| Status pesanan | Efek stok |
|----------------|-----------|
| Diproses, dikirim, selesai, dibayar, dikonfirmasi | Stok **keluar** (sale) |
| Draft, dibatalkan | Stok **kembali** (jika sempat keluar) |

- **Bundle** di pesanan: stok komponen yang dikurangi
- **Per baris gudang:** tiap item bisa dari gudang berbeda
- **Blokir minus aktif:** ubah status ke committed ditolak jika stok kurang

---

## 8. Integrasi WhatsApp / AI

Setelah setup selesai, balasan AI produk bisa menampilkan **stok tersedia** untuk item yang dilacak — membantu CS tidak menjanjikan barang habis.

---

## 9. Skenario umum (playbook)

### Skenario A — Baru mulai pakai WABantu, sudah punya barang di gudang
1. Setup HPP → terapkan metode
2. Konfigurasi Item → lacak stok untuk produk fisik
3. Saldo awal semua qty
4. Setup selesai
5. (Opsional) Backfill jika ada pesanan lama committed

### Skenario B — Beli rutin dari supplier
1. Buat PO saat order ke supplier
2. Saat barang datang → Bill (partial boleh)
3. Stok naik, siap dijual lewat pesanan

### Skenario C — Stok habis tapi pesanan masuk
1. Cek halaman Stok / badge di Pesanan
2. Buat Bill (restock) atau Saldo awal / penyesuaian +
3. Proses pesanan

### Skenario D — Opname bulanan
1. Hitung fisik vs sistem di halaman Stok
2. Operasi Stok → Penyesuaian ± dengan alasan “opname [bulan]”

### Skenario E — HPP di laporan aneh
1. Cek Kartu Stok produk bermasalah
2. Pemeliharaan → Recalculate HPP
3. Jika perlu koreksi nilai tanpa ubah qty → Revaluasi

---

## 10. Glosarium

| Istilah | Arti |
|---------|------|
| **HPP / COGS** | Harga pokok penjualan — biaya modal barang terjual |
| **On hand** | Jumlah stok di sistem |
| **Movement** | Satu baris perubahan stok di buku besar |
| **PO** | Purchase Order — rencana beli |
| **Bill / GRN** | Penerimaan barang — stok masuk |
| **Backfill** | Sinkronisasi stok untuk pesanan historis |
| **Bundle** | Paket produk — stok dari komponen |
| **Akrual** | Biaya HPP saat jual (default) |
| **Cashflow** | Biaya saat beli (mode alternatif) |

---

## 11. Bantuan di aplikasi

- Tombol **(?)** di judul halaman Persediaan → penjelasan singkat + use case
- Tombol **(?)** di pengaturan & kartu pemeliharaan → penjelasan per fitur
- **Docs Hub** (super admin): `/dashboard/docs` → cari `INVENTORY_MODULE`

---

*Terakhir diperbarui: modul Persediaan F1–F9 + setup wawancara + backfill dengan panduan kekurangan stok.*
