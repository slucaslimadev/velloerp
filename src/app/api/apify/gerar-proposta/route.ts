import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { nome, segmento, observacoes } = await req.json();

  if (!nome) return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });

  // Extract website and city from observacoes
  const websiteMatch = observacoes?.match(/Site:\s*(https?:\/\/[^\s\n]+)/);
  const website = websiteMatch?.[1] ?? null;
  const enderecoMatch = observacoes?.match(/Endereço:\s*([^\n]+)/);
  const cidade = enderecoMatch?.[1]?.split(",").slice(-2, -1)[0]?.trim() ?? "Brasil";

  const prompt = `Pesquise sobre a empresa "${nome}"${cidade ? ` localizada em ${cidade}` : ""}${segmento ? `, que atua no segmento de ${segmento}` : ""}.
${website ? `Website da empresa: ${website}` : ""}

Com base nas informações encontradas sobre ela, escreva uma mensagem de primeiro contato via WhatsApp da empresa VELLO Inteligência Artificial — consultoria especializada em IA e automação de processos para negócios.

Regras obrigatórias:
- Máximo 3 parágrafos curtos (mensagem cabe em tela de celular sem rolar)
- Demonstre que pesquisou a empresa: mencione o setor, produto ou processo específico deles
- Apresente um benefício concreto que a Vello pode entregar para ESSE tipo de negócio
- Tom humano e direto, NÃO pareça mensagem em massa ou template
- NÃO comece com "Olá, tudo bem?" ou variações genéricas
- NÃO use mais de 2 emojis no total
- Termine com UMA pergunta aberta que convide à resposta
- Escreva em português brasileiro informal mas profissional
- NÃO inclua assinatura nem nome da empresa ao final (será adicionado depois)`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (getOpenAI().responses as any).create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      input: prompt,
    });

    const mensagem: string = response.output_text ?? "";
    if (!mensagem) throw new Error("Resposta vazia da IA");

    return NextResponse.json({ mensagem: mensagem.trim() });
  } catch (err) {
    console.error("[gerar-proposta] Erro Responses API:", err);

    // Fallback: generate without web search
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 350,
        temperature: 0.85,
      });
      const mensagem = completion.choices[0]?.message?.content ?? "";
      return NextResponse.json({ mensagem: mensagem.trim(), fallback: true });
    } catch (err2) {
      console.error("[gerar-proposta] Fallback também falhou:", err2);
      return NextResponse.json({ error: "Falha ao gerar proposta" }, { status: 500 });
    }
  }
}
