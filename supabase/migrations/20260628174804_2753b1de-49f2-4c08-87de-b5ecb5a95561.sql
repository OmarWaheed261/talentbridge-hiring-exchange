
CREATE POLICY "Members read own consultancy exports files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exports'
    AND (storage.foldername(name))[1] = public.current_consultancy_id()::text
  );
