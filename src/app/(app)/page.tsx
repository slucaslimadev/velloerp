import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [leadsResult, clientesResult] = await Promise.all([
    supabase.from("leads").select("*").order("criado_em", { ascending: false }),
    supabase.from("clientes").select("valor_contrato, status"),
  ]);

  const leads = leadsResult.data ?? [];
  const clientes = clientesResult.data ?? [];

  return <DashboardClient leads={leads} clientes={clientes} />;
}
