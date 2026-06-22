import { after } from "next/server";
import { type NextRequest, NextResponse } from "next/server";
import { processarMensagem, MSG_MIDIA } from "@/lib/agent/agent";
import { DEMO_WA_AGENTES, processarMensagemDemoWa, normWA } from "@/lib/agent/demo-wa-agentes";
import { enviarMensagem, getMediaBase64 } from "@/lib/agent/evolution";
import { transcreverAudioBase64 } from "@/lib/agent/audio";
import { getAgentePorInstancia } from "@/lib/agent/clientes-agentes";
import { processarMensagemAgente } from "@/lib/agent/agente-generico";
import type { EvolutionWebhookPayload } from "@/lib/agent/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get("x-webhook-token");
  if (process.env.WEBHOOK_TOKEN?.trim() && token !== process.env.WEBHOOK_TOKEN.trim()) {
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

  const instance = payload.instance ?? (process.env.EVOLUTION_INSTANCE ?? "vello");
  const { key, message, messageType, pushName } = payload.data;

  if (key.fromMe || key.remoteJid.endsWith("@g.us")) {
    return NextResponse.json({ received: true });
  }

  const whatsapp = key.remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");

  // ── Roteamento multi-tenant: instância de um cliente-agente ──────────────────
  // Se a instância pertence a um cliente cadastrado, usa o agente genérico
  // (estética etc.) e ignora as regras VELLO (demo, ALLOWED_WHATSAPP).
  const clienteAgente = await getAgentePorInstancia(instance);
  if (clienteAgente) {
    if (messageType === "audioMessage") {
      after(async () => {
        try {
          const base64 = await getMediaBase64(key.id, instance);
          const textoTranscrito = await transcreverAudioBase64(base64, ".ogg");
          await processarMensagemAgente(clienteAgente, whatsapp, textoTranscrito, pushName);
        } catch (err) {
          console.error(`[Webhook:${instance}] Erro no áudio:`, err);
          await enviarMensagem(whatsapp, "Desculpe, não consegui entender seu áudio. Pode escrever? 🙏", instance);
        }
      });
      return NextResponse.json({ received: true });
    }

    let textoCliente: string | null = null;
    if (messageType === "conversation") textoCliente = message?.conversation ?? null;
    else if (messageType === "extendedTextMessage") textoCliente = message?.extendedTextMessage?.text ?? null;

    if (["imageMessage", "videoMessage", "documentMessage"].includes(messageType)) {
      after(async () => { await enviarMensagem(whatsapp, MSG_MIDIA, instance); });
      return NextResponse.json({ received: true });
    }

    if (!textoCliente?.trim()) return NextResponse.json({ received: true });

    const txt = textoCliente.trim();
    after(async () => { await processarMensagemAgente(clienteAgente, whatsapp, txt, pushName); });
    return NextResponse.json({ received: true });
  }

  // Roteamento para agentes demo — verificado ANTES do filtro ALLOWED_WHATSAPP
  const demoAgente = DEMO_WA_AGENTES.find((a) =>
    a.numeros.some((n) => normWA(n) === normWA(whatsapp))
  );

  if (!demoAgente) {
    const allowedNumber = process.env.ALLOWED_WHATSAPP?.trim();
    if (allowedNumber && whatsapp !== allowedNumber) {
      console.log(`[Webhook] Número ${whatsapp} bloqueado (modo teste). Ignorando.`);
      return NextResponse.json({ received: true });
    }
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
        if (demoAgente) {
          await processarMensagemDemoWa(whatsapp, textoTranscrito, pushName, demoAgente);
        } else {
          await processarMensagem(whatsapp, textoTranscrito, pushName);
        }
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
    if (demoAgente) {
      await processarMensagemDemoWa(whatsapp, textoFinal, pushName, demoAgente);
    } else {
      await processarMensagem(whatsapp, textoFinal, pushName);
    }
  });

  return NextResponse.json({ received: true });
}
