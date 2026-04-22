import { createClient } from "@/lib/supabase/server";
import { ClientesClient } from "./clientes-client";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const supabase = await createClient();

  const { data: clientes } = await supabase
    .from("clientes")
    .select("*")
    .order("criado_em", { ascending: false });

  return <ClientesClient clientes={clientes ?? []} />;
}
