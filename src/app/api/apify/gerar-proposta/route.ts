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

Com base no que encontrar, escreva uma mensagem de primeiro contato via WhatsApp da VELLO Inteligência Artificial — empresa que cria agentes de IA para automatizar o atendimento de negócios pelo WhatsApp.

O foco da mensagem é SEMPRE vender um agente de IA para atendimento via WhatsApp: um assistente que responde clientes automaticamente 24h, qualifica leads, agenda, tira dúvidas e libera a equipe para fechar vendas.

Regras obrigatórias:
- Máximo 3 parágrafos curtos (cabe na tela sem rolar)
- Conecte a proposta ao negócio deles: mencione algo específico do setor ou da empresa (tipo de cliente, volume de atendimento, processo típico do segmento)
- Mostre um benefício concreto do agente de IA para ESSE segmento (ex: imobiliária → qualifica interessados 24h; clínica → agenda e confirma consultas; loja → responde dúvidas de produto e preço)
- Tom humano e direto — NÃO pareça mensagem em massa
- NÃO comece com "Olá, tudo bem?" nem variações genéricas
- NÃO use mais de 2 emojis no total
- Termine com UMA pergunta aberta que convide à resposta
- Português brasileiro, informal mas profissional
- NÃO inclua assinatura nem nome da empresa ao final`;

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
