import { after } from "next/server";
import { type NextRequest, NextResponse } from "next/server";
import { processarMensagem, MSG_MIDIA } from "@/lib/agent/agent";
import { enviarMensagem, getMediaBase64 } from "@/lib/agent/evolution";
import { transcreverAudioBase64 } from "@/lib/agent/audio";
import type { EvolutionWebhookPayload } from "@/lib/agent/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get("x-webhook-token");
  if (process.env.WEBHOOK_TOKEN && token !== process.env.WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: EvolutionWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.event !== "messages.upsert") {
    return NextResponse.json({ received: true });
  }

  const { key, message, messageType, pushName } = payload.data;

  if (key.fromMe || key.remoteJid.endsWith("@g.us")) {
    return NextResponse.json({ received: true });
  }

  const whatsapp = key.remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");

  const allowedNumber = process.env.ALLOWED_WHATSAPP;
  if (allowedNumber && whatsapp !== allowedNumber) {
    console.log(`[Webhook] Número ${whatsapp} bloqueado (modo teste). Ignorando.`);
    return NextResponse.json({ received: true });
  }

  const isOutraMidia = ["imageMessage", "videoMessage", "documentMessage"].includes(messageType);
  if (isOutraMidia) {
    after(async () => {
      await enviarMensagem(whatsapp, MSG_MIDIA);
    });
    return NextResponse.json({ received: true });
  }

  if (messageType === "audioMessage") {
    console.log(`[Webhook] Recebeu áudio de ${whatsapp}. Transcrevendo...`);
    after(async () => {
      try {
        const base64 = await getMediaBase64(key.id);
        const textoTranscrito = await transcreverAudioBase64(base64, ".ogg");
        console.log(`[Webhook] Áudio transcrito [${whatsapp}]: ${textoTranscrito}`);
        await processarMensagem(whatsapp, textoTranscrito, pushName);
      } catch (err) {
        console.error(`[Webhook] Erro ao transcrever áudio de ${whatsapp}:`, err);
        await enviarMensagem(
          whatsapp,
          "Desculpe, tive um probleminha para entender seu áudio. 😕 Poderia me enviar a mensagem por texto?"
        );
      }
    });
    return NextResponse.json({ received: true });
  }

  let texto: string | null = null;
  if (messageType === "conversation") {
    texto = message?.conversation ?? null;
  } else if (messageType === "extendedTextMessage") {
    texto = message?.extendedTextMessage?.text ?? null;
  }

  if (!texto?.trim()) {
    return NextResponse.json({ received: true });
  }

  console.log(`[Webhook] ${whatsapp} (${pushName ?? "desconhecido"}): ${texto}`);

  const textoFinal = texto.trim();
  after(async () => {
    await processarMensagem(whatsapp, textoFinal, pushName);
  });

  return NextResponse.json({ received: true });
}
