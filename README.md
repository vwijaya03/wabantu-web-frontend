# WABantu Web Frontend

Next.js 16 (App Router) + Tailwind v4 + shadcn/ui-style components.

Backend aktif: **[`../api-go/`](../api-go/)** (Encore, port **4000**, prefix **`/api/v1`**). Stack Nest **`../api/`** (port 3001) **tidak** dipakai oleh frontend ini.

Alur lengkap: **[APP_FLOW_GUIDE.md](./APP_FLOW_GUIDE.md)** · Backend: **[../api-go/README.md](../api-go/README.md)**.

---

## Untuk developer baru — checklist sebelum `npm run dev`

| # | Harus sudah ready | Cara cek |
|---|-------------------|----------|
| 1 | **Node.js 18+** (disarankan 20/22) | `node -v` — Next 16 tidak jalan di Node 14 |
| 2 | **api-go** sedang jalan | `curl -s http://localhost:4000/api/v1/health` → JSON OK |
| 3 | **Redis** (untuk session api-go) | `redis-cli ping` → `PONG` (lihat `../infra`) |
| 4 | File env frontend | `cp .env.example .env.local` (atau `.env`) |
| 5 | Dependencies terpasang | `npm install` |

**Urutan hari pertama:**

```bash
# Terminal 1 — Redis + API (detail: api-go/README.md)
cd ../infra && docker compose up -d redis
cd ../api-go && encore auth login && ./scripts/setup-secrets-from-env.sh && encore run

# Terminal 2 — Frontend
cd web-frontend
cp .env.example .env.local
npm install
npm run dev
```

Buka **http://localhost:3000** → `/register` atau `/login` → `/dashboard`.

Super admin dev: daftar/login dengan **`superadmin@gmail.com`** → menu **Admin** di sidebar.

---

## Environment variables

| Variabel | Default dev | Keterangan |
|----------|-------------|------------|
| `NEXT_PUBLIC_API_URL` | `/api/v1` | Base URL browser (same-origin; hindari CORS) |
| `API_BACKEND_URL` | `http://localhost:4000` | Target rewrite Next (`next.config.ts`) |
| `API_URL_INTERNAL` | `http://localhost:4000` | Server Components; `/api/v1` ditambah otomatis (`lib/env.ts`) |
| `NEXT_PUBLIC_SSE_API_URL` | (kosong) | Opsional: SSE inbox langsung ke API (mis. `http://localhost:4000`) |
| `NEXT_PUBLIC_APP_NAME` | `WABantu` | Branding |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | — | Email di halaman legal |

**Jangan** arahkan ke Nest: `API_BACKEND_URL=http://localhost:3001` akan memanggil stack lama.

Copy template: `.env.example` → `.env.local` (gitignore) atau pakai `.env` yang sudah ada.

---

## Route structure

```
app/
├── layout.tsx                 # Root layout (Theme + Query providers, Toaster)
├── global-error.tsx           # Standalone fallback (no providers)
├── (marketing)/               # Public marketing site
│   ├── layout.tsx             # Top nav + footer (links: Privasi, Penghapusan data)
│   ├── page.tsx               # Landing
│   ├── pricing/page.tsx
│   ├── privacy/page.tsx       # /privacy — kebijakan privasi (Meta / umum)
│   └── data-deletion/page.tsx # /data-deletion — instruksi penghapusan data
├── (auth)/                    # Login / register split layout
│   ├── layout.tsx
│   ├── login/page.tsx
│   └── register/page.tsx
└── (dashboard)/               # Protected (force-dynamic)
    ├── layout.tsx             # Sidebar + topbar + AuthProvider seeded from server
    └── dashboard/
        ├── page.tsx           # Overview
        ├── inbox/
        ├── contacts/
        ├── ai-settings/       # Business profile form
        ├── knowledge-base/    # FAQ CRUD
        ├── whatsapp/          # Channel management
        │   └── onboarding/    # OAuth onboarding + help page
        ├── analytics/
        ├── billing/
        ├── team/
        ├── catalog/             # Katalog produk
        ├── orders/              # Pesanan
        ├── broadcast/           # Broadcast WA (Business+)
        ├── import/              # Import CSV/XLSX
        ├── branches/            # Multi cabang (Pro)
        ├── workflow/            # Rule automation (Business+)
        └── admin/               # Super admin
```

Route groups (`(marketing)`, `(auth)`, `(dashboard)`) keep URLs flat
(`/`, `/login`, `/dashboard/...`) while letting each group own its
layout, providers, and auth gate.

## Auth

- API issues an HttpOnly cookie `wabantu_at` on login/register
- `/login` now does server-side session check (`getServerUser()`); active
  sessions are redirected to `/dashboard`
- `proxy.ts` (Next.js 16's renamed middleware) does an optimistic edge
  redirect: visiting `/dashboard/*` without the cookie bounces to
  `/login`
- The dashboard layout calls `getServerUser()` (forwards cookies to
  `GET /auth/me`) and either redirects or seeds `AuthProvider` with
  the resolved user — so client code never sees a "loading" first
  render
- Logout catches network failures and still clears local auth state +
  redirects to `/login`

## Legal & support URLs

- **`NEXT_PUBLIC_SUPPORT_EMAIL`** (see `.env.example`) — used in legal/copy where a contact email is required; defaults to a sensible placeholder if unset.

## Plan gating (sidebar / halaman)

`hooks/use-plan.ts` memuat `GET /api/v1/billing/overview`:

| Plan | Broadcast & workflow | Multi cabang |
|------|----------------------|--------------|
| `starter` | ❌ | ❌ |
| `business` / `basic` | ✅ | ❌ |
| `pro` | ✅ | ✅ |

Halaman tetap bisa diakses manual lewat URL; enforcement utama di API (`entitlement`).

---

## Flow guide

Lihat **`APP_FLOW_GUIDE.md`** (auth, rewrite API, WhatsApp OAuth, inbox SSE, halaman baru).

## WhatsApp onboarding (OAuth-only)

- New sellers are guided via `/dashboard/whatsapp/onboarding`
- Required input in onboarding:
  - channel name
  - WhatsApp business number
  - `Meta App ID`
  - `Meta App Secret`
- Frontend generates OAuth URL via `POST /whatsapp/meta/connect/init`
- After Meta redirects with `code/state`, frontend auto-calls
  `POST /whatsapp/meta/connect/callback`
- `/dashboard/whatsapp` is now focused on connected channel management
  (Disconnect/Reconnect)
- Dashboard overview: setup checklist and “AI status” read server data —
  WhatsApp from `/whatsapp/channels`, business profile from
  `/business/profile`, FAQ count from `/knowledge-base` (see
  `lib/api/server.ts`, `lib/business-profile-card-complete.ts`)

## Data fetching

- `lib/api/client.ts` — shared axios instance with `withCredentials: true`,
  unwraps the `{ success, data }` envelope, redirects on 401
- `lib/api/business.ts` — `GET`/`PATCH` business profile; normalizes
  `reportingTimezone` from camelCase or `reporting_timezone`, trims values,
  and ignores empty strings so the real zone is not lost
- Mutations use `@tanstack/react-query` (`useMutation` + `invalidateQueries`)
- Forms use `react-hook-form` + `zod` resolver

## AI Settings (`/dashboard/ai-settings`)

- Loads `GET /api/v1/business/profile` via React Query; the page shows a short
  loading state until `profile` exists, then mounts the form with
  `defaultValues: toFormValues(profile)` so the default timezone is not a
  spurious `Asia/Jakarta` flash.
- `useLayoutEffect` + `reset(toFormValues(profile))` keeps the form aligned when
  the cached profile updates (e.g. after save).
- Reporting timezone dropdown uses the IANA allowlist in
  `lib/reporting-timezones.ts` (must match the API allowlist). Radix `Select`
  uses an explicit `SelectValue` label from `reportingTimezoneTriggerLabel` so
  the trigger text stays correct after route changes (portal/unmounted items).

## UI primitives

`components/ui/` ships with the shadcn/ui-style components used by the
app: `Button`, `Input`, `Textarea`, `Label`, `Card`, `Badge`,
`Dropdown`, `Avatar`, `Separator`, `Skeleton`, `Sonner Toaster`. Theme
variables live in `app/globals.css` using the Tailwind v4 CSS-first
config + OKLCH color tokens, including a separate `--sidebar-*` palette
so the dashboard frame can have its own accent shade.

## Branding

Tweak `--primary`, `--ring`, and `--sidebar-primary` in
`app/globals.css` to rebrand. The default is a WhatsApp-inspired
emerald.

## Scripts

```bash
npm run dev      # Dev server :3000 (butuh api-go :4000)
npm run build    # Production build — butuh Node 18+
npm run start    # Serve the built output
npm run lint     # Next ESLint config
```

## Troubleshooting

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| API 404 / network error | `encore run` belum jalan | Jalankan `api-go` dulu |
| Login loop | Cookie invalid + proxy | Clear cookie `wabantu_at`; cek `API_BACKEND_URL` |
| Dashboard kosong / redirect login | `getServerUser` gagal | Pastikan `API_URL_INTERNAL` → api-go; lihat `lib/env.ts` |
| Inbox tidak real-time | SSE via rewrite | Set `NEXT_PUBLIC_SSE_API_URL=http://localhost:4000` |
| `npm run build` syntax error | Node 14 | `nvm use 20` atau 22 |

## Docker (standalone deploy unit)

The frontend ships its own `Dockerfile` (multi-stage, Next.js standalone
output) and `docker-compose.yml`, so it can be built and shipped
independently of the API or the infra services.

```bash
# Build & start the web container:
cd web-frontend && docker compose up -d --build
```

`NEXT_PUBLIC_*` values are inlined into the JS bundle at build time, so
they are passed via `--build-arg` from the compose file. Pick the API
URL the bundle should ship with via the host shell:

```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.id/api/v1 \
  docker compose build
```

`API_URL_INTERNAL` (used by server components like the dashboard's
`getServerUser()`) is read at runtime from `environment:` and defaults
to `http://wabantu-api-go:4000` (with `/api/v1` appended automatically)
so the container can reach **Encore api-go** on `wabantu_net` without a
public hop. Do not point the frontend at the legacy Nest `api/` service.

## Notes for Next.js 16 specifically

- `middleware.ts` is now `proxy.ts`; signature is identical
- `params` and `searchParams` are `Promise`-based — `await` them in pages
- Use `useSearchParams` only inside a `<Suspense>` boundary, otherwise
  the prerender step bails out
- For ngrok/dev external origin access, `next.config.ts` includes
  `allowedDevOrigins`
- Browser API requests use same-origin `/api/v1` by default and rely on
  Next rewrites to **`http://localhost:4000/api/v1`** (Encore `api-go`) in dev
