import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AgenteDashboard } from "./agente-dashboard";
import type { ClienteAgente, SessaoMetrica, Agendamento } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AgenteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: agente } = await supabase
    .from("clientes_agentes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!agente) notFound();

  const [metricasRes, agendamentosRes] = await Promise.all([
    supabase.from("sessoes_metricas").select("*").eq("cliente_agente_id", id).order("criado_em", { ascending: false }),
    supabase.from("agendamentos").select("*").eq("cliente_agente_id", id).order("data_hora", { ascending: false }).limit(30),
  ]);

  return (
    <AgenteDashboard
      agente={agente as ClienteAgente}
      metricas={(metricasRes.data ?? []) as SessaoMetrica[]}
      agendamentos={(agendamentosRes.data ?? []) as Agendamento[]}
    />
  );
}
