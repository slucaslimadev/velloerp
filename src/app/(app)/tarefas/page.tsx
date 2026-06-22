import { createClient } from "@/lib/supabase/server";
import { TarefasClient } from "./tarefas-client";

export const dynamic = "force-dynamic";

export default async function TarefasPage() {
  const supabase = await createClient();

  const [tarefasRes, leadsRes, clientesRes] = await Promise.all([
    supabase.from("tarefas").select("*").order("data", { ascending: true }).order("horario", { ascending: true }),
    supabase.from("leads").select("id, nome").order("nome", { ascending: true }),
    supabase.from("clientes").select("id, nome").order("nome", { ascending: true })
  ]);

  return (
    <TarefasClient
      initialTarefas={tarefasRes.data ?? []}
      leads={leadsRes.data ?? []}
      clientes={clientesRes.data ?? []}
    />
  );
}
