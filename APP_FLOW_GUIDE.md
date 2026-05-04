# WABantu Web Flow Guide (Next.js)

Ringkasan **alur frontend**: routing, auth, URL legal (Meta), dan bagaimana UI memanggil API. Untuk path REST lengkap dan logika multi-tenant, baca `../api/APP_FLOW_GUIDE.md`.

---

## 1) Peran folder & URL

| Area | Route group | Contoh URL |
|------|-------------|------------|
| Marketing | `app/(marketing)/` | `/`, `/pricing`, `/privacy`, `/data-deletion` |
| Auth | `app/(auth)/` | `/login`, `/register` |
| App | `app/(dashboard)/` | `/dashboard`, `/dashboard/inbox`, … |

Group `(marketing|auth|dashboard)` **tidak** muncul di URL — hanya mengorganisir layout.

---

## 2) Auth (browser → API)

1. Login/register memanggil API same-origin `POST /api/v1/auth/...` (Next rewrite ke Nest di dev).
2. API set cookie HttpOnly `wabantu_at`.
3. `proxy.ts` memantau cookie untuk redirect cepat dari `/dashboard/*`.
4. Layout dashboard memanggil `getServerUser()` → `GET /api/v1/auth/me` — ini sumber kebenaran session.

Lihat juga bagian auth di `../api/APP_FLOW_GUIDE.md`.

---

## 3) Halaman legal (Meta & kepatuhan)

- **`/privacy`** — kebijakan privasi (`app/(marketing)/privacy/page.tsx`).
- **`/data-deletion`** — instruksi penghapusan data pengguna (`app/(marketing)/data-deletion/page.tsx`).

Footer marketing (`app/(marketing)/layout.tsx`) menautkan **Privasi** dan **Penghapusan data**.

Email kontak di copy legal memakai **`NEXT_PUBLIC_SUPPORT_EMAIL`** (lihat `.env.example`; ada fallback default di halaman jika tidak di-set).

---

## 4) WhatsApp onboarding (ringkas)

1. User ke `/dashboard/whatsapp/onboarding`, mengisi channel name, nomor bisnis, Meta App ID & Secret.
2. UI memanggil `POST /api/v1/whatsapp/meta/connect/init` → dapat `oauthUrl` + `state` (bukan WABA/Phone ID).
3. Redirect ke Meta; setelah approve, kembali dengan `code` + `state`.
4. UI memanggil `POST /api/v1/whatsapp/meta/connect/callback` — backend yang menukar code dan mengisi **`meta_waba_id` / `meta_phone_number_id`** lewat Graph bila tersedia.

Detail edge case (ID kosong, webhook backfill) ada di `../api/APP_FLOW_GUIDE.md` §9.

---

## 5) AI Settings & zona waktu laporan

1. User membuka `/dashboard/ai-settings`.
2. `useQuery` memanggil `GET /api/v1/business/profile` (cookie auth).
3. Selama `profile` belum ada, UI menampilkan **Memuat profil…** — form **tidak**
   di-mount, supaya default internal tidak mem-flash `Asia/Jakarta` sebelum data server.
4. Setelah `profile` ada, form di-mount dengan `defaultValues` dari server;
   `useLayoutEffect` memanggil `reset(toFormValues(profile))` saat `profile`
   berubah (mis. setelah simpan).
5. Zona waktu: Radix `Select` terkontrol oleh `react-hook-form`; label trigger
   diisi eksplisit lewat `reportingTimezoneTriggerLabel` (`lib/reporting-timezones.ts`)
   agar teks tetap tampil walau item dropdown di portal belum termount.
6. Simpan memanggil `PATCH /api/v1/business/profile` dengan body form; respons
   memperbarui cache React Query. Klien memakai `lib/api/business.ts` yang
   menggabungkan `reportingTimezone` / `reporting_timezone` dan mengabaikan string kosong.

Daftar IANA yang boleh dipilih harus **sama** dengan allowlist backend
(`api/src/common/constants/reporting-timezones.constants.ts`).

---

## 6) Ringkasan dashboard (`/dashboard`)

1. Server component memuat paralel: user, channel WA, analytics ringkas,
   **profil bisnis** (`GET /api/v1/business/profile`), dan **total FAQ**
   (`GET /api/v1/knowledge-base?page=1&pageSize=1` → field `total`).
2. Checklist **“Lengkapi info bisnis”** dianggap selesai jika semua field
   kartu Profil bisnis (sama seperti di AI Settings) terisi — logika di
   `lib/business-profile-card-complete.ts`.
3. Checklist **“Isi minimal 5 FAQ”** selesai bila `total >= 5`.
4. Kartu **AI status** “Siap” bila kedua syarat di atas terpenuhi.

---

## 7) File yang sering disentuh

| Kebutuhan | File |
|-----------|------|
| Rewrite API / middleware edge | `proxy.ts`, `next.config.ts` |
| Server fetch dengan cookie | `lib/api/server.ts` |
| Client API + envelope | `lib/api/client.ts` |
| Profil bisnis + timezone | `lib/api/business.ts`, `lib/reporting-timezones.ts`, `app/(dashboard)/dashboard/ai-settings/page.tsx` |
| Checklist dashboard / kelengkapan profil | `app/(dashboard)/dashboard/page.tsx`, `lib/business-profile-card-complete.ts` |
| Env terpusat | `lib/env.ts` |
| Dashboard shell + auth seed | `app/(dashboard)/layout.tsx` |

---

## 8) Next steps

Setelah nyaman dengan flow di atas, lanjutkan ke **`../api/APP_FLOW_GUIDE.md`** untuk inbox, leads, billing, webhook WhatsApp, dan detail respons profil bisnis.
