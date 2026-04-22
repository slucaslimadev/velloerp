"use client";

import { useState } from "react";
import {
  Robot,
  ChatCircleDots,
  CheckCircle,
  Clock,
  Users,
  ToggleLeft,
  ToggleRight,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConversaResumo {
  id: string;
  finalizada: boolean;
  criado_em: string;
  whatsapp: string;
  nome_contato: string | null;
}

interface Props {
  iaAtivaInicial: boolean;
  conversas: ConversaResumo[];
  totalLeads: number;
}

export function ConfiguracoesClient({ iaAtivaInicial, conversas, totalLeads }: Props) {
  const [iaAtiva, setIaAtiva] = useState(iaAtivaInicial);
  const [salvando, setSalvando] = useState(false);

  const conversasHoje = conversas.filter((c) => isToday(new Date(c.criado_em)));
  const conversasAtivas = conversas.filter((c) => !c.finalizada);

  async function toggleIa() {
    setSalvando(true);
    const supabase = createClient();
    const novoValor = !iaAtiva;
    await supabase
      .from("configuracoes")
      .upsert({ id: "ia_ativa", valor: novoValor ? "true" : "false" });
    setIaAtiva(novoValor);
    setSalvando(false);
  }

  const stats = [
    {
      label: "Conversas Hoje",
      value: conversasHoje.length,
      icon: <ChatCircleDots size={20} weight="duotone" />,
      color: "var(--cyan)",
      bg: "rgba(65,190,234,0.08)",
    },
    {
      label: "Em Andamento",
      value: conversasAtivas.length,
      icon: <Clock size={20} weight="duotone" />,
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.08)",
    },
    {
      label: "Finalizadas",
      value: conversas.filter((c) => c.finalizada).length,
      icon: <CheckCircle size={20} weight="duotone" />,
      color: "#22C55E",
      bg: "rgba(34,197,94,0.08)",
    },
    {
      label: "Leads Gerados",
      value: totalLeads,
      icon: <Users size={20} weight="duotone" />,
      color: "#8B5CF6",
      bg: "rgba(139,92,246,0.08)",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-vello p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: "var(--ff-head)", letterSpacing: "-0.02em" }}
        >
          Configurações da IA
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
          Controle o agente Velly e acompanhe as conversas
        </p>
      </div>

      {/* Toggle global */}
      <div
        className="rounded-2xl p-6 mb-8"
        style={{
          background: "var(--bg-surface)",
          border: `1px solid ${iaAtiva ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: iaAtiva ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                color: iaAtiva ? "#22C55E" : "#EF4444",
              }}
            >
              <Robot size={24} weight={iaAtiva ? "fill" : "regular"} />
            </div>
            <div>
              <p
                className="font-semibold text-white"
                style={{ fontFamily: "var(--ff-head)" }}
              >
                Agente Velly — IA Global
              </p>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>
                {iaAtiva
                  ? "Respondendo automaticamente a novos contatos no WhatsApp"
                  : "Pausado — nenhuma mensagem será respondida automaticamente"}
              </p>
            </div>
          </div>

          <button
            onClick={toggleIa}
            disabled={salvando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex-shrink-0"
            style={{
              background: iaAtiva ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
              color: iaAtiva ? "#22C55E" : "#EF4444",
              border: `1px solid ${iaAtiva ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              opacity: salvando ? 0.6 : 1,
              fontFamily: "var(--ff-body)",
            }}
          >
            {iaAtiva ? (
              <ToggleRight size={20} weight="fill" />
            ) : (
              <ToggleLeft size={20} weight="fill" />
            )}
            {salvando ? "Salvando..." : iaAtiva ? "Ativa" : "Pausada"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: s.bg, color: s.color }}
            >
              {s.icon}
            </div>
            <p
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--ff-head)", color: s.color }}
            >
              {s.value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Conversas recentes */}
      <div>
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-4"
          style={{ color: "var(--text-3)", fontFamily: "var(--ff-body)" }}
        >
          Conversas Recentes
        </p>

        {conversas.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}
          >
            <ChatCircleDots size={32} style={{ color: "var(--text-3)", margin: "0 auto 8px" }} />
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              Nenhuma conversa registrada ainda.
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}
          >
            {conversas.slice(0, 20).map((conv, idx) => (
              <div
                key={conv.id}
                className="flex items-center gap-4 px-5 py-4"
                style={{
                  borderBottom:
                    idx < Math.min(conversas.length, 20) - 1
                      ? "1px solid rgba(65,190,234,0.05)"
                      : "none",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: conv.finalizada
                      ? "rgba(34,197,94,0.08)"
                      : "rgba(245,158,11,0.08)",
                    color: conv.finalizada ? "#22C55E" : "#F59E0B",
                  }}
                >
                  <WhatsappLogo size={18} weight="fill" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                    {conv.nome_contato ?? conv.whatsapp}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                    {conv.whatsapp}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: conv.finalizada
                        ? "rgba(34,197,94,0.1)"
                        : "rgba(245,158,11,0.1)",
                      color: conv.finalizada ? "#22C55E" : "#F59E0B",
                    }}
                  >
                    {conv.finalizada ? "Finalizada" : "Em andamento"}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-3)" }}>
                    {format(new Date(conv.criado_em), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
