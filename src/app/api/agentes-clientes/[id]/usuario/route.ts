import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRequest } from "@/lib/auth";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// Cria (ou revincula) o usuário de acesso ao portal do cliente.
// O usuário recebe app_metadata.role = 'cliente' e é vinculado ao cliente-agente.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const { id } = await params;
  const { email, password } = await req.json();

  if (!email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Senha deve ter ao menos 6 caracteres" }, { status: 400 });
  }

  const admin = adminClient();

  try {
    const { data, error } = await admin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      app_metadata: { role: "cliente" },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { error: linkErr } = await admin
      .from("clientes_agentes")
      .update({ user_id: data.user.id })
      .eq("id", id);

    if (linkErr) {
      // rollback: remove o usuário criado para não deixar órfão
      await admin.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ error: linkErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, user: { id: data.user.id, email: data.user.email } });
  } catch (err) {
    console.error("[agentes-clientes usuario POST]", err);
    return NextResponse.json({ error: "Erro ao criar usuário do portal" }, { status: 500 });
  }
}

// Atualiza a senha do usuário do portal vinculado.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const { id } = await params;
  const { password } = await req.json();

  if (!password?.trim() || password.length < 6) {
    return NextResponse.json({ error: "Senha deve ter ao menos 6 caracteres" }, { status: 400 });
  }

  const admin = adminClient();
  try {
    const { data: agente } = await admin
      .from("clientes_agentes")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (!agente?.user_id) {
      return NextResponse.json({ error: "Este agente não tem usuário de portal" }, { status: 404 });
    }

    const { error } = await admin.auth.admin.updateUserById(agente.user_id, { password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[agentes-clientes usuario PATCH]", err);
    return NextResponse.json({ error: "Erro ao redefinir senha" }, { status: 500 });
  }
}
