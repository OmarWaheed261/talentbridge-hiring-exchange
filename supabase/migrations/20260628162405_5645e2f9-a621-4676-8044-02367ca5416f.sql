-- Restrict consultancies SELECT to own consultancy (super admins still have ALL)
DROP POLICY IF EXISTS "Authenticated read consultancies" ON public.consultancies;
CREATE POLICY "Members read own consultancy"
ON public.consultancies
FOR SELECT
TO authenticated
USING (id = public.current_consultancy_id());

-- Restrict resumes storage policies to consultancy-scoped folder paths
DROP POLICY IF EXISTS "Authenticated read resumes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload resumes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete own resumes" ON storage.objects;

CREATE POLICY "Consultancy members read resumes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = public.current_consultancy_id()::text
);

CREATE POLICY "Consultancy members upload resumes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = public.current_consultancy_id()::text
);

CREATE POLICY "Consultancy members update resumes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = public.current_consultancy_id()::text
)
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = public.current_consultancy_id()::text
);

CREATE POLICY "Consultancy members delete resumes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = public.current_consultancy_id()::text
);