import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() {
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function normalizeModel(modelo?: string): string {
  return modelo?.startsWith("gemini-") ? modelo : DEFAULT_GEMINI_MODEL;
}

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db()
    .from("agentes_demo")
    .select("*")
    .order("criado_em", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agentes: data ?? [] });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { nome, emoji, cor, segmento, descricao, systemPrompt, modelo, sugestoes } = body;

  if (!nome?.trim() || !systemPrompt?.trim()) {
    return NextResponse.json({ error: "nome e systemPrompt são obrigatórios" }, { status: 400 });
  }

  const baseSlug = slugify(nome);
  let slug = baseSlug;

  // Ensure slug is unique — append suffix if needed
  const { data: existing } = await db()
    .from("agentes_demo")
    .select("slug")
    .like("slug", `${baseSlug}%`);

  if (existing && existing.length > 0) {
    const taken = new Set(existing.map((r: { slug: string }) => r.slug));
    if (taken.has(slug)) {
      let i = 2;
      while (taken.has(`${baseSlug}-${i}`)) i++;
      slug = `${baseSlug}-${i}`;
    }
  }

  const { data, error } = await db()
    .from("agentes_demo")
    .insert({
      slug,
      nome: nome.trim(),
      emoji: emoji || "🤖",
      cor: cor || "#41BEEA",
      segmento: segmento?.trim() || "",
      descricao: descricao?.trim() || "",
      system_prompt: systemPrompt.trim(),
      modelo: normalizeModel(modelo),
      sugestoes: sugestoes ?? [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agente: data }, { status: 201 });
}
