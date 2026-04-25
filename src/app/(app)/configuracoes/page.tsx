import { createClient } from "@/lib/supabase/server";
import { ConfiguracoesClient } from "./configuracoes-client";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const configRaw = await (supabase.from("configuracoes") as any)
    .select("valor")
    .eq("id", "ia_ativa")
    .maybeSingle();
  const iaAtiva = (configRaw.data as { valor: string } | null)?.valor !== "false";

  return <ConfiguracoesClient iaAtivaInicial={iaAtiva} />;
}
