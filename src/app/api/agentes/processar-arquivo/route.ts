import { type NextRequest, NextResponse } from "next/server";
import { transcreverAudioBase64 } from "@/lib/agent/audio";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { tipo, base64, mediaType, nome, ext } = await req.json();

  if (!tipo || !base64) {
    return NextResponse.json({ error: "tipo e base64 são obrigatórios" }, { status: 400 });
  }

  if (tipo === "audio") {
    try {
      const texto = await transcreverAudioBase64(base64, ext ?? ".ogg");
      return NextResponse.json({ tipo: "audio_transcricao", texto, nome: nome ?? "áudio" });
    } catch (err) {
      console.error("[processar-arquivo] Erro ao transcrever áudio:", err);
      return NextResponse.json({ error: "Falha na transcrição" }, { status: 500 });
    }
  }

  if (tipo === "pdf") {
    try {
      const { extractText } = await import("unpdf");
      const buffer = Buffer.from(base64, "base64");
      const uint8 = new Uint8Array(buffer);
      const { text } = await extractText(uint8, { mergePages: true });
      const texto = text?.trim() ?? "";
      if (!texto) {
        return NextResponse.json({
          tipo: "pdf_text",
          texto: "[PDF sem texto extraível — pode ser um arquivo escaneado]",
          nome,
        });
      }
      return NextResponse.json({ tipo: "pdf_text", texto: texto.slice(0, 20_000), nome });
    } catch (err) {
      console.error("[processar-arquivo] Erro ao processar PDF:", err);
      return NextResponse.json({ error: "Falha ao ler o PDF" }, { status: 500 });
    }
  }

  if (tipo === "image") {
    return NextResponse.json({ tipo: "image", base64, mediaType: mediaType ?? "image/jpeg", nome });
  }

  return NextResponse.json({ error: "Tipo não suportado" }, { status: 400 });
}
