
-- 1) Extend collected_jobs
ALTER TABLE public.collected_jobs
  ADD COLUMN IF NOT EXISTS employment_type text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS salary_text text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS company_website text;

CREATE INDEX IF NOT EXISTS idx_collected_jobs_skills_gin ON public.collected_jobs USING gin (skills);
CREATE INDEX IF NOT EXISTS idx_collected_jobs_tags_gin ON public.collected_jobs USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_collected_jobs_fts ON public.collected_jobs
  USING gin (to_tsvector('english', coalesce(job_title,'') || ' ' || coalesce(company_name,'') || ' ' || coalesce(description,'')));
CREATE INDEX IF NOT EXISTS idx_collected_jobs_employment_type ON public.collected_jobs (employment_type);
CREATE INDEX IF NOT EXISTS idx_collected_jobs_experience_level ON public.collected_jobs (experience_level);

-- 2) job_bookmarks
CREATE TABLE IF NOT EXISTS public.job_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collected_job_id uuid NOT NULL REFERENCES public.collected_jobs(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, collected_job_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_bookmarks TO authenticated;
GRANT ALL ON public.job_bookmarks TO service_role;
ALTER TABLE public.job_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_bookmarks_own" ON public.job_bookmarks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3) saved_searches
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consultancy_id uuid REFERENCES public.consultancies(id) ON DELETE SET NULL,
  name text NOT NULL,
  query jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;
GRANT ALL ON public.saved_searches TO service_role;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_searches_own_all" ON public.saved_searches
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_searches_consultancy_shared_read" ON public.saved_searches
  FOR SELECT TO authenticated
  USING (
    is_shared = true
    AND consultancy_id IS NOT NULL
    AND consultancy_id = public.current_consultancy_id()
  );

CREATE TRIGGER saved_searches_set_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) automation_logs
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  message text,
  jobs_imported integer NOT NULL DEFAULT 0,
  duplicates_removed integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.automation_logs TO authenticated;
GRANT ALL ON public.automation_logs TO service_role;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automation_logs_read_authenticated" ON public.automation_logs
  FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON public.automation_logs (created_at DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_bookmarks;
