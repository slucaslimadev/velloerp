import OpenAI from "openai";

let _client: OpenAI | null = null;

export function openrouterClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://sistema.velloia.com.br",
        "X-Title": "Vello ERP",
      },
    });
  }
  return _client;
}

/** Garante o formato "provider/modelo" exigido pelo OpenRouter, sem alterar o nome usado para custos/exibição. */
export function toOpenRouterModel(modelo: string): string {
  if (!modelo) return "google/gemini-2.5-flash";
  if (modelo.includes("/")) return modelo;
  if (modelo.startsWith("gemini-")) return `google/${modelo}`;
  if (modelo.startsWith("gpt-") || modelo.startsWith("o1") || modelo.startsWith("o3")) return `openai/${modelo}`;
  return modelo;
}
