import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const SEGMENTOS_SAUDE = [
  "clínica", "clinica", "policlínica", "policlinica", "médic", "medic",
  "odontolog", "dentist", "saúde", "saude", "hospital", "farmácia", "farmacia",
  "psicolog", "nutricion", "fisioterapia", "laboratório", "laboratorio",
  "veterinár", "veterinar", "estétic", "estetic",
];

function isClinicaOuSaude(segmento: string | null, nome: string | null): boolean {
  const haystack = `${segmento ?? ""} ${nome ?? ""}`.toLowerCase();
  return SEGMENTOS_SAUDE.some((kw) => haystack.includes(kw));
}

function buildPrompt(params: {
  nome: string;
  segmento: string | null;
  cidade: string;
  website: string | null;
  endereco: string | null;
  produto: "landing-page" | "agente-ia";
  demoUrl: string | null;
}): string {
  const { nome, segmento, cidade, website, endereco, produto, demoUrl } = params;

  const contextoEmpresa = [
    `Empresa: "${nome}"`,
    segmento  ? `Segmento: ${segmento}` : null,
    cidade    ? `Cidade: ${cidade}` : null,
    endereco  ? `Endereço: ${endereco}` : null,
    website   ? `Site atual: ${website}` : "Não tem site",
  ].filter(Boolean).join("\n");

  if (produto === "landing-page") {
    return `${contextoEmpresa}

Escreva uma mensagem de primeiro contato via WhatsApp oferecendo a criação de um site/landing page profissional para essa empresa.

Contexto do vendedor: Lucas Lima, da VELLO Inteligência Artificial — cria sites e agentes de IA para negócios em Brasília.
${demoUrl ? `Link para demonstração de site pronto para o segmento: ${demoUrl}` : ""}

Regras OBRIGATÓRIAS:
- Máximo 3 parágrafos curtos — deve caber na tela sem rolar
- Parágrafo 1: abre com algo específico da empresa ou localização (ex: mencionar o bairro, setor, tipo de negócio) — mostre que não é disparo em massa
- Parágrafo 2: problema concreto de não ter site para ESSE segmento (pacientes que pesquisam no Google e vão para o concorrente, credibilidade, agendamentos perdidos etc.)
- Parágrafo 3: solução — mencione que tem um modelo pronto para o segmento${demoUrl ? `, já funcionando (link: ${demoUrl})` : ""}, com agendamento e assistente de IA integrado
- Termine com UMA pergunta aberta que convide à resposta (ex: "Posso te mostrar como ficaria para vocês?")
- Tom humano, direto, informal mas profissional
- NÃO comece com "Olá, tudo bem?" nem saudações genéricas
- NÃO use mais de 1 emoji no total
- NÃO inclua assinatura, nome ou empresa ao final
- Português brasileiro`;
  }

  // produto === "agente-ia" (padrão original)
  return `Pesquise sobre a empresa "${nome}"${cidade ? ` localizada em ${cidade}` : ""}${segmento ? `, que atua no segmento de ${segmento}` : ""}.
${website ? `Website da empresa: ${website}` : ""}

Com base no que encontrar, escreva uma mensagem de primeiro contato via WhatsApp da VELLO Inteligência Artificial — empresa que cria agentes de IA para automatizar o atendimento de negócios pelo WhatsApp.

O foco da mensagem é SEMPRE vender um agente de IA para atendimento via WhatsApp: um assistente que responde clientes automaticamente 24h, qualifica leads, agenda, tira dúvidas e libera a equipe para fechar vendas.

Regras obrigatórias:
- Máximo 3 parágrafos curtos (cabe na tela sem rolar)
- Conecte a proposta ao negócio deles: mencione algo específico do setor ou da empresa
- Mostre um benefício concreto do agente de IA para ESSE segmento
- Tom humano e direto — NÃO pareça mensagem em massa
- NÃO comece com "Olá, tudo bem?" nem variações genéricas
- NÃO use mais de 2 emojis no total
- Termine com UMA pergunta aberta que convide à resposta
- Português brasileiro, informal mas profissional
- NÃO inclua assinatura nem nome da empresa ao final`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { nome, segmento, observacoes, produto: produtoParam } = await req.json();

  if (!nome) return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });

  // Extrai dados de observacoes
  const websiteMatch  = observacoes?.match(/Site:\s*(https?:\/\/[^\s\n]+)/);
  const website       = websiteMatch?.[1] ?? null;
  const enderecoMatch = observacoes?.match(/Endereço:\s*([^\n]+)/);
  const endereco      = enderecoMatch?.[1] ?? null;
  const cidade        = endereco?.split(",").slice(-2, -1)[0]?.trim() ?? "Brasília";

  // Detecta automaticamente se é saúde/clínica quando produto não vem explícito
  const produto: "landing-page" | "agente-ia" =
    produtoParam === "landing-page" ? "landing-page" :
    produtoParam === "agente-ia"    ? "agente-ia" :
    isClinicaOuSaude(segmento, nome) ? "landing-page" : "agente-ia";

  // URL de demo para o segmento
  const demoUrl =
    produto === "landing-page" && isClinicaOuSaude(segmento, nome)
      ? `${process.env.NEXT_PUBLIC_APP_URL ?? "https://sistema.velloia.com.br"}/demo/clinica`
      : null;

  const prompt = buildPrompt({ nome, segmento, cidade, website, endereco, produto, demoUrl });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (getOpenAI().responses as any).create({
      model: "gpt-4o-mini",
      tools: produto === "agente-ia" ? [{ type: "web_search_preview" }] : [],
      input: prompt,
    });

    const mensagem: string = response.output_text ?? "";
    if (!mensagem) throw new Error("Resposta vazia da IA");

    return NextResponse.json({ mensagem: mensagem.trim(), produto, demoUrl });
  } catch (err) {
    console.error("[gerar-proposta] Erro Responses API:", err);

    // Fallback sem web search
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.82,
      });
      const mensagem = completion.choices[0]?.message?.content ?? "";
      return NextResponse.json({ mensagem: mensagem.trim(), produto, demoUrl, fallback: true });
    } catch (err2) {
      console.error("[gerar-proposta] Fallback falhou:", err2);
      return NextResponse.json({ error: "Falha ao gerar proposta" }, { status: 500 });
    }
  }
}
