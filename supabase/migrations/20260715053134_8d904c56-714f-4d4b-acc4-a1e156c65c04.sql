DROP POLICY IF EXISTS "anyone can upload shared beispielrechnungen" ON storage.objects;
CREATE POLICY "anyone can upload shared beispielrechnungen"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'shared-beispielrechnungen');