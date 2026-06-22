import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { criarInstancia, statusInstancia, desconectarInstancia } from "@/lib/evolution";
import { isAdminRequest } from "@/lib/auth";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

async function getInstance(id: string): Promise<string | null> {
  const { data } = await adminClient()
    .from("clientes_agentes")
    .select("instance_evolution")
    .eq("id", id)
    .maybeSingle();
  return (data as { instance_evolution: string } | null)?.instance_evolution ?? null;
}

// Status + QR da instância do agente
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  const { id } = await params;
  const instancia = await getInstance(id);
  if (!instancia) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  return NextResponse.json(await statusInstancia(instancia));
}

// (Re)cria a instância na Evolution
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  const { id } = await params;
  const instancia = await getInstance(id);
  if (!instancia) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  return NextResponse.json(await criarInstancia(instancia));
}

// Desconecta o WhatsApp da instância
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  const { id } = await params;
  const instancia = await getInstance(id);
  if (!instancia) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  const ok = await desconectarInstancia(instancia);
  return NextResponse.json({ ok });
}
