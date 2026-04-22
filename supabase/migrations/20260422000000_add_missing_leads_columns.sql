-- Adiciona coluna usa_automacao ausente do schema original
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS usa_automacao TEXT; -- 'Sim' | 'Não' | 'Parcial'

-- Força recarga do cache do PostgREST
NOTIFY pgrst, 'reload schema';
