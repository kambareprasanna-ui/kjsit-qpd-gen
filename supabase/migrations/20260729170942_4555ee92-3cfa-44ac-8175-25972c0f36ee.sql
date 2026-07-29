-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('designer', 'dqc', 'coord');

-- 2. user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own role" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3. profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable to authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 4. has_role helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE id = auth.uid();
$$;

-- 5. Signup trigger: enforce @somaiya.edu, create profile + role by email prefix
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
  IF v_local = 'designer' THEN v_role := 'designer'; v_name := 'Paper Designer';
  ELSIF v_local = 'dqc' THEN v_role := 'dqc'; v_name := 'DQC Member';
  ELSIF v_local = 'examcoord' THEN v_role := 'coord'; v_name := 'Exam Coordinator';
  ELSE
    RAISE EXCEPTION 'Email must be one of designer@, dqc@, or examcoord@ somaiya.edu';
  END IF;

  INSERT INTO public.profiles (id, email, name) VALUES (NEW.id, v_email, v_name);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Replace permissive policies on existing tables
DROP POLICY IF EXISTS demo_open_papers ON public.papers;
DROP POLICY IF EXISTS demo_open_diagrams ON public.diagrams;
DROP POLICY IF EXISTS demo_open_notifs ON public.notifications;

-- Papers: all staff view; designers create/delete; designers & DQC update
CREATE POLICY "staff view papers" ON public.papers
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'designer')
    OR public.has_role(auth.uid(), 'dqc')
    OR public.has_role(auth.uid(), 'coord')
  );
CREATE POLICY "designers create papers" ON public.papers
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'designer'));
CREATE POLICY "designers delete papers" ON public.papers
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'designer'));
CREATE POLICY "designers and dqc update papers" ON public.papers
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'designer') OR public.has_role(auth.uid(), 'dqc')
  ) WITH CHECK (
    public.has_role(auth.uid(), 'designer') OR public.has_role(auth.uid(), 'dqc')
  );

-- Diagrams: view by any staff, insert/delete by designer
CREATE POLICY "staff view diagrams" ON public.diagrams
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'designer')
    OR public.has_role(auth.uid(), 'dqc')
    OR public.has_role(auth.uid(), 'coord')
  );
CREATE POLICY "designers manage diagrams" ON public.diagrams
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'designer'))
  WITH CHECK (public.has_role(auth.uid(), 'designer'));

-- Notifications: recipient views/updates own; any staff can insert
CREATE POLICY "recipient views notifications" ON public.notifications
  FOR SELECT TO authenticated USING (recipient_email = public.current_user_email());
CREATE POLICY "recipient updates notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (recipient_email = public.current_user_email())
  WITH CHECK (recipient_email = public.current_user_email());
CREATE POLICY "staff create notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'designer')
    OR public.has_role(auth.uid(), 'dqc')
    OR public.has_role(auth.uid(), 'coord')
  );