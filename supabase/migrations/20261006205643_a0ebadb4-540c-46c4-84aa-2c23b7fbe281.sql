ALTER TABLE public.manutencoes ADD COLUMN condutor text;

CREATE TABLE public.acessorios (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE, nome text NOT NULL, patrimonio text, observacao text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.multas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE, data_hora timestamptz NOT NULL, local text, motorista text, valor numeric, infracao text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.arquivos_veiculo (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE, categoria text NOT NULL, nome text NOT NULL, caminho text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acessorios, public.multas, public.arquivos_veiculo TO authenticated;
GRANT ALL ON public.acessorios, public.multas, public.arquivos_veiculo TO service_role;
ALTER TABLE public.acessorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arquivos_veiculo ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_all ON public.acessorios FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY owner_all ON public.multas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY owner_all ON public.arquivos_veiculo FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY frota_own ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'frota' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'frota' AND (storage.foldername(name))[1] = auth.uid()::text);