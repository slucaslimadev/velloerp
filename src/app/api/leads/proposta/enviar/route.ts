import { type NextRequest, NextResponse } from "next/server";
import { enviarDocumento } from "@/lib/agent/evolution";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { whatsapp, pdfBase64, fileName, nomeCliente } = await req.json();

  if (!whatsapp || !pdfBase64) {
    return NextResponse.json({ error: "whatsapp e pdfBase64 são obrigatórios" }, { status: 400 });
  }

  try {
    await enviarDocumento(
      whatsapp,
      pdfBase64,
      fileName ?? "Proposta-VELLO.pdf",
      `Olá${nomeCliente ? `, ${nomeCliente.split(" ")[0]}` : ""}! 👋\n\nSegue em anexo a proposta comercial da *VELLO Inteligência Artificial*.\n\nQualquer dúvida, estou à disposição. 🚀`
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[proposta/enviar]", err);
    return NextResponse.json({ error: "Falha ao enviar via WhatsApp" }, { status: 500 });
  }
}
