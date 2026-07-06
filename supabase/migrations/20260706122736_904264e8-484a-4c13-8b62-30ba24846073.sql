-- Restrict advisor_directory base table to admins only; expose safe fields via a public view.
DROP POLICY IF EXISTS "advisor_directory authenticated read" ON public.advisor_directory;

CREATE POLICY "advisor_directory admin read"
  ON public.advisor_directory FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Safe public view: excludes email, phone, and street address.
CREATE OR REPLACE VIEW public.advisor_directory_public
WITH (security_invoker = true) AS
SELECT id, name, firm, zip, city, website, immobilien_focus, partner_status, active, created_at
FROM public.advisor_directory
WHERE active = true;

GRANT SELECT ON public.advisor_directory_public TO authenticated;
GRANT SELECT ON public.advisor_directory_public TO anon;