
CREATE TABLE public.integration_settings (
  consultancy_id UUID PRIMARY KEY REFERENCES public.consultancies(id) ON DELETE CASCADE,
  n8n_webhook_url TEXT,
  n8n_webhook_secret TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_settings TO authenticated;
GRANT ALL ON public.integration_settings TO service_role;

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read own consultancy integration settings"
ON public.integration_settings FOR SELECT
TO authenticated
USING (
  consultancy_id = public.current_consultancy_id()
  AND (public.has_role(auth.uid(), 'consultancy_admin') OR public.has_role(auth.uid(), 'super_admin'))
);

CREATE POLICY "Admins insert own consultancy integration settings"
ON public.integration_settings FOR INSERT
TO authenticated
WITH CHECK (
  consultancy_id = public.current_consultancy_id()
  AND (public.has_role(auth.uid(), 'consultancy_admin') OR public.has_role(auth.uid(), 'super_admin'))
);

CREATE POLICY "Admins update own consultancy integration settings"
ON public.integration_settings FOR UPDATE
TO authenticated
USING (
  consultancy_id = public.current_consultancy_id()
  AND (public.has_role(auth.uid(), 'consultancy_admin') OR public.has_role(auth.uid(), 'super_admin'))
)
WITH CHECK (
  consultancy_id = public.current_consultancy_id()
  AND (public.has_role(auth.uid(), 'consultancy_admin') OR public.has_role(auth.uid(), 'super_admin'))
);

CREATE TRIGGER integration_settings_set_updated_at
BEFORE UPDATE ON public.integration_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
