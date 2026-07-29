-- 1. Lock down storage buckets to authenticated staff only
DROP POLICY IF EXISTS "public_read_buckets" ON storage.objects;
DROP POLICY IF EXISTS "public_write_buckets" ON storage.objects;
DROP POLICY IF EXISTS "public_update_buckets" ON storage.objects;
DROP POLICY IF EXISTS "public_delete_buckets" ON storage.objects;

CREATE POLICY "staff_read_buckets" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('uploads','diagrams','signatures')
    AND (
      public.has_role(auth.uid(), 'designer'::public.app_role)
      OR public.has_role(auth.uid(), 'dqc'::public.app_role)
      OR public.has_role(auth.uid(), 'coord'::public.app_role)
    )
  );

CREATE POLICY "staff_write_buckets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('uploads','diagrams','signatures')
    AND (
      public.has_role(auth.uid(), 'designer'::public.app_role)
      OR public.has_role(auth.uid(), 'dqc'::public.app_role)
    )
  );

CREATE POLICY "staff_update_buckets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('uploads','diagrams','signatures')
    AND owner = auth.uid()
  )
  WITH CHECK (
    bucket_id IN ('uploads','diagrams','signatures')
    AND owner = auth.uid()
  );

CREATE POLICY "staff_delete_buckets" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('uploads','diagrams','signatures')
    AND owner = auth.uid()
  );

-- 2. Restrict profiles read to own row
DROP POLICY IF EXISTS "profiles readable to authenticated" ON public.profiles;
CREATE POLICY "users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);