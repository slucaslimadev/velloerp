-- ════════════════════════════════════════════════════════════════════════════
-- Funcionalidades por agente (FAQ) + integrações externas (Google Calendar).
-- ════════════════════════════════════════════════════════════════════════════

-- FAQ por agente: lista de { pergunta, resposta }
ALTER TABLE clientes_agentes
  ADD COLUMN IF NOT EXISTS faq JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ── Tabela: agente_integracoes ──────────────────────────────────────────────
-- Guarda credenciais de integrações (ex: Google Calendar). Tokens sensíveis aqui,
-- NUNCA em clientes_agentes — pois o cliente lê a própria linha de clientes_agentes
-- via RLS no portal. Esta tabela é acessível apenas pelo service role (admin).
CREATE TABLE IF NOT EXISTS agente_integracoes (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_agente_id  UUID        NOT NULL REFERENCES clientes_agentes(id) ON DELETE CASCADE,
  provider           TEXT        NOT NULL,                 -- 'google_calendar'
  refresh_token      TEXT,                                 -- token de longa duração
  email              TEXT,                                 -- conta conectada
  calendar_id        TEXT        NOT NULL DEFAULT 'primary',
  conectado          BOOLEAN     NOT NULL DEFAULT false,
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cliente_agente_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_agente_integracoes_agente ON agente_integracoes(cliente_agente_id);

DROP TRIGGER IF EXISTS set_agente_integracoes_atualizado_em ON agente_integracoes;
CREATE TRIGGER set_agente_integracoes_atualizado_em
  BEFORE UPDATE ON agente_integracoes
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

-- RLS: apenas admin (service role ignora RLS). Sem política para 'cliente' →
-- o token nunca é exposto ao navegador do cliente.
ALTER TABLE agente_integracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_agente_integracoes" ON agente_integracoes
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

NOTIFY pgrst, 'reload schema';
