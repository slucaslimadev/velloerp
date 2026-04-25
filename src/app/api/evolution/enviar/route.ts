import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() {
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

function evolution() {
  return axios.create({
    baseURL: process.env.EVOLUTION_API_URL,
    headers: { apikey: process.env.EVOLUTION_API_KEY, "Content-Type": "application/json" },
    timeout: 15_000,
  });
}

const INSTANCE = () => process.env.EVOLUTION_INSTANCE ?? "vello";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { whatsapp, tipo, conteudo, conversaId, nomeArquivo } = await req.json();

  if (!whatsapp || !tipo || !conteudo) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const numero = String(whatsapp).replace(/\D/g, "");
  const api = evolution();

  try {
    if (tipo === "texto") {
      await api.post(`/message/sendText/${INSTANCE()}`, { number: numero, text: conteudo });
    } else if (tipo === "imagem") {
      await api.post(`/message/sendMedia/${INSTANCE()}`, {
        number: numero,
        mediatype: "image",
        media: conteudo,
        caption: nomeArquivo ?? "",
        encoding: true,
      });
    } else if (tipo === "audio") {
      await api.post(`/message/sendWhatsAppAudio/${INSTANCE()}`, {
        number: numero,
        audio: conteudo,
        encoding: true,
      });
    }
  } catch (err) {
    console.error("[enviar] Erro Evolution API:", err);
    return NextResponse.json({ error: "Falha ao enviar mensagem" }, { status: 500 });
  }

  // Save to conversation historico
  if (conversaId) {
    const { data: conv } = await db()
      .from("conversas")
      .select("historico")
      .eq("id", conversaId)
      .single();

    if (conv) {
      const novaMsg =
        tipo === "texto"
          ? { role: "assistant", content: conteudo }
          : tipo === "imagem"
          ? { role: "assistant", content: `[Imagem${nomeArquivo ? `: ${nomeArquivo}` : ""}]` }
          : { role: "assistant", content: "[Áudio enviado]" };

      const historico = [...(conv.historico ?? []), novaMsg];
      await db()
        .from("conversas")
        .update({ historico, finalizada: false } as never)
        .eq("id", conversaId);
    }
  }

  return NextResponse.json({ ok: true });
}
