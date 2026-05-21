# WABantu — Panduan Produk & Onboarding (Tim CS / Sales / Trainee)

> **Untuk siapa dokumen ini?** Tim yang menjelaskan WABantu ke **pelanggan UMKM** (bukan developer).  
> **Bukan untuk:** konfigurasi server, API, atau kode — itu ada di `api-go/DEVELOPER_DOCUMENTATION.md`.  
> **Aplikasi aktif:** dashboard di `web-frontend` (browser) + backend `api-go`.

---

## Daftar isi

1. [WABantu itu apa? (1 menit)](#1-wabantu-itu-apa-1-menit)
2. [Siapa pelanggan ideal kita?](#2-siapa-pelanggan-ideal-kita)
3. [Nilai jual untuk pitching](#3-nilai-jual-untuk-pitching)
4. [Alur bisnis besar (gambaran pelanggan)](#4-alur-bisnis-besar-gambaran-pelanggan)
5. [Perjalanan pelanggan: dari daftar sampai AI jalan](#5-perjalanan-pelanggan-dari-daftar-sampai-ai-jalan)
6. [Peta menu dashboard (semua fitur)](#6-peta-menu-dashboard-semua-fitur)
7. [Alur detail per fitur](#7-alur-detail-per-fitur)
8. [Peran pengguna (Owner, Staff, Admin internal)](#8-peran-pengguna-owner-staff-admin-internal)
9. [Paket & batasan fitur](#9-paket--batasan-fitur)
10. [Skrip demo untuk presentasi](#10-skrip-demo-untuk-presentasi)
11. [FAQ untuk tim onboarding](#11-faq-untuk-tim-onboarding)
12. [Yang perlu diingat saat jelaskan ke customer](#12-yang-perlu-diingat-saat-jelaskan-ke-customer)

---

## 1. WABantu itu apa? (1 menit)

**WABantu** adalah aplikasi bantu bisnis kecil dan menengah (UMKM) di Indonesia yang:

- Menghubungkan **nomor WhatsApp bisnis** mereka (resmi lewat Meta / WhatsApp Cloud API).
- Membalas chat pelanggan **otomatis dengan AI**, 24 jam, memakai info bisnis + FAQ yang owner isi sendiri.
- Menyimpan semua percakapan di **satu inbox** di komputer/HP browser — owner atau staff bisa lanjutkan manual kapan saja.

**Analogi sederhana:**  
Bayangkan Anda punya asisten virtual di WhatsApp yang hafal harga, jam buka, alamat, dan jawaban FAQ — tapi Anda tetap bisa mengambil alih chat jika ada komplain atau closing manual.

**Bukan:** aplikasi chat pribadi, spam tool ilegal, atau pengganti akun WhatsApp pribadi.  
**Adalah:** alat **WhatsApp Business resmi** + dashboard + AI untuk **melayani pelanggan**.

---

## 2. Siapa pelanggan ideal kita?

| Cocok | Kurang cocok |
|--------|----------------|
| Toko online, F&B, salon, klinik kecantikan, bengkel, reseller | Bisnis yang hampir tidak pakai WhatsApp |
| Sudah terima banyak pertanyaan berulang (harga, ongkir, buka/tutup) | Butuh hanya broadcast spam tanpa layanan |
| Owner/staff mau hemat waktu balas chat | Tidak mau isi info bisnis sama sekali |
| 1–3 nomor WA bisnis | Butuh integrasi non-WA dulu (Telegram only, dll.) |

---

## 3. Nilai jual untuk pitching

Gunakan poin ini saat presentasi atau pitch deck:

| # | Masalah pelanggan | Solusi WABantu |
|---|-------------------|----------------|
| 1 | Chat menumpuk, balas telat, customer kabur | AI balas dalam detik, 24/7 |
| 2 | Pertanyaan sama terus (harga, lokasi, cara order) | Knowledge Base + profil bisnis = jawaban konsisten |
| 3 | Owner capek buka HP terus | Satu dashboard; notifikasi unread; staff bisa bantu |
| 4 | Takut salah info | Owner yang mengisi data; AI hanya pakai sumber itu |
| 5 | Tetap butuh sentuhan manusia | **Handoff** — AI berhenti, manusia lanjut di inbox yang sama |
| 6 | Mau promosi ke banyak kontak | Broadcast (paket tertentu) |
| 7 | Mau lihat performa | Analytics: berapa chat, berapa dijawab AI, open rate |

**Tagline singkat (contoh):**  
*“Balas WhatsApp pelanggan otomatis, 24 jam — Anda fokus jualan, bukan ngetik FAQ berulang.”*

---

## 4. Alur bisnis besar (gambaran pelanggan)

```
Pelanggan WA ──pesan──► Nomor bisnis (Meta) ──webhook──► WABantu
                                                          │
                    ┌─────────────────────────────────────┤
                    ▼                                     ▼
              Simpan chat                          AI baca profil
              di Inbox                             + FAQ + katalog
                    │                                     │
                    │         ┌───────────────────────────┘
                    │         ▼
                    │    Balas otomatis (atau rule Workflow)
                    │         │
                    ▼         ▼
              Owner/Staff lihat di dashboard
              bisa: balas manual / handoff / resume AI
```

**Yang terjadi di belakang layar (cukup tahu konsep):**

- Setiap bisnis punya **“toko data” sendiri** (terisolasi dari bisnis lain).
- Pesan masuk tidak hilang — tersimpan sebagai **percakapan** per nomor pelanggan.
- AI tidak “menebak” sembarangan — kalau data kurang, bisa minta owner lengkapi profil atau arahkan ke CS.

---

## 5. Perjalanan pelanggan: dari daftar sampai AI jalan

Ini **checklist onboarding** yang muncul di halaman **Overview** (`/dashboard`). Jelaskan ke customer sebagai langkah wajib.

| Langkah | Apa yang dilakukan customer | Di menu | Kenapa penting |
|--------|-----------------------------|---------|----------------|
| 1 | **Daftar akun** — email, password, nama bisnis | `/register` | Membuat “toko” digital mereka di sistem |
| 2 | **Sambungkan WhatsApp** — OAuth Meta | `/dashboard/whatsapp/onboarding` | Tanpa ini, tidak ada pesan masuk |
| 3 | **Lengkapi info bisnis** — nama, alamat, jam buka, tone AI | `/dashboard/ai-settings` | AI pakai ini sebagai konteks jawaban |
| 4 | **Isi minimal ~5 FAQ** | `/dashboard/knowledge-base` | Jawaban spesifik (ongkir, promo, dll.) |
| 5 | **(Opsional)** Isi katalog produk | `/dashboard/catalog` | AI bisa sebut harga/nama produk |
| 6 | **Nyalakan AI** | AI Settings → toggle AI enabled | Kalau mati, hanya manusia yang balas |
| 7 | **Tes** — kirim WA ke nomor bisnis | HP customer | Lihat pesan muncul di Inbox + balasan AI |

**Estimasi waktu setup:** 30–60 menit untuk yang pertama kali (termasuk verifikasi Meta).

**Kalimat untuk customer:**  
*“Setelah daftar, urutannya: hubungkan WA → isi profil bisnis → tambah FAQ → tes kirim pesan ke nomor Anda. Baru kita pantau bareng di inbox.”*

---

## 6. Peta menu dashboard (semua fitur)

Sidebar dashboard dibagi 4 kelompok. **Admin** hanya untuk tim internal WABantu, bukan customer.

### Operasional (sehari-hari)

| Menu | Path | Untuk apa (bahasa awam) |
|------|------|-------------------------|
| **Overview** | `/dashboard` | Ringkasan hari ini + checklist setup |
| **Inbox** | `/dashboard/inbox` | Semua chat WhatsApp — inti produk |
| **Contacts** | `/dashboard/contacts` | Daftar calon pelanggan (leads) dari chat |

### AI & Automasi

| Menu | Path | Untuk apa |
|------|------|-----------|
| **AI Settings** | `/dashboard/ai-settings` | Profil bisnis + nyala/matikan AI + gaya bahasa |
| **Knowledge Base** | `/dashboard/knowledge-base` | Bank pertanyaan–jawaban (FAQ) untuk AI |
| **WhatsApp** | `/dashboard/whatsapp` | Status nomor terhubung / putus / reconnect |

### Bisnis

| Menu | Path | Untuk apa |
|------|------|-----------|
| **Katalog** | `/dashboard/catalog` | Daftar produk/jasa + harga |
| **Pesanan** | `/dashboard/orders` | Order yang tercatat dari alur chat (jika dipakai) |
| **Broadcast** | `/dashboard/broadcast` | Kirim pesan massal ke banyak nomor *(paket Business/Pro)* |
| **Import** | `/dashboard/import` | Upload CSV/Excel untuk isi katalog/FAQ massal |
| **Analytics** | `/dashboard/analytics` | Statistik chat & performa AI |
| **Billing** | `/dashboard/billing` | Paket langganan & tagihan |
| **Team** | `/dashboard/team` | Undang staff (hanya **Owner**) |

### Lanjutan

| Menu | Path | Untuk apa |
|------|------|-----------|
| **Cabang** | `/dashboard/branches` | Multi lokasi / multi nomor *(paket Pro)* |
| **Workflow** | `/dashboard/workflow` | Balasan otomatis berdasarkan kata kunci *(paket Business+)* |
| **Admin** | `/dashboard/admin` | **Internal WABantu saja** — pantau semua tenant |

### Halaman publik (bukan dashboard)

| Halaman | Path | Untuk apa |
|---------|------|-----------|
| Landing | `/` | Marketing, CTA daftar |
| Harga | `/pricing` | Perbandingan paket |
| Login / Register | `/login`, `/register` | Masuk & daftar bisnis baru |
| Privasi / Data deletion | `/privacy`, `/data-deletion` | Kebijakan legal |

---

## 7. Alur detail per fitur

### 7.1 Register & Login

**Register**

- Customer isi: email, password, nama orang, **nama bisnis**.
- Sistem membuat akun **Owner** + “toko” baru (data terpisah dari bisnis lain).
- Setelah sukses → langsung masuk dashboard.

**Login**

- Email + password yang sama.
- Sesi aman di browser (tidak perlu install aplikasi desktop).

**Yang dijelaskan ke customer:**  
*“Satu email = satu bisnis. Kalau punya 2 brand berbeda, daftar 2 akun terpisah.”*

---

### 7.2 WhatsApp — menghubungkan nomor

**Tujuan:** Nomor WhatsApp Business resmi terhubung ke WABantu.

**Langkah customer (umum):**

1. Buka **WhatsApp** → **Connect / Reconnect** (`/dashboard/whatsapp/onboarding`).
2. Login ke Meta / Facebook Business (OAuth resmi).
3. Pilih nomor / WABA yang diizinkan Meta.
4. Setelah sukses, status di **WhatsApp** menu = **Connected**.

**Jika putus:** bisa disconnect atau connect ulang dari menu yang sama.

**Yang TIDAK perlu dijelankan ke customer:** token rahasia global, webhook manual — itu tim teknis saat setup Meta App (sekali untuk platform).

**Kalimat pitching:**  
*“Integrasi resmi Meta, bukan cara ilegal. Nomor Anda tetap milik Anda; WABantu hanya menerima dan mengirim pesan lewat API resmi.”*

---

### 7.3 AI Settings — otak bisnis

Customer mengisi (semakin lengkap, semakin bagus jawaban AI):

| Field | Contoh isi | Dampak ke AI |
|-------|------------|--------------|
| Nama bisnis | “Warung Makan Bu Sri” | Menyebut nama toko |
| Deskripsi | Jenis usaha, keunggulan | Konteks umum |
| Alamat | Jalan, kota | Jawab “dimana?” |
| Jam buka | Senin–Sabtu 08–21 | Jawab “buka?” |
| Produk/layanan | Ringkasan menu | Gambaran penawaran |
| Harga dasar | “Mulai 15rb” | Range harga |
| Area kirim | “Jakarta Selatan” | Ongkir / layanan |
| Template sapaan | “Halo Kak, ada yang bisa dibantu?” | Gaya pembuka |
| Tone | Ramah / formal / santai | Gaya bahasa |
| AI enabled | On / Off | Master switch auto-reply |
| Zona waktu laporan | Asia/Jakarta | Statistik “hari ini” |

**Tips onboarding:** Minta customer isi seperti menjelaskan ke teman yang baru pertama kali chat.

---

### 7.4 Knowledge Base — FAQ

**Tujuan:** Jawaban pasti untuk pertanyaan yang sering diulang.

**Cara pakai:**

- Tambah entri: **Pertanyaan** + **Jawaban** + kategori (opsional).
- Minimal **5 entri** disarankan sebelum AI dianggap “siap” (ada di checklist Overview).
- Bisa cari/filter di daftar FAQ.

**Contoh entri bagus:**

- Q: “Berapa ongkir ke Depok?” → A: “Ongkir flat Rp 15.000 untuk Depok.”
- Q: “Apakah bisa cod?” → A: “Bisa COD untuk area Jakarta.”

**Kalimat ke customer:**  
*“AI gabungkan info dari Profil Bisnis + FAQ. FAQ untuk pertanyaan spesifik yang sering ditanya ulang.”*

---

### 7.5 Katalog produk

**Tujuan:** AI dan tim bisa menyebut produk dengan nama & harga yang benar.

- Tambah produk: kode, nama, harga, satuan.
- Bisa juga **Import** CSV/Excel (menu Import) untuk banyak produk sekaligus.

**Use case:** Toko fashion, catering, reseller dengan banyak SKU.

---

### 7.6 Inbox — pusat percakapan

**Ini fitur yang paling sering dipakai customer.**

**Tampilan:**

- **Kiri:** daftar percakapan (per nomor pelanggan), bisa cari nama/nomor, filter belum dibaca.
- **Kanan:** isi chat (seperti WhatsApp), kotak balas di bawah.

**Jenis pesan di thread:**

| Dari | Arti |
|------|------|
| Pelanggan | Pesan masuk (inbound) |
| AI | Balasan otomatis |
| Staff/Owner | Balasan manual |
| Sistem | Notifikasi internal (mis. “AI dijeda”) |

**Fitur penting:**

| Tombol / aksi | Apa yang terjadi | Kapan dipakai |
|---------------|------------------|--------------|
| **Kirim pesan** | Owner/staff balas manual lewat WA resmi | Closing, komplain, kasih foto |
| **Handoff** | AI **berhenti** membalas percakapan ini | Customer marah, butuh manusia |
| **Resume AI** | AI **aktif lagi** di percakapan ini | Masalah selesai, mau otomatis lagi |
| **Tandai dibaca** | Unread hilang | Setelah selesai baca |
| **Edit nama kontak** | Nama tampilan di dashboard | Supaya tim kenal siapa |

**Realtime:** Chat baru bisa muncul tanpa refresh halaman (notifikasi di sidebar).

**Alur pesan masuk (untuk dijelaskan ke customer):**

1. Pelanggan kirim WA ke nomor bisnis.
2. Pesan muncul di Inbox (beberapa detik).
3. Jika AI nyala & belum handoff → AI balas otomatis.
4. Owner bisa lihat & override kapan saja.

---

### 7.7 Workflow — balasan kata kunci (paket tertentu)

**Tujuan:** Sebelum AI kompleks, balas cepat jika pesan mengandung kata tertentu.

**Contoh rule:**

- Jika pesan mengandung **“booking”** → balas teks jadwal reservasi.
- Jika mengandung **“ongkir”** → balas tabel ongkir singkat.

**Bedanya dengan AI:** Workflow = aturan tetap (if keyword → text). AI = memahami konteks + FAQ.

**Paket:** Business / Pro (di UI akan muncul pesan upgrade jika paket Starter).

---

### 7.8 Contacts (Leads)

**Tujuan:** Melacak calon pembeli yang muncul dari chat.

- Sistem bisa mencatat **lead** dari percakapan.
- Status: baru → dihubungi → qualified → menang / kalah.
- Tim sales bisa update status di tabel Contacts.

**Pitching:** *“Tidak cuma balas chat — Anda punya daftar prospek yang pernah chat.”*

---

### 7.9 Pesanan (Orders)

**Tujuan:** Mencatat order yang lahir dari percakapan (ringkasan status & total).

- Daftar pesanan dengan status (draft, dibayar, dikirim, dll. tergantung implementasi).
- Berguna untuk UMKM yang sudah jualan lewat WA dan mau satu tempat lihat order.

**Catatan onboarding:** Jelaskan bahwa ini melengkapi chat — bukan pengganti marketplace lengkap.

---

### 7.10 Broadcast

**Tujuan:** Kirim satu pesan ke banyak nomor sekaligus (promo, pengumuman).

- Buat kampanye: nama, isi pesan, daftar nomor (pisah baris/koma).
- Kirim kampanye (antrian di backend).

**Batasan:** Hanya paket **Business / Pro**.  
**Penting untuk customer:** Harus patuh aturan WhatsApp (tidak spam, consent pelanggan).

---

### 7.11 Import CSV/XLSX

**Tujuan:** Isi banyak data sekaligus tanpa ketik satu per satu.

1. Upload file.
2. **Preview** — sistem tunjukkan kolom & contoh baris.
3. **Execute** — data masuk (mis. ke katalog).

**Use case:** Migrasi dari Excel price list lama.

---

### 7.12 Analytics

**Tujuan:** Owner lihat angka performa.

Contoh metrik yang ditampilkan:

- Total pesan / inbound / balasan AI
- Leads terbentuk
- AI coverage (% chat yang dibalas AI)
- Handoff rate
- Open rate & rata-rata waktu balas pertama

**Pitching:** *“Bisa buktikan ke boss: berapa chat ditangani AI bulan ini.”*

---

### 7.13 Billing

**Tujuan:** Kelola paket & trial.

- Lihat paket aktif (Starter / Growth / Business / Pro — nama di sistem bisa sedikit beda dengan halaman marketing).
- Pilih / ganti paket
- Riwayat invoice
- Pembayaran QRIS (Midtrans) jika diaktifkan

**Untuk onboarding:** Arahkan ke halaman **Pricing** (`/pricing`) untuk perbandingan marketing, **Billing** untuk langganan aktual di akun mereka.

---

### 7.14 Team

**Hanya Owner** yang bisa:

- Undang **Staff** (email + password sementara + nama).
- Hapus staff.

**Staff bisa:** inbox, banyak menu baca/tulis operasional.  
**Staff tidak bisa:** undang orang, beberapa setting sensitif (tergantung endpoint — umumnya team & billing owner-only).

---

### 7.15 Cabang (Multi-branch, paket Pro)

**Tujuan:** Bisnis punya beberapa lokasi / beberapa nomor WA.

- Definisikan cabang (nama + slug).
- Untuk brand multi-outlet (F&B chain kecil, franchise).

---

### 7.16 Admin (internal WABantu — jangan dijual ke customer)

**Bukan fitur pelanggan.**

- Tim WABantu login sebagai **platform admin**.
- Lihat daftar semua bisnis (tenant) terdaftar.
- **Pantau** inbox bisnis customer untuk support/debug (mode internal, dengan banner peringatan).

**Saat demo ke investor:** bisa disebut “ops dashboard” — terpisah dari produk UMKM.

---

## 8. Peran pengguna (Owner, Staff, Admin internal)

| Peran | Siapa | Bisa apa | Tidak bisa |
|-------|-------|----------|------------|
| **Owner** | Pemilik bisnis / yang daftar | Semua fitur bisnis + undang staff + billing | Akses bisnis lain |
| **Staff** | Karyawan CS | Inbox, balas chat, banyak menu operasional | Undang staff, beberapa setting owner |
| **Platform admin** | Tim WABantu | Konsol tenant, pantau/debug | Bukan untuk dijual ke UMKM |

---

## 9. Paket & batasan fitur

Halaman marketing (`/pricing`) menampilkan 3 tier contoh. Di sistem, nama paket bisa: `starter`, `basic`, `business`, `pro` — fitur gate di UI mengikuti kode paket.

| Fitur | Starter (umum) | Naik paket |
|-------|------------------|------------|
| 1 nomor WA, inbox, AI dasar, FAQ manual | ✓ | — |
| Lebih banyak percakapan / bulan | terbatas | Growth+ |
| Broadcast | ✗ | Business+ |
| Workflow rule | ✗ | Business+ |
| Multi cabang | ✗ | Pro |
| Multi staff / analitik lengkap | terbatas | Business+ |

**Saat customer tanya “kenapa menu X kosong?”**  
→ Cek **Billing** → paket aktif; jelaskan upgrade, jangan bilang “rusak”.

---

## 10. Skrip demo untuk presentasi

**Durasi 15 menit (demo singkat)**

| Menit | Apa yang ditunjukkan | Apa yang dikatakan |
|-------|----------------------|-------------------|
| 0–2 | Landing `/` | “UMKM dapat asisten WA 24 jam…” |
| 2–4 | Register (atau akun demo) | “Satu bisnis = satu akun, data terpisah” |
| 4–6 | Overview checklist | “Empat langkah: WA, profil, FAQ, tes” |
| 6–8 | AI Settings + 1–2 FAQ | “AI hanya jawab dari yang Anda isi” |
| 8–11 | Inbox — kirim pesan dari HP ke nomor demo | “Pesan masuk, AI balas, kita handoff, kita balas manual” |
| 11–13 | Analytics | “Angka performa bulan ini” |
| 13–15 | Pricing + tanya jawab | Paket & trial 14 hari |

**Akun demo:** Siapkan tenant dengan WA sudah connect + profil lengkap + FAQ — jangan demo register live jika Meta OAuth lambat.

---

## 11. FAQ untuk tim onboarding

**Apakah ini WhatsApp resmi?**  
Ya, lewat WhatsApp Cloud API (Meta). Bukan modifikasi APK WA.

**Apakah AI baca chat pribadi owner?**  
Tidak. Hanya nomor bisnis yang dihubungkan ke akun bisnis mereka.

**Kalau AI salah jawab?**  
Owner perbaiki FAQ/profil → handoff → balas manual. AI bisa dimatikan per percakapan atau global.

**Apakah data aman antar bisnis?**  
Ya, setiap bisnis punya data terisolasi (multi-tenant).

**Harus install aplikasi?**  
Tidak. Cukup browser: `https://…` (domain produksi Anda).

**Bisa beberapa orang login bersamaan?**  
Ya, Owner undang Staff di menu Team.

**Berapa lama setup?**  
30–60 menit pertama kali; Meta OAuth bisa butuh verifikasi bisnis.

**Apakah bisa broadcast sembarangan?**  
Fitur ada di paket tertentu; ingatkan aturan anti-spam WA & izin pelanggan.

**Customer marah dapat balasan AI terus?**  
Ajarkan **Handoff** — itu fitur kunci untuk CS manusia.

---

## 12. Yang perlu diingat saat jelaskan ke customer

### DO (lakukan)

- Tekankan **setup berurutan**: WA → profil → FAQ → tes.
- Tunjukkan **Inbox** sebagai “rumah” utama kerja harian.
- Jelaskan **Handoff** = kontrol manusia, bukan AI mengambil alih total.
- Sebut **trial / paket** sesuai halaman Pricing & Billing.
- Akui batasan paket (broadcast, cabang) dengan jujur → tawarkan upgrade.

### DON’T (hindari)

- Janji “AI paham semua tanpa isi data”.
- Bilang staff bisa ganti paket/billing (hanya owner).
- Tunjukkan menu **Admin** ke customer UMKM.
- Bahas webhook, Redis, Encore, atau secret ke customer.
- Suruh customer set secret bootstrap / platform admin.

---

## Lampiran: Satu hari kerja Owner (contoh F&B)

| Waktu | Aktivitas di WABantu |
|-------|----------------------|
| Pagi | Buka Overview — lihat pesan masuk semalam & % dibalas AI |
| Siang | Inbox — handoff 2 chat komplain, balas manual |
| Sore | Tambah 1 FAQ promo weekend di Knowledge Base |
| Malam | Cek Analytics mingguan — share ke partner |

---

## Lampiran: Glosarium singkat

| Istilah | Arti untuk customer |
|---------|---------------------|
| Tenant / bisnis | Satu akun toko di sistem |
| Channel | Satu nomor WhatsApp terhubung |
| Percakapan | Satu thread chat dengan satu pelanggan |
| Handoff | Serah chat dari AI ke manusia |
| Knowledge Base | Daftar FAQ |
| Lead | Calon pelanggan yang pernah chat |
| Broadcast | Pesan massal ke banyak nomor |

---

## Perbarui dokumen ini

Jika ada fitur baru di dashboard, update bagian **§6–§7** dan checklist **§5**.  
Referensi teknis backend: `../api-go/APP_FLOW_GUIDE.md` · Developer: `../api-go/DEVELOPER_DOCUMENTATION.md`.

*Terakhir disusun untuk stack web-frontend + api-go (dashboard Bearer auth, platform admin internal).*
