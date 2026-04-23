import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processarMensagem } from "@/lib/agent/agent";

export async function GET(): Promise<NextResponse> {
  const results: Record<string, unknown> = {};

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient<any>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: conv, error: convErr } = await db
      .from("conversas")
      .select("id")
      .limit(1);
    results.conversas = convErr ? `ERROR: ${convErr.message}` : `OK (${conv?.length ?? 0} rows)`;

    const { data: conf, error: confErr } = await db
      .from("configuracoes")
      .select("id, valor")
      .limit(5);
    results.configuracoes = confErr ? `ERROR: ${confErr.message}` : conf;

  } catch (err: unknown) {
    results.supabaseError = String(err);
  }

  return NextResponse.json(results);
}

// POST: chama processarMensagem diretamente e retorna erros
export async function POST(req: Request): Promise<NextResponse> {
  const { whatsapp, texto } = await req.json();
  try {
    await processarMensagem(whatsapp ?? "556199872122", texto ?? "oi teste debug", "Debug");
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
