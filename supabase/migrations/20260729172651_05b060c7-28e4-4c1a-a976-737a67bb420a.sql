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
  IF v_local IN ('faculty','designer') THEN v_role := 'designer'; v_name := 'Faculty';
  ELSIF v_local = 'dqc' THEN v_role := 'dqc'; v_name := 'DQC Member';
  ELSIF v_local = 'examcoord' THEN v_role := 'coord'; v_name := 'Exam Coordinator';
  ELSE
    RAISE EXCEPTION 'Email must be one of faculty@, dqc@, or examcoord@ somaiya.edu';
  END IF;

  INSERT INTO public.profiles (id, email, name) VALUES (NEW.id, v_email, v_name);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$$;