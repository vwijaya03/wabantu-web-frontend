# Persediaan & HPP — Panduan Pengguna (web-frontend)

Modul Persediaan membantu kamu melacak stok, harga pokok (HPP), pembelian, dan
penjualan. Backend: lihat `../api-go/docs/INVENTORY_MODULE.md`.

> Status UI bertahap. Bagian bertanda _(menyusul)_ dirilis di PR frontend berikutnya.

## Menu

Sidebar grup **Persediaan**:

| Menu | Halaman | Fungsi |
|------|---------|--------|
| **Stok** | `/dashboard/inventory` | Saldo stok & nilai persediaan per gudang |
| **Pergerakan** | `/dashboard/inventory/movements` | Kartu stok: semua mutasi + HPP per transaksi |
| **Gudang** | `/dashboard/inventory/warehouses` | Kelola lokasi gudang |
| **Setup HPP** | `/dashboard/inventory/setup` | Wizard metode HPP + aktivasi modul |

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

## Menyusul (PR frontend berikutnya)

- Penyesuaian stok (±), transfer antar gudang, saldo awal (form/CSV), revaluasi HPP.
- Purchase Order & Penerimaan Barang (Bill).
- Faktur & Retur Penjualan.
- Bundle (paket), config item (metode per item, batch/expiry).
- Laporan nilai persediaan & margin.
- Backfill stok pesanan lama.
