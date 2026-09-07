# AI Triage Console (superadmin)

**Route:** `/dashboard/admin/ai-triage`  
**API client:** `lib/api/ai-triage.ts`  
**Backend:** `api-go/admin/ai_triage.go`

## Tab

| Tab | Fungsi |
|-----|--------|
| Mencurigakan | Anomali routing dari cron / live scan |
| AI Review | LLM judge window scan (bukan auto-fix routing) |
| Laporan | Human report dari Inbox — filter **Selesai** untuk `resolved` |
| Investigasi | Pilih percakapan → **Jalankan loop** (forensic) atau **Verifikasi fix** |

## Loop per percakapan

- Satu job = satu `conversationId`, semua turn routing mismatch (**forensic**: history WhatsApp vs simulator sekarang).
- Status: `pending` → `running` → `pr_ready` / `pr_ready_needs_fix` → optional `fix_running` → **`verified`** setelah tombol **Verifikasi fix**.
- Analysis menyertakan `simulatorSnapshot` (katalog tenant) — test GHA replay data yang sama dengan analyze.
- Merge PR **tidak** menulis ulang history WhatsApp. Sukses fix = simulator deployed cocok golden `wantPath`, bukan loop forensic baru.
- Job forensic kedua untuk percakapan yang sama ditolak kecuali `force=true`.
- Verifikasi lulus: laporan `open` percakapan itu jadi `resolved` (hilang dari Menunggu; tetap di Selesai / Semua).

## Fix dengan AI

Tombol muncul saat `pr_ready_needs_fix` atau `failed` dengan mismatch. Dispatch workflow `ai-triage-cursor-fix.yml` (Composer 2.5). Maks **2 percobaan** per job (`cursorFixAttempts`); setelah itu patch manual di draft PR. Butuh secret `CURSOR_API_KEY` di repo api-go.

Dokumen lengkap: `api-go/docs/AI_TRIAGE_LOOP_NEXT_DEV.md`
