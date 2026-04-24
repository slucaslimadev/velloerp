import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { whatsapp, mensagem } = await req.json();

  if (!whatsapp || !mensagem?.trim()) {
    return NextResponse.json({ error: "whatsapp e mensagem são obrigatórios" }, { status: 400 });
  }

  const numero = String(whatsapp).replace(/\D/g, "");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data: conversa, error } = await db
    .from("conversas")
    .insert({
      whatsapp: numero,
      historico: [{ role: "assistant", content: mensagem.trim() }],
      finalizada: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const api = axios.create({
      baseURL: process.env.EVOLUTION_API_URL,
      headers: { apikey: process.env.EVOLUTION_API_KEY, "Content-Type": "application/json" },
      timeout: 10_000,
    });
    await api.post(`/message/sendText/${process.env.EVOLUTION_INSTANCE ?? "vello"}`, {
      number: numero,
      text: mensagem.trim(),
    });
  } catch (err) {
    console.error("[iniciarConversa] Erro ao enviar mensagem via Evolution:", err);
  }

  return NextResponse.json({ ok: true, conversa });
}
