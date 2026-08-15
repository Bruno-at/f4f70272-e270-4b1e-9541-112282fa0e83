CREATE POLICY "School members can read their template files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'report-templates' AND (storage.foldername(name))[1] = public.get_user_school_id()::text);

CREATE POLICY "Staff can upload template files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'report-templates' AND (storage.foldername(name))[1] = public.get_user_school_id()::text
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','headteacher','teacher')));

CREATE POLICY "Staff can update template files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'report-templates' AND (storage.foldername(name))[1] = public.get_user_school_id()::text
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','headteacher','teacher')));

CREATE POLICY "Admins can delete template files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'report-templates' AND (storage.foldername(name))[1] = public.get_user_school_id()::text
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','headteacher')));