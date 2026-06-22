import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function db() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_KEY!.trim()
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const body = await req.json();
    
    const { data: updatedRecord, error } = await (db()
      .from("tarefas") as any)
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ tarefa: updatedRecord });
  } catch (error: any) {
    console.error(`[PATCH /api/tarefas/${id}]`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const { error } = await db()
      .from("tarefas")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error(`[DELETE /api/tarefas/${id}]`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
