-- ════════════════════════════════════════════════════════════════════════════
-- Agentes multi-tenant: 1 agente por cliente, métricas e agendamentos.
-- Separação de acesso:
--   • Admin  (VELLO)  → JWT sem role, ou app_metadata.role = 'admin' → acesso total
--   • Cliente (portal) → app_metadata.role = 'cliente'  → só os próprios dados
-- ════════════════════════════════════════════════════════════════════════════

-- Garante a função de atualizado_em (usada pelos triggers abaixo).
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

-- Helper: verdadeiro quando o usuário autenticado é admin da VELLO.
-- Usuários antigos não têm role definido → tratados como admin (retrocompatível).
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    'admin'
  ) = 'admin';
$$;

-- ── Tabela: clientes_agentes ────────────────────────────────────────────────
-- Uma linha por cliente que contratou um agente de IA.
CREATE TABLE IF NOT EXISTS clientes_agentes (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id         UUID        REFERENCES clientes(id) ON DELETE SET NULL,
  user_id            UUID        UNIQUE,            -- auth.users do login do portal
  nome               TEXT        NOT NULL,          -- "Estética Silva"
  segmento           TEXT        DEFAULT '',        -- "Estética e Beleza"
  emoji              TEXT        NOT NULL DEFAULT '🤖',
  instance_evolution TEXT        UNIQUE NOT NULL,   -- nome da instância na Evolution API
  system_prompt      TEXT        NOT NULL DEFAULT '',
  modelo             TEXT        NOT NULL DEFAULT 'gemini-2.5-flash',
  temperatura        NUMERIC     NOT NULL DEFAULT 0.7,
  max_tokens         INTEGER     NOT NULL DEFAULT 600,
  tools_ativas       JSONB       NOT NULL DEFAULT '[]'::jsonb, -- ex: ["agendar","servicos"]
  servicos           JSONB       NOT NULL DEFAULT '[]'::jsonb, -- cardápio do salão p/ o agente
  ativo              BOOLEAN     NOT NULL DEFAULT true,
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_agentes_user      ON clientes_agentes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_agentes_instance  ON clientes_agentes(instance_evolution);

-- ── Tabela: sessoes_metricas ────────────────────────────────────────────────
-- Uma linha por chamada à API do modelo (telemetria de custo e desempenho).
CREATE TABLE IF NOT EXISTS sessoes_metricas (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_agente_id  UUID        REFERENCES clientes_agentes(id) ON DELETE CASCADE,
  conversa_id        UUID,
  whatsapp           TEXT,
  modelo             TEXT,
  tokens_input       INTEGER     NOT NULL DEFAULT 0,
  tokens_output      INTEGER     NOT NULL DEFAULT 0,
  custo_usd          NUMERIC(12,6) NOT NULL DEFAULT 0,
  tempo_resposta_ms  INTEGER     NOT NULL DEFAULT 0,
  resultado          TEXT        NOT NULL DEFAULT 'resposta', -- resposta|agendamento|lead|encerrado|erro
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessoes_metricas_agente ON sessoes_metricas(cliente_agente_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_metricas_data   ON sessoes_metricas(criado_em);

-- ── Tabela: agendamentos ────────────────────────────────────────────────────
-- Agendamentos criados pelo agente durante as conversas.
CREATE TABLE IF NOT EXISTS agendamentos (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_agente_id  UUID        REFERENCES clientes_agentes(id) ON DELETE CASCADE,
  nome_contato       TEXT,
  whatsapp           TEXT,
  servico            TEXT,
  profissional       TEXT,
  data_hora          TIMESTAMPTZ,
  status             TEXT        NOT NULL DEFAULT 'confirmado', -- confirmado|pendente|cancelado|concluido
  observacoes        TEXT,
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_agente   ON agendamentos(cliente_agente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_datahora ON agendamentos(data_hora);

-- ── Triggers de atualizado_em ───────────────────────────────────────────────
DROP TRIGGER IF EXISTS set_clientes_agentes_atualizado_em ON clientes_agentes;
CREATE TRIGGER set_clientes_agentes_atualizado_em
  BEFORE UPDATE ON clientes_agentes
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

DROP TRIGGER IF EXISTS set_agendamentos_atualizado_em ON agendamentos;
CREATE TRIGGER set_agendamentos_atualizado_em
  BEFORE UPDATE ON agendamentos
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

-- ════════════════════════════════════════════════════════════════════════════
-- RLS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE clientes_agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes_metricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos     ENABLE ROW LEVEL SECURITY;

-- clientes_agentes ───────────────────────────────────────────────────────────
-- Admin: acesso total
CREATE POLICY "admin_all_clientes_agentes" ON clientes_agentes
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Cliente do portal: lê a própria linha
CREATE POLICY "cliente_select_proprio_agente" ON clientes_agentes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Cliente do portal: atualiza apenas o campo de status (toggle ativar/pausar).
-- O WITH CHECK garante que ele continua dono da linha após o update.
CREATE POLICY "cliente_update_proprio_agente" ON clientes_agentes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- sessoes_metricas ───────────────────────────────────────────────────────────
CREATE POLICY "admin_all_sessoes_metricas" ON sessoes_metricas
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "cliente_select_sessoes_metricas" ON sessoes_metricas
  FOR SELECT TO authenticated
  USING (
    cliente_agente_id IN (
      SELECT id FROM clientes_agentes WHERE user_id = auth.uid()
    )
  );

-- agendamentos ───────────────────────────────────────────────────────────────
CREATE POLICY "admin_all_agendamentos" ON agendamentos
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "cliente_select_agendamentos" ON agendamentos
  FOR SELECT TO authenticated
  USING (
    cliente_agente_id IN (
      SELECT id FROM clientes_agentes WHERE user_id = auth.uid()
    )
  );

-- Força o PostgREST a recarregar o schema
NOTIFY pgrst, 'reload schema';
