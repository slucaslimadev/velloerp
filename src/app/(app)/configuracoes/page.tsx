import { createClient } from "@/lib/supabase/server";
import { ConfiguracoesClient } from "./configuracoes-client";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const configRaw = await (supabase.from("configuracoes") as any).select("valor").eq("id", "ia_ativa").maybeSingle();
  const [conversasRes, leadsRes] = await Promise.all([
    supabase.from("conversas").select("id, finalizada, criado_em, whatsapp, nome_contato"),
    supabase.from("leads").select("id, nome, classificacao, criado_em"),
  ]);

  const iaAtiva = (configRaw.data as { valor: string } | null)?.valor !== "false";
  const conversas = conversasRes.data ?? [];
  const leads = leadsRes.data ?? [];

  return (
    <ConfiguracoesClient
      iaAtivaInicial={iaAtiva}
      conversas={conversas as {
        id: string;
        finalizada: boolean;
        criado_em: string;
        whatsapp: string;
        nome_contato: string | null;
      }[]}
      totalLeads={leads.length}
    />
  );
}
