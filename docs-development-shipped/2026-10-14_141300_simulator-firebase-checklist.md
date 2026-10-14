# Checklist: Simulator demo + Firebase (mirror)

**Status:** Mirror ops — detail backend di [`api-go/docs-development-shipped/2026-10-14_141300_simulator-firebase-checklist.md`](../../api-go/docs-development-shipped/2026-10-14_141300_simulator-firebase-checklist.md).

## Env Vercel (wajib untuk realtime)

Dari [`lib/firebase/config.ts`](../lib/firebase/config.ts):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Semua harus non-kosong agar `isFirebaseConfigured()` true; jika tidak, inbox memakai polling.

## Rules & simulator

- **Firestore rules:** file di repo api-go → `api-go/firestore.rules`.
- **Simulator allowlist:** env Encore `SimulatorTenantAllowlist` (tenant demo).
- **Sesi:** owner/staff demo; super_admin dengan tenant dipilih; admin platform / Pantau → lihat catatan api-go (#217).

## Pesanan

`/dashboard/orders` — refresh **manual**, bukan listener Firestore. Mode **Pantau**: Setujui disabled (`readOnly` impersonation + `order-approve-button.tsx`).
