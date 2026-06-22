import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function db() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_KEY!.trim()
  );
}

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db()
      .from("tarefas")
      .select("*")
      .order("data", { ascending: true })
      .order("horario", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ tarefas: data ?? [] });
  } catch (error: any) {
    console.error("[GET /api/tarefas]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { titulo, descricao, data, horario, responsavel, lead_id, cliente_id, status } = body;

    if (!titulo || !data || !responsavel) {
      return NextResponse.json({ error: "Título, data e responsável são obrigatórios." }, { status: 400 });
    }

    const { data: newRecord, error } = await db()
      .from("tarefas")
      .insert({
        titulo,
        descricao: descricao || null,
        data,
        horario: horario || null,
        responsavel,
        lead_id: lead_id || null,
        cliente_id: cliente_id || null,
        status: status || "Pendente"
      } as any)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ tarefa: newRecord });
  } catch (error: any) {
    console.error("[POST /api/tarefas]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
