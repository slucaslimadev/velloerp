import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAgente } from "@/lib/agentes/config";
import type { ChatCompletionMessageParam, ChatCompletionContentPart } from "openai/resources";

let _openai: OpenAI | null = null;
function ai() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY?.trim(),
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  return _openai;
}

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function normalizeModel(modelo?: string): string {
  return modelo?.startsWith("gemini-") ? modelo : DEFAULT_GEMINI_MODEL;
}

function buildCurrentDateContext(): string {
  const now = new Date();
  const timeZone = process.env.AGENT_TIME_ZONE ?? "America/Sao_Paulo";
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  return [
    "## Contexto atual de data e hora",
    `Agora e ${formatted} (${timeZone}).`,
    'Use este contexto para interpretar termos relativos como "hoje", "amanha", "sexta", "mais tarde" e horarios pedidos pelo usuario.',
    "Quando falar de agenda, confirme datas e horarios em relacao a este contexto atual.",
  ].join("\n");
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  arquivo?: {
    tipo: "image" | "pdf_text" | "audio_transcricao";
    nome: string;
    base64?: string;
    mediaType?: string;
    texto?: string;
  };
}

function buildOpenAIMessages(
  systemPrompt: string,
  messages: ChatMessage[]
): ChatCompletionMessageParam[] {
  const promptWithDateContext = `${systemPrompt}\n\n${buildCurrentDateContext()}`;
  const result: ChatCompletionMessageParam[] = [
    { role: "system", content: promptWithDateContext },
  ];

  for (const msg of messages) {
    if (msg.role === "assistant") {
      result.push({ role: "assistant", content: msg.content });
      continue;
    }

    const parts: ChatCompletionContentPart[] = [];

    // Text content
    if (msg.content) {
      parts.push({ type: "text", text: msg.content });
    }

    // File attachment
    if (msg.arquivo) {
      const { tipo, nome, base64, mediaType, texto } = msg.arquivo;

      if (tipo === "image" && base64 && mediaType) {
        parts.push({
          type: "image_url",
          image_url: { url: `data:${mediaType};base64,${base64}`, detail: "high" },
        });
      } else if (tipo === "pdf_text" && texto) {
        parts.push({
          type: "text",
          text: `\n[Arquivo PDF: ${nome}]\n\n${texto}`,
        });
      } else if (tipo === "audio_transcricao" && texto) {
        parts.push({
          type: "text",
          text: `[Áudio transcrito]: ${texto}`,
        });
      }
    }

    result.push({ role: "user", content: parts.length === 1 && parts[0].type === "text" ? parts[0].text : parts });
  }

  return result;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { slug, messages, systemPromptOverride, modeloOverride } = (await req.json()) as {
    slug: string;
    messages: ChatMessage[];
    systemPromptOverride?: string;
    modeloOverride?: string;
  };

  // When systemPromptOverride is provided (wizard preview), skip slug validation
  let systemPrompt = systemPromptOverride ?? "";
  let modelo = normalizeModel(modeloOverride);

  if (!systemPromptOverride) {
    const agente = await getAgente(slug);
    if (!agente) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
    systemPrompt = agente.systemPrompt;
    modelo = normalizeModel(agente.modelo);
  }

  const openaiMessages = buildOpenAIMessages(systemPrompt, messages);

  try {
    const completion = await ai().chat.completions.create({
      model: modelo,
      messages: openaiMessages,
      max_tokens: 1500,
      temperature: 0.7,
    });

    const resposta = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ resposta });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[agentes/chat] modelo:", modelo, "erro:", msg);
    return NextResponse.json({ error: "Erro ao processar mensagem", detail: msg }, { status: 500 });
  }
}
