import { createClient } from "@supabase/supabase-js";
import type { Conversa, Mensagem, DadosLead } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _supabase: ReturnType<typeof createClient<any>> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): ReturnType<typeof createClient<any>> {
  if (!_supabase) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _supabase = createClient<any>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return _supabase;
}

const TIMEOUT_HORAS = 24;

export async function isIaAtiva(whatsapp: string): Promise<boolean> {
  const { data: config } = await db()
    .from("configuracoes")
    .select("valor")
    .eq("id", "ia_ativa")
    .maybeSingle();

  if (config && (config as { valor: string }).valor === "false") return false;

  const { data: lead } = await db()
    .from("leads")
    .select("ia_ativa")
    .eq("whatsapp", whatsapp)
    .maybeSingle();

  if (lead && (lead as { ia_ativa: boolean }).ia_ativa === false) return false;

  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recente } = await db()
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

export async function getOrCreateConversa(
  whatsapp: string,
  nomeContato?: string
): Promise<Conversa> {
  const limite = new Date(
    Date.now() - TIMEOUT_HORAS * 60 * 60 * 1000
  ).toISOString();

  const { data } = await db()
    .from("conversas")
    .select("*")
    .eq("whatsapp", whatsapp)
    .eq("finalizada", false)
    .gte("atualizado_em", limite)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) return data as unknown as Conversa;

  const { data: nova, error } = await db()
    .from("conversas")
    .insert({
      whatsapp,
      nome_contato: nomeContato ?? null,
      historico: [],
    })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar conversa: ${error.message}`);
  return nova as unknown as Conversa;
}

export async function updateHistorico(
  id: string,
  historico: Mensagem[]
): Promise<void> {
  const { error } = await db()
    .from("conversas")
    .update({ historico } as never)
    .eq("id", id);

  if (error) throw new Error(`Erro ao salvar histórico: ${error.message}`);
}

export async function finalizarConversa(id: string): Promise<void> {
  await db()
    .from("conversas")
    .update({ finalizada: true } as never)
    .eq("id", id);
}

export async function getContextoLead(
  whatsapp: string
): Promise<{ tentativas: number; classificacaoAnterior: string | null }> {
  const { data } = await db()
    .from("leads")
    .select("tentativas_requalificacao, classificacao")
    .eq("whatsapp", whatsapp)
    .maybeSingle();

  const row = data as { tentativas_requalificacao: number; classificacao: string } | null;
  return {
    tentativas: row?.tentativas_requalificacao ?? 0,
    classificacaoAnterior: row?.classificacao ?? null,
  };
}

export async function salvarLead(dados: DadosLead): Promise<void> {
  const { data: existente } = await db()
    .from("leads")
    .select("id, tentativas_requalificacao")
    .eq("whatsapp", dados.whatsapp)
    .maybeSingle();

  const row = existente as { id: string; tentativas_requalificacao: number } | null;

  if (row) {
    const tentativas = (row.tentativas_requalificacao ?? 0) + 1;
    const { error } = await db()
      .from("leads")
      .update({ ...dados, tentativas_requalificacao: tentativas } as never)
      .eq("id", row.id);
    if (error) throw new Error(`Erro ao atualizar lead: ${error.message}`);
  } else {
    const { error } = await db().from("leads").insert(dados as never);
    if (error) throw new Error(`Erro ao salvar lead: ${error.message}`);
  }
}
