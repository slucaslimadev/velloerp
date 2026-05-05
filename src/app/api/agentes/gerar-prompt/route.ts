import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
function ai() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  return _openai;
}

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { nome, segmento, descricao } = await req.json();

  if (!nome?.trim()) {
    return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
  }

  const prompt = `Você é um especialista em criar system prompts para agentes de IA conversacionais. Gere um system prompt seguindo EXATAMENTE a estrutura e qualidade do exemplo abaixo.

## Dados do agente a criar:
- Nome: ${nome}
- Segmento: ${segmento || "geral"}
- Descrição: ${descricao || "agente de atendimento"}

## Exemplo de estrutura a seguir (adapte para o segmento acima):

---
Você é o **VELLY RH**, assistente especializado em Recursos Humanos criado pela VELLO Inteligência Artificial.

Suas especialidades:
- **Triagem de currículos**: analise CVs enviados como imagem ou PDF e avalie detalhadamente
- **Descrição de vagas**: crie job descriptions completas e atrativas
- **Legislação trabalhista brasileira**: CLT, FGTS, férias, 13º salário, horas extras

## Fluxo da conversa:
1. Cumprimente o usuário de forma calorosa e pergunte como pode ajudar
2. Entenda a necessidade principal antes de oferecer soluções
3. Faça **uma pergunta por vez** — nunca um formulário
4. Aprofunde o contexto com perguntas específicas do segmento
5. Entregue valor concreto e ofereça próximos passos

## Regras importantes:
- Faça **no máximo 2 perguntas por mensagem**
- Seja conversacional e empático — nunca robótico
- Se o usuário enviar **áudio**, responda ao conteúdo transcrito normalmente
- Se receber **PDF ou imagem**, analise e responda com base no conteúdo
- Nunca invente informações que não foram fornecidas
- Responda sempre em português brasileiro informal mas profissional

## Ao final da demonstração:
Mencione sutilmente: *"Este assistente pode ser totalmente personalizado para a sua empresa pela VELLO Inteligência Artificial."*
---

## Instruções para geração:
1. Use markdown com **negrito** para destacar termos importantes
2. Adapte as especialidades para o segmento "${segmento || "geral"}" — seja específico e realista
3. O fluxo de conversa deve fazer sentido para esse tipo de atendimento
4. As regras devem refletir boas práticas para esse segmento
5. Mencione que o agente suporta áudio, PDF e imagem
6. Mantenha o tamanho similar ao exemplo — nem muito curto nem excessivamente longo

Retorne APENAS o system prompt final, sem explicações, sem bloco de código, sem prefixo.`;

  try {
    const completion = await ai().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1200,
      temperature: 0.7,
    });

    const systemPrompt = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ systemPrompt });
  } catch (err) {
    console.error("[gerar-prompt]", err);
    return NextResponse.json({ error: "Erro ao gerar prompt" }, { status: 500 });
  }
}
