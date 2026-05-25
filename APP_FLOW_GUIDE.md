# WABantu Web Flow Guide (Next.js)

Panduan **alur frontend** untuk developer baru: apa yang harus sudah jalan, bagaimana UI memanggil **api-go** (Encore), dan di mana file kodenya.

| Dokumen terkait | Isi |
|-----------------|-----|
| [README.md](./README.md) | Route, env, Docker, troubleshooting singkat |
| [DEVELOPER_DOCUMENTATION.md](./DEVELOPER_DOCUMENTATION.md) | Arsitektur FE + panduan React/Next untuk pemula |
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
┌─────────────┐   Authorization: Bearer      ┌──────────────┐     rewrite      ┌─────────────┐
│   Browser   │ ───────────────────────────► │  Next :3000  │ ───────────────► │ api-go :4000 │
│ axios + RQ  │   (token di sessionStorage)  │ next.config  │ API_BACKEND_URL  │   Encore    │
└─────────────┘                              └──────────────┘                  └─────────────┘
       │
       │  EventSource /inbox/stream?access_token=…  (dev: sering langsung ke :4000)
       └──────────────────────────────────────────────────────────────────────────────►
```

| Lapisan | File | Base URL |
|---------|------|----------|
| Browser REST | `lib/api/client.ts` | `env.apiUrl` → `/api/v1` + Bearer header |
| Token | `lib/auth/session.ts` | `sessionStorage` key `wabantu_access_token` |
| Rewrite | `next.config.ts` | `/api/v1/:path*` → `${API_BACKEND_URL}/api/v1/:path*` |
| SSE inbox | `hooks/use-inbox-activity-stream.ts` | `env.sseApiUrl` atau same-origin `/api/v1/inbox/stream` |
| Auth gate UI | `components/dashboard/dashboard-auth-shell.tsx` | `GET /auth/me` setelah token ada |

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

1. Login/register: `POST /api/v1/auth/login` | `register` via `lib/api/auth.ts` → simpan **`accessToken`** ke **`sessionStorage`** (`lib/auth/session.ts`).
2. Axios (`lib/api/client.ts`) menambahkan **`Authorization: Bearer <token>`** pada setiap request API.
3. **`app/(dashboard)/layout.tsx`** → **`DashboardAuthShell`**: tanpa token → `/login?next=…`; dengan token → **`authApi.me()`** → render sidebar + **`AuthProvider`**.
4. **`LoginSessionGate`** di `/login`: jika token masih valid → redirect ke `next` atau `/dashboard`.
5. Setelah login: **`window.location.assign`** (bukan hanya `router.push`) supaya shell bersih.
6. **`proxy.ts`**: pass-through — **tidak** memeriksa cookie/token di edge.
7. Logout: `POST /api/v1/auth/logout` + `clearClientSession()` + redirect `/login`.

**401:** interceptor axios menghapus token dan redirect sekali (`authRedirectInFlight`) — hindari loop di halaman login.

Diagram lengkap: [DEVELOPER_DOCUMENTATION.md](./DEVELOPER_DOCUMENTATION.md) bagian 8.

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

Halaman **client** (`"use client"`) — React Query paralel di `app/(dashboard)/dashboard/page.tsx`:

- User dari **`useAuth()`** (di-seed oleh `DashboardAuthShell`)
- `GET /api/v1/whatsapp/channels`
- `GET /api/v1/analytics/overview?days=30`
- `GET /api/v1/business/profile`
- `GET /api/v1/knowledge-base` (total FAQ)

Checklist “lengkapi profil” / “≥5 FAQ” / kartu “AI status”: `lib/business-profile-card-complete.ts`.

---

## 8) Halaman fitur & API client

| Halaman | Client | Endpoint utama |
|---------|--------|----------------|
| `/dashboard/inbox` | `lib/api/inbox.ts` | conversations, messages, handoff, SSE |
| `/dashboard/contacts` | `lib/api/leads.ts` | leads / contacts |
| `/dashboard/knowledge-base` | `lib/api/knowledge-base.ts` | FAQ CRUD |
| `/dashboard/team` | `lib/api/team.ts` | `GET/POST/DELETE /api/v1/team/members` |
| `/dashboard/catalog` | `lib/api/catalog.ts` | katalog produk (CRUD manual) |
| `/dashboard/catalog/import-image` | `lib/api/catalogImage.ts`, `lib/catalog-image-limits.ts` | Multi-screenshot (≤ **5** file, **5 MB**/file, **20 MB** total) → AI (Haiku) → pratinjau editable → commit; pakai kuota `ai_token` di preview saja. Backend: [api-go/docs/CATALOG_IMAGE_IMPORT.md](../api-go/docs/CATALOG_IMAGE_IMPORT.md) |
| `/dashboard/orders` | `lib/api/orders.ts` | pesanan |
| `/dashboard/broadcast` | `lib/api/broadcast.ts` | broadcast (Business+ berbayar; trial dengan kuota) |
| `/dashboard/import` | `lib/api/import.ts` | preview → `jobId` → execute |
| `/dashboard/billing` | `billing`, `usage`, `payment` | overview, kuota, QRIS, AI top-up 20rb/30rb |
| `/dashboard/branches` | `lib/api/branches.ts` | cabang (Pro) |
| `/dashboard/workflow` | `lib/api/workflow.ts` | aturan keyword — list, buat, **edit** (`PATCH`), **hapus** (`DELETE`); konfirmasi pakai `AlertDialog` |
| `/dashboard/finance` | `lib/api/finance.ts` | dashboard keuangan — ringkasan saldo, alert pending |
| `/dashboard/finance/transactions` | `lib/api/finance.ts` | list + filter + approve/reject transaksi |
| `/dashboard/finance/wallets` | `lib/api/finance.ts` | CRUD dompet + saldo |
| `/dashboard/finance/budget` | `lib/api/finance.ts` | anggaran per kategori + progress bar |
| `/dashboard/finance/investment` | `lib/api/finance.ts` | portofolio aset, P&L, update harga manual |
| `/dashboard/finance/recurring` | `lib/api/finance.ts` | transaksi berulang (auto/reminder) |
| `/dashboard/finance/checklist` | `lib/api/finance.ts` | checklist harian + template |
| `/dashboard/finance/reports` | `lib/api/finance.ts` | perbandingan bulanan + export CSV/PDF |
| `/dashboard/admin/ai-activity` | `lib/api/ai-activity.ts` | log AI per tenant — **super_admin** only |
| `/dashboard/admin` | `lib/api/admin.ts` | super admin only — search/pagination tenant, pantau, override paket, delete tenant |

Nav: `components/dashboard/sidebar-nav.tsx` · Plan: `hooks/use-plan.ts`.

### Plan gating (UI)

**→ [LIMITS_AND_QUOTAS.md](./LIMITS_AND_QUOTAS.md)**

| Kondisi | Broadcast / workflow | Multi cabang |
|---------|----------------------|--------------|
| **Trial** (`subscription.isTrial`) | ✅ | ✅ |
| `starter` (berbayar) | ❌ / pesan upgrade | ❌ |
| `business` | ✅ | ❌ |
| `pro` | ✅ | ✅ |

Enforcement kuat di api-go (`entitlement` + kuota `usage`). Billing: checkout `pending` → QRIS → invoice `paid`.

### Super admin (operator platform)

1. Akun internal via bootstrap API (`POST /api/v1/internal/platform-admin/bootstrap`) — lihat `api-go/README.md`.
2. Login → default ke **Konsol Platform** (`/dashboard/admin`).
3. **Pantau** tenant → banner kuning → menu tenant (Inbox, Workflow, Cabang, Finance, …) aktif.
4. Admin bisa search/pagination daftar tenant, override paket (`starter`/`business`/`pro`), atau delete tenant permanen dengan konfirmasi nama schema.
5. **Migrasi schema tenant** (tombol di admin) atau `encore exec ./cmd/migrate-tenant-schemas` di `api-go` setelah deploy modul baru (mis. Finance).
6. Tanpa impersonate: Workflow/Cabang **tidak** di sidebar; URL tenant diarahkan ke admin dengan petunjuk `?needTenant=1`.

> Pola lama `superadmin@gmail.com` saat register sudah tidak dipakai untuk akun tanpa toko.

---

## 9) Inbox realtime (SSE)

1. `InboxActivityBridge` memasang hook **`useInboxActivityStream`** di seluruh dashboard.
2. `EventSource` ke `GET /api/v1/inbox/stream?access_token=<JWT>` — browser **tidak bisa** set header Authorization pada SSE.
3. **Dev:** `lib/env.ts` default SSE ke `http://localhost:4000/api/v1` (bypass rewrite Next yang sering mem-buffer stream).
4. Opsional production/dev override:

```env
NEXT_PUBLIC_SSE_API_URL=http://localhost:4000
```

(`/api/v1` ditambahkan otomatis di `lib/env.ts`.)

5. Pada event (kecuali `ping`): `invalidateQueries` untuk `inbox-unread-summary`, `inbox-conversations`, `inbox-messages`.
6. Fallback: query inbox `refetchOnWindowFocus: 'always'`.

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
| Edge hook (no-op) | `proxy.ts` |
| JWT session | `lib/auth/session.ts` |
| Client axios + Bearer + envelope | `lib/api/client.ts` |
| Auth gate + layout | `components/dashboard/dashboard-auth-shell.tsx`, `app/(dashboard)/layout.tsx` |
| Auth context | `components/providers/auth-provider.tsx` |
| SSE inbox | `hooks/use-inbox-activity-stream.ts`, `components/dashboard/inbox-activity-bridge.tsx` |
| Profil bisnis | `lib/api/business.ts`, `dashboard/ai-settings/page.tsx` |
| Plan gating | `hooks/use-plan.ts` |
| Sidebar | `components/dashboard/sidebar-nav.tsx` |

---

## 12) Troubleshooting frontend

| Gejala | Cek |
|--------|-----|
| Semua API gagal | `encore run`, `API_BACKEND_URL=http://localhost:4000` |
| Redirect login loop | Token di `sessionStorage`; interceptor 401; Redis api-go |
| 401 terus | Secret JWT / Redis session; login ulang; tab yang sama |
| CORS di dev | REST: pakai `/api/v1` same-origin; SSE boleh langsung ke `:4000` |
| Inbox tidak push | Network → `inbox/stream` open; `NEXT_PUBLIC_SSE_API_URL` |

Detail backend: **[../api-go/APP_FLOW_GUIDE.md](../api-go/APP_FLOW_GUIDE.md)**.
