
-- 1. Open self-registration for any @somaiya.edu email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text := lower(NEW.email);
  v_local text;
  v_role public.app_role;
  v_name text;
BEGIN
  IF v_email !~ '@somaiya\.edu$' THEN
    RAISE EXCEPTION 'Only @somaiya.edu email addresses are allowed';
  END IF;
  v_local := split_part(v_email, '@', 1);
  IF v_local = 'dqc' THEN
    v_role := 'dqc'; v_name := 'DQC Member';
  ELSIF v_local = 'examcoord' THEN
    v_role := 'coord'; v_name := 'Exam Coordinator';
  ELSE
    v_role := 'designer';
    v_name := initcap(replace(replace(v_local, '.', ' '), '_', ' '));
  END IF;

  v_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), ''), v_name);

  INSERT INTO public.profiles (id, email, name) VALUES (NEW.id, v_email, v_name);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$function$;

-- 2. Papers: faculty only see/manage their own
DROP POLICY IF EXISTS "staff view papers" ON public.papers;
DROP POLICY IF EXISTS "designers and dqc update papers" ON public.papers;
DROP POLICY IF EXISTS "designers delete papers" ON public.papers;
DROP POLICY IF EXISTS "designers create papers" ON public.papers;

CREATE POLICY "faculty view own papers"
ON public.papers FOR SELECT TO authenticated
USING (
  (has_role(auth.uid(), 'designer'::app_role) AND created_by_email = current_user_email())
  OR has_role(auth.uid(), 'dqc'::app_role)
  OR has_role(auth.uid(), 'coord'::app_role)
);

CREATE POLICY "faculty create own papers"
ON public.papers FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'designer'::app_role)
  AND created_by_email = current_user_email()
);

CREATE POLICY "faculty update own papers or dqc"
ON public.papers FOR UPDATE TO authenticated
USING (
  (has_role(auth.uid(), 'designer'::app_role) AND created_by_email = current_user_email())
  OR has_role(auth.uid(), 'dqc'::app_role)
)
WITH CHECK (
  (has_role(auth.uid(), 'designer'::app_role) AND created_by_email = current_user_email())
  OR has_role(auth.uid(), 'dqc'::app_role)
);

CREATE POLICY "faculty delete own papers"
ON public.papers FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'designer'::app_role) AND created_by_email = current_user_email()
);

-- 3. Diagrams: faculty only see diagrams of their own papers
DROP POLICY IF EXISTS "staff view diagrams" ON public.diagrams;

CREATE POLICY "staff view diagrams"
ON public.diagrams FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'dqc'::app_role)
  OR has_role(auth.uid(), 'coord'::app_role)
  OR (
    has_role(auth.uid(), 'designer'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.papers p
      WHERE p.id = diagrams.paper_id AND p.created_by_email = current_user_email()
    )
  )
);
