import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalClient } from "./portal-client";
import type { ClienteAgente, SessaoMetrica, Agendamento } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: agenteData } = await supabase
    .from("clientes_agentes")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const agente = agenteData as ClienteAgente | null;

  if (!agente) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#16171C] px-4 text-center">
        <div>
          <p className="text-white text-lg font-semibold" style={{ fontFamily: "var(--ff-head)" }}>Acesso não vinculado</p>
          <p className="text-sm mt-2" style={{ color: "var(--text-3)" }}>Sua conta ainda não está ligada a um agente. Fale com a Vello.</p>
        </div>
      </div>
    );
  }

  const [metricasRes, agendamentosRes] = await Promise.all([
    supabase.from("sessoes_metricas").select("*").eq("cliente_agente_id", agente.id).order("criado_em", { ascending: false }),
    supabase.from("agendamentos").select("*").eq("cliente_agente_id", agente.id).order("data_hora", { ascending: false }).limit(20),
  ]);

  return (
    <PortalClient
      agente={agente as ClienteAgente}
      metricas={(metricasRes.data ?? []) as SessaoMetrica[]}
      agendamentos={(agendamentosRes.data ?? []) as Agendamento[]}
    />
  );
}
