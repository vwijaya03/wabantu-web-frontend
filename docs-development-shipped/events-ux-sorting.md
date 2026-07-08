# Shipped: UX Acara & Terapi — Redundansi, Sorting, Export

**Status:** Siap review  
**Tanggal:** 2026-07  
**Scope:** `web-frontend/` + `api-go/events/`

---

## Ringkasan

Modul **Acara & Terapi** dirapikan: export terpusat, tab detail bisa di-deep-link, semua list operasional punya kontrol urutan, dan export pasien/staf mendukung **pengaturan urutan baris** sebelum generate.

---

## Perubahan UX (redundansi)

| Sebelum | Sesudah |
|---------|---------|
| Export pasien/staf di tab Dashboard (`EventShareExportCard`) + tab Pasien/Staf | Export hanya di tab **Pasien** & **Staf** (filter tabel lengkap) |
| `EventExportJobsPanel` ×3 (Dashboard, Pasien, Staf) | **Satu panel** riwayat export di bawah semua tab detail acara |
| Tombol header "Buka pendaftaran publik" + card salin link | Hanya **card link publik** (salin + buka pasien/staf) |
| Tab detail hilang saat refresh | URL `?tab=patients|people|…` |

Dashboard tab sekarang: statistik + kapasitas terapi + hint ke tab Staf.

---

## Sorting — allowlist API

### Daftar acara (`GET /api/v1/events`)

| sortBy | Default |
|--------|---------|
| `startDate`, `eventName`, `status`, `createdAt` | `startDate` desc |

UI: filter status + pagination 50 + kontrol urutan.

### Pasien (`GET …/patients` + export PDF/XLSX)

| sortBy | Catatan |
|--------|---------|
| `therapy`, `name`, `slotDate`, `slotTime`, `status`, `createdAt` | Default `therapy` asc; `name` sort in-memory (encrypted) |

### Staf (`GET …/people` + export Excel)

| sortBy | Catatan |
|--------|---------|
| `personType`, `name`, `createdAt` | Export staff: `name`, `personType` saja |

### Penugasan (`GET …/assignments`)

| sortBy | Default |
|--------|---------|
| `startTime`, `taskName`, `personName`, `createdAt` | `startTime` asc |

### Jadwal (client-side)

- Slot: `startTime`, `capacity`
- Pasien terjadwal: `slotTime`, `name`, `status`

---

## Export — urutan baris

Panel **"Urutan baris export"** di tab Pasien & Staf:

- Dropdown urutan + toggle A→Z / Z→A
- Checkbox **"Samakan dengan urutan tabel"** (default: aktif)
- Export pasien mengirim `sortBy` / `sortDir` di `filters`; export staf di `staffFilters`

---

## File kunci

| Layer | File |
|-------|------|
| Backend sort | `api-go/events/sort.go`, `patients_query.go`, `event.go`, `staff.go`, `export_job.go` |
| Frontend sort | `web-frontend/lib/events-sort.ts`, `components/events/list-sort-control.tsx`, `export-sort-panel.tsx` |
| Cleanup | `app/(dashboard)/dashboard/events/[eventId]/page.tsx` |
| Lists | `event-patients-tab.tsx`, `event-staff-tab.tsx`, `event-assignments-tab.tsx`, `event-schedule-tab.tsx`, `events/page.tsx` |

---

## Test checklist

- [ ] api-go: `encore test ./events/...`
- [ ] Daftar acara: filter status, urut nama, pagination
- [ ] Tab Pasien: urut nama; export PDF dengan urutan berbeda dari tabel (uncheck sync)
- [ ] Tab Staf: export Excel dengan urut nama A→Z
- [ ] Tab Penugasan & Jadwal: urutan tampil benar
- [ ] Refresh halaman detail → tab dari URL tetap
- [ ] Riwayat export satu panel; generate dari Pasien/Staf muncul di panel bawah
- [ ] Regression: request tanpa `sortBy` → urutan lama (terapi → slot → created)
