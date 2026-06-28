
CREATE TABLE public.collected_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title text NOT NULL,
  company_name text NOT NULL,
  location text,
  skills text[] NOT NULL DEFAULT '{}',
  job_url text,
  source text,
  description text,
  posted_date timestamptz,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','processed','shared')),
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX collected_jobs_job_url_key
  ON public.collected_jobs (job_url) WHERE job_url IS NOT NULL;
CREATE INDEX collected_jobs_status_idx ON public.collected_jobs (status);
CREATE INDEX collected_jobs_source_idx ON public.collected_jobs (source);
CREATE INDEX collected_jobs_posted_date_idx ON public.collected_jobs (posted_date DESC NULLS LAST);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collected_jobs TO authenticated;
GRANT ALL ON public.collected_jobs TO service_role;

ALTER TABLE public.collected_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read collected jobs"
  ON public.collected_jobs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins update collected jobs"
  ON public.collected_jobs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins delete collected jobs"
  ON public.collected_jobs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER collected_jobs_set_updated_at
  BEFORE UPDATE ON public.collected_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.collected_jobs;
