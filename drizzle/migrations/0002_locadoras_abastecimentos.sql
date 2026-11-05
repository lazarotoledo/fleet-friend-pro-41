CREATE TABLE IF NOT EXISTS public.locadoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  nome text NOT NULL,
  contato text,
  telefone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locadoras TO authenticated;
GRANT ALL ON public.locadoras TO service_role;
ALTER TABLE public.locadoras ENABLE ROW LEVEL SECURITY;
CREATE POLICY member_read ON public.locadoras FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY admin_write ON public.locadoras FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS locadora_id uuid REFERENCES public.locadoras(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.abastecimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  litros numeric NOT NULL,
  valor numeric NOT NULL,
  km integer,
  motorista text,
  posto text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.abastecimentos TO authenticated;
GRANT ALL ON public.abastecimentos TO service_role;
ALTER TABLE public.abastecimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY member_read ON public.abastecimentos FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY admin_write ON public.abastecimentos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));