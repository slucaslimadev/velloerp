import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() {
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function GET(): Promise<NextResponse> {
  try {
    const { data } = await db().from("contatos").select("whatsapp, tags");
    return NextResponse.json({ contatos: data ?? [] });
  } catch {
    return NextResponse.json({ contatos: [] });
  }
}
