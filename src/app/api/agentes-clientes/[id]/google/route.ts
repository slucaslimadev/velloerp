import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRequest } from "@/lib/auth";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// Status da integração Google (sem expor o token)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  const { id } = await params;
  const { data } = await adminClient()
    .from("agente_integracoes")
    .select("conectado, email")
    .eq("cliente_agente_id", id)
    .eq("provider", "google_calendar")
    .maybeSingle();
  const row = data as { conectado: boolean; email: string | null } | null;
  return NextResponse.json({ conectado: row?.conectado ?? false, email: row?.email ?? null });
}

// Desconecta o Google Calendar
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  const { id } = await params;
  await adminClient()
    .from("agente_integracoes")
    .update({ conectado: false, refresh_token: null } as never)
    .eq("cliente_agente_id", id)
    .eq("provider", "google_calendar");
  return NextResponse.json({ ok: true });
}
