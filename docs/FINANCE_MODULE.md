# Finance Module — Panduan untuk Owner & Tim CS

Modul keuangan terintegrasi di dalam dashboard WABantu.  
Bukan software akuntansi — ini **buku kas digital** yang mudah dipakai UMKM.

> Dokumentasi teknis (endpoint, schema, arsitektur): [`api-go/docs/FINANCE_MODULE.md`](../../api-go/docs/FINANCE_MODULE.md).

---

## Fitur yang tersedia

| Fitur | Halaman | Siapa bisa akses |
|-------|---------|-----------------|
| Dashboard ringkasan | `/dashboard/finance` | Owner + Staff |
| Catat transaksi | Tombol "+ Catat" (operasional saja) | Owner + Staff |
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
3. **Catat transaksi** — pemasukan, pengeluaran, transfer (bukan beli/jual/dividen investasi).
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
| Dividen | Penerimaan dividen (hanya dari menu Investasi, terhubung ke aset) | + saldo dompet |
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
2. **Catat Pembelian / Catat Penjualan** — menambah/mengurangi kepemilikan dan modal (bukan dari menu Transaksi umum).
3. **Catat Dividen** — penerimaan dividen terhubung ke aset (menambah Total Dividen + saldo dompet).
4. **Update Harga** — harga pasar manual; P&L unrealized dihitung setelah ada kepemilikan.

**Satuan default per tipe** (bisa diubah saat tambah aset):

| Tipe | Satuan qty | Harga per |
|------|------------|-----------|
| Saham | Lot (IDX) atau lembar | lembar |
| Emas | Gram (default), oz, kg | satuan yang dipilih |
| Reksa dana | Unit | unit (NAV) |
| Kripto | Koin | koin |
| Lainnya | Unit / pcs | satuan yang dipilih |

**Saham Indonesia:** 1 lot = 100 lembar. Harga diinput **per lembar** (mis. 1191,69).  
**Emas retail:** umumnya **gram** (Antam/Pegadaian), bukan lot.  
Biaya broker bisa **persen** (default beli 0,15% / jual 0,25% dari nilai transaksi) atau nominal.

**Catat Dividen** hanya dari menu Investasi (terhubung ke aset), bukan Catat Transaksi.

**Riwayat** pada kartu aset: hapus transaksi beli/jual yang salah sebelum menghapus aset.

WABantu **tidak** mengambil harga pasar otomatis dari bursa.

---

## Transaksi (daftar)

Semua transaksi termasuk **Beli/Jual Aset** muncul di `/dashboard/finance/transactions` dengan filter periode, jenis, status, dan **pencarian**.  
Owner bisa **ubah** (deskripsi/tanggal; investasi: qty/harga lewat menu Investasi) dan **hapus**.

---

## Catat Transaksi (sheet)

Form **Catat Transaksi** hanya untuk keuangan operasional: pemasukan, pengeluaran, transfer, bunga, cashback, penyesuaian.

- **Tidak menampilkan** Beli Aset, Jual Aset, atau Dividen (gunakan menu Investasi).
- **Kategori** tanpa grup Investasi (menghindari duplikasi dengan alur investasi).

---

## Dompet & rekening

Owner dapat **tambah, ubah** (nama, tipe, ikon, warna, visibilitas), **cari**, dan **hapus** dompet.

Dompet **tidak bisa dihapus** jika masih ada transaksi, aset investasi aktif, atau transaksi berulang yang memakai dompet tersebut.

Dashboard Finance menampilkan ikon dompet (sama seperti kartu di halaman Dompet).

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
- Satuan investasi (preset UI): `lib/finance/investment-units.ts`
- Ikon dompet: `lib/finance/wallet-icons.tsx`
- Cache invalidation: `lib/finance/utils.ts`
- Kuota & limit: [`LIMITS_AND_QUOTAS.md`](../LIMITS_AND_QUOTAS.md)

---

## Changelog UI

| Tanggal | Catatan |
|---------|---------|
| 2026-05-24 | Investasi: catat beli/jual, biaya %, lot/lembar, riwayat & hapus transaksi aset; Transaksi: search, edit, hapus, badge investasi; Dompet: guard hapus; Jenis transaksi: halaman CRUD; perbaikan Select & kategori duplikat |
| 2026-05-25 | Dompet: ubah/hapus/cari/ikon; Investasi: catat dividen, preset satuan per tipe; Catat Transaksi: pisah dari investasi, tanpa kategori investasi; dashboard: ikon saldo dompet; a11y SheetDescription |
