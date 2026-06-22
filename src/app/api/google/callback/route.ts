import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { exchangeCode } from "@/lib/google";

export const dynamic = "force-dynamic";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

function decodeState(state: string): { a: string; o: string } | null {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const origin = url.origin;

  const decoded = state ? decodeState(state) : null;
  const destino = decoded?.o === "portal" ? "/portal" : decoded ? `/agentes-clientes/${decoded.a}` : "/";

  if (!code || !decoded) {
    return NextResponse.redirect(`${origin}${destino}?google=erro`);
  }

  try {
    const { refresh_token, email } = await exchangeCode(code);
    const admin = adminClient();

    // upsert da integração. Só sobrescreve refresh_token se veio um novo.
    const update: Record<string, unknown> = {
      cliente_agente_id: decoded.a,
      provider: "google_calendar",
      email,
      conectado: true,
    };
    if (refresh_token) update.refresh_token = refresh_token;

    await admin.from("agente_integracoes").upsert(update, { onConflict: "cliente_agente_id,provider" });

    return NextResponse.redirect(`${origin}${destino}?google=ok`);
  } catch (err) {
    console.error("[google/callback]", err);
    return NextResponse.redirect(`${origin}${destino}?google=erro`);
  }
}
