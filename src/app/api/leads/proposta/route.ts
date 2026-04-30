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
  const dados = await req.json();

  const {
    nome, segmento, tamanho_empresa, dor_principal,
    orcamento, prazo, sistemas_utilizados, observacoes,
    // Contexto da conversa (campos do formulário)
    discussao, objecoes, funcionalidades_interessadas, decisor, urgencia,
  } = dados;

  if (!nome) return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });

  const urgenciaTexto: Record<string, string> = {
    "imediato": "quer começar imediatamente",
    "3-meses": "curto prazo, até 3 meses",
    "6-meses": "médio prazo, até 6 meses",
    "indefinido": "ainda explorando opções",
  };

  const prompt = `Você é um especialista em propostas comerciais B2B de tecnologia/IA que aplica princípios de psicologia de vendas para aumentar a taxa de conversão.

## Dados do Lead
- **Empresa:** ${nome}
- **Segmento:** ${segmento || "não informado"}
- **Porte:** ${tamanho_empresa || "não informado"}
- **Dor principal:** ${dor_principal || "não informada"}
- **Orçamento:** ${orcamento || "a definir"}
- **Prazo:** ${prazo || "a definir"}
- **Sistemas que usa:** ${sistemas_utilizados || "não informado"}
${observacoes ? `- **Observações:** ${observacoes}` : ""}

## Contexto da Conversa
${discussao ? `- **O que foi discutido:** ${discussao}` : ""}
${objecoes ? `- **Objeções levantadas:** ${objecoes}` : ""}
${funcionalidades_interessadas ? `- **O que mais interessou:** ${funcionalidades_interessadas}` : ""}
${decisor ? `- **Decisor:** ${decisor}` : ""}
${urgencia ? `- **Urgência:** ${urgenciaTexto[urgencia] || urgencia}` : ""}

## Sobre a VELLO
Consultoria de IA em Brasília que cria agentes de IA personalizados, automatiza processos e integra sistemas. Oferece 7 dias de teste gratuito. Diferencial: soluções sob medida, resultado garantido.

## Princípios a Aplicar

### 1. Loss Aversion (Custo da Inação)
Calcule e mostre o custo mensal de NÃO ter a solução. Base: volume de atendimentos perdidos, horas gastas manualmente, leads não convertidos. Use dados do segmento para estimar.

### 2. Anchoring (Comparativo de Custo)
Compare o investimento com o custo de contratar uma pessoa para fazer o mesmo trabalho (salário + encargos ~R$5.000-8.000/mês) ou com o custo atual sem automação.

### 3. Risk Reversal (Garantia)
Mencione o teste gratuito de 7 dias e a entrega com prazo garantido como eliminadores de risco.

### 4. "Por que agora?" (Urgência)
Crie urgência baseada em tendências reais do mercado para o segmento: concorrentes adotando IA, custo crescente de mão-de-obra, expectativa dos clientes por atendimento imediato.

### 5. Personalização Total
Use o contexto da conversa (discussao, objecoes, funcionalidades_interessadas) para personalizar cada seção. Responda objeções diretamente no texto. Mencione o que mais interessou na solução.

## Gere o JSON da proposta com esta estrutura exata:

\`\`\`json
{
  "resumo_executivo": "2-3 frases poderosas que resumem a oportunidade e o custo de não agir. Mencione algo específico da conversa se houver.",
  "custo_inacao": {
    "valor_mensal": "R$ X.XXX/mês (valor estimado que perde hoje)",
    "descricao": "2-3 frases explicando o custo real de não automatizar agora — use dados do segmento e da dor relatada. Seja específico."
  },
  "por_que_agora": "2-3 frases sobre por que implementar IA neste segmento agora é crítico — tendências de mercado, concorrência, expectativas dos clientes. Seja específico para o segmento.",
  "diagnostico": {
    "titulo": "Título impactante que nomeia o problema (max 8 palavras)",
    "descricao": "2-3 parágrafos. Use o contexto da conversa. Mostre que entende profundamente o problema deles."
  },
  "solucao": {
    "titulo": "Título da solução (max 8 palavras)",
    "descricao": "2 parágrafos explicando a solução. Se houver funcionalidades que interessaram, destaque-as.",
    "entregaveis": ["Entregável específico 1", "Entregável 2", "Entregável 3", "Entregável 4"]
  },
  "roi": {
    "economia_mensal": "R$ X.XXX/mês estimado",
    "payback": "X a Y meses",
    "descricao": "Como calculamos o retorno baseado no cenário deles."
  },
  "beneficios": [
    "Benefício 1 com métrica (ex: 70% menos tempo de atendimento)",
    "Benefício 2 com métrica",
    "Benefício 3 com métrica",
    "Benefício 4 com métrica"
  ],
  "comparativo": "Uma frase poderosa comparando o investimento na VELLO vs. o custo alternativo (contratar funcionário, manter processo manual, perder leads).",
  "investimento": {
    "valor": "${orcamento || "A consultar"}",
    "descricao": "O que está incluído, formas de pagamento. Se havia objeção de preço na conversa, aborde-a aqui de forma sutil."
  },
  "garantia": "Descreva o teste gratuito de 7 dias e a garantia de entrega no prazo como eliminadores de risco. Tom confiante.",
  "prazo": "${prazo || "4 a 6 semanas"}",
  "proximos_passos": [
    "Passo 1 — Reunião de alinhamento técnico",
    "Passo 2 — Proposta técnica detalhada em 48h",
    "Passo 3 — Início do teste gratuito de 7 dias",
    "Passo 4 — Implementação e treinamento da equipe"
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
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    conteudo = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  } catch (err) {
    console.error("[proposta] Erro ao gerar conteúdo:", err);
    return NextResponse.json({ error: "Falha ao gerar conteúdo da proposta" }, { status: 500 });
  }

  const dadosProposta: PropostaConteudo = {
    nomeCliente: nome,
    segmento: segmento || "Geral",
    data: format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    ...conteudo,
  };

  try {
    const buffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(PropostaPDF, { c: dadosProposta }) as any
    );
    const base64 = Buffer.from(buffer).toString("base64");
    const fileName = `Proposta-VELLO-${nome.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
    return NextResponse.json({ pdfBase64: base64, fileName });
  } catch (err) {
    console.error("[proposta] Erro ao gerar PDF:", err);
    return NextResponse.json({ error: "Falha ao gerar PDF" }, { status: 500 });
  }
}
