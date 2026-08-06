DROP POLICY IF EXISTS "designers manage diagrams" ON public.diagrams;

CREATE POLICY "designers manage own paper diagrams"
ON public.diagrams
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'designer'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.papers p
    WHERE p.id = diagrams.paper_id
      AND p.created_by_email = public.current_user_email()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'designer'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.papers p
    WHERE p.id = diagrams.paper_id
      AND p.created_by_email = public.current_user_email()
  )
);

CREATE POLICY "recipient deletes notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (recipient_email = public.current_user_email());

GRANT DELETE ON public.notifications TO authenticated;