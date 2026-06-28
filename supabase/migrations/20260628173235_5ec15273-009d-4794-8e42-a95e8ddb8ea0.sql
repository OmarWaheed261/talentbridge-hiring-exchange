CREATE INDEX IF NOT EXISTS collected_jobs_status_idx ON public.collected_jobs (status);
CREATE INDEX IF NOT EXISTS collected_jobs_source_idx ON public.collected_jobs (source);
CREATE INDEX IF NOT EXISTS collected_jobs_company_idx ON public.collected_jobs (company_name);
CREATE INDEX IF NOT EXISTS collected_jobs_location_idx ON public.collected_jobs (location);
CREATE INDEX IF NOT EXISTS collected_jobs_posted_date_idx ON public.collected_jobs (posted_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS collected_jobs_created_at_idx ON public.collected_jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS collected_jobs_skills_gin_idx ON public.collected_jobs USING GIN (skills);