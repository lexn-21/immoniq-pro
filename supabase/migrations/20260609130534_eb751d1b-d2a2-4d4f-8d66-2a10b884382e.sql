CREATE TABLE IF NOT EXISTS public.tenant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('out','in')),
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','sms','email','note')),
  body text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','read','failed')),
  external_id text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tenant_messages_tenant ON public.tenant_messages (tenant_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_messages_user ON public.tenant_messages (user_id, sent_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_messages TO authenticated;
GRANT ALL ON public.tenant_messages TO service_role;

ALTER TABLE public.tenant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage own tenant messages"
  ON public.tenant_messages
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);