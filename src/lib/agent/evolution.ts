import axios from "axios";

const api = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: {
    apikey: process.env.EVOLUTION_API_KEY,
    "Content-Type": "application/json",
  },
  timeout: 10_000,
});

const INSTANCE = process.env.EVOLUTION_INSTANCE ?? "vello";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function comRetry<T>(fn: () => Promise<T>, tentativas = 3, delayMs = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (tentativas <= 1) throw err;
    await sleep(delayMs);
    return comRetry(fn, tentativas - 1, delayMs * 2);
  }
}

export async function enviarMensagem(numero: string, texto: string): Promise<void> {
  await comRetry(async () => {
    await api.post(`/message/sendText/${INSTANCE}`, {
      number: numero,
      text: texto,
    });
  });
}

export async function enviarDigitando(numero: string, duracaoMs = 1500): Promise<void> {
  try {
    await api.post(`/chat/sendPresence/${INSTANCE}`, {
      number: numero,
      options: { presence: "composing", delay: duracaoMs },
    });
  } catch {
    // Não crítico — ignora erro
  }
}

export async function getMediaBase64(messageId: string): Promise<string> {
  try {
    const response = await api.post(`/chat/getBase64FromMediaMessage/${INSTANCE}`, {
      message: { key: { id: messageId } },
    });
    return response.data.base64;
  } catch (err) {
    console.error(`[Evolution] Erro ao recuperar base64 da mensagem ${messageId}:`, err);
    throw err;
  }
}

export async function enviarDocumento(numero: string, base64: string, fileName: string, caption: string): Promise<void> {
  await comRetry(async () => {
    await api.post(`/message/sendMedia/${INSTANCE}`, {
      number: numero,
      mediatype: "document",
      mimetype: "application/pdf",
      caption,
      media: base64,
      fileName,
    });
  });
}

export async function enviarImagem(numero: string, mediaUrl: string, caption: string): Promise<void> {
  await comRetry(async () => {
    await api.post(`/message/sendMedia/${INSTANCE}`, {
      number: numero,
      mediatype: "image",
      mimetype: "image/jpeg",
      caption,
      media: mediaUrl,
      fileName: "veiculo.jpg",
    });
  });
}

export async function enviarAlerta(mensagem: string): Promise<void> {
  const numero = process.env.ALERT_WHATSAPP_NUMBER;
  if (!numero) return;
  try {
    await enviarMensagem(numero, mensagem);
    console.log(`[Evolution] Alerta enviado para ${numero}`);
  } catch (err) {
    console.error("[Evolution] Erro ao enviar alerta:", err);
  }
}
