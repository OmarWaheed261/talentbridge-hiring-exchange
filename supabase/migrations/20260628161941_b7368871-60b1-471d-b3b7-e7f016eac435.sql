
REVOKE EXECUTE ON FUNCTION public.log_job_status_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_job_status_change() TO service_role;
