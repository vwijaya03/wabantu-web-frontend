# AI Triage Console (superadmin)

**Route:** `/dashboard/admin/ai-triage`  
**API client:** `lib/api/ai-triage.ts`  
**Backend:** `api-go/admin/ai_triage.go`

## Tab

| Tab | Fungsi |
|-----|--------|
| Mencurigakan | Anomali routing dari cron / live scan |
| AI Review | LLM judge window scan (bukan auto-fix routing) |
| Laporan | Human report dari Inbox |
| Investigasi | Pilih percakapan → **Jalankan loop** |

## Loop per percakapan

- Satu job = satu `conversationId`, semua turn routing mismatch.
- Status: `pending` → `running` → `pr_ready` / `pr_ready_needs_fix` → optional `fix_running`.
- Analysis menyertakan `simulatorSnapshot` (katalog tenant) — test GHA replay data yang sama dengan analyze.

## Fix dengan AI

Tombol muncul saat `pr_ready_needs_fix` atau `failed` dengan mismatch. Dispatch workflow `ai-triage-cursor-fix.yml` (Composer 2.5). Butuh secret `CURSOR_API_KEY` di repo api-go.

Dokumen lengkap: `api-go/docs/AI_TRIAGE_LOOP_NEXT_DEV.md`
