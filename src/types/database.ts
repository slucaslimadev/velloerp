export type LeadClassificacao = "Quente" | "Morno" | "Frio" | "Desqualificado";
export type LeadStatus =
  | "Novo"
  | "Em Qualificação"
  | "Proposta Enviada"
  | "Em Negociação"
  | "Fechado Ganho"
  | "Fechado Perdido";

export type InteracaoTipo = "whatsapp" | "email" | "ligacao" | "reuniao";

export interface Lead {
  id: string;
  criado_em: string;
  nome: string | null;
  whatsapp: string | null;
  email: string | null;
  segmento: string | null;
  tamanho_empresa: string | null;
  dor_principal: string | null;
  sistemas_utilizados: string | null;
  tem_api: string | null;
  descricao_processo_ia: string | null;
  ia_ativa: boolean;
  orcamento: string | null;
  prazo: string | null;
  pontuacao: number | null;
  classificacao: LeadClassificacao | null;
  tentativas_requalificacao: number;
  status: string;
  responsavel: string | null;
  proximo_followup: string | null;
  observacoes: string | null;
}

export interface Pipeline {
  id: string;
  lead_id: string;
  estagio: string;
  criado_em: string;
  atualizado_em: string;
  responsavel: string | null;
  observacoes: string | null;
}

export interface Cliente {
  id: string;
  lead_id: string | null;
  criado_em: string;
  nome: string | null;
  empresa: string | null;
  whatsapp: string | null;
  email: string | null;
  segmento: string | null;
  valor_contrato: number | null;
  data_inicio: string | null;
  status: string | null;
}

export interface MensagemConversa {
  role: "user" | "assistant";
  content: string;
}

export interface Conversa {
  id: string;
  whatsapp: string;
  nome_contato: string | null;
  historico: MensagemConversa[];
  finalizada: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Interacao {
  id: string;
  lead_id: string;
  tipo: string;
  descricao: string | null;
  criado_em: string;
  responsavel: string | null;
}

export interface Configuracao {
  id: string;
  valor: string;
}

type PartialRecord<T> = Partial<T> & Record<string, unknown>;

export type Database = {
  public: {
    Tables: {
      leads: {
        Row: Lead;
        Insert: PartialRecord<Lead>;
        Update: PartialRecord<Lead>;
        Relationships: [];
      };
      pipeline: {
        Row: Pipeline;
        Insert: PartialRecord<Pipeline>;
        Update: PartialRecord<Pipeline>;
        Relationships: [];
      };
      clientes: {
        Row: Cliente;
        Insert: PartialRecord<Cliente>;
        Update: PartialRecord<Cliente>;
        Relationships: [];
      };
      interacoes: {
        Row: Interacao;
        Insert: PartialRecord<Interacao>;
        Update: PartialRecord<Interacao>;
        Relationships: [];
      };
      conversas: {
        Row: Conversa;
        Insert: PartialRecord<Conversa>;
        Update: PartialRecord<Conversa>;
        Relationships: [];
      };
      configuracoes: {
        Row: Configuracao;
        Insert: PartialRecord<Configuracao>;
        Update: PartialRecord<Configuracao>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
