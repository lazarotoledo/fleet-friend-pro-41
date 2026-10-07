CREATE TYPE public.app_role AS ENUM ('admin', 'consultor');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE POLICY "own_role_read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

INSERT INTO public.user_roles (user_id, role) SELECT id, 'admin' FROM auth.users ON CONFLICT DO NOTHING;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['acessorios','arquivos_veiculo','equipes','historico_equipes','leituras_km','manutencoes','multas','sinistros','veiculos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS owner_all ON public.%I', t);
    EXECUTE format('CREATE POLICY member_read ON public.%I FOR SELECT TO authenticated USING (public.is_member(auth.uid()))', t);
    EXECUTE format('CREATE POLICY admin_write ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS frota_own ON storage.objects;
CREATE POLICY frota_member_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'frota' AND public.is_member(auth.uid()));
CREATE POLICY frota_admin_write ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'frota' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'frota' AND public.has_role(auth.uid(), 'admin'));