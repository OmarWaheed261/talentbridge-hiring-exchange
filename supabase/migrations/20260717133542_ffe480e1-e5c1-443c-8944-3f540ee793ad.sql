
-- Trigger-only SECURITY DEFINER functions: revoke EXECUTE from all app roles.
-- Triggers fire regardless of EXECUTE grants.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_job_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- RLS-helper SECURITY DEFINER functions: revoke from PUBLIC and anon;
-- keep EXECUTE only for authenticated (required so RLS policies can call them)
-- and service_role.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_consultancy_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_consultancy_id() TO authenticated, service_role;
