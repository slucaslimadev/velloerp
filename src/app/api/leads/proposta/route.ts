import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { PropostaPDF, type PropostaConteudo } from "@/lib/proposta/template";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

let _openai: OpenAI | null = null;
function ai() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const lead = await req.json();

  const {
    nome, segmento, dor_principal, tamanho_empresa,
    orcamento, prazo, sistemas_utilizados, descricao_processo_ia, observacoes,
  } = lead;

  if (!nome) return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });

  // ─── Geração do conteúdo com GPT-4o ──────────────────────────────────────

  const prompt = `Você é um especialista em vendas B2B de tecnologia e deve criar o conteúdo de uma proposta comercial profissional para um potencial cliente da VELLO Inteligência Artificial.

## Sobre a VELLO
A VELLO é uma empresa de consultoria em IA sediada em Brasília que cria agentes de IA personalizados, automatiza processos e integra sistemas. Diferencial: soluções sob medida que economizam tempo e aumentam a conversão.

## Dados do Lead
- **Nome/Empresa:** ${nome}
- **Segmento:** ${segmento || "não informado"}
- **Porte:** ${tamanho_empresa || "não informado"}
- **Principal Dor:** ${dor_principal || "não informada"}
- **Sistemas Utilizados:** ${sistemas_utilizados || "não informado"}
- **Processo a Automatizar:** ${descricao_processo_ia || "não informado"}
- **Orçamento:** ${orcamento || "a definir"}
- **Prazo Desejado:** ${prazo || "a definir"}
- **Observações:** ${observacoes || "nenhuma"}

## Tarefa
Gere o conteúdo da proposta comercial em JSON com esta estrutura exata. Seja específico, persuasivo e personalizado para o segmento do cliente. Mencione a dor real dele e como a VELLO resolve:

\`\`\`json
{
  "resumo_executivo": "2-3 frases que resumem o diagnóstico e a oportunidade para este cliente específico",
  "diagnostico": {
    "titulo": "Título impactante que nomeia o problema principal do cliente (max 8 palavras)",
    "descricao": "2-3 parágrafos descrevendo o cenário atual do cliente, os impactos negativos da situação atual e por que é urgente resolver. Seja específico para o segmento."
  },
  "solucao": {
    "titulo": "Título da solução proposta (ex: Agente de IA para Atendimento Automatizado) (max 8 palavras)",
    "descricao": "2 parágrafos explicando o que a VELLO vai entregar e como funciona tecnicamente de forma acessível",
    "entregaveis": [
      "Entregável 1 específico",
      "Entregável 2 específico",
      "Entregável 3 específico",
      "Entregável 4 específico"
    ]
  },
  "beneficios": [
    "Benefício 1 com número/métrica estimada (ex: Redução de 70% no tempo de atendimento)",
    "Benefício 2 com número/métrica",
    "Benefício 3 com número/métrica",
    "Benefício 4 com número/métrica"
  ],
  "investimento": {
    "valor": "${orcamento || "A consultar"}",
    "descricao": "2-3 frases sobre o que está incluído, formas de pagamento sugeridas e garantias"
  },
  "prazo": "${prazo || "4 a 6 semanas"}",
  "proximos_passos": [
    "Passo 1 (ex: Reunião de alinhamento para detalhar o escopo)",
    "Passo 2 (ex: Proposta técnica detalhada em até 48h)",
    "Passo 3 (ex: Início do desenvolvimento após aprovação)",
    "Passo 4 (ex: Entrega e treinamento da equipe)"
  ]
}
\`\`\`

Retorne APENAS o JSON válido, sem explicações.`;

  let conteudo: Omit<PropostaConteudo, "nomeCliente" | "segmento" | "data">;

  try {
    const completion = await ai().chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    conteudo = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  } catch (err) {
    console.error("[proposta] Erro ao gerar conteúdo:", err);
    return NextResponse.json({ error: "Falha ao gerar conteúdo da proposta" }, { status: 500 });
  }

  // ─── Geração do PDF ───────────────────────────────────────────────────────

  const dadosProposta: PropostaConteudo = {
    nomeCliente: nome,
    segmento: segmento || "Geral",
    data: format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    ...conteudo,
  };

  try {
    const buffer = await renderToBuffer(
      createElement(PropostaPDF, { c: dadosProposta })
    );

    const base64 = Buffer.from(buffer).toString("base64");
    const fileName = `Proposta-VELLO-${nome.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;

    return NextResponse.json({ pdfBase64: base64, fileName });
  } catch (err) {
    console.error("[proposta] Erro ao gerar PDF:", err);
    return NextResponse.json({ error: "Falha ao gerar PDF" }, { status: 500 });
  }
}
