
CREATE TABLE public.export_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consultancy_id UUID NOT NULL REFERENCES public.consultancies(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('csv','xlsx')),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','ready','failed')),
  row_count INTEGER,
  file_path TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX export_jobs_consultancy_created_idx ON public.export_jobs (consultancy_id, created_at DESC);
CREATE INDEX export_jobs_user_created_idx ON public.export_jobs (user_id, created_at DESC);
CREATE INDEX export_jobs_status_idx ON public.export_jobs (status);

GRANT SELECT, INSERT ON public.export_jobs TO authenticated;
GRANT ALL ON public.export_jobs TO service_role;

ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own consultancy exports"
  ON public.export_jobs FOR SELECT
  TO authenticated
  USING (consultancy_id = public.current_consultancy_id());

CREATE POLICY "Members queue exports for own consultancy"
  ON public.export_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND consultancy_id = public.current_consultancy_id()
  );

CREATE TRIGGER update_export_jobs_updated_at
  BEFORE UPDATE ON public.export_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.export_jobs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.export_jobs;
