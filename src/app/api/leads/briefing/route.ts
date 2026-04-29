import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
function ai() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export interface BriefingConteudo {
  empresa: { titulo: string; descricao: string };
  dores_setor: string[];
  presenca_digital: { avaliacao: "fraca" | "media" | "forte"; pontos: string[] };
  concorrentes: string[];
  argumentos_venda: string[];
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const lead = await req.json();
  const { nome, segmento, observacoes, dor_principal, sistemas_utilizados, tamanho_empresa } = lead;

  if (!nome) return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });

  // Extrai website das observações se existir
  const websiteMatch = observacoes?.match(/Site:\s*(https?:\/\/[^\s\n]+)/);
  const website = websiteMatch?.[1] ?? null;

  const prompt = `Você é um analista de inteligência comercial especializado em vendas B2B de tecnologia/IA.

Pesquise e monte um briefing de inteligência sobre o seguinte lead para que a equipe da VELLO Inteligência Artificial chegue dominando a reunião:

## Dados do Lead
- **Nome/Empresa:** ${nome}
- **Segmento:** ${segmento || "não informado"}
- **Porte:** ${tamanho_empresa || "não informado"}
- **Dor relatada:** ${dor_principal || "não informada"}
- **Sistemas que usa:** ${sistemas_utilizados || "não informado"}
${website ? `- **Website:** ${website}` : ""}

## Instruções
Pesquise na web sobre a empresa e o segmento. Retorne um JSON com este formato exato:

\`\`\`json
{
  "empresa": {
    "titulo": "Nome comercial ou como a empresa se posiciona",
    "descricao": "2-3 frases sobre o que a empresa faz, há quanto tempo existe, porte estimado e como se posiciona no mercado"
  },
  "dores_setor": [
    "Dor específica 1 que empresas desse segmento enfrentam hoje",
    "Dor específica 2",
    "Dor específica 3",
    "Dor específica 4"
  ],
  "presenca_digital": {
    "avaliacao": "fraca | media | forte",
    "pontos": [
      "Observação 1 sobre o site/redes sociais/atendimento digital",
      "Observação 2",
      "Observação 3"
    ]
  },
  "concorrentes": [
    "Concorrente direto 1 (como se posiciona)",
    "Concorrente direto 2",
    "Concorrente indireto relevante"
  ],
  "argumentos_venda": [
    "Argumento específico 1 para usar com ESSE lead (mencione algo que pesquisou sobre eles)",
    "Argumento específico 2",
    "Argumento específico 3",
    "Argumento específico 4"
  ]
}
\`\`\`

Seja específico e baseado em informações reais. Os argumentos de venda devem mencionar algo concreto sobre a empresa ou setor pesquisado. Retorne APENAS o JSON válido.`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (ai().responses as any).create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      input: prompt,
    });

    const raw: string = response.output_text ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON não encontrado na resposta");

    const conteudo: BriefingConteudo = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ briefing: conteudo });
  } catch (err) {
    console.error("[briefing] Erro com Responses API:", err);

    // Fallback sem web search
    try {
      const completion = await ai().chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 1200,
        temperature: 0.7,
      });
      const conteudo: BriefingConteudo = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      return NextResponse.json({ briefing: conteudo, fallback: true });
    } catch (err2) {
      console.error("[briefing] Fallback falhou:", err2);
      return NextResponse.json({ error: "Falha ao gerar briefing" }, { status: 500 });
    }
  }
}
