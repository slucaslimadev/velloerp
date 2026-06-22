-- Create tarefas table
CREATE TABLE IF NOT EXISTS tarefas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  titulo        TEXT NOT NULL,
  descricao     TEXT,
  data          DATE NOT NULL,
  horario       TIME,
  responsavel   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Pendente', -- 'Pendente' | 'Em Andamento' | 'Concluída'
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  cliente_id    UUID REFERENCES clientes(id) ON DELETE SET NULL
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_data ON tarefas(data);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel ON tarefas(responsavel);

-- Enable Row Level Security (RLS)
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users have full access
CREATE POLICY "Authenticated users full access" ON tarefas
  FOR ALL USING (auth.role() = 'authenticated');

-- Trigger to update atualizado_em
CREATE TRIGGER set_tarefas_atualizado_em
  BEFORE UPDATE ON tarefas
  FOR EACH ROW
  EXECUTE FUNCTION update_atualizado_em();
