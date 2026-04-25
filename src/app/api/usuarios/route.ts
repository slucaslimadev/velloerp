import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await adminClient().auth.admin.listUsers();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const users = data.users.map((u) => ({
      id: u.id,
      email: u.email,
      criado_em: u.created_at,
      ultimo_login: u.last_sign_in_at ?? null,
    }));
    return NextResponse.json({ users });
  } catch (err) {
    console.error("[usuarios GET]", err);
    return NextResponse.json({ error: "Erro ao listar usuários" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Senha deve ter ao menos 6 caracteres" }, { status: 400 });
  }
  try {
    const { data, error } = await adminClient().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, user: { id: data.user.id, email: data.user.email } });
  } catch (err) {
    console.error("[usuarios POST]", err);
    return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 });
  }
}
