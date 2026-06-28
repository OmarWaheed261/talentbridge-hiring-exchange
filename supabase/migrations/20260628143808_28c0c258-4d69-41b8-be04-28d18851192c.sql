
CREATE POLICY "Authenticated upload resumes" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes');
CREATE POLICY "Authenticated read resumes" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes');
CREATE POLICY "Authenticated update own resumes" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resumes' AND owner = auth.uid());
CREATE POLICY "Authenticated delete own resumes" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND owner = auth.uid());
