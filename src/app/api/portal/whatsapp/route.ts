import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { statusInstancia, desconectarInstancia } from "@/lib/evolution";

export const dynamic = "force-dynamic";

/** Resolve a instância da Evolution do cliente autenticado (via RLS). */
async function getInstanciaDoCliente(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("clientes_agentes")
    .select("instance_evolution")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as { instance_evolution: string } | null)?.instance_evolution ?? null;
}

export async function GET(): Promise<NextResponse> {
  const instancia = await getInstanciaDoCliente();
  if (!instancia) return NextResponse.json({ error: "Sem agente vinculado" }, { status: 403 });
  return NextResponse.json(await statusInstancia(instancia));
}

// Desconecta o WhatsApp (logout da instância)
export async function DELETE(): Promise<NextResponse> {
  const instancia = await getInstanciaDoCliente();
  if (!instancia) return NextResponse.json({ error: "Sem agente vinculado" }, { status: 403 });
  const ok = await desconectarInstancia(instancia);
  return NextResponse.json({ ok });
}
