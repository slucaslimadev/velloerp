import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources";
import {
  getOrCreateConversa,
  updateHistorico,
  finalizarConversa,
  salvarLead,
  isIaAtiva,
  getContextoLead,
} from "./supabase";
import { enviarMensagem, enviarDigitando, enviarAlerta } from "./evolution";
import type { DadosLead, Mensagem } from "./types";

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}
const MODEL = "gpt-4.1-nano";

async function comRetry<T>(fn: () => Promise<T>, tentativas = 3, delayMs = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const reintentavel = err?.status === 503 || err?.status === 429 || err?.status === 500;
    if (tentativas <= 1 || !reintentavel) throw err;
    console.log(`[Agent] Erro ${err?.status}, tentando novamente em ${delayMs}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return comRetry(fn, tentativas - 1, delayMs * 2);
  }
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é a Velly, assistente de inteligência artificial da VELLO Inteligência Artificial, empresa de consultoria em IA e automação para negócios, sediada em Brasília.

Seu objetivo é qualificar leads que chegam via WhatsApp de forma natural, amigável e profissional. Você deve coletar as informações necessárias para que a equipe comercial da Vello avalie a oportunidade.

## Fluxo da conversa

1. Faça uma apresentação calorosa e pergunte o nome da pessoa.
2. Pergunte o e-mail de contato (diga que é para a equipe entrar em contato — incentive, mas é opcional).
3. Pergunte sobre a empresa: segmento de atuação e número aproximado de funcionários.
4. Pergunte qual é a principal dor ou desafio que os motivou a buscar a Vello.
5. Pergunte qual o orçamento aproximado disponível para o projeto e em quanto tempo gostariam de ter a solução funcionando (pode ser na mesma mensagem).
6. Pergunte se a empresa já utiliza alguma automação hoje (ex: chatbot, RPA, integrações automáticas entre sistemas). Se ainda não, mostre que há muito potencial a explorar.
7. Pergunte quais sistemas ou ferramentas a empresa já usa (ERP, CRM, WhatsApp Business, planilhas etc.) e se esses sistemas se comunicam entre si de forma automática.
8. Peça para a pessoa explicar mais ou menos o processo que ela deseja automatizar ou quais agentes de IA deseja criar. Informe de forma amigável que, se preferir, ela pode enviar um **áudio** descrevendo, pois você consegue escutar perfeitamente.
9. Quando tiver coletado todas as informações (ou o lead deixar claro que não quer fornecer alguma), chame a função \`registrar_lead\` com todos os dados coletados.

## Regras importantes

- Faça **uma ou duas perguntas por mensagem** — nunca um formulário completo de uma vez.
- Seja conversacional e natural. Use o nome da pessoa com moderação — apenas ocasionalmente, não em toda mensagem.
- **Nunca repita ou parafraseie o que a pessoa acabou de dizer.** Vá direto para a próxima pergunta ou reação.
- Se a pessoa enviar imagem, vídeo ou documento, responda educadamente pedindo que detalhe o conteúdo em texto ou em uma mensagem de áudio (você consegue escutar áudios).
- Se a pessoa perguntar sobre serviços, preços ou quiser falar com humano, diga que a equipe entrará em contato em breve após o cadastro.
- Nunca invente informações sobre preços ou prazos.
- **Nunca peça confirmação antes de registrar o lead.** Quando tiver os dados, chame \`registrar_lead\` diretamente, sem perguntar "posso registrar?" ou "posso prosseguir?".
- Após registrar o lead, agradeça e informe que a equipe entrará em contato em até 24 horas.
- Se a pessoa claramente não quiser continuar, se despedir ou pedir para parar, chame \`encerrar_conversa\` com gentileza.

## Critérios de pontuação (use ao chamar registrar_lead)

**tamanho_empresa → pontos (máx 20):**
- Acima de 200 funcionários: 20
- 51–200 funcionários: 16
- 11–50 funcionários: 10
- 1–10 funcionários: 5

**dor_principal → pontos (máx 20):**
- Automatização de atendimento, vendas ou processos críticos: 20
- Geração de relatórios, análise de dados: 15
- Processos administrativos gerais: 10
- Curiosidade ou sem dor clara: 3

**sistemas_utilizados / tem_api → pontos (máx 20):**
- Usa sistemas com API documentada (SAP, Totvs, Salesforce, etc.): 20
- Possível integração, precisa verificar: 12
- Só planilhas ou ferramentas sem integração conhecida: 6

**orcamento → pontos (máx 20):**
- Acima de R$ 15.000: 20
- R$ 5.000–R$ 15.000: 15
- R$ 2.000–R$ 5.000: 8
- R$ 1.000–R$ 2.000: 3
- Sem orçamento ou muito baixo: 0

**prazo → pontos (máx 15):**
- Imediato / 1–3 meses: 15
- 3–6 meses: 10
- 6+ meses: 5
- Sem prazo definido: 2

**usa_automacao → pontos (máx 15):**
- Não usa nenhuma automação hoje: 15 (alto potencial de transformação)
- Usa parcialmente (algum chatbot ou integração simples): 8
- Já usa automações avançadas: 3

Some todos os pontos e preencha o campo \`pontuacao\` (máximo 90). Defina \`classificacao\` assim:
- 80–90: Quente
- 50–79: Morno
- 20–49: Frio
- Abaixo de 20: Desqualificado
`;

function buildSystemPrompt(tentativas: number, classificacaoAnterior: string | null): string {
  if (tentativas === 0) return SYSTEM_PROMPT;
  return (
    SYSTEM_PROMPT +
    `\n\n## Contexto especial\nVocê já conversou com esta pessoa ${tentativas} vez(es) anteriormente. Na última interação foi classificada como "${classificacaoAnterior}". Mencione isso de forma natural no início ("Que bom te ver novamente!") e pergunte se algo mudou no cenário dela desde então.`
  );
}

// ─── Ferramentas ───────────────────────────────────────────────────────────────

const TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "registrar_lead",
      description:
        "Registra o lead qualificado no banco de dados. Chame esta função quando tiver coletado todas as informações necessárias.",
      parameters: {
        type: "object",
        properties: {
          nome:                  { type: "string", description: "Nome completo da pessoa" },
          email:                 { type: ["string", "null"], description: "E-mail de contato (pode ser null)" },
          segmento:              { type: "string", description: "Segmento de atuação da empresa" },
          tamanho_empresa:       { type: "string", description: "Tamanho da empresa (ex: 1-10 funcionários)" },
          dor_principal:         { type: "string", description: "Principal dor ou desafio relatado pelo lead" },
          sistemas_utilizados:   { type: "string", description: "Sistemas e ferramentas que a empresa já usa" },
          usa_automacao:         { type: ["string", "null"], enum: ["Sim", "Não", "Parcial", null], description: "Se a empresa já usa automação hoje" },
          tem_api:               { type: "string", enum: ["Sim", "Não", "Verificar"], description: "Se os sistemas possuem integração automática" },
          descricao_processo_ia: { type: "string", description: "Processos que deseja automatizar" },
          orcamento:             { type: "string", description: "Orçamento disponível para o projeto" },
          prazo:                 { type: "string", description: "Prazo desejado para implementação" },
          pontuacao:             { type: "number", description: "Pontuação calculada (0–90)" },
          classificacao:         { type: "string", enum: ["Quente", "Morno", "Frio", "Desqualificado"], description: "Classificação do lead" },
          observacoes:           { type: ["string", "null"], description: "Observações adicionais" },
        },
        required: [
          "nome", "segmento", "tamanho_empresa", "dor_principal",
          "usa_automacao", "sistemas_utilizados", "tem_api",
          "descricao_processo_ia", "orcamento", "prazo",
          "pontuacao", "classificacao",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "encerrar_conversa",
      description:
        "Encerra a conversa sem registrar lead. Use quando o lead claramente não quer continuar, se despede ou demonstra desinteresse definitivo.",
      parameters: {
        type: "object",
        properties: {
          motivo: { type: "string", description: "Motivo do encerramento" },
        },
        required: ["motivo"],
      },
    },
  },
];

// ─── Mensagens ────────────────────────────────────────────────────────────────

export const MSG_MIDIA =
  "Infelizmente ainda não consigo abrir imagens, vídeos ou documentos. 😕 " +
  "Mas você pode me enviar mensagens de texto ou **áudio**, que eu consigo escutar perfeitamente! 🎤";

const MSG_ERRO =
  "Desculpe, tive um probleminha aqui. Pode repetir sua mensagem? 🙏";

// ─── Função principal ─────────────────────────────────────────────────────────

export async function processarMensagem(
  whatsapp: string,
  texto: string,
  nomeContato?: string
): Promise<void> {
  console.log(`[Agent] Iniciando processamento para ${whatsapp}`);

  const ativa = await isIaAtiva(whatsapp);
  if (!ativa) {
    console.log(`[Agent] IA desativada ou bloqueada (24h/Lead) para ${whatsapp}. Ignorando.`);
    return;
  }

  const [conversa, contextoLead] = await Promise.all([
    getOrCreateConversa(whatsapp, nomeContato),
    getContextoLead(whatsapp),
  ]);
  console.log(`[Agent] Conversa carregada: ${conversa.id}`);

  const systemPrompt = buildSystemPrompt(
    contextoLead.tentativas,
    contextoLead.classificacaoAnterior
  );

  const historico: Mensagem[] = [
    ...conversa.historico,
    { role: "user", content: texto },
  ];

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...historico.map((m) => ({ role: m.role, content: m.content })),
  ];

  await enviarDigitando(whatsapp);
  console.log(`[Agent] Chamando OpenAI (${MODEL})...`);

  try {
    const response = await comRetry(() =>
      getOpenAI().chat.completions.create({
        model: MODEL,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 600,
      })
    );

    const choice = response.choices[0];

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];

      if (toolCall.type !== "function") return;

      if (toolCall.function.name === "registrar_lead") {
        const args = JSON.parse(toolCall.function.arguments) as Omit<DadosLead, "whatsapp" | "status">;

        await salvarLead({ ...args, whatsapp, status: "Novo" });
        await finalizarConversa(conversa.id);

        if (["Quente", "Morno"].includes(args.classificacao)) {
          const emoji = args.classificacao === "Quente" ? "🔥" : "🌡️";
          await enviarAlerta(
            `${emoji} *Lead ${args.classificacao} registrado!*\n\n` +
            `👤 ${args.nome ?? "Sem nome"}\n` +
            `📱 ${whatsapp}\n` +
            `🏢 ${args.segmento} · ${args.tamanho_empresa}\n` +
            `💰 ${args.orcamento}\n` +
            `⭐ Pontuação: ${args.pontuacao}`
          );
        }

        const msgFinal =
          `Perfeito, ${args.nome?.split(" ")[0] ?? ""}! ✅\n\n` +
          `Suas informações foram registradas com sucesso. ` +
          `Nossa equipe comercial entrará em contato em até *24 horas* para dar sequência.\n\n` +
          `Obrigado pelo interesse na VELLO! 🚀`;

        await enviarMensagem(whatsapp, msgFinal);
        return;
      }

      if (toolCall.function.name === "encerrar_conversa") {
        const { motivo } = JSON.parse(toolCall.function.arguments) as { motivo: string };
        console.log(`[Agent] Encerrando conversa para ${whatsapp}. Motivo: ${motivo}`);
        await finalizarConversa(conversa.id);
        await enviarMensagem(
          whatsapp,
          "Tudo bem! Se precisar de nós no futuro, é só chamar. 😊 Tenha um ótimo dia!"
        );
        return;
      }
    }

    const resposta = choice.message.content;
    if (!resposta) return;

    const duracaoMs = Math.min(1000 + resposta.length * 18, 4500);
    await new Promise((resolve) => setTimeout(resolve, duracaoMs));

    const novoHistorico: Mensagem[] = [
      ...historico,
      { role: "assistant", content: resposta },
    ];
    await updateHistorico(conversa.id, novoHistorico);

    await enviarMensagem(whatsapp, resposta);
  } catch (err) {
    console.error("[Agent] Erro ao processar mensagem:", err);
    await enviarMensagem(whatsapp, MSG_ERRO);
  }
}
