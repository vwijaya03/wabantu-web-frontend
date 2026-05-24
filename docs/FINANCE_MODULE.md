# Finance Module — Panduan untuk Owner & Tim CS

Modul keuangan terintegrasi di dalam dashboard WABantu.  
Bukan software akuntansi — ini **buku kas digital** yang mudah dipakai UMKM.

> Dokumentasi teknis (endpoint, schema, arsitektur): [`api-go/docs/FINANCE_MODULE.md`](../../api-go/docs/FINANCE_MODULE.md).

---

## Fitur yang tersedia

| Fitur | Halaman | Siapa bisa akses |
|-------|---------|-----------------|
| Dashboard ringkasan | `/dashboard/finance` | Owner + Staff |
| Catat transaksi | Tombol "+ Catat" (mana saja) | Owner + Staff |
| Dompet & saldo | `/dashboard/finance/wallets` | Owner (kelola) + Staff (lihat) |
| Kategori | Saat input transaksi | Owner (kelola) + Staff (lihat) |
| Anggaran bulanan | `/dashboard/finance/budget` | Owner (kelola) + semua (lihat) |
| Investasi & aset | `/dashboard/finance/investment` | Owner saja |
| Jenis transaksi | `/dashboard/finance/transaction-types` | Owner saja |
| Transaksi berulang | `/dashboard/finance/recurring` | Owner saja |
| Checklist harian | `/dashboard/finance/checklist` | Owner + Staff |
| Laporan & export | `/dashboard/finance/reports` | Owner + Staff |
| Persetujuan transaksi | Tab "Menunggu" di Transaksi | Owner (approve/reject) |
| Kunci periode | Di halaman Transaksi | Owner saja |
| Log audit | Riwayat perubahan | Owner saja |

---

## Cara mulai (untuk owner baru)

1. **Buat dompet** di `/dashboard/finance/wallets` — minimal 1 dompet Kas Tunai (sudah ada secara default).
2. **Isi saldo awal** yang benar saat membuat dompet.
3. **Catat transaksi** — gunakan tombol "+" di pojok kanan atas (tersedia di semua halaman Finance).
4. **Set anggaran** di `/dashboard/finance/budget` untuk memantau pengeluaran per kategori.
5. **Lihat laporan** di `/dashboard/finance/reports` untuk ringkasan bulan ini.

---

## Jenis transaksi

| Jenis | Arti | Efek saldo |
|-------|------|------------|
| Pemasukan | Uang masuk ke dompet | + saldo dompet |
| Pengeluaran | Uang keluar dari dompet | - saldo dompet |
| Transfer | Pindah antar dompet sendiri | - saldo asal, + saldo tujuan |
| Beli Aset | Beli investasi | - saldo dompet |
| Jual Aset | Jual investasi | + saldo dompet |
| Dividen | Penerimaan dividen | + saldo dompet |
| Bunga | Bunga tabungan | + saldo dompet |
| Cashback | Cashback pembayaran | + saldo dompet |
| Penyesuaian | Koreksi saldo (owner only) | + atau - |

---

## Approval workflow (persetujuan)

Bisa diaktifkan di Settings Finance:
- **Nonaktif (default):** semua transaksi langsung masuk sebagai "Disetujui".
- **Aktif:** transaksi yang dibuat staff → status "Menunggu Persetujuan" → owner approve/reject.
- Bisa set batas jumlah — mis. hanya transaksi ≥ Rp 500.000 yang perlu approval.

---

## Kunci periode

Owner bisa mengunci bulan yang sudah selesai agar tidak ada yang bisa edit/hapus transaksi di bulan itu.  
Berguna untuk tutup buku akhir bulan.

---

## Investasi & aset

Alur yang benar:

1. **Tambah Aset** — hanya mendaftarkan instrumen (nama, ticker, dompet).
2. **Catat Pembelian / Catat Penjualan** — menambah/mengurangi lot dan modal (bukan dari menu Transaksi umum).
3. **Update Harga** — harga pasar manual per lembar; P&L unrealized dihitung setelah ada kepemilikan.

**Saham Indonesia:** 1 lot = 100 lembar. Harga diinput **per lembar** (mis. 1191,69).  
Biaya broker bisa **persen** (default beli 0,15% / jual 0,25% dari nilai transaksi) atau nominal.

**Riwayat** pada kartu aset: hapus transaksi beli/jual yang salah sebelum menghapus aset.

WABantu **tidak** mengambil harga pasar otomatis dari bursa.

---

## Transaksi (daftar)

Semua transaksi termasuk **Beli/Jual Aset** muncul di `/dashboard/finance/transactions` dengan filter periode, jenis, status, dan **pencarian**.  
Owner bisa **ubah** (deskripsi/tanggal; investasi: qty/harga lewat menu Investasi) dan **hapus**.

---

## Dompet & rekening

Dompet **tidak bisa dihapus** jika masih ada transaksi, aset investasi aktif, atau transaksi berulang yang memakai dompet tersebut.

---

## Export laporan

Format tersedia: **CSV** (buka di Excel/Sheets) dan **PDF** (untuk print/kirim).  
Export berjalan di background — status bisa dicek di halaman Laporan.

---

## Pertanyaan umum (CS)

**Q: Saldo dompet tidak sesuai?**  
→ Pastikan semua transaksi sudah di-approve. Transaksi "Menunggu" tidak mempengaruhi saldo.

**Q: Transaksi bisa dihapus/diedit?**  
→ Owner bisa menghapus/mengedit selama periode belum dikunci. Staff hanya bisa edit draft milik sendiri.

**Q: Investasi di sini = invest pakai uang WABantu?**  
→ Tidak. Ini hanya **pencatatan** investasi yang dimiliki bisnis — tidak ada koneksi ke broker/aplikasi investasi.

**Q: Data keuangan tenant lain bisa dilihat?**  
→ Tidak. Setiap tenant punya data terpisah di database (schema isolasi).

---

## Referensi teknis

- Dokumentasi endpoint lengkap: [`api-go/docs/FINANCE_MODULE.md`](../../api-go/docs/FINANCE_MODULE.md)
- API client frontend: `lib/api/finance.ts`
- Komponen input transaksi: `components/finance/add-transaction-sheet.tsx`
- Cache invalidation: `lib/finance/utils.ts`
- Kuota & limit: [`LIMITS_AND_QUOTAS.md`](../LIMITS_AND_QUOTAS.md)

---

## Changelog UI

| Tanggal | Catatan |
|---------|---------|
| 2026-05-24 | Investasi: catat beli/jual, biaya %, lot/lembar, riwayat & hapus transaksi aset; Transaksi: search, edit, hapus, badge investasi; Dompet: guard hapus; Jenis transaksi: halaman CRUD; perbaikan Select & kategori duplikat |
