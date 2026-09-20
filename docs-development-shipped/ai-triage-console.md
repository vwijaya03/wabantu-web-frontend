# AI Triage Console (superadmin)

**Route:** `/dashboard/admin/ai-triage`  
**API client:** `lib/api/ai-triage.ts`  
**Backend:** Insiden / behavior / repair / LLM scan / laporan manusia — bukan loop routing.

## Tab

| Tab | Fungsi |
|-----|--------|
| Insiden | Confirm kontrak → Composer (`ai-triage-behavior-fix.yml`). Repair draft unpaid terpisah. |
| AI Review | Haiku window scan. Finding flagged → ingest insiden. Tidak auto-Composer. |
| Laporan | Human report dari Inbox. **Buka Insiden** (bukan loop percakapan). |

Default tab: **Insiden**. Query `?tab=mencurigakan` / `investigasi` dialihkan ke Insiden.

Loop routing (Jalankan loop, `CreateAITriageJob`, Mencurigakan, Investigasi) sudah dihapus.
