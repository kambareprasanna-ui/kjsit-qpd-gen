
CREATE TABLE public.papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'draft',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  sets JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_set_index INTEGER,
  dqc_note TEXT,
  dqc_signature_url TEXT,
  created_by_role TEXT NOT NULL DEFAULT 'designer',
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.papers TO anon, authenticated;
GRANT ALL ON public.papers TO service_role;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_open_papers" ON public.papers FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.diagrams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  set_index INTEGER NOT NULL,
  question_key TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagrams TO anon, authenticated;
GRANT ALL ON public.diagrams TO service_role;
ALTER TABLE public.diagrams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_open_diagrams" ON public.diagrams FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  paper_id UUID REFERENCES public.papers(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon, authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_open_notifs" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public_read_buckets" ON storage.objects FOR SELECT USING (bucket_id IN ('uploads','diagrams','signatures'));
CREATE POLICY "public_write_buckets" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('uploads','diagrams','signatures'));
CREATE POLICY "public_update_buckets" ON storage.objects FOR UPDATE USING (bucket_id IN ('uploads','diagrams','signatures'));
CREATE POLICY "public_delete_buckets" ON storage.objects FOR DELETE USING (bucket_id IN ('uploads','diagrams','signatures'));
