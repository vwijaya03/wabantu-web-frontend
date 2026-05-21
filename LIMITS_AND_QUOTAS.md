# Batasan sistem — web-frontend

Ringkasan untuk tim UI/UX & onboarding. **Detail lengkap & angka kuota:** [`../api-go/LIMITS_AND_QUOTAS.md`](../api-go/LIMITS_AND_QUOTAS.md).

---

## Trial (7 hari)

- **Semua menu fitur terbuka** (`hooks/use-plan.ts` + enforcement api-go `entitlement`).
- **Kuota ketat** — jauh di bawah Starter berbayar (lihat tabel di api-go doc §2.2).
- Halaman Billing menampilkan: *"Trial — semua fitur aktif (Broadcast, Workflow, CRM, AI hybrid, Cabang)"*.
- Pemakaian bulan ini: label plan **`trial`** di `GET /usage/summary`.

## Paket berbayar (gate UI)

| Kondisi | Broadcast & Workflow | Multi cabang | CRM leads |
|---------|----------------------|--------------|-----------|
| **Trial** | ✅ (kuota ketat) | ✅ | ✅ |
| **Starter** | ❌ | ❌ | ❌ |
| **Business** | ✅ | ❌ | ✅ |
| **Pro** | ✅ | ✅ | ✅ |

Halaman broadcast/workflow/branches tetap bisa dibuka lewat URL; API menolak jika tidak berhak / kuota habis.

## Billing UI

- Pilih paket → invoice **`pending`** + buka QRIS (bukan ganti paket langsung).
- **Riwayat invoice** hanya setelah **lunas** (`paid`).
- Banner kuning jika ada `pendingCheckout` di overview.

## Rate limit (HTTP 429)

- Toast + banner dashboard saat terlalu banyak request.
- Bukan logout — pesan: tunggu ~1 menit, tombol **Coba lagi**.
- Kode: `lib/api/rate-limit.ts`, `components/dashboard/dashboard-rate-limit-notice.tsx`.

---

Dokumen produk/onboarding: [`ONBOARDING_AND_PRODUCT_GUIDE.md`](./ONBOARDING_AND_PRODUCT_GUIDE.md) §9.  
Dokumen developer: [`DEVELOPER_DOCUMENTATION.md`](./DEVELOPER_DOCUMENTATION.md) §7.5.
