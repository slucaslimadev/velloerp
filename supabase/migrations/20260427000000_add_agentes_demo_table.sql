CREATE TABLE IF NOT EXISTS agentes_demo (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        UNIQUE NOT NULL,
  nome        TEXT        NOT NULL,
  descricao   TEXT        NOT NULL DEFAULT '',
  segmento    TEXT        NOT NULL DEFAULT '',
  system_prompt TEXT      NOT NULL DEFAULT '',
  modelo      TEXT        NOT NULL DEFAULT 'gpt-4o-mini',
  cor         TEXT        NOT NULL DEFAULT '#41BEEA',
  emoji       TEXT        NOT NULL DEFAULT '🤖',
  sugestoes   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  ativo       BOOLEAN     NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agentes_demo ENABLE ROW LEVEL SECURITY;

-- Anyone can read active agents (public /demo pages)
CREATE POLICY "public_read_agentes" ON agentes_demo
  FOR SELECT USING (ativo = true);

-- Authenticated users can manage agents
CREATE POLICY "auth_manage_agentes" ON agentes_demo
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
