# Modul Acara & Terapi — Panduan Penggunaan

Panduan untuk **owner toko** dan tim operasional yang mengelola acara terapi (pendaftaran pasien, jadwal slot, staf, penugasan).

> Dokumentasi teknis API & database: [`api-go/docs/EVENTS_MODULE.md`](../../api-go/docs/EVENTS_MODULE.md).

---

## Di mana fitur ini?

| Menu | URL |
|------|-----|
| Daftar acara | `/dashboard/events` |
| Detail acara (semua tab) | `/dashboard/events/{eventId}` |
| Kontak (data pasien) | `/dashboard/contacts` |
| Master terapi / tugas / peran relawan | `/dashboard/events/masters` |
| Pendaftaran publik pasien | `/register/{slug-toko}/{slug-acara}` |
| Jadwal pasien publik | `/jadwal/{slug-toko}/{slug-acara}` |
| Pantau staf publik | `/monitor/{slug-toko}/{slug-acara}` |

Hanya **owner** (atau super admin yang memantau tenant) yang bisa mengubah data. Staff bisa melihat sesuai kebijakan auth tenant.

---

## Alur kerja disarankan

### Pertama kali (setup tim & kontak)

1. **Contacts** — untuk setiap pasien yang sering datang, isi **Nama**, **Nomor HP**, dan **Tanggal lahir**. Tanpa tanggal lahir, pendaftaran dari kontak ke acara akan ditolak.
2. **Acara pertama** — tambah **Staf** (terapis, relawan, dll.). Centang **Simpan ke roster staf** (default aktif).
3. Atau setelah acara terisi: tab **Staf** → **Simpan staf acara ini ke roster**.
4. **Pengaturan Terapi** — atur slot (lihat bagian di bawah).
5. Tab **Jadwal** → **Generate slot** per terapi.

### Acara berikutnya (tanpa isi ulang)

1. **Buat acara baru** — centang **Import staf dari roster** (default aktif) → tim langsung masuk.
2. **Pasien** — **Tambah pasien** → pilih dari **Contacts**, pilih terapi, simpan.
3. Duplikat acara (tombol **Duplikat** di header) menyalin staf, pasien, dan pengaturan terapi dari acara lain (bukan slot).

---

## Tab di detail acara

| Tab | Fungsi |
|-----|--------|
| **Dashboard** | Ringkasan pasien, kapasitas terapi, jumlah staf |
| **Pasien** | Tabel + filter + CRUD + export PDF (antrian) + import gambar |
| **Staf** | Tabel + roster + export Excel (antrian) + import gambar |
| **Penugasan** | Tugas × staf × jam |
| **Pengaturan Terapi** | Kapasitas & pola slot per jenis terapi |
| **Jadwal** | Generate slot & lihat pasien terjadwal |

---

## Pasien — dari Contacts

### Menyiapkan kontak

1. Buka **Contacts** (`/dashboard/contacts`).
2. Tambah atau edit kontak.
3. Isi **Tanggal lahir** (penting untuk modul acara).
4. **Nama** dan **Catatan** (opsional, bisa jadi keluhan di acara).

### Mendaftarkan pasien ke acara

1. Buka acara → tab **Pasien** → **Tambah pasien**.
2. Di bagian **Dari kontak**, ketik nama/nomor → **Cari** → pilih kontak.
3. Nama dan tanggal lahir terisi otomatis; pilih **Terapi** (wajib).
4. Opsional: keluhan, jam preferensi.
5. **Simpan**.

Anda tetap bisa mengisi pasien **manual** tanpa kontak (nama + tanggal lahir + terapi).

### Tabel pasien

- **Cari** nama, filter terapi / status / tanggal slot / sudah-belum slot.
- **Pagination** 20 per halaman.
- **Export PDF** — dimulai sebagai **job** (seperti Laporan Finance). Setelah klik export, cek kartu **Riwayat export** di bawah tabel → **Refresh** atau tunggu auto-refresh → unduh saat status **Selesai**. Jika filter menghasilkan > 2500 pasien, persempit filter dulu.
- **Import dari gambar** — upload screenshot daftar pasien, konfirmasi draft AI, commit.

---

## Staf — roster (tim tetap)

Roster = daftar nama yang dipakai ulang di setiap acara, tanpa mengetik dari awal.

### Menyimpan ke roster

- Saat **Tambah staf** / **Edit staf**, checkbox **Simpan ke roster staf (untuk acara berikutnya)** (default centang).
- Atau sekali jalan: **Simpan staf acara ini ke roster** (mengambil semua staf di acara ini).

### Memakai roster

| Aksi | Kapan |
|------|--------|
| **Import staf dari roster** (saat buat acara) | Acara baru langsung berisi tim |
| **Muat semua dari roster** (tab Staf) | Acara sudah ada tapi staf masih kosong |
| **Pilih dari roster staf** (dialog Tambah staf) | Tambah satu orang dari daftar |

### Peran staf

| Peran UI | Keterangan |
|----------|------------|
| Terapis | Bisa dipilih beberapa **terapi** |
| Shijie / Daoshi / Fashi | Sama — multi terapi |
| Relawan | Peran relawan + opsi **Pencatat** |

Import gambar staf: upload screenshot → review draft → commit.

### Export lembar terapis (Excel)

- Tab **Staf** → **Export Excel** → job async → unduh dari **Riwayat export**.
- File berisi: daftar terapis (timestamp, nama, kehadiran, terapi), blok relawan (depan / bakar fu / pintu keluar), jadwal **Medang** per jam, tugas scan / re-scan / koordinator per sesi — mengikuti data **Penugasan** di acara.

---

## Pengaturan terapi & slot

Setiap jenis terapi punya kartu pengaturan sendiri.

### Mode kapasitas (angka di kolom `0/11` di tab Jadwal)

Ini **bukan** jumlah baris jam (5 slot manual). Ini **berapa pasien maksimal per jam** di setiap rentang waktu.

| Mode | Arti |
|------|------|
| **Jumlah terapis (per terapi)** (`THERAPIST_COUNT`) | Kapasitas = staf terapis/daoshi/fashi yang **terikat terapi ini** & hadir (mis. 11 → `0/11`). Field angka tetap **tidak dipakai** kecuali tidak ada terapis sama sekali. |
| **Jumlah Shijie** | Kapasitas = jumlah Shijie hadir di acara |
| **Angka tetap** (`FIXED`) | Kapasitas = angka yang Anda isi (mis. **5** → `0/5`) |

**Contoh:** 5 baris jam (09:00, 09:31, …) + kapasitas tetap 5 → pilih mode **Angka tetap** = 5, lalu **Simpan** dan **Generate slot** lagi.

### Roster staf — apa itu?

**Roster** = daftar tim **tetap** di tenant (nama + peran + terapi), dipakai ulang tiap acara baru tanpa mengetik dari awal.

| Fitur | Keterangan |
|-------|------------|
| Tab **Staf** → centang simpan ke roster | Staf acara disalin ke roster |
| **Muat semua dari roster** | Isi staf acara dari roster |
| **Pilih dari roster** (dialog tambah staf) | Satu orang dari daftar tetap |

Bukan jadwal slot — roster hanya menyimpan **siapa** tim Anda, bukan jam terapi.

### Mode jadwal slot

#### Rentang jam (otomatis) — cocok untuk Shijie & Energi Dewa

1. Pilih **Rentang jam (otomatis)**.
2. Isi **Durasi slot (menit)** — mis. 30.
3. Isi **Jam mulai** dan **Jam selesai** — mis. 09:00–17:00.
4. **Simpan** → tab **Jadwal** → **Generate slot**.

Sistem membagi rentang menjadi slot berurutan (09:00–09:30, 09:30–10:00, …).

#### Daftar slot manual — cocok untuk Terapi 5 Elemen

Untuk jadwal dengan **jeda** (mis. istirahat siang), jangan pakai rentang kontinu.

1. Pilih **Daftar slot manual**.
2. **Tambah slot** untuk setiap rentang, contoh:

   | Slot | Mulai | Selesai |
   |------|-------|---------|
   | 1 | 09:00 | 09:30 |
   | 2 | 09:31 | 10:00 |
   | 3 | 10:01 | 10:30 |
   | 4 | 13:00 | 13:30 |
   | 5 | 13:31 | 14:00 |

3. **Simpan** → tab **Jadwal** → **Generate slot: Terapi 5 Elemen**.

Pola slot yang sama dipakai **setiap hari** dalam rentang tanggal acara.

---

## Penugasan

Menetapkan staf ke tugas (Medang, Scan Barrier, Koordinator, dll.).

1. Tab **Penugasan** → **Tambah penugasan**.
2. Pilih **Tugas**, **Staf**, jam (opsional), nama sesi (opsional).
3. Tabel mendukung **cari** dan **pagination**.

Master tugas di `/dashboard/events/masters`.

---

## Pendaftaran publik

1. Acara status **PUBLISHED**.
2. **Generate slot** dulu di tab **Jadwal** (wajib sebelum pendaftaran bisa memilih jam).
3. Di detail acara, kartu **Link publik** → baris **Pasien** → **Salin** (atau **Buka**).
4. Format URL (disalin ke clipboard): `https://domain-anda/register/{slug-toko}/{slug-acara}`.

Pasien memilih **terapi** lalu **jam** dari daftar slot yang masih ada kuota. Jika slot penuh, jam tersebut tidak muncul dan pendaftaran ditolak.

Pasien dari dashboard (tab Pasien): isi **Jam preferensi** → kolom **Slot** terisi setelah slot di-generate dan jam cocok (simpan ulang jika slot baru dibuat).

---

## Jadwal pasien publik

Halaman baca-saja untuk menyebarkan jadwal pasien yang sudah **CONFIRMED** dan punya slot.

1. Acara status **PUBLISHED**.
2. Di detail acara, kartu **Link publik** → baris **Jadwal pasien** → **Salin** (atau **Buka**).
3. Format URL (disalin ke clipboard): `https://domain-anda/jadwal/{slug-toko}/{slug-acara}`.

| Kolom yang tampil | Tidak ditampilkan (privacy) |
|-------------------|-----------------------------|
| Pasien, Terapi, Jadwal, Jam preferensi | Tanggal lahir, keluhan, status reservasi, UUID internal |

**Urutan baris:** jam preferensi naik (ASC); yang tanpa jam preferensi di akhir.

**UX halaman:** tipografi lebih besar dan kontras lebih kuat agar mudah dibaca (termasuk pengguna lansia).

**Metadata browser / preview link:** judul tab = **nama acara saja** (tanpa “WABantu”, tanpa nama toko). Jika acara tidak ditemukan: judul fallback `Jadwal Pasien`.

Error di halaman publik (jadwal & monitor) menampilkan pesan aman saja — teks teknis database tidak pernah ditampilkan.

Mockup UX (preview): `docs/mockups/public-patient-schedule-ux-preview.html` dan gambar `docs/mockups/public-patient-schedule-ux-mockup.png`.

---

## Duplikat acara

Tombol **Duplikat** di header detail acara:

- Disalin: staf, pasien, pengaturan terapi.
- Tidak disalin: slot waktu, penugasan (buat ulang jika perlu).

Berguna untuk acara serupa minggu depan dengan tim sama.

---

## Import dari gambar (AI)

Tersedia untuk:

- **Staf** — screenshot daftar relawan/terapis.
- **Pasien** — screenshot daftar pasien.

Alur: upload → preview hasil AI → edit baris jika perlu → **Commit** ke acara.

---

## Komponen frontend (developer)

| Path | Isi |
|------|-----|
| `app/(dashboard)/dashboard/events/page.tsx` | Daftar + buat acara (+ import roster) |
| `app/(dashboard)/dashboard/events/[eventId]/page.tsx` | Tab utama |
| `components/events/event-patients-tab.tsx` | Tabel pasien + ContactPicker |
| `components/events/event-staff-tab.tsx` | Tabel staf + roster |
| `components/events/event-assignments-tab.tsx` | Tabel penugasan |
| `components/events/event-therapy-settings-tab.tsx` | AUTO / MANUAL slot |
| `components/events/contact-picker.tsx` | Pilih kontak |
| `components/events/data-table-toolbar.tsx` | Search + pagination |
| `lib/api/events.ts` | Client API |
| `lib/events-staff.ts` | Label peran, helper terapi |
| `app/jadwal/[tenantSlug]/[eventSlug]/` | Halaman jadwal pasien publik |
| `app/monitor/[tenantSlug]/[eventSlug]/` | Halaman pantau staf publik |
| `lib/public-event-error.ts` | Pesan error aman untuk halaman publik |
| `lib/server/public-event.ts` | Fetch metadata + URL absolut halaman publik |

---

## Checklist sebelum hari H

- [ ] Acara **PUBLISHED** (jika buka pendaftaran publik)
- [ ] Staf lengkap (roster atau import)
- [ ] Pengaturan terapi disimpan
- [ ] Slot di-generate (tab Jadwal)
- [ ] Pasien terdaftar / link disebar
- [ ] Penugasan tugas (opsional)

---

## Pertanyaan umum

**Apakah pasien harus jadi Contact dulu?**  
Tidak wajib. Kontak memudahkan data ulang dan menghindari salah ketik nama/TTL.

**Roster kosong saat buat acara baru?**  
Isi staf di satu acara → **Simpan staf acara ini ke roster**, atau tambah staf manual dengan checkbox roster.

**Slot generate kosong?**  
Pastikan pengaturan terapi sudah **Simpan**; mode MANUAL harus punya minimal satu baris slot.

**Bedanya duplikat acara vs roster?**  
Roster = template tim tenant. Duplikat = salin satu acara spesifik (termasuk pasien).

---

## Dokumen terkait

- [Contacts & inbox](../APP_FLOW_GUIDE.md) — nomor WhatsApp & kontak
- [API Events (teknis)](../../api-go/docs/EVENTS_MODULE.md)
- [LIMITS_AND_QUOTAS.md](../LIMITS_AND_QUOTAS.md) — batas kuota tenant jika ada
