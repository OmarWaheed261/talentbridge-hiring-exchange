
CREATE TABLE public.job_status_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  consultancy_id UUID,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX job_status_events_unprocessed_idx
  ON public.job_status_events (created_at)
  WHERE processed_at IS NULL;

CREATE INDEX job_status_events_job_id_idx
  ON public.job_status_events (job_id);

GRANT SELECT ON public.job_status_events TO authenticated;
GRANT ALL ON public.job_status_events TO service_role;

ALTER TABLE public.job_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read job status events"
  ON public.job_status_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.log_job_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.job_status_events (
      job_id, consultancy_id, old_status, new_status, changed_by
    ) VALUES (
      NEW.id, NEW.consultancy_id, OLD.status, NEW.status, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER jobs_status_change_outbox
  AFTER UPDATE OF status ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_job_status_change();
