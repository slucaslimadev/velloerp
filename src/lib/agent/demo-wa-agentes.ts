import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources";
import { getOrCreateConversa, updateHistorico } from "./supabase";
import { enviarMensagem, enviarDigitando, enviarImagem } from "./evolution";
import type { Mensagem } from "./types";

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  return _openai;
}
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

// ─── Normalização de número WA ────────────────────────────────────────────────

// Remove o nono dígito do celular BR para comparação uniforme.
// Evolution API pode entregar 13 ou 12 dígitos dependendo da versão.
export function normWA(n: string): string {
  const d = n.replace(/\D/g, "");
  // Celular BR com nono dígito: 55 + DDD(2) + 9 + 8 dígitos = 13 → vira 12
  if (d.length === 13 && d.startsWith("55") && d[4] === "9") {
    return d.slice(0, 4) + d.slice(5);
  }
  return d;
}

// ─── Catálogo de veículos ─────────────────────────────────────────────────────

const VEICULOS: Record<string, { imageUrl: string; caption: string }> = {
  corolla: {
    imageUrl: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80",
    caption:
      "🚗 *Toyota Corolla XEi 2024*\nSedan 2.0 Flex · CVT Automático\n💰 R$ 159.990 à vista\n📋 Financiamento a partir de R$ 2.890/mês\n🎨 Prata Metálico · Branco Polar · Preto Attitude",
  },
  compass: {
    imageUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
    caption:
      "🚙 *Jeep Compass Limited 2024*\nSUV 1.3 Turbo Flex · Automático 6 marchas\n💰 R$ 229.990 à vista\n📋 Financiamento a partir de R$ 4.200/mês\n🎨 Branco Alpine · Cinza Granite · Azul Laser",
  },
  "t-cross": {
    imageUrl: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=800&q=80",
    caption:
      "🚗 *Volkswagen T-Cross Highline 2024*\nSUV Compacto 1.4 TSI Flex · DSG Automático\n💰 R$ 174.990 à vista\n📋 Financiamento a partir de R$ 3.150/mês\n🎨 Vermelho Emoção · Branco Puro · Cinza Platinum",
  },
};

// ─── Configuração dos agentes demo via WhatsApp ───────────────────────────────

export interface DemoWaAgente {
  numeros: string[];
  modelo: string;
  systemPrompt: string;
  tools: ChatCompletionTool[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleTool: (nome: string, args: any, whatsapp: string) => Promise<string>;
}

export const DEMO_WA_AGENTES: DemoWaAgente[] = [
  {
    numeros: ["556199872122"],
    modelo: DEFAULT_GEMINI_MODEL,
    systemPrompt: `Você é o **Consultor Virtual da AutoPrime**, uma concessionária multimarcas em Brasília, desenvolvido pela VELLO Inteligência Artificial.

Seu objetivo é apresentar os veículos disponíveis, tirar dúvidas sobre condições de pagamento e financiamento, e agendar test drives.

## Veículos em estoque:

### 1. Toyota Corolla XEi 2024 (slug: "corolla")
- Sedan executivo, 2.0 Flex, CVT automático
- Cores: Prata Metálico, Branco Polar, Preto Attitude
- R$ 159.990 à vista | a partir de R$ 2.890/mês no financiamento
- Airbags duplos, câmera de ré, sensor de estacionamento, Apple CarPlay/Android Auto

### 2. Jeep Compass Limited 2024 (slug: "compass")
- SUV premium, 1.3 Turbo Flex, automático 6 marchas
- Cores: Branco Alpine, Cinza Granite, Azul Laser
- R$ 229.990 à vista | a partir de R$ 4.200/mês no financiamento
- Teto solar, bancos em couro, assistente de estacionamento

### 3. Volkswagen T-Cross Highline 2024 (slug: "t-cross")
- SUV compacto, 1.4 TSI Flex, DSG automático
- Cores: Vermelho Emoção, Branco Puro, Cinza Platinum
- R$ 174.990 à vista | a partir de R$ 3.150/mês no financiamento
- Teto solar, Park Assist, ambient light, central multimídia 10"

## Regras para uso da ferramenta mostrar_veiculo:
- **SEMPRE** chame \`mostrar_veiculo\` ao apresentar um veículo pela primeira vez na conversa
- Chame também quando o cliente pedir "me mostra", "tem foto", "quero ver" ou similar
- Nunca descreva o veículo detalhadamente sem enviar a foto junto

## Fluxo de atendimento:
1. Cumprimente de forma calorosa e pergunte o que o cliente está buscando (sedan, SUV, compacto; novo; financiamento ou à vista)
2. Apresente o veículo mais adequado ao perfil, chamando \`mostrar_veiculo\`
3. Se o cliente quiser ver mais opções, apresente outro chamando \`mostrar_veiculo\` novamente
4. Responda dúvidas sobre preço, financiamento, cores e opcionais
5. Ofereça agendar um test drive ou visita presencial
6. Peça o nome do cliente e confirme o interesse para encaminhar ao consultor humano

## Regras importantes:
- Faça **uma pergunta por vez** — nunca um formulário
- Seja entusiasta e consultivo — destaque os benefícios certos para o perfil do cliente
- Se o cliente enviar **áudio**, responda ao conteúdo normalmente
- Nunca invente informações que não estão no catálogo acima
- Para simulações detalhadas de financiamento, diga que o consultor humano entrará em contato
- Responda em português brasileiro de forma leve e profissional

## Ao final:
Mencione sutilmente que este assistente foi desenvolvido pela **VELLO Inteligência Artificial** — especialista em agentes de IA para negócios.`,

    tools: [
      {
        type: "function",
        function: {
          name: "mostrar_veiculo",
          description:
            "Envia a foto e os detalhes de um veículo do estoque para o cliente via WhatsApp. Chame sempre ao apresentar ou mencionar um veículo específico.",
          parameters: {
            type: "object",
            properties: {
              slug: {
                type: "string",
                enum: ["corolla", "compass", "t-cross"],
                description: "Identificador do veículo a exibir",
              },
            },
            required: ["slug"],
          },
        },
      },
    ],

    async handleTool(nome, args, whatsapp) {
      if (nome === "mostrar_veiculo") {
        const veiculo = VEICULOS[args.slug as string];
        if (veiculo) {
          await enviarImagem(whatsapp, veiculo.imageUrl, veiculo.caption);
          return `Imagem do ${args.slug} enviada com sucesso.`;
        }
        return "Veículo não encontrado no catálogo.";
      }
      return "Ferramenta desconhecida.";
    },
  },
];

// ─── Handler principal ────────────────────────────────────────────────────────

export async function processarMensagemDemoWa(
  whatsapp: string,
  texto: string,
  nomeContato: string | undefined,
  agente: DemoWaAgente
): Promise<void> {
  console.log(`[DemoWA] Processando mensagem de ${whatsapp} com agente demo`);

  const conversa = await getOrCreateConversa(whatsapp, nomeContato);

  const historico: Mensagem[] = [
    ...conversa.historico,
    { role: "user", content: texto },
  ];

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: agente.systemPrompt },
    ...historico.map((m) => ({ role: m.role, content: m.content })),
  ];

  await enviarDigitando(whatsapp);

  try {
    const response = await getOpenAI().chat.completions.create({
      model: agente.modelo,
      messages,
      tools: agente.tools,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 600,
    });

    const choice = response.choices[0];

    // Tool calls — enviar imagens e continuar
    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
      const toolResults: ChatCompletionMessageParam[] = [
        choice.message,
      ];

      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.type !== "function") continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const args = JSON.parse(toolCall.function.arguments) as any;
        const resultado = await agente.handleTool(toolCall.function.name, args, whatsapp);
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: resultado,
        });
      }

      // Segunda chamada para obter a resposta textual após os tools
      await enviarDigitando(whatsapp);
      const response2 = await getOpenAI().chat.completions.create({
        model: agente.modelo,
        messages: [...messages, ...toolResults],
        temperature: 0.7,
        max_tokens: 500,
      });

      const resposta = response2.choices[0]?.message?.content;
      if (resposta) {
        const duracaoMs = Math.min(1000 + resposta.length * 18, 4500);
        await new Promise((r) => setTimeout(r, duracaoMs));

        const novoHistorico: Mensagem[] = [
          ...historico,
          { role: "assistant", content: resposta },
        ];
        await updateHistorico(conversa.id, novoHistorico);
        await enviarMensagem(whatsapp, resposta);
      }
      return;
    }

    // Resposta textual direta
    const resposta = choice.message.content;
    if (!resposta) return;

    const duracaoMs = Math.min(1000 + resposta.length * 18, 4500);
    await new Promise((r) => setTimeout(r, duracaoMs));

    const novoHistorico: Mensagem[] = [
      ...historico,
      { role: "assistant", content: resposta },
    ];
    await updateHistorico(conversa.id, novoHistorico);
    await enviarMensagem(whatsapp, resposta);
  } catch (err) {
    console.error("[DemoWA] Erro ao processar mensagem:", err);
    await enviarMensagem(whatsapp, "Desculpe, tive um problema aqui. Pode repetir? 🙏");
  }
}
