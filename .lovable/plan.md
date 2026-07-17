
## What already exists (reuse, don't rebuild)

- `collected_jobs` table with `job_url` unique constraint, indexes, realtime enabled
- `/api/public/n8n/collected-jobs` ingest endpoint (dedupes on job_url)
- `apify-ingest-collected-jobs.json` n8n template
- `/job-collection` operator view (raw table + exports + saved views)
- `saved_views` table + `SavedViewsBar` (already generic, filter JSON)

I will NOT touch those. The new work sits alongside as the recruiter-facing search surface.

## New database (one migration)

1. `job_bookmarks (id, user_id, collected_job_id, note, created_at)` — RLS: own rows only.
2. `saved_searches (id, user_id, consultancy_id, name, query jsonb, created_at)` — RLS: own rows; consultancy admins can read shared.
3. `automation_logs (id, source, event, status, message, metadata jsonb, created_at)` — RLS: authenticated read, service_role write. Populated by n8n via a new endpoint.
4. Add nullable columns to `collected_jobs`: `employment_type text`, `experience_level text`, `salary_text text`, `tags text[] default '{}'`, `company_website text`. Backfill from `raw_payload` where present.
5. GIN indexes on `collected_jobs (skills)`, `(tags)`, and a `tsvector` expression index on `(job_title || company_name || description)` for full-text search.

## New API endpoints (`src/routes/api/public/n8n/`)

- `automation-logs.ts` POST — n8n posts run summaries (source, jobs_imported, duplicates_removed, status). Secured with `x-n8n-secret`.
- Extend `collected-jobs.ts` schema to accept the new nullable fields.

## New pages (all under `_authenticated/`)

- `job-search.tsx` — the main recruiter interface.
  - URL-driven search params (`@tanstack/zod-adapter`): `q, location, employment_type, experience_level, source, skills[], tags[], sort, view (cards|table), page`.
  - Debounced global search with Postgres full-text (`ilike` fallback if FTS index missing).
  - Sidebar filters: Location (US preset list + free text), Employment Type, Experience Level, Source, Skills multi-select (searchable), Tags multi-select.
  - Sort: Newest / Oldest / Company / Most Relevant (FTS rank when q present).
  - Card + Table toggle. Each result: title, company, location, skills badges, posted date, source badge, status, actions (View, Bookmark, Share to consultancy).
  - Realtime subscription to `collected_jobs` INSERTs — new results slide in with a "N new jobs" pill.
  - Saved Searches drawer: save current filters, list, one-click apply, delete.

- `job-search.$jobId.tsx` — detail page.
  - Full description, skills, experience, salary, company + website, location, employment type, source, original URL button.
  - Actions: Submit Candidate (opens existing CandidateDialog prefilled with job_id linkage), Bookmark, Share (copy link).

- `automation-center.tsx` — status dashboard.
  - Stat cards: Last Sync, Jobs Imported Today, Total Jobs, Duplicates Removed (24h), Apify / n8n / Supabase status pills (health check for supabase via existing `runRlsHealthcheck`; Apify/n8n derived from recent `automation_logs`).
  - Recent Automation Logs table (last 50) with realtime append.

## Components

- `src/components/JobCard.tsx` — reusable card used by search + saved searches.
- `src/components/JobFiltersSidebar.tsx` — collapsible filter panel.
- `src/components/SavedSearchesDrawer.tsx` — list/save/apply.
- `src/lib/job-search.functions.ts` — `searchCollectedJobs`, `toggleBookmark`, `saveSearch`, `listSavedSearches`, `deleteSavedSearch` server fns (all `requireSupabaseAuth`).

## Navigation

Add "Job Search" and "Automation Center" entries to `AppSidebar`. Keep "Job Collection" as the operator/admin surface.

## n8n

Extend `apify-ingest-collected-jobs.json` code node to also emit `employment_type`, `experience_level`, `salary_text`, `tags`, `company_website`. Add new `report-automation-run.json` template that POSTs to `/api/public/n8n/automation-logs` after each ingest.

## Not doing (explicitly out of scope this turn)

- AI matching / resume ranking / recommendation engine — request says "future ready", schema is left extensible via `raw_payload` + `tags`.
- Editing existing `/job-collection` page.
- Multi-tenant sharing of saved searches beyond "own + consultancy admin read".

Ship on approval.
