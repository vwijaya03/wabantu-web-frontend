# WABantu Web Flow Guide (Next.js)

Panduan **alur frontend** untuk developer baru: apa yang harus sudah jalan, bagaimana UI memanggil **api-go** (Encore), dan di mana file kodenya.

| Dokumen terkait | Isi |
|-----------------|-----|
| [README.md](./README.md) | Route, env, Docker, troubleshooting singkat |
| [../api-go/README.md](../api-go/README.md) | Encore, secrets, 2 DB, Redis |
| [../api-go/APP_FLOW_GUIDE.md](../api-go/APP_FLOW_GUIDE.md) | Webhook, AI Pub/Sub, multi-tenant |
| [../api-go/ENDPOINT_COMPATIBILITY.md](../api-go/ENDPOINT_COMPATIBILITY.md) | Perbandingan path vs Nest |
| `../api/APP_FLOW_GUIDE.md` | Referensi stack lama (Nest) — **jangan** dipakai untuk dev FE baru |

---

## 0) Checklist persiapan (wajib)

| # | Komponen | Perintah / cek |
|---|----------|----------------|
| 1 | Node **18+** | `node -v` |
| 2 | Redis | `cd ../infra && docker compose up -d redis` |
| 3 | api-go secrets + run | `cd ../api-go && ./scripts/setup-secrets-from-env.sh && encore run` |
| 4 | Health API | `curl -s http://localhost:4000/api/v1/health` |
| 5 | Env frontend | `cp .env.example .env.local` |
| 6 | Install & dev | `npm install && npm run dev` |

**Tidak perlu:** Nest `api/` (3001), `ai-worker/`, `ai-worker-go/` untuk alur UI standar.

---

## 1) Bagaimana frontend memanggil API

Semua klien memakai path **`/api/v1/...`** (sama dengan Nest). Perbedaannya hanya **host tujuan rewrite**.

```
┌─────────────┐     GET /api/v1/auth/me      ┌──────────────┐     rewrite      ┌─────────────┐
│   Browser   │ ───────────────────────────► │  Next :3000  │ ───────────────► │ api-go :4000 │
│  axios + RQ │     (cookie wabantu_at)      │ next.config  │  API_BACKEND_URL │   Encore    │
└─────────────┘                              └──────────────┘                  └─────────────┘
       ▲                                                                              │
       │  Server Component (layout dashboard)                                         │
       └──────── getServerUser() ── fetch API_URL_INTERNAL/api/v1/auth/me ──────────┘
                         (langsung ke :4000, tanpa lewat rewrite browser)
```

| Lapisan | File | Base URL |
|---------|------|----------|
| Browser (client) | `lib/api/client.ts` | `env.apiUrl` → `/api/v1` |
| Server (RSC) | `lib/api/server.ts` | `env.apiUrlInternal` → `http://localhost:4000/api/v1` |
| Rewrite | `next.config.ts` | `/api/v1/:path*` → `${API_BACKEND_URL}/api/v1/:path*` |
| SSE inbox | `hooks/use-inbox-activity-stream.ts` | same-origin atau `NEXT_PUBLIC_SSE_API_URL` |

Envelope respons: backend mengembalikan `{ success: true, data: ... }`; axios interceptor di `client.ts` meng-unwrap `data` untuk hooks.

---

## 2) Peran folder & URL

| Area | Route group | Contoh URL |
|------|-------------|------------|
| Marketing | `app/(marketing)/` | `/`, `/pricing`, `/privacy`, `/data-deletion` |
| Auth | `app/(auth)/` | `/login`, `/register` |
| App | `app/(dashboard)/` | `/dashboard`, `/dashboard/inbox`, … |

Group `(marketing|auth|dashboard)` **tidak** muncul di URL — hanya mengorganisir layout.

---

## 3) Auth (browser → API)

1. Login/register: `POST /api/v1/auth/login` | `register` (via axios, `withCredentials: true`).
2. API set cookie HttpOnly **`wabantu_at`** + body berisi `accessToken`.
3. **`proxy.ts`**: redirect optimistik — `/dashboard/*` tanpa cookie → `/login` (bukan sumber kebenaran session).
4. **`app/(dashboard)/layout.tsx`**: `getServerUser()` → `GET /api/v1/auth/me` dengan cookie request — **ini** yang menentukan session valid.
5. Logout: `POST /api/v1/auth/logout` + clear state lokal.

Edge case: jangan redirect `/login` → `/dashboard` hanya karena cookie ada (stale cookie = loop). Login page juga memanggil `getServerUser()` sebelum render form.

---

## 4) Halaman legal (Meta & kepatuhan)

- **`/privacy`** — `app/(marketing)/privacy/page.tsx`
- **`/data-deletion`** — `app/(marketing)/data-deletion/page.tsx`
- Footer marketing menautkan kedua halaman.
- Email: **`NEXT_PUBLIC_SUPPORT_EMAIL`** (`.env.example`)

---

## 5) WhatsApp onboarding

1. `/dashboard/whatsapp/onboarding` — channel name, nomor, Meta App ID & Secret.
2. `POST /api/v1/whatsapp/meta/connect/init` → `oauthUrl` + `state`.
3. Redirect Meta → kembali dengan `code` + `state`.
4. `POST /api/v1/whatsapp/meta/connect/callback` — backend isi `meta_waba_id` / `meta_phone_number_id` via Graph bila ada.
5. `/dashboard/whatsapp` — kelola channel (disconnect/reconnect).

Webhook Meta dikonfigurasi di **backend** (`/api/v1/webhook/whatsapp` atau alias) — bukan URL Nest 3001.

---

## 6) AI Settings & zona waktu

1. `/dashboard/ai-settings` → `GET /api/v1/business/profile`.
2. Loading sampai `profile` ada — hindari flash timezone default.
3. `PATCH /api/v1/business/profile` — allowlist IANA di `lib/reporting-timezones.ts` (selaraskan dengan validasi api-go).

---

## 7) Dashboard overview (`/dashboard`)

Server load paralel (`lib/api/server.ts`):

- `GET /api/v1/auth/me` (via layout)
- `GET /api/v1/whatsapp/channels`
- `GET /api/v1/analytics/overview?days=30`
- `GET /api/v1/business/profile`
- `GET /api/v1/knowledge-base?page=1&pageSize=1` → `total`

Checklist “lengkapi profil” / “≥5 FAQ” / kartu “AI status”: `lib/business-profile-card-complete.ts`.

---

## 8) Halaman fitur & API client

| Halaman | Client | Endpoint utama |
|---------|--------|----------------|
| `/dashboard/inbox` | `lib/api/inbox.ts` | conversations, messages, handoff, SSE |
| `/dashboard/contacts` | `lib/api/leads.ts` | leads / contacts |
| `/dashboard/knowledge-base` | `lib/api/knowledge-base.ts` | FAQ CRUD |
| `/dashboard/team` | `lib/api/team.ts` | `GET/POST/DELETE /api/v1/team/members` |
| `/dashboard/catalog` | `lib/api/catalog.ts` | katalog produk |
| `/dashboard/orders` | `lib/api/orders.ts` | pesanan |
| `/dashboard/broadcast` | `lib/api/broadcast.ts` | broadcast (plan Business+) |
| `/dashboard/import` | `lib/api/import.ts` | preview → `jobId` → execute |
| `/dashboard/billing` | `billing`, `usage`, `payment` | overview, kuota, QRIS |
| `/dashboard/branches` | `lib/api/branches.ts` | cabang (Pro) |
| `/dashboard/workflow` | `lib/api/workflow.ts` | aturan keyword |
| `/dashboard/admin` | `lib/api/admin.ts` | super admin only |

Nav: `components/dashboard/sidebar-nav.tsx` · Plan: `hooks/use-plan.ts`.

### Plan gating (UI)

| `planCode` | Broadcast / workflow | Multi cabang |
|------------|----------------------|--------------|
| `starter` | hidden / disabled | hidden |
| `business`, `basic` | ✅ | ❌ |
| `pro` | ✅ | ✅ |

Enforcement kuat tetap di api-go (`entitlement`).

### Super admin (dev)

Register/login **`superadmin@gmail.com`** → role `super_admin` → `/dashboard/admin` (daftar tenant, impersonation).

---

## 9) Inbox realtime (SSE)

1. Hook `useInboxActivityStream` subscribe `GET /api/v1/inbox/stream` (`EventSource`, `withCredentials`).
2. Default URL: `window.location.origin` + `/api/v1/inbox/stream` (lewat rewrite).
3. Jika koneksi gagal berulang: set di `.env.local`:

```env
NEXT_PUBLIC_SSE_API_URL=http://localhost:4000
```

(`/api/v1` ditambahkan otomatis di `lib/env.ts`.)

4. Fallback: query inbox `refetchOnWindowFocus: 'always'`.

---

## 10) Perintah harian

```bash
# Sudah jalan dari kemarin — cukup:
cd ../api-go && encore run
cd web-frontend && npm run dev

# Setelah pull besar:
cd ../api-go && encore check
cd web-frontend && npm run build
```

Production build frontend: Node 18+, env `NEXT_PUBLIC_*` di-inline saat `npm run build`.

---

## 11) File yang sering disentuh

| Kebutuhan | File |
|-----------|------|
| Rewrite API | `next.config.ts` |
| Env terpusat | `lib/env.ts`, `.env.example` |
| Edge auth gate | `proxy.ts` |
| Server fetch + cookie | `lib/api/server.ts` |
| Client axios + envelope | `lib/api/client.ts` |
| Profil bisnis | `lib/api/business.ts`, `dashboard/ai-settings/page.tsx` |
| Plan gating | `hooks/use-plan.ts` |
| Dashboard shell | `app/(dashboard)/layout.tsx` |
| Sidebar | `components/dashboard/sidebar-nav.tsx` |

---

## 12) Troubleshooting frontend

| Gejala | Cek |
|--------|-----|
| Semua API gagal | `encore run`, `API_BACKEND_URL=http://localhost:4000` |
| Hanya server component gagal | `API_URL_INTERNAL`, log `getServerUser` |
| 401 terus | Secret JWT / Redis session; login ulang |
| CORS di dev | Pakai `/api/v1` same-origin, jangan hardcode `:4000` di axios |
| Inbox tidak push | `NEXT_PUBLIC_SSE_API_URL` |

Detail backend: **[../api-go/APP_FLOW_GUIDE.md](../api-go/APP_FLOW_GUIDE.md)**.
