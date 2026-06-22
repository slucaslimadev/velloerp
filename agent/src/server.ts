import "dotenv/config";
import express, { type Request, type Response } from "express";
import { processarMensagem, MSG_MIDIA } from "./agent";
import { processarMensagemAgente } from "./agente-generico";
import { getAgentePorInstancia } from "./clientes-agentes";
import type { EvolutionWebhookPayload } from "./types";
import { enqueue } from "./queue";

const app  = express();
const PORT = process.env.PORT ?? 3001;

const DEBOUNCE_MS = 3000;

app.use(express.json({ limit: "1mb" }));

/**
 * Roteia a mensagem: se a instância pertence a um cliente-agente configurado,
 * usa o agente genérico; caso contrário, cai no fluxo VELLO (qualificação de leads).
 */
async function rotear(whatsapp: string, texto: string, instance: string, pushName?: string): Promise<void> {
  const agente = await getAgentePorInstancia(instance);
  if (agente) {
    await processarMensagemAgente(agente, whatsapp, texto, pushName);
  } else {
    await processarMensagem(whatsapp, texto, pushName);
  }
}

// ─── Debounce por número ──────────────────────────────────────────────────────

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const mensagensPendentes = new Map<string, { textos: string[]; pushName?: string; instance: string }>();

function agendarProcessamento(whatsapp: string, texto: string, instance: string, pushName?: string): void {
  const pendente = mensagensPendentes.get(whatsapp) ?? { textos: [], instance };
  pendente.textos.push(texto);
  pendente.instance = instance;
  if (!pendente.pushName && pushName) pendente.pushName = pushName;
  mensagensPendentes.set(whatsapp, pendente);

  const existing = debounceTimers.get(whatsapp);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    debounceTimers.delete(whatsapp);
    const dados = mensagensPendentes.get(whatsapp);
    mensagensPendentes.delete(whatsapp);
    if (!dados) return;

    const textoFinal = dados.textos.join("\n");
    enqueue(whatsapp, () => rotear(whatsapp, textoFinal, dados.instance, dados.pushName));
  }, DEBOUNCE_MS);

  debounceTimers.set(whatsapp, timer);
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Webhook da Evolution API ─────────────────────────────────────────────────
app.post("/webhook", async (req: Request, res: Response) => {
  const token = req.headers["x-webhook-token"];
  if (
    process.env.WEBHOOK_TOKEN &&
    token !== process.env.WEBHOOK_TOKEN
  ) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.status(200).json({ received: true });

  const payload = req.body as EvolutionWebhookPayload;

  if (payload.event !== "messages.upsert") return;

  const instance = payload.instance ?? (process.env.EVOLUTION_INSTANCE ?? "vello");
  const { key, message, messageType, pushName } = payload.data;

  if (key.fromMe) return;

  const whatsapp = key.remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");

  // Modo de teste: responde apenas o número autorizado
  const allowedNumber = process.env.ALLOWED_WHATSAPP;
  if (allowedNumber && whatsapp !== allowedNumber) {
    console.log(`[Webhook] Número ${whatsapp} bloqueado (modo teste). Ignorando.`);
    return;
  }

  if (key.remoteJid.endsWith("@g.us")) return;

  let texto: string | null = null;

  if (messageType === "conversation") {
    texto = message?.conversation ?? null;
  } else if (messageType === "extendedTextMessage") {
    texto = message?.extendedTextMessage?.text ?? null;
  }

  const isOutraMidia = ["imageMessage", "videoMessage", "documentMessage"].includes(messageType);

  if (isOutraMidia) {
    const { enviarMensagem } = await import("./evolution");
    await enviarMensagem(whatsapp, MSG_MIDIA, instance);
    return;
  }

  if (messageType === "audioMessage") {
    console.log(`[Webhook] Recebeu áudio de ${whatsapp}. Transcrevendo...`);

    (async () => {
      try {
        const { getMediaBase64 } = await import("./evolution");
        const { transcreverAudioBase64 } = await import("./audio");

        const base64 = await getMediaBase64(key.id);
        const textoTranscrito = await transcreverAudioBase64(base64, ".ogg");

        console.log(`[Webhook] Áudio transcrito [${whatsapp}]: ${textoTranscrito}`);
        agendarProcessamento(whatsapp, textoTranscrito, instance, pushName);
      } catch (err) {
        console.error(`[Webhook] Erro ao transcrever áudio de ${whatsapp}:`, err);
        const { enviarMensagem } = await import("./evolution");
        await enviarMensagem(whatsapp, "Desculpe, tive um probleminha para entender seu áudio. 😕 Poderia me enviar a mensagem por texto?", instance);
      }
    })();
    return;
  }

  if (!texto?.trim()) return;

  console.log(`[Webhook] [${instance}] ${whatsapp} (${pushName ?? "desconhecido"}): ${texto}`);

  agendarProcessamento(whatsapp, texto.trim(), instance, pushName);
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🤖 Vello Agent rodando na porta ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Webhook: http://localhost:${PORT}/webhook\n`);
});
