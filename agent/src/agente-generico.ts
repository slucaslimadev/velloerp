import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources";
import { getOrCreateConversa, updateHistorico, finalizarConversa } from "./supabase";
import { enviarMensagem, enviarDigitando } from "./evolution";
import {
  type ClienteAgente,
  registrarMetrica,
  criarAgendamento,
  horarioDisponivel,
  cancelarAgendamento,
} from "./clientes-agentes";
import type { Mensagem } from "./types";

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

async function comRetry<T>(fn: () => Promise<T>, tentativas = 3, delayMs = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const reintentavel = err?.status === 503 || err?.status === 429 || err?.status === 500;
    if (tentativas <= 1 || !reintentavel) throw err;
    await new Promise((r) => setTimeout(r, delayMs));
    return comRetry(fn, tentativas - 1, delayMs * 2);
  }
}

// ─── Ferramentas de agendamento ───────────────────────────────────────────────

function buildTools(agente: ClienteAgente): ChatCompletionTool[] {
  const tools: ChatCompletionTool[] = [];

  if (agente.tools_ativas.includes("servicos")) {
    tools.push({
      type: "function",
      function: {
        name: "listar_servicos",
        description: "Lista os serviços oferecidos com duração e preço.",
        parameters: { type: "object", properties: {} },
      },
    });
  }

  if (agente.tools_ativas.includes("agendar")) {
    tools.push({
      type: "function",
      function: {
        name: "verificar_disponibilidade",
        description: "Verifica se um horário está livre antes de agendar. Use sempre antes de agendar_horario.",
        parameters: {
          type: "object",
          properties: {
            data_hora: { type: "string", description: "Data e hora desejadas em ISO 8601 (ex: 2026-06-20T14:00:00)" },
          },
          required: ["data_hora"],
        },
      },
    });
    tools.push({
      type: "function",
      function: {
        name: "agendar_horario",
        description: "Confirma o agendamento de um serviço para o cliente. Só chame após verificar disponibilidade.",
        parameters: {
          type: "object",
          properties: {
            nome: { type: "string", description: "Nome do cliente" },
            servico: { type: "string", description: "Serviço escolhido" },
            data_hora: { type: "string", description: "Data e hora em ISO 8601 (ex: 2026-06-20T14:00:00)" },
            profissional: { type: ["string", "null"], description: "Profissional preferido (opcional)" },
            observacoes: { type: ["string", "null"], description: "Observações (opcional)" },
          },
          required: ["nome", "servico", "data_hora"],
        },
      },
    });
    tools.push({
      type: "function",
      function: {
        name: "cancelar_agendamento",
        description: "Cancela o agendamento ativo deste cliente.",
        parameters: { type: "object", properties: {} },
      },
    });
  }

  return tools;
}

function buildSystemPrompt(agente: ClienteAgente): string {
  const agora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  let prompt = agente.system_prompt || `Você é a assistente virtual de ${agente.nome}.`;
  prompt += `\n\n## Contexto\n- Data e hora atual: ${agora} (horário de Brasília).`;
  if (agente.servicos?.length) {
    const lista = agente.servicos
      .map((s) => `- ${s.nome}${s.preco ? ` — R$ ${s.preco}` : ""}${s.duracao_min ? ` (${s.duracao_min} min)` : ""}`)
      .join("\n");
    prompt += `\n\n## Serviços disponíveis\n${lista}`;
  }
  prompt += `\n\n## Regras\n- Seja natural, simpático e objetivo. Uma ou duas perguntas por mensagem.\n- Ao agendar, sempre verifique a disponibilidade antes de confirmar.\n- Nunca invente serviços ou preços que não estejam na lista.`;
  return prompt;
}

// ─── Execução de tool calls ───────────────────────────────────────────────────

async function executarTool(
  agente: ClienteAgente,
  whatsapp: string,
  nome: string,
  args: any
): Promise<{ resultado: string; foiAgendamento: boolean }> {
  switch (nome) {
    case "listar_servicos": {
      const lista = agente.servicos?.length
        ? agente.servicos.map((s) => `${s.nome}${s.preco ? ` — R$ ${s.preco}` : ""}`).join("; ")
        : "Nenhum serviço cadastrado.";
      return { resultado: lista, foiAgendamento: false };
    }
    case "verificar_disponibilidade": {
      const livre = await horarioDisponivel(agente.id, args.data_hora);
      return {
        resultado: livre ? "Horário disponível." : "Horário ocupado. Sugira outro horário.",
        foiAgendamento: false,
      };
    }
    case "agendar_horario": {
      const livre = await horarioDisponivel(agente.id, args.data_hora);
      if (!livre) return { resultado: "Horário indisponível. Ofereça outro.", foiAgendamento: false };
      await criarAgendamento({
        cliente_agente_id: agente.id,
        nome_contato: args.nome ?? null,
        whatsapp,
        servico: args.servico,
        profissional: args.profissional ?? null,
        data_hora: args.data_hora,
        observacoes: args.observacoes ?? null,
      });
      return { resultado: "Agendamento confirmado com sucesso.", foiAgendamento: true };
    }
    case "cancelar_agendamento": {
      const ok = await cancelarAgendamento(agente.id, whatsapp);
      return {
        resultado: ok ? "Agendamento cancelado." : "Nenhum agendamento ativo encontrado.",
        foiAgendamento: false,
      };
    }
    default:
      return { resultado: "Função desconhecida.", foiAgendamento: false };
  }
}

// ─── Função principal ─────────────────────────────────────────────────────────

export async function processarMensagemAgente(
  agente: ClienteAgente,
  whatsapp: string,
  texto: string,
  nomeContato?: string
): Promise<void> {
  if (!agente.ativo) {
    console.log(`[Agente:${agente.instance_evolution}] Agente pausado. Ignorando.`);
    return;
  }

  const conversa = await getOrCreateConversa(whatsapp, nomeContato);

  const historico: Mensagem[] = [...conversa.historico, { role: "user", content: texto }];
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(agente) },
    ...historico.map((m) => ({ role: m.role, content: m.content })),
  ];

  const tools = buildTools(agente);

  await enviarDigitando(whatsapp, 1500, agente.instance_evolution);

  const t0 = Date.now();
  let resultado = "resposta";
  let tokensIn = 0;
  let tokensOut = 0;

  try {
    const response = await comRetry(() =>
      openai.chat.completions.create({
        model: agente.modelo,
        messages,
        ...(tools.length ? { tools, tool_choice: "auto" as const } : {}),
        temperature: agente.temperatura,
        max_tokens: agente.max_tokens,
      })
    );

    tokensIn = response.usage?.prompt_tokens ?? 0;
    tokensOut = response.usage?.completion_tokens ?? 0;
    const choice = response.choices[0];

    // ── Tool call ──────────────────────────────────────────────────────────
    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];
      if (toolCall.type === "function") {
        const args = JSON.parse(toolCall.function.arguments || "{}");
        const exec = await executarTool(agente, whatsapp, args.nome ?? nomeContato ?? "", args);
        if (exec.foiAgendamento) resultado = "agendamento";

        // Segunda chamada com o resultado da ferramenta para gerar a resposta final
        const messages2: ChatCompletionMessageParam[] = [
          ...messages,
          choice.message,
          { role: "tool", tool_call_id: toolCall.id, content: exec.resultado },
        ];
        const final = await comRetry(() =>
          openai.chat.completions.create({
            model: agente.modelo,
            messages: messages2,
            temperature: agente.temperatura,
            max_tokens: agente.max_tokens,
          })
        );
        tokensIn += final.usage?.prompt_tokens ?? 0;
        tokensOut += final.usage?.completion_tokens ?? 0;

        const respostaFinal = final.choices[0].message.content ?? "Pronto! ✅";
        const novoHist: Mensagem[] = [...historico, { role: "assistant", content: respostaFinal }];
        await updateHistorico(conversa.id, novoHist);
        await enviarMensagem(whatsapp, respostaFinal, agente.instance_evolution);

        await registrarMetrica({
          cliente_agente_id: agente.id,
          conversa_id: conversa.id,
          whatsapp,
          modelo: agente.modelo,
          tokens_input: tokensIn,
          tokens_output: tokensOut,
          tempo_resposta_ms: Date.now() - t0,
          resultado,
        });
        return;
      }
    }

    // ── Resposta de texto normal ───────────────────────────────────────────
    const resposta = choice.message.content;
    if (resposta) {
      const novoHist: Mensagem[] = [...historico, { role: "assistant", content: resposta }];
      await updateHistorico(conversa.id, novoHist);
      await enviarMensagem(whatsapp, resposta, agente.instance_evolution);
    }

    await registrarMetrica({
      cliente_agente_id: agente.id,
      conversa_id: conversa.id,
      whatsapp,
      modelo: agente.modelo,
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      tempo_resposta_ms: Date.now() - t0,
      resultado,
    });
  } catch (err) {
    console.error(`[Agente:${agente.instance_evolution}] Erro:`, err);
    await registrarMetrica({
      cliente_agente_id: agente.id,
      conversa_id: conversa.id,
      whatsapp,
      modelo: agente.modelo,
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      tempo_resposta_ms: Date.now() - t0,
      resultado: "erro",
    });
    await enviarMensagem(
      whatsapp,
      "Desculpe, tive um probleminha aqui. Pode repetir? 🙏",
      agente.instance_evolution
    );
  }
}
