export interface Mensagem {
  role: "user" | "assistant";
  content: string;
}

export interface Conversa {
  id: string;
  whatsapp: string;
  nome_contato: string | null;
  historico: Mensagem[];
  finalizada: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface DadosLead {
  nome: string | null;
  whatsapp: string;
  email: string | null;
  segmento: string | null;
  tamanho_empresa: string | null;
  dor_principal: string | null;
  usa_automacao: "Sim" | "Não" | "Parcial" | null;
  sistemas_utilizados: string | null;
  tem_api: "Sim" | "Não" | "Verificar";
  descricao_processo_ia: string | null;
  orcamento: string | null;
  prazo: string | null;
  pontuacao: number;
  classificacao: "Quente" | "Morno" | "Frio" | "Desqualificado";
  status: "Novo";
  observacoes: string | null;
}

// Payload que chega da Evolution API
export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text: string };
      audioMessage?: object;
      imageMessage?: object;
      videoMessage?: object;
      documentMessage?: object;
    };
    messageType: string;
    messageTimestamp: number;
  };
}
