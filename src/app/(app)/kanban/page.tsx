import { createClient } from "@/lib/supabase/server";
import { KanbanClient } from "./kanban-client";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const supabase = await createClient();

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("pontuacao", { ascending: false });

  return <KanbanClient leads={leads ?? []} />;
}
