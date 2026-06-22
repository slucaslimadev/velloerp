import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/google";

export const dynamic = "force-dynamic";

// Inicia o OAuth do Google Calendar para o agente do cliente logado (origem portal).
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/portal/login", process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000"));

  const { data } = await supabase
    .from("clientes_agentes")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const agenteId = (data as { id: string } | null)?.id;
  if (!agenteId) return NextResponse.json({ error: "Sem agente vinculado" }, { status: 403 });

  const state = Buffer.from(JSON.stringify({ a: agenteId, o: "portal" })).toString("base64url");
  return NextResponse.redirect(getAuthUrl(state));
}
