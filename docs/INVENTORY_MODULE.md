# Persediaan & HPP — Panduan Pengguna (web-frontend)

Modul Persediaan membantu kamu melacak stok, harga pokok (HPP), pembelian, dan
penjualan. Backend: lihat `../api-go/docs/INVENTORY_MODULE.md`.

> Status UI bertahap. Bagian bertanda _(menyusul)_ dirilis di PR frontend berikutnya.

## Menu

Sidebar grup **Persediaan**:

| Menu | Halaman | Fungsi |
|------|---------|--------|
| **Stok** | `/dashboard/inventory` | KPI (nilai persediaan, stok habis) + saldo per gudang |
| **Operasi Stok** | `/dashboard/inventory/operations` | Penyesuaian ±, transfer, saldo awal, revaluasi HPP |
| **Pembelian (PO)** | `/dashboard/inventory/purchase-orders` | Rencana beli ke supplier (partial receive) |
| **Penerimaan** | `/dashboard/inventory/bills` | Terima barang → stok masuk (bisa dari PO) |
| **Faktur** | `/dashboard/inventory/invoices` | Faktur dari pesanan + HPP per baris |
| **Retur** | `/dashboard/inventory/sales-returns` | Retur penjualan → stok kembali (HPP asli) |
| **Pergerakan** | `/dashboard/inventory/movements` | Kartu stok: semua mutasi + HPP per transaksi |
| **Gudang** | `/dashboard/inventory/warehouses` | Kelola lokasi gudang |
| **Konfigurasi Item** | `/dashboard/inventory/items` | Track stok, metode HPP per item, bundle, batch/expiry |
| **Pemeliharaan** | `/dashboard/inventory/maintenance` | Recalculate HPP, backfill pesanan lama, nilai per gudang |
| **Setup HPP** | `/dashboard/inventory/setup` | Wizard metode HPP + aktivasi modul |

## Operasi Stok (UX)

Halaman **Operasi Stok** menyatukan 4 aksi dengan pola aman:
- **Penyesuaian ±**: pilih tambah/kurangi, wajib isi **alasan** (audit), tampil stok &
  peringatan bila melebihi stok.
- **Transfer**: alur gudang asal → tujuan dengan **dialog konfirmasi** ("Transfer N X
  dari A ke B?").
- **Saldo Awal**: input banyak baris sekaligus; item otomatis mulai dilacak.
- **Revaluasi HPP**: tampil **pratinjau selisih** nilai + dialog konfirmasi sebelum disimpan.

## Langkah pertama (owner)

1. **Setup HPP** → jawab wizard → terapkan metode (FIFO / LIFO / Average).
   - FIFO: barang lama keluar dulu (cocok produk kedaluwarsa, mis. frozen).
   - Average: rata-rata tertimbang (sederhana, stabil).
2. Atur kebijakan:
   - **Blokir stok minus** (disarankan aktif): pesanan ditolak jika stok kurang.
   - **Mode cashflow**: aktif = beli langsung jadi biaya (tanpa COGS saat jual);
     nonaktif (disarankan) = nilai persediaan naik saat beli, biaya muncul sebagai
     HPP saat barang terjual (laba-rugi akurat).
3. **Gudang** → tambah gudang bila lebih dari satu (gudang utama otomatis ada).
4. Isi **saldo awal** stok _(menyusul: form/CSV)_.
5. **Tandai Setup Selesai** → mulai saat itu, pesanan berstatus *diproses* otomatis
   memotong stok dan mencatat HPP.

## Catatan penting

- Sebelum setup selesai, alur pesanan **tidak berubah** (tidak ada pemotongan stok).
- Stok hanya dihitung untuk item yang diaktifkan pelacakannya _(menyusul: toggle di Katalog)_.
- Pesanan dibatalkan → stok kembali otomatis.

## Pembelian → Penerimaan

- **Pembelian (PO)**: buat rencana beli (supplier, gudang, baris item + harga). Status:
  Terbuka → Sebagian diterima → Diterima penuh; bisa Tutup/Batal.
- **Penerimaan (Bill)**: terima barang. Pilih PO untuk prefill sisa, atau input manual.
  Saat disimpan: **stok bertambah + HPP tercatat**, qty diterima PO ter-update otomatis.

## Faktur & Retur

- **Faktur**: pilih pesanan → buat faktur (`WINV-...`) dengan snapshot HPP per baris.
- **Retur**: pilih pesanan → tentukan qty retur per produk → stok masuk kembali dengan
  **HPP asli** dari penjualan. Validasi qty ≤ yang terjual.

## Konfigurasi Item

Halaman **Konfigurasi Item** (per produk katalog):
- **Lacak stok**: aktifkan agar item ikut dipotong saat pesanan.
- **Metode HPP**: ikuti default tenant atau override FIFO/LIFO/Average (mengubah → recalculate item).
- **Batch / expiry / serial**: aktifkan pelacakan tambahan.
- **Bundle**: tetapkan komponen SKU anak (stok diambil dari komponen).

## Pemeliharaan

Halaman **Pemeliharaan** (owner):
- **Recalculate HPP**: bangun ulang lapisan biaya & saldo dari riwayat (bila HPP kacau).
  Revaluasi manual tidak dipertahankan.
- **Backfill Pesanan Lama**: potong stok retroaktif untuk pesanan committed sebelum modul aktif
  (Preview dulu → Jalankan).
- **Nilai Persediaan per Gudang**: ringkasan nilai stok.

## Status

Modul persediaan UI lengkap: setup, stok, operasi, PO/Bill, faktur/retur, konfigurasi item,
pemeliharaan. Integrasi mendalam di halaman Pesanan (badge stok inline) = enhancement opsional.
