# TalentBridge AI — n8n Workflow Templates

Ready-to-import n8n workflows that call the TalentBridge AI public API.

## Setup (once per n8n instance)

1. **Credentials → New → Header Auth**
   - Name: `TalentBridge n8n Secret`
   - Header Name: `x-n8n-secret`
   - Header Value: *(paste the value of `N8N_WEBHOOK_SECRET` from Lovable Cloud)*

2. **Variables** (Settings → Variables) — or edit each workflow's "Set Base URL" node:
   - `TALENTBRIDGE_BASE_URL` = `https://project--5b5c7bbd-89d9-4296-8b02-1ea4ca9062d7-dev.lovable.app` (preview)
     or `https://project--5b5c7bbd-89d9-4296-8b02-1ea4ca9062d7.lovable.app` (production)

3. Import each `*.json` file: **Workflows → Import from File**.

## Templates

| File | Purpose | Trigger |
|---|---|---|
| `sync-open-jobs.json` | Pull open jobs from TalentBridge and forward them to a downstream system (Slack, sheet, scraper enrichment, etc.) | Cron — every 30 min |
| `ingest-jobs-from-source.json` | Scrape/fetch jobs from an external source and POST them into TalentBridge | Cron — hourly |
| `ingest-candidate-submission.json` | Receive a candidate (resume parsed upstream, ATS form, email parser) and POST into TalentBridge | Webhook |
| `update-candidate-status.json` | Move a candidate to a new pipeline status (e.g. when an interview is scheduled) | Webhook |
| `sync-job-status-changes.json` | Stream every job status change out of TalentBridge to your downstream system, then acknowledge so each event is delivered exactly once | Cron — every minute |

## Endpoint cheat-sheet

All endpoints require header `x-n8n-secret: $N8N_WEBHOOK_SECRET`.

- `GET  /api/public/n8n/health`
- `GET  /api/public/n8n/jobs?limit=50`
- `POST /api/public/n8n/jobs` — body: job object or array (≤100)
- `POST /api/public/n8n/candidates` — body: candidate object or array (≤100)
- `PATCH /api/public/n8n/candidates` — body: `{ id, status?, notes? }`
- `POST /api/public/n8n/notify` — body: `{ user_id, title, message, type? }`
- `GET  /api/public/n8n/job-status-events?limit=100` — unprocessed job status changes (with full job snapshot)
- `POST /api/public/n8n/job-status-events` — body: `{ ids: [uuid] }` to mark events processed

## How job status sync works

Whenever a job's `status` column changes, a database trigger writes a row to
`job_status_events` (an outbox). The `sync-job-status-changes` workflow polls
`GET /api/public/n8n/job-status-events` every minute, fans each event out to
your destination (replace the **Shape payload** node), and `POST`s the
processed IDs back so the same event is never delivered twice.

