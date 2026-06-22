import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface Servico {
  nome: string;
  duracao_min?: number;
  preco?: number;
}

export interface ClienteAgente {
  id: string;
  cliente_id: string | null;
  user_id: string | null;
  nome: string;
  segmento: string | null;
  emoji: string;
  instance_evolution: string;
  system_prompt: string;
  modelo: string;
  temperatura: number;
  max_tokens: number;
  tools_ativas: string[];
  servicos: Servico[];
  ativo: boolean;
}

export interface MetricaInput {
  cliente_agente_id: string;
  conversa_id: string | null;
  whatsapp: string;
  modelo: string;
  tokens_input: number;
  tokens_output: number;
  tempo_resposta_ms: number;
  resultado: string;
}

// ─── Preços por modelo (USD por 1M tokens) ──────────────────────────────────
// Ajuste conforme a tabela vigente do provedor.
const PRECOS: Record<string, { input: number; output: number }> = {
  "gemini-2.5-pro":    { input: 1.25,  output: 10.0 },
  "gemini-2.5-flash":  { input: 0.30,  output: 2.50 },
  "gemini-2.0-flash":  { input: 0.10,  output: 0.40 },
  "gemini-1.5-flash":  { input: 0.075, output: 0.30 },
  "gpt-4o-mini":       { input: 0.15,  output: 0.60 },
  "gpt-4.1-nano":      { input: 0.10,  output: 0.40 },
};

const PRECO_PADRAO = { input: 0.30, output: 2.50 };

export function calcularCusto(modelo: string, tokensIn: number, tokensOut: number): number {
  const preco = PRECOS[modelo] ?? PRECO_PADRAO;
  return (tokensIn / 1_000_000) * preco.input + (tokensOut / 1_000_000) * preco.output;
}

// ─── Consultas ──────────────────────────────────────────────────────────────

/** Busca o agente configurado para uma instância da Evolution. Retorna null se for a VELLO ou desconhecida. */
export async function getAgentePorInstancia(instance: string): Promise<ClienteAgente | null> {
  const { data, error } = await supabase
    .from("clientes_agentes")
    .select("*")
    .eq("instance_evolution", instance)
    .maybeSingle();

  if (error) {
    console.error(`[ClientesAgentes] Erro ao buscar agente da instância ${instance}:`, error.message);
    return null;
  }
  return (data as ClienteAgente) ?? null;
}

/** Registra uma linha de telemetria + custo calculado. Falha de métrica nunca interrompe a conversa. */
export async function registrarMetrica(m: MetricaInput): Promise<void> {
  try {
    const custo_usd = calcularCusto(m.modelo, m.tokens_input, m.tokens_output);
    const { error } = await supabase.from("sessoes_metricas").insert({
      cliente_agente_id: m.cliente_agente_id,
      conversa_id: m.conversa_id,
      whatsapp: m.whatsapp,
      modelo: m.modelo,
      tokens_input: m.tokens_input,
      tokens_output: m.tokens_output,
      custo_usd,
      tempo_resposta_ms: m.tempo_resposta_ms,
      resultado: m.resultado,
    });
    if (error) console.error("[ClientesAgentes] Erro ao registrar métrica:", error.message);
  } catch (err) {
    console.error("[ClientesAgentes] Exceção ao registrar métrica:", err);
  }
}

// ─── Agendamentos ─────────────────────────────────────────────────────────────

export interface NovoAgendamento {
  cliente_agente_id: string;
  nome_contato: string | null;
  whatsapp: string;
  servico: string;
  profissional?: string | null;
  data_hora: string; // ISO
  observacoes?: string | null;
}

export async function criarAgendamento(a: NovoAgendamento): Promise<void> {
  const { error } = await supabase.from("agendamentos").insert({
    cliente_agente_id: a.cliente_agente_id,
    nome_contato: a.nome_contato,
    whatsapp: a.whatsapp,
    servico: a.servico,
    profissional: a.profissional ?? null,
    data_hora: a.data_hora,
    observacoes: a.observacoes ?? null,
    status: "confirmado",
  });
  if (error) throw new Error(`Erro ao criar agendamento: ${error.message}`);
}

/** Verifica se há conflito de horário (mesmo agente, janela de 1h, status ativo). */
export async function horarioDisponivel(
  clienteAgenteId: string,
  dataHoraIso: string
): Promise<boolean> {
  const alvo = new Date(dataHoraIso);
  const inicio = new Date(alvo.getTime() - 59 * 60 * 1000).toISOString();
  const fim = new Date(alvo.getTime() + 59 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("agendamentos")
    .select("id")
    .eq("cliente_agente_id", clienteAgenteId)
    .neq("status", "cancelado")
    .gte("data_hora", inicio)
    .lte("data_hora", fim)
    .limit(1);

  return !data || data.length === 0;
}

export async function cancelarAgendamento(
  clienteAgenteId: string,
  whatsapp: string
): Promise<boolean> {
  const { data } = await supabase
    .from("agendamentos")
    .select("id")
    .eq("cliente_agente_id", clienteAgenteId)
    .eq("whatsapp", whatsapp)
    .neq("status", "cancelado")
    .order("data_hora", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return false;

  await supabase.from("agendamentos").update({ status: "cancelado" }).eq("id", data.id);
  return true;
}
