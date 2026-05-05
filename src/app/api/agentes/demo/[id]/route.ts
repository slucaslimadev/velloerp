import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() {
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function normalizeModel(modelo?: string): string {
  return modelo?.startsWith("gemini-") ? modelo : DEFAULT_GEMINI_MODEL;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json();
  const { nome, emoji, cor, segmento, descricao, systemPrompt, modelo, sugestoes } = body;

  if (!nome?.trim() || !systemPrompt?.trim()) {
    return NextResponse.json({ error: "nome e systemPrompt são obrigatórios" }, { status: 400 });
  }

  const { data, error } = await db()
    .from("agentes_demo")
    .update({
      nome: nome.trim(),
      emoji: emoji || "🤖",
      cor: cor || "#41BEEA",
      segmento: segmento?.trim() || "",
      descricao: descricao?.trim() || "",
      system_prompt: systemPrompt.trim(),
      modelo: normalizeModel(modelo),
      sugestoes: sugestoes ?? [],
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agente: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const { error } = await db()
    .from("agentes_demo")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
