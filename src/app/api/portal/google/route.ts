import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

/** Resolve o id do agente do cliente logado (via RLS). */
async function getAgenteId(): Promise<string | null> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("clientes_agentes").select("id").eq("user_id", user.id).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

// Status (sem expor token)
export async function GET(): Promise<NextResponse> {
  const id = await getAgenteId();
  if (!id) return NextResponse.json({ error: "Sem agente vinculado" }, { status: 403 });
  const { data } = await adminClient()
    .from("agente_integracoes")
    .select("conectado, email")
    .eq("cliente_agente_id", id)
    .eq("provider", "google_calendar")
    .maybeSingle();
  const row = data as { conectado: boolean; email: string | null } | null;
  return NextResponse.json({ conectado: row?.conectado ?? false, email: row?.email ?? null });
}

// Desconecta
export async function DELETE(): Promise<NextResponse> {
  const id = await getAgenteId();
  if (!id) return NextResponse.json({ error: "Sem agente vinculado" }, { status: 403 });
  await adminClient()
    .from("agente_integracoes")
    .update({ conectado: false, refresh_token: null } as never)
    .eq("cliente_agente_id", id)
    .eq("provider", "google_calendar");
  return NextResponse.json({ ok: true });
}
