ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id ON public.expenses(tenant_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'expenses_tenant_id_fkey') THEN
    ALTER TABLE public.expenses ADD CONSTRAINT expenses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
  END IF;
END $$;