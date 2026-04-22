import { createClient } from "@/lib/supabase/server";
import { LeadsClient } from "./leads-client";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("criado_em", { ascending: false });

  return <LeadsClient leads={leads ?? []} />;
}
