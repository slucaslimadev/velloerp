import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processarMensagem } from "@/lib/agent/agent";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() {
  return createClient<any>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function GET(): Promise<NextResponse> {
  const results: Record<string, unknown> = {};

  try {
    const { data: convs, error: convErr } = await db()
      .from("conversas")
      .select("id, whatsapp, finalizada, atualizado_em")
      .order("atualizado_em", { ascending: false })
      .limit(10);
    results.conversas = convErr ? `ERROR: ${convErr.message}` : convs;

    const { data: conf, error: confErr } = await db()
      .from("configuracoes")
      .select("id, valor")
      .limit(5);
    results.configuracoes = confErr ? `ERROR: ${confErr.message}` : conf;

    const limite = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recente, error: rErr } = await db()
      .from("conversas")
      .select("id, whatsapp, finalizada, atualizado_em")
      .eq("whatsapp", "556199872122")
      .eq("finalizada", true)
      .gte("atualizado_em", limite)
      .limit(1)
      .maybeSingle();
    results.conversaFinalizada24h = rErr ? `ERROR: ${rErr.message}` : recente;
    results.iaAtivaPara556199872122 = recente ? false : "PROVAVELMENTE_ATIVA";

  } catch (err: unknown) {
    results.supabaseError = String(err);
  }

  return NextResponse.json(results);
}

export async function POST(req: Request): Promise<NextResponse> {
  const { whatsapp, texto } = await req.json();
  try {
    await processarMensagem(whatsapp ?? "556199872122", texto ?? "oi debug", "Debug");
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
