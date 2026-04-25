import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() {
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ whatsapp: string }> }): Promise<NextResponse> {
  const { whatsapp } = await params;
  try {
    const { data } = await db()
      .from("contatos")
      .select("tags")
      .eq("whatsapp", decodeURIComponent(whatsapp))
      .maybeSingle();
    return NextResponse.json({ tags: data?.tags ?? [] });
  } catch {
    return NextResponse.json({ tags: [] });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ whatsapp: string }> }): Promise<NextResponse> {
  const { whatsapp } = await params;
  const { tags } = await req.json();
  try {
    await db()
      .from("contatos")
      .upsert({ whatsapp: decodeURIComponent(whatsapp), tags: tags ?? [] }, { onConflict: "whatsapp" });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
