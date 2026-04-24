import { createClient } from "@/lib/supabase/server";
import { ConversasClient } from "./conversas-client";
import type { Conversa, Lead } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ConversasPage() {
  const supabase = await createClient();

  const [{ data: conversas }, { data: leads }] = await Promise.all([
    supabase.from("conversas").select("*").order("atualizado_em", { ascending: false }),
    supabase.from("leads").select("id, nome, whatsapp"),
  ]);

  return (
    <ConversasClient
      initialConversas={(conversas ?? []) as Conversa[]}
      leads={(leads ?? []) as Pick<Lead, "id" | "nome" | "whatsapp">[]}
    />
  );
}
