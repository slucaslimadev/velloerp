import OpenAI from "openai";
import fs from "fs/promises";
import * as fsSync from "fs";
import path from "path";
import os from "os";

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

async function comRetry<T>(fn: () => Promise<T>, tentativas = 3, delayMs = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const reintentavel = err?.status === 503 || err?.status === 429 || err?.status === 500;
    if (tentativas <= 1 || !reintentavel) throw err;
    console.log(`[Audio] Erro ${err?.status}, tentando novamente em ${delayMs}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return comRetry(fn, tentativas - 1, delayMs * 2);
  }
}

export async function transcreverAudioBase64(base64: string, ext = ".ogg"): Promise<string> {
  const filePath = path.join(os.tmpdir(), `audio_${Date.now()}_${Math.random().toString(36).slice(7)}${ext}`);

  try {
    await fs.writeFile(filePath, Buffer.from(base64, "base64"));

    const res = await comRetry(() =>
      getOpenAI().audio.transcriptions.create({
        file: fsSync.createReadStream(filePath),
        model: "whisper-1",
      })
    );

    return res.text;
  } finally {
    await fs.unlink(filePath).catch(() => {});
  }
}
