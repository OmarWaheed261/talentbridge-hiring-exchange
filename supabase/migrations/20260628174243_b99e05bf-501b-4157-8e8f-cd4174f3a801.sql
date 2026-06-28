CREATE TABLE public.export_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('csv','xlsx')),
  scope TEXT NOT NULL CHECK (scope IN ('page','all')),
  row_count INTEGER NOT NULL DEFAULT 0,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX export_audit_log_user_idx ON public.export_audit_log (user_id, created_at DESC);
CREATE INDEX export_audit_log_page_idx ON public.export_audit_log (page_key, created_at DESC);

GRANT SELECT, INSERT ON public.export_audit_log TO authenticated;
GRANT ALL ON public.export_audit_log TO service_role;

ALTER TABLE public.export_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own export audit"
  ON public.export_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own export audit"
  ON public.export_audit_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins read all export audit"
  ON public.export_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));