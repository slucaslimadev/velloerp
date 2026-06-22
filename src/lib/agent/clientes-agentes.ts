import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _supabase: ReturnType<typeof createClient<any>> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): ReturnType<typeof createClient<any>> {
  if (!_supabase) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _supabase = createClient<any>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  }
  return _supabase;
}

export interface Servico {
  nome: string;
  duracao_min?: number;
  preco?: number;
}

export interface FaqItem {
  pergunta: string;
  resposta: string;
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
  faq: FaqItem[];
  ativo: boolean;
}

export interface GoogleIntegracao {
  refresh_token: string;
  email: string | null;
  calendar_id: string;
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

// Preços por modelo (USD por 1M tokens). Ajuste conforme a tabela vigente.
const PRECOS: Record<string, { input: number; output: number }> = {
  "gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
};
const PRECO_PADRAO = { input: 0.3, output: 2.5 };

export function calcularCusto(modelo: string, tokensIn: number, tokensOut: number): number {
  const preco = PRECOS[modelo] ?? PRECO_PADRAO;
  return (tokensIn / 1_000_000) * preco.input + (tokensOut / 1_000_000) * preco.output;
}

/** Busca o agente configurado para uma instância. Retorna null se for a VELLO/desconhecida. */
export async function getAgentePorInstancia(instance: string): Promise<ClienteAgente | null> {
  const { data, error } = await db()
    .from("clientes_agentes")
    .select("*")
    .eq("instance_evolution", instance)
    .maybeSingle();

  if (error) {
    console.error(`[ClientesAgentes] Erro ao buscar agente da instância ${instance}:`, error.message);
    return null;
  }
  return (data as unknown as ClienteAgente) ?? null;
}

/** Registra telemetria + custo. Falha de métrica nunca interrompe a conversa. */
export async function registrarMetrica(m: MetricaInput): Promise<void> {
  try {
    const custo_usd = calcularCusto(m.modelo, m.tokens_input, m.tokens_output);
    const { error } = await db().from("sessoes_metricas").insert({
      cliente_agente_id: m.cliente_agente_id,
      conversa_id: m.conversa_id,
      whatsapp: m.whatsapp,
      modelo: m.modelo,
      tokens_input: m.tokens_input,
      tokens_output: m.tokens_output,
      custo_usd,
      tempo_resposta_ms: m.tempo_resposta_ms,
      resultado: m.resultado,
    } as never);
    if (error) console.error("[ClientesAgentes] Erro ao registrar métrica:", error.message);
  } catch (err) {
    console.error("[ClientesAgentes] Exceção ao registrar métrica:", err);
  }
}

export interface NovoAgendamento {
  cliente_agente_id: string;
  nome_contato: string | null;
  whatsapp: string;
  servico: string;
  profissional?: string | null;
  data_hora: string;
  observacoes?: string | null;
}

export async function criarAgendamento(a: NovoAgendamento): Promise<void> {
  const { error } = await db().from("agendamentos").insert({
    cliente_agente_id: a.cliente_agente_id,
    nome_contato: a.nome_contato,
    whatsapp: a.whatsapp,
    servico: a.servico,
    profissional: a.profissional ?? null,
    data_hora: a.data_hora,
    observacoes: a.observacoes ?? null,
    status: "confirmado",
  } as never);
  if (error) throw new Error(`Erro ao criar agendamento: ${error.message}`);
}

/** Verifica conflito de horário (mesmo agente, janela de ~1h, status ativo). */
export async function horarioDisponivel(clienteAgenteId: string, dataHoraIso: string): Promise<boolean> {
  const alvo = new Date(dataHoraIso);
  const inicio = new Date(alvo.getTime() - 59 * 60 * 1000).toISOString();
  const fim = new Date(alvo.getTime() + 59 * 60 * 1000).toISOString();

  const { data } = await db()
    .from("agendamentos")
    .select("id")
    .eq("cliente_agente_id", clienteAgenteId)
    .neq("status", "cancelado")
    .gte("data_hora", inicio)
    .lte("data_hora", fim)
    .limit(1);

  return !data || (data as unknown[]).length === 0;
}

// ─── Qualificação de lead (capacidade qualificar_lead) ────────────────────────
export interface LeadGenerico {
  nome: string | null;
  whatsapp: string;
  email?: string | null;
  segmento?: string | null;
  dor_principal?: string | null;
  orcamento?: string | null;
  pontuacao?: number | null;
  classificacao?: string | null;
  observacoes?: string | null;
}

/** Insere/atualiza um lead na tabela leads (reaproveita o pipeline existente). */
export async function salvarLead(dados: LeadGenerico): Promise<void> {
  const { data: existente } = await db()
    .from("leads")
    .select("id")
    .eq("whatsapp", dados.whatsapp)
    .maybeSingle();

  if (existente) {
    await db().from("leads").update({ ...dados, status: "Novo" } as never).eq("id", (existente as { id: string }).id);
  } else {
    const { error } = await db().from("leads").insert({ ...dados, status: "Novo" } as never);
    if (error) throw new Error(`Erro ao salvar lead: ${error.message}`);
  }
}

// ─── Integração Google Calendar ───────────────────────────────────────────────
export async function getIntegracaoGoogle(clienteAgenteId: string): Promise<GoogleIntegracao | null> {
  const { data } = await db()
    .from("agente_integracoes")
    .select("refresh_token, email, calendar_id, conectado")
    .eq("cliente_agente_id", clienteAgenteId)
    .eq("provider", "google_calendar")
    .maybeSingle();

  const row = data as { refresh_token: string | null; email: string | null; calendar_id: string; conectado: boolean } | null;
  if (!row || !row.conectado || !row.refresh_token) return null;
  return { refresh_token: row.refresh_token, email: row.email, calendar_id: row.calendar_id ?? "primary" };
}

export async function cancelarAgendamento(clienteAgenteId: string, whatsapp: string): Promise<boolean> {
  const { data } = await db()
    .from("agendamentos")
    .select("id")
    .eq("cliente_agente_id", clienteAgenteId)
    .eq("whatsapp", whatsapp)
    .neq("status", "cancelado")
    .order("data_hora", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return false;
  await db().from("agendamentos").update({ status: "cancelado" } as never).eq("id", (data as { id: string }).id);
  return true;
}
