"use client";

import { useState, useMemo } from "react";
import {
  MagnifyingGlass,
  Funnel,
  X,
  WhatsappLogo,
  EnvelopeSimple,
  Calendar,
  User,
  Buildings,
  Tag,
  Star,
  ChatCircle,
  Phone,
  VideoCamera,
  Robot,
} from "@phosphor-icons/react";
import type { Lead, LeadClassificacao, LeadStatus, Interacao, Conversa } from "@/types/database";
import { ClassificacaoBadge } from "@/components/shared/ClassificacaoBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CLASSIFICACOES: LeadClassificacao[] = ["Quente", "Morno", "Frio", "Desqualificado"];
const STATUS_LIST: LeadStatus[] = [
  "Novo", "Em Qualificação", "Proposta Enviada",
  "Em Negociação", "Fechado Ganho", "Fechado Perdido",
];

interface Props {
  leads: Lead[];
}

export function LeadsClient({ leads: initialLeads }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [filterClassificacao, setFilterClassificacao] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [loadingInteracoes, setLoadingInteracoes] = useState(false);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loadingConversas, setLoadingConversas] = useState(false);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        l.nome?.toLowerCase().includes(q) ||
        l.whatsapp?.includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.segmento?.toLowerCase().includes(q);
      const matchClass = !filterClassificacao || l.classificacao === filterClassificacao;
      const matchStatus = !filterStatus || l.status === filterStatus;
      return matchSearch && matchClass && matchStatus;
    });
  }, [leads, search, filterClassificacao, filterStatus]);

  async function openLead(lead: Lead) {
    setSelectedLead(lead);
    setInteracoes([]);
    setConversas([]);

    const supabase = createClient();

    setLoadingInteracoes(true);
    setLoadingConversas(true);

    const [interacoesRes, conversasRes] = await Promise.all([
      supabase
        .from("interacoes")
        .select("*")
        .eq("lead_id", lead.id)
        .order("criado_em", { ascending: false }),
      supabase
        .from("conversas")
        .select("*")
        .eq("whatsapp", lead.whatsapp ?? "")
        .order("criado_em", { ascending: false })
        .limit(5),
    ]);

    setInteracoes((interacoesRes.data as Interacao[]) ?? []);
    setConversas((conversasRes.data as Conversa[]) ?? []);
    setLoadingInteracoes(false);
    setLoadingConversas(false);
  }

  async function toggleIaAtiva(leadId: string, currentStatus: boolean) {
    const supabase = createClient();
    const newStatus = !currentStatus;
    
    // Atualiza remota
    await supabase.from("leads").update({ ia_ativa: newStatus }).eq("id", leadId);
    
    // Atualiza local
    if (selectedLead?.id === leadId) {
      setSelectedLead({ ...selectedLead, ia_ativa: newStatus });
    }
    setLeads((current) => current.map((l) => (l.id === leadId ? { ...l, ia_ativa: newStatus } : l)));
  }

  const tipoInteracaoIcon: Record<string, React.ReactNode> = {
    whatsapp: <WhatsappLogo size={16} style={{ color: "#22C55E" }} />,
    email: <EnvelopeSimple size={16} style={{ color: "var(--cyan)" }} />,
    ligacao: <Phone size={16} style={{ color: "#F59E0B" }} />,
    reuniao: <VideoCamera size={16} style={{ color: "#8B5CF6" }} />,
  };

  return (
    <div className="h-full flex">
      {/* Main panel */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
        {/* Header */}
        <div className="p-6 lg:p-8 pb-0">
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--ff-head)", letterSpacing: "-0.02em" }}
          >
            Leads
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
            {filtered.length} lead{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Filters */}
        <div className="px-6 lg:px-8 py-5 flex flex-wrap gap-3">
          <div
            className="flex items-center gap-2 flex-1 min-w-[200px] rounded-xl px-4 py-2.5"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-dim)",
              maxWidth: 360,
            }}
          >
            <MagnifyingGlass size={16} style={{ color: "var(--text-3)", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buscar por nome, WhatsApp, e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--text-1)", fontFamily: "var(--ff-body)" }}
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X size={14} style={{ color: "var(--text-3)" }} />
              </button>
            )}
          </div>

          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}
          >
            <Funnel size={15} style={{ color: "var(--text-3)" }} />
            <select
              value={filterClassificacao}
              onChange={(e) => setFilterClassificacao(e.target.value)}
              className="bg-transparent text-sm outline-none cursor-pointer"
              style={{
                color: filterClassificacao ? "var(--text-1)" : "var(--text-3)",
                fontFamily: "var(--ff-body)",
              }}
            >
              <option value="">Classificação</option>
              {CLASSIFICACOES.map((c) => (
                <option key={c} value={c} style={{ background: "var(--bg-elevated)" }}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}
          >
            <Funnel size={15} style={{ color: "var(--text-3)" }} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-sm outline-none cursor-pointer"
              style={{
                color: filterStatus ? "var(--text-1)" : "var(--text-3)",
                fontFamily: "var(--ff-body)",
              }}
            >
              <option value="">Status</option>
              {STATUS_LIST.map((s) => (
                <option key={s} value={s} style={{ background: "var(--bg-elevated)" }}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {(filterClassificacao || filterStatus) && (
            <button
              onClick={() => {
                setFilterClassificacao("");
                setFilterStatus("");
              }}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.20)",
                color: "#EF4444",
              }}
            >
              <X size={13} />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8 scrollbar-vello">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    {[
                      "Nome / Contato",
                      "Segmento",
                      "Empresa",
                      "Pontuação",
                      "Classificação",
                      "Status",
                      "Data",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-3)", fontFamily: "var(--ff-body)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-16 text-center"
                        style={{ color: "var(--text-3)" }}
                      >
                        Nenhum lead encontrado.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => openLead(lead)}
                        className="cursor-pointer transition-colors"
                        style={{
                          borderBottom: "1px solid rgba(65,190,234,0.05)",
                          background:
                            selectedLead?.id === lead.id
                              ? "rgba(65,190,234,0.06)"
                              : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedLead?.id !== lead.id)
                            (e.currentTarget as HTMLTableRowElement).style.background =
                              "rgba(65,190,234,0.03)";
                        }}
                        onMouseLeave={(e) => {
                          if (selectedLead?.id !== lead.id)
                            (e.currentTarget as HTMLTableRowElement).style.background =
                              "transparent";
                        }}
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-white leading-tight">
                            {lead.nome ?? "—"}
                          </p>
                          {lead.whatsapp && (
                            <div className="flex items-center gap-1 mt-1">
                              <span
                                className="flex items-center gap-1 text-xs"
                                style={{ color: "var(--text-3)" }}
                              >
                                <WhatsappLogo size={11} />
                                {lead.whatsapp}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm" style={{ color: "var(--text-2)" }}>
                          {lead.segmento ?? "—"}
                        </td>
                        <td className="px-5 py-4 text-sm" style={{ color: "var(--text-2)" }}>
                          {lead.tamanho_empresa ?? "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className="font-bold text-lg leading-none"
                            style={{ fontFamily: "var(--ff-head)", color: "var(--cyan)" }}
                          >
                            {lead.pontuacao ?? "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <ClassificacaoBadge classificacao={lead.classificacao} />
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="px-5 py-4 text-xs" style={{ color: "var(--text-3)" }}>
                          {format(new Date(lead.criado_em), "dd/MM/yy", { locale: ptBR })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Side panel */}
      {selectedLead && (
        <div
          className="w-full max-w-sm xl:max-w-md flex-shrink-0 flex flex-col overflow-hidden"
          style={{
            borderLeft: "1px solid var(--border-dim)",
            background: "var(--bg-surface)",
          }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid var(--border-dim)" }}
          >
            <div>
              <h3
                className="font-semibold text-white text-base leading-tight"
                style={{ fontFamily: "var(--ff-head)" }}
              >
                {selectedLead.nome ?? "Sem nome"}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                Detalhes do lead
              </p>
            </div>
            <button
              onClick={() => setSelectedLead(null)}
              className="p-2 rounded-xl transition-colors"
              style={{ color: "var(--text-3)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto scrollbar-vello p-6 space-y-6">
            {/* Score + Badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{
                  background: "rgba(65,190,234,0.08)",
                  border: "1px solid var(--border-dim)",
                }}
              >
                <Star size={16} weight="duotone" style={{ color: "var(--cyan)" }} />
                <span
                  className="font-bold text-xl"
                  style={{ fontFamily: "var(--ff-head)", color: "var(--cyan)" }}
                >
                  {selectedLead.pontuacao ?? "—"}
                </span>
                <span className="text-xs" style={{ color: "var(--text-3)" }}>
                  pts
                </span>
              </div>
              <ClassificacaoBadge classificacao={selectedLead.classificacao} />
              <StatusBadge status={selectedLead.status} />

              <button
                onClick={() => toggleIaAtiva(selectedLead.id, selectedLead.ia_ativa)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ml-auto transition-colors"
                style={{
                  background: selectedLead.ia_ativa ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  color: selectedLead.ia_ativa ? "#22C55E" : "#EF4444",
                  border: `1px solid ${selectedLead.ia_ativa ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
                }}
              >
                <Robot weight={selectedLead.ia_ativa ? "fill" : "regular"} size={16} />
                {selectedLead.ia_ativa ? 'IA Ativa' : 'IA Dinamica Off'}
              </button>
            </div>

            <LeadSection title="Contato">
              <InfoRow icon={<User size={14} />} label="Nome" value={selectedLead.nome} />
              <InfoRow
                icon={<WhatsappLogo size={14} style={{ color: "#22C55E" }} />}
                label="WhatsApp"
                value={selectedLead.whatsapp}
              />
              <InfoRow
                icon={<EnvelopeSimple size={14} />}
                label="E-mail"
                value={selectedLead.email}
              />
            </LeadSection>

            <LeadSection title="Empresa">
              <InfoRow icon={<Buildings size={14} />} label="Segmento" value={selectedLead.segmento} />
              <InfoRow icon={<Tag size={14} />} label="Tamanho" value={selectedLead.tamanho_empresa} />
              <InfoRow icon={<Tag size={14} />} label="Dor principal" value={selectedLead.dor_principal} />
              <InfoRow
                icon={<Tag size={14} />}
                label="Sistemas"
                value={selectedLead.sistemas_utilizados}
              />
              <InfoRow icon={<Tag size={14} />} label="Tem API" value={selectedLead.tem_api} />
              <InfoRow
                icon={<Tag size={14} />}
                label="Processo a Automatizar"
                value={selectedLead.descricao_processo_ia}
              />
            </LeadSection>

            <LeadSection title="Pipeline">
              <InfoRow icon={<Tag size={14} />} label="Orçamento" value={selectedLead.orcamento} />
              <InfoRow icon={<Calendar size={14} />} label="Prazo" value={selectedLead.prazo} />
              <InfoRow icon={<User size={14} />} label="Responsável" value={selectedLead.responsavel} />
              <InfoRow
                icon={<Calendar size={14} />}
                label="Próximo follow-up"
                value={
                  selectedLead.proximo_followup
                    ? format(new Date(selectedLead.proximo_followup), "dd/MM/yyyy", {
                        locale: ptBR,
                      })
                    : null
                }
              />
            </LeadSection>

            {selectedLead.observacoes && (
              <LeadSection title="Observações">
                <p
                  className="text-sm leading-relaxed rounded-xl p-3"
                  style={{
                    color: "var(--text-2)",
                    background: "rgba(65,190,234,0.05)",
                    border: "1px solid var(--border-dim)",
                  }}
                >
                  {selectedLead.observacoes}
                </p>
              </LeadSection>
            )}

            <LeadSection title="Conversa com IA">
              {loadingConversas ? (
                <p className="text-xs" style={{ color: "var(--text-3)" }}>Carregando...</p>
              ) : conversas.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-3)" }}>Nenhuma conversa encontrada.</p>
              ) : (
                <div className="space-y-4">
                  {conversas.map((conv) => (
                    <div key={conv.id}>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: "var(--text-3)" }}
                        >
                          {format(new Date(conv.criado_em), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{
                            background: conv.finalizada ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                            color: conv.finalizada ? "#22C55E" : "#F59E0B",
                          }}
                        >
                          {conv.finalizada ? "Finalizada" : "Em andamento"}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {conv.historico.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                              style={
                                msg.role === "user"
                                  ? {
                                      background: "rgba(65,190,234,0.12)",
                                      color: "var(--text-1)",
                                      borderBottomRightRadius: 4,
                                    }
                                  : {
                                      background: "var(--bg-elevated)",
                                      color: "var(--text-2)",
                                      border: "1px solid var(--border-dim)",
                                      borderBottomLeftRadius: 4,
                                    }
                              }
                            >
                              {msg.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </LeadSection>

            <LeadSection title="Histórico de Interações">
              {loadingInteracoes ? (
                <p className="text-xs" style={{ color: "var(--text-3)" }}>
                  Carregando...
                </p>
              ) : interacoes.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-3)" }}>
                  Nenhuma interação registrada.
                </p>
              ) : (
                <div className="space-y-3">
                  {interacoes.map((i) => (
                    <div
                      key={i.id}
                      className="rounded-xl p-3"
                      style={{
                        background: "rgba(65,190,234,0.04)",
                        border: "1px solid var(--border-dim)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {tipoInteracaoIcon[i.tipo] ?? <ChatCircle size={16} />}
                          <span
                            className="text-xs font-semibold capitalize"
                            style={{ color: "var(--text-2)" }}
                          >
                            {i.tipo}
                          </span>
                        </div>
                        <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                          {format(new Date(i.criado_em), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {i.descricao && (
                        <p
                          className="text-xs leading-relaxed"
                          style={{ color: "var(--text-2)" }}
                        >
                          {i.descricao}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </LeadSection>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="text-[10px] font-semibold uppercase tracking-widest mb-3"
        style={{ color: "var(--text-3)", fontFamily: "var(--ff-body)" }}
      >
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--text-3)" }}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
          {label}
        </span>
        <p className="text-sm mt-0.5 break-words" style={{ color: "var(--text-1)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}
