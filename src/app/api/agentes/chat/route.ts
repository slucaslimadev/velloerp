import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAgente } from "@/lib/agentes/config";
import type { ChatCompletionMessageParam, ChatCompletionContentPart } from "openai/resources";

let _openai: OpenAI | null = null;
function ai() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
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
  const result: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
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
  const { slug, messages, systemPromptOverride } = (await req.json()) as { slug: string; messages: ChatMessage[]; systemPromptOverride?: string };

  const agente = getAgente(slug);
  if (!agente) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const openaiMessages = buildOpenAIMessages(systemPromptOverride || agente.systemPrompt, messages);

  try {
    const completion = await ai().chat.completions.create({
      model: agente.modelo,
      messages: openaiMessages,
      max_tokens: 1500,
      temperature: 0.7,
    });

    const resposta = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ resposta });
  } catch (err) {
    console.error("[agentes/chat]", err);
    return NextResponse.json({ error: "Erro ao processar mensagem" }, { status: 500 });
  }
}
