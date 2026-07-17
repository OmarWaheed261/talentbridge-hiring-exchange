
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('auth','role_action','data','system')),
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  actor_role TEXT,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resource_type TEXT,
  resource_id TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','failure')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can insert their own audit entries"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_event_type ON public.audit_logs (event_type, created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action);

-- Auto-log signup events
CREATE OR REPLACE FUNCTION public.log_auth_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (event_type, action, actor_id, actor_email, target_user_id, metadata)
  VALUES ('auth', 'user.signup', NEW.id, NEW.email, NEW.id,
          jsonb_build_object('provider', COALESCE(NEW.raw_app_meta_data->>'provider','email')));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.log_auth_signup() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_audit ON auth.users;
CREATE TRIGGER on_auth_user_created_audit
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.log_auth_signup();
