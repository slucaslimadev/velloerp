import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { nome, email, telefone, segmento, origem } = await req.json();

  if (!nome || !telefone) {
    return NextResponse.json({ error: "Nome e telefone são obrigatórios" }, { status: 400 });
  }

  try {
    // Verifica se já existe um lead com este telefone
    const { data: existente } = await db()
      .from("leads")
      .select("id, tentativas_requalificacao")
      .eq("whatsapp", telefone)
      .maybeSingle();

    const row = existente as { id: string; tentativas_requalificacao: number } | null;

    const dadosLead = {
      nome,
      email: email || null,
      whatsapp: telefone,
      segmento: segmento || "Imobiliário",
      tamanho_empresa: null,
      dor_principal: "Demonstração do Corretor Virtual (demo)",
      usa_automacao: null,
      sistemas_utilizados: null,
      tem_api: "Verificar",
      descricao_processo_ia: `Lead captado via demo pública — origem: ${origem || "demo_imobiliaria"}`,
      orcamento: null,
      prazo: null,
      pontuacao: 40,
      classificacao: "Quente",
      status: "Novo",
      observacoes: `Captado via demo pública (${origem || "demo_imobiliaria"}). Solicitou teste de 7 dias.`,
    };

    if (row) {
      await db()
        .from("leads")
        .update({ ...dadosLead, tentativas_requalificacao: (row.tentativas_requalificacao ?? 0) + 1 } as never)
        .eq("id", row.id);
    } else {
      const { error } = await db().from("leads").insert(dadosLead as never);
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[capturar-lead]", err);
    return NextResponse.json({ error: "Erro ao salvar lead" }, { status: 500 });
  }
}
