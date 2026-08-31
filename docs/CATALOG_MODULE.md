# Modul Katalog (Dashboard)

Dokumentasi UI dan integrasi frontend untuk manajemen produk tenant (`business_catalog_item`).

Backend API: lihat `api-go/README.md` § Katalog produk, [PRICE_TYPES_AND_CATALOG_PRICING.md](../../api-go/docs/PRICE_TYPES_AND_CATALOG_PRICING.md), [CATALOG_IMAGE_IMPORT.md](../../api-go/docs/CATALOG_IMAGE_IMPORT.md), [CATALOG_TEXT_IMPORT.md](../../api-go/docs/CATALOG_TEXT_IMPORT.md).

## Route

| Path | Fungsi |
|------|--------|
| `/dashboard/catalog` | List produk — CRUD, duplikat, bulk delete, refresh |
| `/dashboard/catalog/price-types` | CRUD tipe harga (umum, reseller, kustom) |
| `/dashboard/catalog/import-image` | Import screenshot → AI vision → konfirmasi |
| `/dashboard/catalog/import-text` | Import teks/caption → AI → konfirmasi |

Import CSV/XLSX tetap di `/dashboard/import` (bukan sub-route katalog).

## Halaman list (`catalog/page.tsx`)

### Layout & tabel

- Tabel Shadcn **full-width** dengan kolom: checkbox, nama, SKU, harga efektif, satuan, status, aksi.
- SKU panjang di-**truncate** dengan tooltip hover untuk teks penuh.
- Mobile: kartu per produk (bukan tabel).

### Pencarian & pagination

- Search dan pagination **server-side** (`catalogApi.list({ q, page, pageSize })`).
- Default `pageSize` 25 — jangan fetch semua SKU (tenant bisa puluhan ribu item).

### Aksi per baris

| Aksi | Perilaku |
|------|----------|
| Edit | Buka Sheet form dengan data produk |
| Duplikat | Sheet create pre-fill; SKU baru dari `generateSkuFromProductName` |
| Hapus | Konfirmasi → `catalogApi.remove(id)` |

### Bulk delete

- Toolbar muncul saat ada baris terpilih.
- Hapus paralel (`Promise.all` loop `catalogApi.remove`) — **tidak** ada endpoint batch delete backend.

### Refresh

- Tombol refresh memanggil `refetch()` query list; icon berputar saat `isFetching`.

### Form produk (Sheet)

- Komponen: `components/catalog/*`, util `lib/catalog/form.ts`.
- Multi-harga per tipe (`prices[]`) — sinkron dengan `business_price_type`.
- Deskripsi: **rich markdown editor** (`description-rich-editor.tsx`) — toolbar bold/italic/list + tab preview.

## Import gambar (`import-image/page.tsx`)

- Client: `lib/api/catalogImage.ts`, limit: `lib/catalog-image-limits.ts`.
- Wizard: upload → preview AI → edit draft → commit.
- Draft table: `catalog-import-draft-table.tsx` (shared dengan import teks).
- Banner kuota `ai_token` dari `usage/summary`.

## Import teks (`import-text/page.tsx`)

- Client: `lib/api/catalogText.ts`.
- Alur sama import gambar: tempel teks (10–12.000 karakter) → preview → edit → commit.
- Validasi panjang di client sebelum hit API.
- Deskripsi per baris draft bisa diedit dengan rich markdown editor.

## Komponen bersama

| File | Peran |
|------|--------|
| `catalog-import-draft-table.tsx` | Tabel editable draft (include toggle, SKU, nama, harga, unit, deskripsi) |
| `description-rich-editor.tsx` | Textarea + toolbar markdown + preview |
| `lib/markdown/simple.ts` | Render markdown sederhana untuk preview |

## API client (`lib/api/catalog.ts`)

- `list`, `create`, `update`, `remove` — JWT owner/tenant.
- List dengan `contactId` opsional untuk `effectiveSellPrice` per kontak.

## Catatan integrasi

- Setelah commit import (gambar/teks), invalidate query `['catalog']` agar list ter-update.
- Soft delete di backend — SKU yang dihapus bisa dipakai lagi untuk produk baru dengan `source` yang sama.
- Indexing RAG katalog otomatis lewat CRUD manual; import AI commit belum trigger outbox (lihat shipped note api-go).

## Changelog UI (2026-08-31)

- Revamp tabel + Sheet form + duplikat + bulk delete + refresh.
- Halaman import teks + editor deskripsi markdown.
- Shared draft table antara import gambar dan teks.
