# Shipped: UI Bukti Transfer + Buka Batas (Fase 2)

**Status:** Siap merge  
**Branch:** `feat/payment-proof-ui`  
**PR:** [#32](https://github.com/vwijaya03/wabantu-web-frontend/pull/32)  
**Tanggal:** 2026-06  
**Backend:** [api-go PR #46](https://github.com/vwijaya03/wabantu-api-go/pull/46) — [`api-go/docs-development-shipped/payment-proof-fase2.md`](../../api-go/docs-development-shipped/payment-proof-fase2.md)

---

## Apa yang di-ship

1. **Panel bukti transfer** di dialog detail pesanan (Orders).
2. **Badge & filter** status pembayaran di daftar pesanan.
3. **Verifikasi / Tolak** bukti (owner) dengan `ConfirmDialog` / `PromptDialog`.
4. **Banner blocked** + tombol **Buka batas bukti** setelah 5x penolakan.
5. **AI Settings** — mode verifikasi manual vs auto-verify.

---

## Status pembayaran (`paymentStatus`)

| Nilai | Badge | Filter daftar |
|-------|-------|---------------|
| `unpaid` | Belum ada bukti | Belum ada bukti transfer |
| `proof_submitted` | Perlu dicek | Bukti perlu dicek |
| `verified` | Sudah dibayar | Pembayaran sudah OK |
| `rejected` | Bukti ditolak | Bukti transfer ditolak |

Konstanta & helper: `components/orders/payment-proof-panel.tsx` — `PAYMENT_STATUSES`, `paymentStatusMeta`, dll.

---

## Panel bukti transfer

**File:** `components/orders/payment-proof-panel.tsx`  
**Dipakai di:** `app/(dashboard)/dashboard/orders/page.tsx` (dialog edit pesanan)

| Elemen | Keterangan |
|--------|------------|
| Banner status | Warna per `paymentStatus` + hint |
| Screenshot | Lazy load blob via `inboxApi.fetchMessageMediaBlob(messageId)` |
| Meta OCR | Nominal, bank, rekening, confidence, flags |
| Verifikasi / Tolak | Saat `proof_submitted` + ada `paymentProofMessageId` |
| Verifikasi ulang | Saat `rejected` (termasuk saat `proofBlocked`) |
| Banner blocked | Amber: upload diabaikan (`rejectionCount`/5) |
| Buka batas bukti | Owner saat `paymentProofMeta.proofBlocked` |

---

## API client

**File:** `lib/api/orders.ts`

```ts
interface PaymentProofMeta {
  // OCR fields…
  rejectionCount?: number;
  proofBlocked?: boolean;
  blockedNotified?: boolean;
}

ordersApi.verifyPaymentProof(id)
ordersApi.rejectPaymentProof(id, { reason? })
ordersApi.unblockPaymentProof(id)   // POST .../payment-proof/unblock
```

---

## Alur owner: buka batas bukti

1. Buka detail pesanan dengan `proofBlocked: true`.
2. Klik **Buka batas bukti** → `ConfirmDialog`.
3. `unblockPaymentMut` → `ordersApi.unblockPaymentProof`.
4. Toast sukses; order di-refresh; backend kirim WA ke pembeli.

Counter penolakan di-reset penuh di backend; pembeli bisa upload lagi (max 5 penolakan baru).

---

## File kunci

| File | Perubahan |
|------|-----------|
| `lib/api/orders.ts` | Types `PaymentProofMeta`, `PaymentStatus`, API verify/reject/unblock |
| `components/orders/payment-proof-panel.tsx` | Panel UI + blocked banner |
| `app/(dashboard)/dashboard/orders/page.tsx` | Mutations, filter payment, dialog reject/unblock |
| `components/dashboard/confirm-dialog.tsx` | Dipakai untuk konfirmasi unblock (dan aksi lain) |
| `components/dashboard/prompt-dialog.tsx` | Alasan penolakan bukti |

---

## Test manual

1. Deploy/merge api-go #46 dulu, lalu frontend #32.
2. Orders → buka pesanan dengan bukti → Verifikasi / Tolak.
3. Simulasikan 5x penolakan (backend) → banner blocked + tombol unblock muncul.
4. Buka batas → kirim bukti lagi dari WA → pipeline terima.
5. Saat blocked, **Verifikasi ulang** tetap tersedia di panel.

---

## Catatan teknis

- `orders` di halaman Orders dibungkus `useMemo` agar dependency `useEffect` stabil (eslint).
- Jangan commit `public/generated-docs/docs-index.json` dari generator lokal kecuali sengaja regenerate docs hub.
