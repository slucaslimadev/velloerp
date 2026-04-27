-- Cria a tabela de configurações se não existir
CREATE TABLE IF NOT EXISTS configuracoes (
  id      TEXT PRIMARY KEY,
  valor   TEXT
);

-- Configura as permissões (RLS) para o dashboard
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'configuracoes' AND policyname = 'Authenticated users full access'
  ) THEN
    CREATE POLICY "Authenticated users full access" ON configuracoes
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END
$$;

-- Insere o registro padrão que ativa a IA inicialmente
INSERT INTO configuracoes (id, valor) VALUES ('ia_ativa', 'true') ON CONFLICT (id) DO NOTHING;

-- Força a API a recarregar o novo esquema e remover o erro 404
NOTIFY pgrst, 'reload schema';
