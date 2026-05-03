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

## 5) File yang sering disentuh

| Kebutuhan | File |
|-----------|------|
| Rewrite API / middleware edge | `proxy.ts`, `next.config.ts` |
| Server fetch dengan cookie | `lib/api/server.ts` |
| Client API + envelope | `lib/api/client.ts` |
| Env terpusat | `lib/env.ts` |
| Dashboard shell + auth seed | `app/(dashboard)/layout.tsx` |

---

## 6) Next steps

Setelah nyaman dengan flow di atas, lanjutkan ke **`../api/APP_FLOW_GUIDE.md`** untuk inbox, leads, billing, dan webhook WhatsApp.
