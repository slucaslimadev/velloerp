-- ─── Vello ERP — Schema Supabase ─────────────────────────────────

-- Tabela de Leads
CREATE TABLE IF NOT EXISTS leads (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_em                 TIMESTAMPTZ DEFAULT NOW(),
  nome                      TEXT,
  whatsapp                  TEXT,
  email                     TEXT,
  segmento                  TEXT,
  tamanho_empresa           TEXT,
  dor_principal             TEXT,
  sistemas_utilizados       TEXT,
  tem_api                   TEXT,         -- 'Sim' | 'Não' | 'Verificar'
  usa_automacao             TEXT,         -- 'Sim' | 'Não' | 'Parcial'
  descricao_processo_ia     TEXT,
  ia_ativa                  BOOLEAN DEFAULT TRUE,
  orcamento                 TEXT,
  prazo                     TEXT,
  pontuacao                 INTEGER,
  classificacao             TEXT,         -- 'Quente' | 'Morno' | 'Frio' | 'Desqualificado'
  tentativas_requalificacao INTEGER DEFAULT 0,
  status                    TEXT DEFAULT 'Novo',
  responsavel               TEXT,
  proximo_followup          DATE,
  observacoes               TEXT
);

-- Tabela de Configurações
CREATE TABLE IF NOT EXISTS configuracoes (
  id      TEXT PRIMARY KEY,
  valor   TEXT
);

-- Tabela de Pipeline
CREATE TABLE IF NOT EXISTS pipeline (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID REFERENCES leads(id) ON DELETE CASCADE,
  estagio       TEXT,
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  responsavel   TEXT,
  observacoes   TEXT
);

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  nome            TEXT,
  empresa         TEXT,
  whatsapp        TEXT,
  email           TEXT,
  segmento        TEXT,
  valor_contrato  NUMERIC,
  data_inicio     DATE,
  status          TEXT
);

-- Tabela de Interações
CREATE TABLE IF NOT EXISTS interacoes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID REFERENCES leads(id) ON DELETE CASCADE,
  tipo         TEXT,    -- 'whatsapp' | 'email' | 'ligacao' | 'reuniao'
  descricao    TEXT,
  criado_em    TIMESTAMPTZ DEFAULT NOW(),
  responsavel  TEXT
);

-- ─── Índices ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_classificacao ON leads(classificacao);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_criado_em ON leads(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_lead_id ON pipeline(lead_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_lead_id ON interacoes(lead_id);

-- ─── Row Level Security ───────────────────────────────────────────
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacoes ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados têm acesso total
CREATE POLICY "Authenticated users full access" ON leads
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON pipeline
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON clientes
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON interacoes
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users full access" ON configuracoes
  FOR ALL USING (auth.role() = 'authenticated');

-- ─── Trigger: atualizar atualizado_em ────────────────────────────
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_atualizado_em
  BEFORE UPDATE ON pipeline
  FOR EACH ROW
  EXECUTE FUNCTION update_atualizado_em();

-- ─── Dados de exemplo (opcional) ─────────────────────────────────
INSERT INTO configuracoes (id, valor) VALUES ('ia_ativa', 'true') ON CONFLICT (id) DO NOTHING;

INSERT INTO leads (nome, whatsapp, email, segmento, tamanho_empresa, dor_principal,
  sistemas_utilizados, tem_api, descricao_processo_ia, orcamento, prazo,
  pontuacao, classificacao, status, ia_ativa)
VALUES
  ('Carlos Mendes', '61999990001', 'carlos@empresa.com', 'Varejo', '11-50 funcionários',
   'Atendimento ao cliente lento', 'Totvs, WhatsApp Business', 'Sim', 'Quer automatizar vendas e CS.',
   'R$ 5.000 - R$ 15.000', '1-3 meses', 92, 'Quente', 'Novo', true),
  ('Ana Rodrigues', '61999990002', 'ana@consultora.com', 'Consultoria', '1-10 funcionários',
   'Geração de relatórios manual', 'Google Sheets, Notion', 'Não', 'Extrair dados pra planilha',
   'R$ 2.000 - R$ 5.000', '3-6 meses', 62, 'Morno', 'Em Qualificação', true),
  ('Pedro Alves', '61999990003', 'pedro@industria.com', 'Indústria', '51-200 funcionários',
   'Controle de estoque ineficiente', 'SAP, Excel', 'Verificar', 'Agente de IA conectando SAP',
   'Acima de R$ 15.000', '6+ meses', 85, 'Quente', 'Proposta Enviada', true),
  ('Mariana Costa', '61999990004', 'mariana@loja.com', 'E-commerce', '1-10 funcionários',
   'Abandono de carrinho', 'Shopify, Mailchimp', 'Sim', 'Agente pra enviar audio de recuperacao',
   'R$ 1.000 - R$ 2.000', '1-3 meses', 45, 'Frio', 'Novo', false),
  ('Roberto Lima', '61999990005', 'roberto@clinica.com', 'Saúde', '11-50 funcionários',
   'Agendamento manual de consultas', 'Google Calendar, WhatsApp', 'Não', 'WhatsApp bot pra agenda',
   'R$ 5.000 - R$ 15.000', '3-6 meses', 78, 'Morno', 'Em Negociação', true);
