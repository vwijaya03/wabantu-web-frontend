# Guidance Pribadi — Roadmap F&B

Halaman baca pribadi untuk plan "Roadmap 100 Juta" (F&B Korean Chicken Grill) agar mudah dibaca dan bahan resep mudah dicari saat belanja/masak.

> Ini konten pribadi (route group `(personal)`), bukan fitur tenant WABantu. Halaman `noindex, nofollow`.

## Route & endpoint

| Jenis | Path | Keterangan |
|-------|------|------------|
| Halaman | `/guidance/roadmap` | Server component + reader client (`RoadmapGuidanceReader`) |
| Endpoint | `GET /api/guidance/roadmap` | Next.js route handler; return JSON konten guidance, `Cache-Control: no-store`, tanpa auth |

## Sumber data

Konten dimodelkan sebagai typed const di [`lib/guidance/roadmap-fnb.ts`](../lib/guidance/roadmap-fnb.ts) (`RoadmapGuidance`), mengikuti pola `lib/portfolio/wabantu.ts` dan `lib/resume/content.ts`. **Update konten = edit file ini** — endpoint dan UI otomatis ikut.

Struktur utama: `meta`, `numbers`, `strategy`, `heroMenu`, `flavor`, `sauce`, `recipe` (ingredientGroups + stepGroups + troubleshooting), `halal` (swaps + shoppingChecklist), `practice`, `phases`, `moneyRules`, `ninetyDays`, `principles`, `techRole`.

## Fitur UI (`components/personal/guidance/roadmap-reader.tsx`)

- **Search** semua konten (bahan, langkah, aturan, fase) — hasil flat dengan badge section, klik untuk lompat ke section.
- **Checklist bahan** dengan persist `localStorage` (`guidance-roadmap-checked-v1`) + progress dicentang.
- **Salin daftar belanja** — copy bahan yang belum dicentang ke clipboard (format teks siap kirim WA).
- Nav chip anchor per section, sticky header, gaya personal pages (palet `neutral-*`, bukan token shadcn dashboard).

## Catatan privasi

Endpoint dan halaman tidak pakai auth (konsisten dengan endpoint personal lain seperti `/api/resume/docx`), hanya `noindex`. Konten berisi angka target pribadi — kalau perlu benar-benar privat, tambahkan gate auth atau pindahkan datanya keluar repo.
