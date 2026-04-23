import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(): Promise<NextResponse> {
  const results: Record<string, unknown> = {
    envVars: {
      SUPABASE_URL: process.env.SUPABASE_URL ? "SET" : "MISSING",
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? "SET" : "MISSING",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "SET" : "MISSING",
      EVOLUTION_API_URL: process.env.EVOLUTION_API_URL ? "SET" : "MISSING",
      EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY ? "SET" : "MISSING",
      EVOLUTION_INSTANCE: process.env.EVOLUTION_INSTANCE || "MISSING",
      WEBHOOK_TOKEN: process.env.WEBHOOK_TOKEN ? "SET" : "MISSING",
      ALLOWED_WHATSAPP: JSON.stringify(process.env.ALLOWED_WHATSAPP),
    },
  };

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
