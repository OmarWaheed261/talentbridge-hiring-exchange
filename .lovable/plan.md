## Goal

Offload large Job Collection Engine exports to n8n. The app enqueues a job, n8n generates the file (CSV/Excel) and uploads it, then the user gets a realtime toast with a download link. Small exports keep using the existing inline path.

## How it works

```text
User clicks "Queue export"
   │
   ▼
queueExport server fn ──► insert export_jobs row (status=queued)
   │                              │
   │                              └─► dispatch n8n event "export.requested"
   │
   ▼
Realtime subscription on export_jobs (consultancy/user-scoped)
   │
   ▼
n8n workflow:
  1. POST /api/public/n8n/export-jobs/claim   → marks running, returns filters
  2. Paginates collected_jobs via existing public API
  3. Builds CSV/XLSX
  4. Uploads to "exports" Storage bucket
  5. POST /api/public/n8n/export-jobs/complete → status=ready, file_path, row_count
   │
   ▼
Realtime UPDATE arrives → toast "Export ready" with signed download URL
```

## Database

New migration:
- `export_jobs` table: `id`, `user_id`, `consultancy_id`, `page_key` ('job_collection'), `format` ('csv'|'xlsx'), `filters jsonb`, `status` ('queued'|'running'|'ready'|'failed'), `row_count`, `file_path`, `error`, `created_at`, `updated_at`, `completed_at`.
- Indexes on `(consultancy_id, created_at desc)` and `status`.
- RLS: members read/insert their consultancy's jobs; service role full access (for n8n callback).
- `GRANT` SELECT/INSERT to `authenticated`, ALL to `service_role`.
- Enable Realtime and `REPLICA IDENTITY FULL`.
- New private Storage bucket `exports` with policies: members read only files under `${consultancy_id}/…`; service role writes.

## Backend

- `src/lib/export-jobs.functions.ts`
  - `queueExport({ page_key, format, filters })` — uses `requireSupabaseAuth`, inserts row, dispatches `export.requested` n8n event with the job id, returns the row.
  - `getSignedExportUrl({ jobId })` — verifies ownership, returns 15‑min signed URL from `exports` bucket.
- `src/routes/api/public/n8n/export-jobs.ts` (verified by `verifyN8nRequest`)
  - `POST { action: 'claim', jobId }` → flips `queued`→`running`, returns filters + page_key.
  - `POST { action: 'complete', jobId, file_path, row_count }` → `ready`, sets timestamps.
  - `POST { action: 'fail', jobId, error }` → `failed`.
- Reuse existing `dispatchN8nEvent` for the outbound `export.requested` notification.

## UI changes (`src/routes/_authenticated/job-collection.tsx`)

- Extend the Export dropdown with **Queue CSV (n8n)** and **Queue Excel (n8n)** items. Auto-suggest the queue path when filtered row count exceeds 5,000 (toast hint).
- Toast lifecycle: "Queued — you'll be notified when ready".
- Subscribe to `postgres_changes` on `export_jobs` filtered to current user. On `ready` → toast with **Download** action that calls `getSignedExportUrl` and triggers the browser download. On `failed` → error toast with reason.
- New "Export queue" entry inside the existing **Export history** dialog showing queued/running/ready jobs with re‑download buttons.

## n8n template

New `n8n-templates/export-job-runner.json`:
1. Webhook trigger (filters by `event_type = "export.requested"` header).
2. HTTP request → `/export-jobs` claim.
3. Loop: HTTP GET `/api/public/n8n/collected-jobs?...filters&page=N` (1k per page, cap 100k).
4. Code node: CSV or XLSX (SheetJS) build in memory.
5. HTTP request: Supabase Storage upload to `exports/${consultancy_id}/${jobId}.${ext}` using service-role key.
6. HTTP request → `/export-jobs` complete (or fail on error branch).
7. Register the template in the static template route.

## Out of scope

- Email/SMS notifications (toast + in-app only this pass).
- Other pages (Candidates) — same `page_key` mechanism leaves it trivial to add later.
- Inline exports (≤ current cap) keep their existing CSV/XLSX path; nothing about that flow changes.
