# Drop loop routing AI Triage (self-heal only)

**Status:** PR (belum merge)

## Masalah / Kebutuhan

Mesin loop path-only (`CreateAITriageJob`, Mencurigakan, Investigasi, GHA `ai-triage-fix.yml`) tidak memperbaiki isi/keranjang dan mengunci `wantPath` produksi. Self-healing memakai tab Insiden + Composer behavior.

## Perubahan

- Hapus tab Mencurigakan dan Investigasi; default tab Insiden.
- Hapus tombol Jalankan loop di AI Review dan Laporan.
- Laporan hanya **Buka Insiden**.
- Client API tidak lagi memanggil `/admin/ai-triage/anomalies` atau `/admin/ai-triage/jobs`.

## File utama

- `app/(dashboard)/dashboard/admin/ai-triage/page.tsx`
- `lib/api/ai-triage.ts`

## Testing

- `nvm use 25.9.0 && npm run lint && npm run build`

## Catatan deploy

Merge setelah (atau bersama) PR api-go yang mencabut endpoint loop. Frontend lama yang masih POST `/jobs` akan 404.
