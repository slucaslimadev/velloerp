import { createClient } from "@supabase/supabase-js";
import type { Conversa, Mensagem, DadosLead } from "./types";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const TIMEOUT_HORAS = 24;

/** Verifica as 3 regras de bloqueio da IA: Global, Lead e 24h pós-classificação. */
export async function isIaAtiva(whatsapp: string): Promise<boolean> {
  // 1. Bloqueio Global
  const { data: config } = await supabase
    .from("configuracoes")
    .select("valor")
    .eq("id", "ia_ativa")
    .maybeSingle();

  if (config && config.valor === "false") return false;

  // 2. Bloqueio por Lead
  const { data: lead } = await supabase
    .from("leads")
    .select("ia_ativa")
    .eq("whatsapp", whatsapp)
    .maybeSingle();

  if (lead && lead.ia_ativa === false) return false;

  // 3. Bloqueio de 24h Pós-Classificação (conversa finalizada recente)
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recente } = await supabase
    .from("conversas")
    .select("id")
    .eq("whatsapp", whatsapp)
    .eq("finalizada", true)
    .gte("atualizado_em", limite)
    .limit(1)
    .maybeSingle();

  if (recente) return false;

  return true;
}

/** Retorna conversa ativa (últimas 24h) ou cria uma nova */
export async function getOrCreateConversa(
  whatsapp: string,
  nomeContato?: string
): Promise<Conversa> {
  const limite = new Date(
    Date.now() - TIMEOUT_HORAS * 60 * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("conversas")
    .select("*")
    .eq("whatsapp", whatsapp)
    .eq("finalizada", false)
    .gte("atualizado_em", limite)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) return data as Conversa;

  const { data: nova, error } = await supabase
    .from("conversas")
    .insert({
      whatsapp,
      nome_contato: nomeContato ?? null,
      historico: [],
    })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar conversa: ${error.message}`);
  return nova as Conversa;
}

export async function updateHistorico(
  id: string,
  historico: Mensagem[]
): Promise<void> {
  const { error } = await supabase
    .from("conversas")
    .update({ historico })
    .eq("id", id);

  if (error) throw new Error(`Erro ao salvar histórico: ${error.message}`);
}

export async function finalizarConversa(id: string): Promise<void> {
  await supabase
    .from("conversas")
    .update({ finalizada: true })
    .eq("id", id);
}

export async function getContextoLead(
  whatsapp: string
): Promise<{ tentativas: number; classificacaoAnterior: string | null }> {
  const { data } = await supabase
    .from("leads")
    .select("tentativas_requalificacao, classificacao")
    .eq("whatsapp", whatsapp)
    .maybeSingle();

  return {
    tentativas: data?.tentativas_requalificacao ?? 0,
    classificacaoAnterior: data?.classificacao ?? null,
  };
}

export async function salvarLead(dados: DadosLead): Promise<void> {
  // Verifica se já existe lead com esse WhatsApp
  const { data: existente } = await supabase
    .from("leads")
    .select("id, tentativas_requalificacao")
    .eq("whatsapp", dados.whatsapp)
    .maybeSingle();

  if (existente) {
    const tentativas = (existente.tentativas_requalificacao ?? 0) + 1;
    const { error } = await supabase
      .from("leads")
      .update({ ...dados, tentativas_requalificacao: tentativas })
      .eq("id", existente.id);
    if (error) throw new Error(`Erro ao atualizar lead: ${error.message}`);
  } else {
    const { error } = await supabase.from("leads").insert(dados);
    if (error) throw new Error(`Erro ao salvar lead: ${error.message}`);
  }
}
