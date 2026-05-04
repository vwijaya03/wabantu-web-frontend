# WABantu Web Frontend

Next.js 16 (App Router) + Tailwind v4 + shadcn/ui-style components.

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
        └── team/
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

## Flow guide

For the same “how does this app hang together” narrative as the API guide, see **`APP_FLOW_GUIDE.md`** in this folder (marketing vs dashboard, cookies, WhatsApp onboarding).

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
npm run dev      # Turbopack dev server
npm run build    # Production build (NODE_ENV=production assumed)
npm run start    # Serve the built output
npm run lint     # Next ESLint config
```

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
to `http://wabantu-api:3001/api/v1` so the container can reach the API
through the shared `wabantu_net` network without a public hop.

## Notes for Next.js 16 specifically

- `middleware.ts` is now `proxy.ts`; signature is identical
- `params` and `searchParams` are `Promise`-based — `await` them in pages
- Use `useSearchParams` only inside a `<Suspense>` boundary, otherwise
  the prerender step bails out
- For ngrok/dev external origin access, `next.config.ts` includes
  `allowedDevOrigins`
- Browser API requests use same-origin `/api/v1` by default and rely on
  Next rewrites to `http://localhost:3001/api/v1` in dev
