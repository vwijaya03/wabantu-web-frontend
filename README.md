# WABantu Web Frontend

Next.js 16 (App Router) + Tailwind v4 + shadcn/ui-style components.

## Route structure

```
app/
├── layout.tsx                 # Root layout (Theme + Query providers, Toaster)
├── global-error.tsx           # Standalone fallback (no providers)
├── (marketing)/               # Public marketing site
│   ├── layout.tsx             # Top nav + footer
│   ├── page.tsx               # Landing
│   └── pricing/page.tsx
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
        ├── analytics/
        ├── billing/
        └── team/
```

Route groups (`(marketing)`, `(auth)`, `(dashboard)`) keep URLs flat
(`/`, `/login`, `/dashboard/...`) while letting each group own its
layout, providers, and auth gate.

## Auth

- API issues an HttpOnly cookie `wabantu_at` on login/register
- `proxy.ts` (Next.js 16's renamed middleware) does an optimistic edge
  redirect: visiting `/dashboard/*` without the cookie bounces to
  `/login`; visiting `/login` or `/register` while logged-in bounces
  to `/dashboard`
- The dashboard layout calls `getServerUser()` (forwards cookies to
  `GET /auth/me`) and either redirects or seeds `AuthProvider` with
  the resolved user — so client code never sees a "loading" first
  render

## Data fetching

- `lib/api/client.ts` — shared axios instance with `withCredentials: true`,
  unwraps the `{ success, data }` envelope, redirects on 401
- Mutations use `@tanstack/react-query` (`useMutation` + `invalidateQueries`)
- Forms use `react-hook-form` + `zod` resolver

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
