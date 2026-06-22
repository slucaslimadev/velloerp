import { createClient } from "@/lib/supabase/server";
import { AgentesClientesClient } from "./agentes-clientes-client";
import type { ClienteAgente, SessaoMetrica, Agendamento } from "@/types/database";

export const dynamic = "force-dynamic";

export interface AgenteComStats extends ClienteAgente {
  total_conversas: number;
  total_agendamentos: number;
  custo_total: number;
}

export default async function AgentesClientesPage() {
  const supabase = await createClient();

  const [agentesRes, metricasRes, agendamentosRes] = await Promise.all([
    supabase.from("clientes_agentes").select("*").order("criado_em", { ascending: false }),
    supabase.from("sessoes_metricas").select("cliente_agente_id, custo_usd, conversa_id"),
    supabase.from("agendamentos").select("cliente_agente_id").neq("status", "cancelado"),
  ]);

  const metricas = (metricasRes.data ?? []) as Pick<SessaoMetrica, "cliente_agente_id" | "custo_usd" | "conversa_id">[];
  const agendamentos = (agendamentosRes.data ?? []) as Pick<Agendamento, "cliente_agente_id">[];

  const agentes: AgenteComStats[] = ((agentesRes.data ?? []) as ClienteAgente[]).map((a) => {
    const ms = metricas.filter((m) => m.cliente_agente_id === a.id);
    const conversas = new Set(ms.map((m) => m.conversa_id).filter(Boolean));
    return {
      ...a,
      total_conversas: conversas.size,
      total_agendamentos: agendamentos.filter((ag) => ag.cliente_agente_id === a.id).length,
      custo_total: ms.reduce((s, m) => s + Number(m.custo_usd ?? 0), 0),
    };
  });

  return <AgentesClientesClient initialAgentes={agentes} />;
}
