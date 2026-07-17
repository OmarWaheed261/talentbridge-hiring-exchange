
CREATE OR REPLACE FUNCTION public.log_user_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (event_type, action, actor_id, target_user_id, resource_type, resource_id, metadata)
    VALUES ('role_action', 'role.granted', actor, NEW.user_id, 'user_role', NEW.id::text,
            jsonb_build_object('role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (event_type, action, actor_id, target_user_id, resource_type, resource_id, metadata)
    VALUES ('role_action', 'role.revoked', actor, OLD.user_id, 'user_role', OLD.id::text,
            jsonb_build_object('role', OLD.role));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (event_type, action, actor_id, target_user_id, resource_type, resource_id, metadata)
    VALUES ('role_action', 'role.changed', actor, NEW.user_id, 'user_role', NEW.id::text,
            jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.log_user_role_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_roles_audit ON public.user_roles;
CREATE TRIGGER user_roles_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_user_role_change();
