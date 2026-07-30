-- Explicitly deny client-side role assignment changes on public.user_roles.
-- Role rows are only created by the SECURITY DEFINER handle_new_user() trigger
-- (which bypasses RLS) or by service_role maintenance.

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE ALL ON public.user_roles FROM anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "no client role inserts" ON public.user_roles;
CREATE POLICY "no client role inserts"
  ON public.user_roles AS RESTRICTIVE FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);

DROP POLICY IF EXISTS "no client role updates" ON public.user_roles;
CREATE POLICY "no client role updates"
  ON public.user_roles AS RESTRICTIVE FOR UPDATE
  TO authenticated, anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no client role deletes" ON public.user_roles;
CREATE POLICY "no client role deletes"
  ON public.user_roles AS RESTRICTIVE FOR DELETE
  TO authenticated, anon
  USING (false);