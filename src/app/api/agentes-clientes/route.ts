import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { criarInstancia } from "@/lib/evolution";
import { isAdminRequest } from "@/lib/auth";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// Cria um novo cliente-agente
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const body = await req.json();
  const { nome, instance_evolution } = body;

  if (!nome?.trim() || !instance_evolution?.trim()) {
    return NextResponse.json(
      { error: "Nome e instância da Evolution são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await adminClient()
      .from("clientes_agentes")
      .insert({
        nome: nome.trim(),
        instance_evolution: instance_evolution.trim(),
        segmento: body.segmento ?? "",
        emoji: body.emoji ?? "🤖",
        system_prompt: body.system_prompt ?? "",
        modelo: body.modelo ?? "gemini-2.5-flash",
        temperatura: body.temperatura ?? 0.7,
        max_tokens: body.max_tokens ?? 600,
        tools_ativas: body.tools_ativas ?? [],
        servicos: body.servicos ?? [],
      })
      .select()
      .single();

    if (error) {
      const msg = error.message.includes("duplicate")
        ? "Já existe um agente com essa instância da Evolution."
        : error.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Provisiona a instância na Evolution API (opcional via flag criar_instancia).
    let instancia = null;
    if (body.criar_instancia !== false) {
      instancia = await criarInstancia(instance_evolution.trim());
    }

    return NextResponse.json({ ok: true, agente: data, instancia });
  } catch (err) {
    console.error("[agentes-clientes POST]", err);
    return NextResponse.json({ error: "Erro ao criar agente" }, { status: 500 });
  }
}
