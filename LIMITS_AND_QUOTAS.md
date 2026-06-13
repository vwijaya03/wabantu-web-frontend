# Batasan sistem — web-frontend

Ringkasan untuk tim UI/UX & onboarding. **Detail lengkap & angka kuota:** [`../api-go/LIMITS_AND_QUOTAS.md`](../api-go/LIMITS_AND_QUOTAS.md).

---

## Trial (7 hari)

- **Semua menu fitur terbuka** (`hooks/use-plan.ts` + enforcement api-go `entitlement`).
- **Kuota ketat** — jauh di bawah Starter berbayar (lihat tabel di api-go doc bagian 2.2).
- Halaman Billing menampilkan: *"Trial — semua fitur aktif (Broadcast, Workflow, CRM, AI hybrid, Cabang)"*.
- Pemakaian bulan ini: label plan **`trial`** di `GET /usage/summary`.

## Paket berbayar (gate UI)

| Kondisi | Broadcast & Workflow | Multi cabang | CRM leads |
|---------|----------------------|--------------|-----------|
| **Trial** | ✅ (kuota ketat) | ✅ | ✅ |
| **Starter** | ❌ | ❌ | ❌ |
| **Business** | ✅ | ❌ | ✅ |
| **Pro** | ✅ (kuota **10.000** kontak/bulan) | ✅ | ✅ |

**Pro — angka pasti (bukan “lebih besar”):** 10 channel, 10 seat, 20.000 percakapan AI, 30 juta token AI, 10.000 broadcast, 10 GB storage, 5.000 workflow. Bandingkan Business: 2 / 3 / 6.000 / 8 juta / 500 / 2 GB / 500.

**Unit economics (biaya Meta + Anthropic):** [`../api-go/docs/UNIT_ECONOMICS_AND_PRICING.md`](../api-go/docs/UNIT_ECONOMICS_AND_PRICING.md).

**Owner/staff:** halaman broadcast/workflow/branches bisa dibuka lewat URL; API menolak jika paket tidak berhak atau kuota habis.

**Super admin tanpa impersonate:** menu tenant (Workflow, Cabang, Finance, Inbox, …) **disembunyikan**; akses langsung ke URL diarahkan ke `/dashboard/admin?needTenant=1`. Klik **Pantau** pada tenant dulu.

**Finance module:** tersedia semua paket tenant (termasuk trial). Tidak ada gating paket untuk fitur dasar finance. Lihat [docs/FINANCE_MODULE.md](./docs/FINANCE_MODULE.md).

## Billing UI

- Pilih paket → invoice **`pending`** + buka QRIS (bukan ganti paket langsung).
- **Riwayat invoice** hanya setelah **lunas** (`paid`).
- Banner kuning jika ada `pendingCheckout` di overview.
- **Kuota bulan ini:** `/dashboard/billing` → `UsageQuotaPanel` (progress bar per `event_type`); ringkas di `/dashboard` (owner).
- **AI Top-up:** owner bisa beli top-up 20rb/30rb untuk `ai_token` + `ai_conversation`; aktif setelah QRIS lunas, berlaku hanya bulan berjalan, dan tidak menambah broadcast/storage/seat.
- **WhatsApp Meta (bukan kuota WABantu):** [docs/META_WHATSAPP_MESSAGING_AND_BILLING.md](./docs/META_WHATSAPP_MESSAGING_AND_BILLING.md) · api-go: [../api-go/docs/META_WHATSAPP_MESSAGING_AND_BILLING.md](../api-go/docs/META_WHATSAPP_MESSAGING_AND_BILLING.md).

## Rate limit (HTTP 429)

- Toast + banner dashboard saat terlalu banyak request.
- Bukan logout — pesan: tunggu ~1 menit, tombol **Coba lagi**.
- Kode: `lib/api/rate-limit.ts`, `components/dashboard/dashboard-rate-limit-notice.tsx`.

---

Dokumen produk/onboarding: [`ONBOARDING_AND_PRODUCT_GUIDE.md`](./ONBOARDING_AND_PRODUCT_GUIDE.md) bagian 9.  
Dokumen developer: [`DEVELOPER_DOCUMENTATION.md`](./DEVELOPER_DOCUMENTATION.md) bagian 7.5.

