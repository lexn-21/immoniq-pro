
DROP POLICY IF EXISTS "listing-photos authenticated read" ON storage.objects;
CREATE POLICY "listing-photos owner list"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'listing-photos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
