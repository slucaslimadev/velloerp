import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { ConversasClient } from "./conversas-client";
import type { Conversa, Lead } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ConversasPage() {
  // Service key para bypassar RLS na tabela conversas (sem política de leitura)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  const supabase = await createServerClient();

  const [{ data: conversas }, { data: leads }] = await Promise.all([
    adminDb.from("conversas").select("*").order("atualizado_em", { ascending: false }),
    supabase.from("leads").select("id, nome, whatsapp"),
  ]);

  return (
    <ConversasClient
      initialConversas={(conversas ?? []) as Conversa[]}
      leads={(leads ?? []) as Pick<Lead, "id" | "nome" | "whatsapp">[]}
    />
  );
}
