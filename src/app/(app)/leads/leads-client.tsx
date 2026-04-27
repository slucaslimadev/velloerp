"use client";

import { useState, useMemo } from "react";
import { useDisparos } from "@/lib/disparos-context";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass, Funnel, X, WhatsappLogo, EnvelopeSimple,
  Calendar, User, Buildings, Tag, Star, ChatCircle, Phone,
  VideoCamera, Robot, Plus, SquaresFour, Rows, Trash,
  WarningCircle, ArrowsDownUp, MagnifyingGlassPlus, Check,
} from "@phosphor-icons/react";
import type { Lead, LeadClassificacao, LeadStatus, Interacao, Conversa } from "@/types/database";
import { ClassificacaoBadge } from "@/components/shared/ClassificacaoBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type SortKey = "data-desc" | "data-asc" | "pontuacao-desc" | "pontuacao-asc" | "classificacao-desc";

const CLASSIF_RANK: Record<string, number> = { Quente: 4, Morno: 3, Frio: 2, Desqualificado: 1 };

const CLASSIFICACOES: LeadClassificacao[] = ["Quente", "Morno", "Frio", "Desqualificado"];
const STATUS_LIST: LeadStatus[] = [
  "Novo", "Em Qualificação", "Proposta Enviada",
  "Em Negociação", "Fechado Ganho", "Fechado Perdido",
];
const TAMANHOS = ["1-10 funcionários", "11-50 funcionários", "51-200 funcionários", "Acima de 200 funcionários"];

const inputCls = `w-full rounded-xl px-3 py-2 text-sm outline-none transition-colors`;
const inputStyle = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-dim)",
  color: "var(--text-1)",
  fontFamily: "var(--ff-body)",
};

type ViewMode = "list" | "cards";

interface FormState {
  nome: string; whatsapp: string; email: string; segmento: string;
  tamanho_empresa: string; dor_principal: string; classificacao: LeadClassificacao;
  status: LeadStatus; pontuacao: string; orcamento: string; prazo: string; observacoes: string;
}

const DEFAULT_FORM: FormState = {
  nome: "", whatsapp: "", email: "", segmento: "",
  tamanho_empresa: "", dor_principal: "", classificacao: "Frio",
  status: "Novo", pontuacao: "", orcamento: "", prazo: "", observacoes: "",
};

export function LeadsClient({ leads: initialLeads }: { leads: Lead[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [filterClassificacao, setFilterClassificacao] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("data-desc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [loadingInteracoes, setLoadingInteracoes] = useState(false);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loadingConversas, setLoadingConversas] = useState(false);
  const [showNovoLead, setShowNovoLead] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [salvando, setSalvando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletando, setDeletando] = useState(false);

  // Prospecção via Apify
  const [showProspeccao, setShowProspeccao] = useState(false);
  const [prospTab, setProspTab] = useState<"prospectar" | "proposta">("prospectar");
  const [prospBusca, setProspBusca] = useState("");
  const [prospQtd, setProspQtd] = useState("10");
  const [buscando, setBuscando] = useState(false);
  const [prospResultados, setProspResultados] = useState<Partial<Lead>[]>([]);
  const [prospSelecionados, setProspSelecionados] = useState<Set<number>>(new Set());

  interface PropostaItem {
    lead: Partial<Lead>;
    mensagem: string;
    status: "aguardando" | "gerando" | "pronto" | "erro" | "sem-telefone";
  }
  const [propostas, setPropostas] = useState<PropostaItem[]>([]);
  const [gerandoAll, setGerandoAll] = useState(false);
  const { iniciarEnvio, state: disparosState } = useDisparos();
  const enviandoAll = disparosState.ativo;

  const hasFilter = !!(filterClassificacao || filterStatus || filterDateFrom || filterDateTo);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const q = search.toLowerCase();
      const matchSearch = !q || l.nome?.toLowerCase().includes(q) ||
        l.whatsapp?.includes(q) || l.email?.toLowerCase().includes(q) ||
        l.segmento?.toLowerCase().includes(q);
      const matchClass = !filterClassificacao || l.classificacao === filterClassificacao;
      const matchStatus = !filterStatus || l.status === filterStatus;
      const criado = new Date(l.criado_em);
      const matchFrom = !filterDateFrom || criado >= new Date(filterDateFrom);
      const matchTo = !filterDateTo || criado <= new Date(filterDateTo + "T23:59:59");
      return matchSearch && matchClass && matchStatus && matchFrom && matchTo;
    });
  }, [leads, search, filterClassificacao, filterStatus, filterDateFrom, filterDateTo]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "data-desc": return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        case "data-asc":  return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
        case "pontuacao-desc": return (b.pontuacao ?? 0) - (a.pontuacao ?? 0);
        case "pontuacao-asc":  return (a.pontuacao ?? 0) - (b.pontuacao ?? 0);
        case "classificacao-desc":
          return (CLASSIF_RANK[b.classificacao ?? ""] ?? 0) - (CLASSIF_RANK[a.classificacao ?? ""] ?? 0);
        default: return 0;
      }
    });
  }, [filtered, sortKey]);

  async function buscarLeadsApify() {
    if (!prospBusca.trim()) return;
    setBuscando(true);
    setProspResultados([]);
    setProspSelecionados(new Set());
    try {
      const res = await fetch("/api/apify/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busca: prospBusca, quantidade: Number(prospQtd) }),
      });
      const json = await res.json();
      if (json.leads) {
        setProspResultados(json.leads);
        setProspSelecionados(new Set(json.leads.map((_: Partial<Lead>, i: number) => i)));
      }
    } finally {
      setBuscando(false);
    }
  }

  function toggleSelecaoProsp(i: number) {
    setProspSelecionados((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function irParaPropostas() {
    const selecionados = prospResultados.filter((_, i) => prospSelecionados.has(i));
    setPropostas(selecionados.map((lead) => ({
      lead,
      mensagem: "",
      status: lead.whatsapp ? "aguardando" : "sem-telefone",
    })));
    setProspTab("proposta");
  }

  async function gerarProposta(index: number) {
    const item = propostas[index];
    if (!item || item.status === "sem-telefone") return;
    setPropostas((prev) => prev.map((p, i) => i === index ? { ...p, status: "gerando" } : p));
    try {
      const res = await fetch("/api/apify/gerar-proposta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: item.lead.nome, segmento: item.lead.segmento, observacoes: item.lead.observacoes }),
      });
      const json = await res.json();
      if (json.mensagem) {
        setPropostas((prev) => prev.map((p, i) => i === index ? { ...p, mensagem: json.mensagem, status: "pronto" } : p));
      } else {
        setPropostas((prev) => prev.map((p, i) => i === index ? { ...p, status: "erro" } : p));
      }
    } catch {
      setPropostas((prev) => prev.map((p, i) => i === index ? { ...p, status: "erro" } : p));
    }
  }

  async function gerarTodasPropostas() {
    setGerandoAll(true);
    for (let i = 0; i < propostas.length; i++) {
      if (propostas[i].status === "sem-telefone") continue;
      await gerarProposta(i);
    }
    setGerandoAll(false);
  }

  async function importarEEnviar() {
    if (enviandoAll) return;
    const supabase = createClient();

    const comMensagem = propostas.filter((p) => p.lead.whatsapp && p.mensagem.trim() && p.status === "pronto");
    const semMensagem = propostas.filter((p) => p.status === "sem-telefone" || !p.mensagem.trim());

    // Importa todos os leads primeiro
    const inseridos: Lead[] = [];
    for (const item of [...comMensagem, ...semMensagem]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("leads") as any).insert(item.lead).select().single();
      if (data) inseridos.push(data as Lead);
    }
    setLeads((prev) => [...inseridos, ...prev]);

    // Fecha o modal e delega o envio para o context global (continua em background)
    setShowProspeccao(false);
    setProspTab("prospectar");
    setProspBusca("");
    setProspResultados([]);
    setPropostas([]);

    iniciarEnvio(comMensagem.map((p) => ({ whatsapp: p.lead.whatsapp!, mensagem: p.mensagem })));
  }

  function irParaWhatsApp(lead: Lead) {
    if (!lead.whatsapp) return;
    router.push(`/conversas?whatsapp=${lead.whatsapp}`);
  }

  async function openLead(lead: Lead) {
    setSelectedLead(lead);
    setInteracoes([]);
    setConversas([]);
    const supabase = createClient();
    setLoadingInteracoes(true);
    setLoadingConversas(true);
    const [iRes, cRes] = await Promise.all([
      supabase.from("interacoes").select("*").eq("lead_id", lead.id).order("criado_em", { ascending: false }),
      supabase.from("conversas").select("*").eq("whatsapp", lead.whatsapp ?? "").order("criado_em", { ascending: false }).limit(5),
    ]);
    setInteracoes((iRes.data as Interacao[]) ?? []);
    setConversas((cRes.data as Conversa[]) ?? []);
    setLoadingInteracoes(false);
    setLoadingConversas(false);
  }

  async function toggleIaAtiva(leadId: string, currentStatus: boolean) {
    const supabase = createClient();
    const newStatus = !currentStatus;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("leads") as any).update({ ia_ativa: newStatus }).eq("id", leadId);
    if (selectedLead?.id === leadId) setSelectedLead({ ...selectedLead, ia_ativa: newStatus });
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, ia_ativa: newStatus } : l));
  }

  async function salvarNovoLead() {
    setSalvando(true);
    const supabase = createClient();
    const n = (v: string): string | null => v.trim() || null;
    const payload = {
      nome:              n(form.nome),
      whatsapp:          n(form.whatsapp),
      email:             n(form.email),
      segmento:          n(form.segmento),
      tamanho_empresa:   n(form.tamanho_empresa),
      dor_principal:     n(form.dor_principal),
      classificacao:     n(form.classificacao),
      status:            form.status || "Novo",
      pontuacao:         form.pontuacao ? Number(form.pontuacao) : null,
      orcamento:         n(form.orcamento),
      prazo:             n(form.prazo),
      observacoes:       n(form.observacoes),
      tentativas_requalificacao: 0,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("leads") as any).insert(payload).select().single();
    if (!error && data) {
      setLeads((prev) => [data as Lead, ...prev]);
      setShowNovoLead(false);
      setForm(DEFAULT_FORM);
    } else if (error) {
      console.error("[salvarNovoLead]", error.message, error.details);
    }
    setSalvando(false);
  }

  async function deletarLead() {
    if (!selectedLead) return;
    setDeletando(true);
    const supabase = createClient();
    await supabase.from("leads").delete().eq("id", selectedLead.id);
    setLeads((prev) => prev.filter((l) => l.id !== selectedLead.id));
    setSelectedLead(null);
    setConfirmDelete(false);
    setDeletando(false);
  }

  function clearFilters() {
    setFilterClassificacao("");
    setFilterStatus("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  const tipoIcon: Record<string, React.ReactNode> = {
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
        <div className="px-6 lg:px-8 pt-6 pb-0 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--ff-head)", letterSpacing: "-0.02em" }}>
              Leads
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
              {filtered.length} lead{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {/* View toggle */}
            <div className="flex items-center gap-0.5 rounded-xl p-1" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
              {(["list", "cards"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{
                    background: viewMode === mode ? "rgba(65,190,234,0.15)" : "transparent",
                    color: viewMode === mode ? "var(--cyan)" : "var(--text-3)",
                  }}
                  title={mode === "list" ? "Lista" : "Cards"}
                >
                  {mode === "list" ? <Rows size={16} /> : <SquaresFour size={16} />}
                </button>
              ))}
            </div>
            {/* Prospectar */}
            <button
              onClick={() => setShowProspeccao(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", color: "var(--text-2)", fontFamily: "var(--ff-body)" }}
            >
              <MagnifyingGlassPlus size={16} weight="bold" />
              Prospectar
            </button>
            {/* Novo Lead */}
            <button
              onClick={() => setShowNovoLead(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: "var(--cyan)", color: "#0a0d14", fontFamily: "var(--ff-body)" }}
            >
              <Plus size={16} weight="bold" />
              Novo Lead
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 lg:px-8 py-4 flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px] rounded-xl px-4 py-2.5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", maxWidth: 360 }}>
            <MagnifyingGlass size={16} style={{ color: "var(--text-3)", flexShrink: 0 }} />
            <input type="text" placeholder="Buscar por nome, WhatsApp, e-mail..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--text-1)", fontFamily: "var(--ff-body)" }} />
            {search && <button onClick={() => setSearch("")}><X size={14} style={{ color: "var(--text-3)" }} /></button>}
          </div>

          {/* Classificação */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
            <Funnel size={15} style={{ color: "var(--text-3)" }} />
            <select value={filterClassificacao} onChange={(e) => setFilterClassificacao(e.target.value)}
              className="bg-transparent text-sm outline-none cursor-pointer"
              style={{ color: filterClassificacao ? "var(--text-1)" : "var(--text-3)", fontFamily: "var(--ff-body)" }}>
              <option value="">Classificação</option>
              {CLASSIFICACOES.map((c) => <option key={c} value={c} style={{ background: "var(--bg-elevated)" }}>{c}</option>)}
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
            <Funnel size={15} style={{ color: "var(--text-3)" }} />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-sm outline-none cursor-pointer"
              style={{ color: filterStatus ? "var(--text-1)" : "var(--text-3)", fontFamily: "var(--ff-body)" }}>
              <option value="">Status</option>
              {STATUS_LIST.map((s) => <option key={s} value={s} style={{ background: "var(--bg-elevated)" }}>{s}</option>)}
            </select>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
            <Calendar size={15} style={{ color: "var(--text-3)" }} />
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
              className="bg-transparent text-sm outline-none cursor-pointer"
              style={{ color: filterDateFrom ? "var(--text-1)" : "var(--text-3)", fontFamily: "var(--ff-body)", colorScheme: "dark" }} />
            <span className="text-xs" style={{ color: "var(--text-3)" }}>até</span>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
              className="bg-transparent text-sm outline-none cursor-pointer"
              style={{ color: filterDateTo ? "var(--text-1)" : "var(--text-3)", fontFamily: "var(--ff-body)", colorScheme: "dark" }} />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
            <ArrowsDownUp size={15} style={{ color: "var(--text-3)" }} />
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="bg-transparent text-sm outline-none cursor-pointer"
              style={{ color: "var(--text-2)", fontFamily: "var(--ff-body)" }}>
              <option value="data-desc"    style={{ background: "var(--bg-elevated)" }}>Data (recente)</option>
              <option value="data-asc"     style={{ background: "var(--bg-elevated)" }}>Data (antigo)</option>
              <option value="pontuacao-desc" style={{ background: "var(--bg-elevated)" }}>Pontuação (maior)</option>
              <option value="pontuacao-asc"  style={{ background: "var(--bg-elevated)" }}>Pontuação (menor)</option>
              <option value="classificacao-desc" style={{ background: "var(--bg-elevated)" }}>Classificação</option>
            </select>
          </div>

          {hasFilter && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "#EF4444" }}>
              <X size={13} /> Limpar filtros
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8 scrollbar-vello">
          {viewMode === "list" ? (
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                      {["Data", "Nome / Contato", "Segmento", "Empresa", "Pontuação", "Classificação", "Status"].map((h) => (
                        <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "var(--text-3)", fontFamily: "var(--ff-body)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.length === 0 ? (
                      <tr><td colSpan={7} className="py-16 text-center" style={{ color: "var(--text-3)" }}>Nenhum lead encontrado.</td></tr>
                    ) : sorted.map((lead) => (
                      <tr key={lead.id} onClick={() => openLead(lead)} className="cursor-pointer transition-colors"
                        style={{ borderBottom: "1px solid rgba(65,190,234,0.05)", background: selectedLead?.id === lead.id ? "rgba(65,190,234,0.06)" : "transparent" }}
                        onMouseEnter={(e) => { if (selectedLead?.id !== lead.id) (e.currentTarget as HTMLElement).style.background = "rgba(65,190,234,0.03)"; }}
                        onMouseLeave={(e) => { if (selectedLead?.id !== lead.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        <td className="px-5 py-4 text-xs font-medium" style={{ color: "var(--text-2)", whiteSpace: "nowrap" }}>
                          {format(new Date(lead.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-white leading-tight">{lead.nome ?? "—"}</p>
                          {lead.whatsapp && (
                            <span className="flex items-center gap-1 text-xs mt-1" style={{ color: "var(--text-3)" }}>
                              <WhatsappLogo size={11} />{lead.whatsapp}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm" style={{ color: "var(--text-2)" }}>{lead.segmento ?? "—"}</td>
                        <td className="px-5 py-4 text-sm" style={{ color: "var(--text-2)" }}>{lead.tamanho_empresa ?? "—"}</td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-lg leading-none" style={{ fontFamily: "var(--ff-head)", color: "var(--cyan)" }}>{lead.pontuacao ?? "—"}</span>
                        </td>
                        <td className="px-5 py-4"><ClassificacaoBadge classificacao={lead.classificacao} /></td>
                        <td className="px-5 py-4"><StatusBadge status={lead.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {sorted.length === 0 ? (
                <p className="col-span-full py-16 text-center text-sm" style={{ color: "var(--text-3)" }}>Nenhum lead encontrado.</p>
              ) : sorted.map((lead) => (
                <LeadCard key={lead.id} lead={lead} selected={selectedLead?.id === lead.id} onClick={() => openLead(lead)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Side panel */}
      {selectedLead && (
        <div className="w-full max-w-sm xl:max-w-md flex-shrink-0 flex flex-col overflow-hidden"
          style={{ borderLeft: "1px solid var(--border-dim)", background: "var(--bg-surface)" }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-dim)" }}>
            <div>
              <h3 className="font-semibold text-white text-base leading-tight" style={{ fontFamily: "var(--ff-head)" }}>
                {selectedLead.nome ?? "Sem nome"}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Detalhes do lead</p>
            </div>
            <button onClick={() => setSelectedLead(null)} className="p-2 rounded-xl transition-colors" style={{ color: "var(--text-3)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-vello p-6 space-y-6">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: "rgba(65,190,234,0.08)", border: "1px solid var(--border-dim)" }}>
                <Star size={16} weight="duotone" style={{ color: "var(--cyan)" }} />
                <span className="font-bold text-xl" style={{ fontFamily: "var(--ff-head)", color: "var(--cyan)" }}>{selectedLead.pontuacao ?? "—"}</span>
                <span className="text-xs" style={{ color: "var(--text-3)" }}>pts</span>
              </div>
              <ClassificacaoBadge classificacao={selectedLead.classificacao} />
              <StatusBadge status={selectedLead.status} />
            </div>

            {/* WhatsApp button */}
            {selectedLead.whatsapp && (
              <button
                onClick={() => irParaWhatsApp(selectedLead)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)", color: "#22C55E" }}
              >
                <WhatsappLogo size={17} weight="fill" />
                Ir para o WhatsApp
              </button>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => toggleIaAtiva(selectedLead.id, selectedLead.ia_ativa)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ml-auto transition-colors"
                style={{
                  background: selectedLead.ia_ativa ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  color: selectedLead.ia_ativa ? "#22C55E" : "#EF4444",
                  border: `1px solid ${selectedLead.ia_ativa ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}>
                <Robot weight={selectedLead.ia_ativa ? "fill" : "regular"} size={16} />
                {selectedLead.ia_ativa ? "IA Ativa" : "IA Dinâmica Off"}
              </button>
            </div>

            <LeadSection title="Contato">
              <InfoRow icon={<User size={14} />} label="Nome" value={selectedLead.nome} />
              <InfoRow icon={<WhatsappLogo size={14} style={{ color: "#22C55E" }} />} label="WhatsApp" value={selectedLead.whatsapp} />
              <InfoRow icon={<EnvelopeSimple size={14} />} label="E-mail" value={selectedLead.email} />
            </LeadSection>

            <LeadSection title="Empresa">
              <InfoRow icon={<Buildings size={14} />} label="Segmento" value={selectedLead.segmento} />
              <InfoRow icon={<Tag size={14} />} label="Tamanho" value={selectedLead.tamanho_empresa} />
              <InfoRow icon={<Tag size={14} />} label="Dor principal" value={selectedLead.dor_principal} />
              <InfoRow icon={<Tag size={14} />} label="Sistemas" value={selectedLead.sistemas_utilizados} />
              <InfoRow icon={<Tag size={14} />} label="Tem API" value={selectedLead.tem_api} />
              <InfoRow icon={<Tag size={14} />} label="Processo a Automatizar" value={selectedLead.descricao_processo_ia} />
            </LeadSection>

            <LeadSection title="Pipeline">
              <InfoRow icon={<Tag size={14} />} label="Orçamento" value={selectedLead.orcamento} />
              <InfoRow icon={<Calendar size={14} />} label="Prazo" value={selectedLead.prazo} />
              <InfoRow icon={<User size={14} />} label="Responsável" value={selectedLead.responsavel} />
              <InfoRow icon={<Calendar size={14} />} label="Próximo follow-up"
                value={selectedLead.proximo_followup ? format(new Date(selectedLead.proximo_followup), "dd/MM/yyyy", { locale: ptBR }) : null} />
            </LeadSection>

            {selectedLead.observacoes && (
              <LeadSection title="Observações">
                <p className="text-sm leading-relaxed rounded-xl p-3" style={{ color: "var(--text-2)", background: "rgba(65,190,234,0.05)", border: "1px solid var(--border-dim)" }}>
                  {selectedLead.observacoes}
                </p>
              </LeadSection>
            )}

            <LeadSection title="Conversa com IA">
              {loadingConversas ? <p className="text-xs" style={{ color: "var(--text-3)" }}>Carregando...</p>
                : conversas.length === 0 ? <p className="text-xs" style={{ color: "var(--text-3)" }}>Nenhuma conversa encontrada.</p>
                : (
                  <div className="space-y-4">
                    {conversas.map((conv) => (
                      <div key={conv.id}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                            {format(new Date(conv.criado_em), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: conv.finalizada ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: conv.finalizada ? "#22C55E" : "#F59E0B" }}>
                            {conv.finalizada ? "Finalizada" : "Em andamento"}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {conv.historico.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                              <div className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                                style={msg.role === "user"
                                  ? { background: "rgba(65,190,234,0.12)", color: "var(--text-1)", borderBottomRightRadius: 4 }
                                  : { background: "var(--bg-elevated)", color: "var(--text-2)", border: "1px solid var(--border-dim)", borderBottomLeftRadius: 4 }}>
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
              {loadingInteracoes ? <p className="text-xs" style={{ color: "var(--text-3)" }}>Carregando...</p>
                : interacoes.length === 0 ? <p className="text-xs" style={{ color: "var(--text-3)" }}>Nenhuma interação registrada.</p>
                : (
                  <div className="space-y-3">
                    {interacoes.map((i) => (
                      <div key={i.id} className="rounded-xl p-3" style={{ background: "rgba(65,190,234,0.04)", border: "1px solid var(--border-dim)" }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            {tipoIcon[i.tipo] ?? <ChatCircle size={16} />}
                            <span className="text-xs font-semibold capitalize" style={{ color: "var(--text-2)" }}>{i.tipo}</span>
                          </div>
                          <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                            {format(new Date(i.criado_em), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {i.descricao && <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>{i.descricao}</p>}
                      </div>
                    ))}
                  </div>
                )}
            </LeadSection>

            {/* Danger zone */}
            <div className="pt-2">
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444" }}
              >
                <Trash size={15} /> Excluir Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(239,68,68,0.12)" }}>
                <WarningCircle size={22} style={{ color: "#EF4444" }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>Excluir Lead</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-sm mb-5" style={{ color: "var(--text-2)" }}>
              Tem certeza que deseja excluir <strong style={{ color: "var(--text-1)" }}>{selectedLead.nome ?? "este lead"}</strong>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-xl text-sm"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", color: "var(--text-2)" }}>
                Cancelar
              </button>
              <button onClick={deletarLead} disabled={deletando} className="flex-1 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ background: "#EF4444", color: "#fff" }}>
                {deletando ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Prospecção — 2 abas */}
      {showProspeccao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && !buscando && !enviandoAll && setShowProspeccao(false)}>
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)", maxHeight: "90vh" }}>

            {/* Header com abas */}
            <div className="flex-shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
              <div className="flex items-center justify-between px-6 pt-4 pb-0">
                <h2 className="text-base font-semibold" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>
                  Prospecção — Google Maps
                </h2>
                <button onClick={() => { setShowProspeccao(false); setProspTab("prospectar"); }}
                  style={{ color: "var(--text-3)" }} disabled={enviandoAll}>
                  <X size={18} />
                </button>
              </div>
              {/* Tabs */}
              <div className="flex px-6 mt-3">
                {(["prospectar", "proposta"] as const).map((tab, i) => (
                  <button key={tab} onClick={() => !enviandoAll && setProspTab(tab)}
                    className="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
                    style={{
                      borderColor: prospTab === tab ? "var(--cyan)" : "transparent",
                      color: prospTab === tab ? "var(--cyan)" : "var(--text-3)",
                    }}>
                    {i + 1}. {tab === "prospectar" ? "Prospectar" : "Gerar Propostas"}
                  </button>
                ))}
              </div>
            </div>

            {/* ── ABA 1: Prospectar ── */}
            {prospTab === "prospectar" && (
              <>
                <div className="px-6 py-4 flex-shrink-0 flex gap-3 items-end"
                  style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>Busca *</label>
                    <input className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
                      placeholder='Ex: "agência de marketing Brasília", "clínica SP"'
                      value={prospBusca} onChange={(e) => setProspBusca(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && buscarLeadsApify()} disabled={buscando} />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>Qtd.</label>
                    <select className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
                      value={prospQtd} onChange={(e) => setProspQtd(e.target.value)} disabled={buscando}>
                      {[5, 10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <button onClick={buscarLeadsApify} disabled={!prospBusca.trim() || buscando}
                    className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
                    style={{ background: "var(--cyan)", color: "#0a0d14" }}>
                    {buscando
                      ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> Buscando...</>
                      : <><MagnifyingGlass size={15} weight="bold" /> Buscar</>}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {buscando && (
                    <div className="py-16 flex flex-col items-center gap-3" style={{ color: "var(--text-3)" }}>
                      <span className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin inline-block" style={{ borderColor: "var(--cyan) transparent var(--cyan) var(--cyan)" }} />
                      <p className="text-sm">Buscando no Google Maps... aguarde</p>
                    </div>
                  )}
                  {!buscando && prospResultados.length === 0 && prospBusca && (
                    <p className="py-16 text-center text-sm" style={{ color: "var(--text-3)" }}>Nenhum resultado. Tente outro termo.</p>
                  )}
                  {!buscando && prospResultados.length > 0 && (
                    <>
                      <div className="px-6 py-3 flex items-center justify-between"
                        style={{ borderBottom: "1px solid var(--border-dim)" }}>
                        <p className="text-xs" style={{ color: "var(--text-3)" }}>{prospSelecionados.size} de {prospResultados.length} selecionados</p>
                        <button className="text-xs" style={{ color: "var(--cyan)" }}
                          onClick={() => setProspSelecionados(
                            prospSelecionados.size === prospResultados.length ? new Set() : new Set(prospResultados.map((_, i) => i))
                          )}>
                          {prospSelecionados.size === prospResultados.length ? "Desmarcar todos" : "Selecionar todos"}
                        </button>
                      </div>
                      {prospResultados.map((lead, i) => (
                        <div key={i} onClick={() => toggleSelecaoProsp(i)}
                          className="flex items-start gap-3 px-6 py-3.5 cursor-pointer transition-colors"
                          style={{ borderBottom: "1px solid var(--border-dim)", background: prospSelecionados.has(i) ? "rgba(65,190,234,0.05)" : "transparent" }}>
                          <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: prospSelecionados.has(i) ? "var(--cyan)" : "var(--bg-surface)", border: `1px solid ${prospSelecionados.has(i) ? "var(--cyan)" : "var(--border-dim)"}` }}>
                            {prospSelecionados.has(i) && <Check size={12} weight="bold" color="#0a0d14" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold truncate" style={{ color: "var(--text-1)" }}>{lead.nome}</p>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <ClassificacaoBadge classificacao={lead.classificacao as LeadClassificacao} />
                                <span className="text-xs font-bold" style={{ color: "var(--cyan)" }}>{lead.pontuacao} pts</span>
                              </div>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{lead.segmento}</p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {lead.whatsapp
                                ? <span className="text-xs flex items-center gap-1" style={{ color: "#22C55E" }}><WhatsappLogo size={11} />{lead.whatsapp}</span>
                                : <span className="text-xs" style={{ color: "#F59E0B" }}>Sem telefone</span>}
                              <span className="text-xs truncate max-w-xs" style={{ color: "var(--text-3)" }}>{lead.observacoes?.split("\n")[0]}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {prospResultados.length > 0 && !buscando && (
                  <div className="px-6 py-4 flex justify-end gap-3 flex-shrink-0" style={{ borderTop: "1px solid var(--border-dim)" }}>
                    <button onClick={() => setShowProspeccao(false)} className="px-4 py-2 rounded-xl text-sm"
                      style={{ color: "var(--text-2)", background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
                      Cancelar
                    </button>
                    <button onClick={irParaPropostas} disabled={prospSelecionados.size === 0}
                      className="px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                      style={{ background: "var(--cyan)", color: "#0a0d14" }}>
                      Próximo: Gerar Propostas ({prospSelecionados.size}) →
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── ABA 2: Propostas ── */}
            {prospTab === "proposta" && (
              <>
                {/* Actions bar */}
                <div className="px-6 py-3 flex items-center justify-between flex-shrink-0"
                  style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>
                    {propostas.filter(p => p.status === "pronto").length} de {propostas.filter(p => p.status !== "sem-telefone").length} geradas
                  </p>
                  <button onClick={gerarTodasPropostas} disabled={gerandoAll || enviandoAll}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                    style={{ background: "rgba(65,190,234,0.12)", color: "var(--cyan)", border: "1px solid rgba(65,190,234,0.2)" }}>
                    {gerandoAll
                      ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> Gerando...</>
                      : "✨ Gerar todas com IA"}
                  </button>
                </div>

                {/* Proposals list */}
                <div className="flex-1 overflow-y-auto">
                  {propostas.map((item, i) => (
                    <div key={i} className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-1)" }}>{item.lead.nome}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs" style={{ color: "var(--text-3)" }}>{item.lead.segmento}</span>
                            {item.lead.whatsapp
                              ? <span className="text-xs flex items-center gap-1" style={{ color: "#22C55E" }}><WhatsappLogo size={10} />{item.lead.whatsapp}</span>
                              : <span className="text-xs" style={{ color: "#F59E0B" }}>⚠ Sem telefone</span>}
                          </div>
                        </div>
                        {item.status !== "sem-telefone" && (
                          <button onClick={() => gerarProposta(i)} disabled={item.status === "gerando" || enviandoAll}
                            className="text-xs px-2.5 py-1.5 rounded-lg flex-shrink-0 disabled:opacity-50"
                            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", color: "var(--text-2)" }}>
                            {item.status === "gerando"
                              ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                              : item.status === "pronto" ? "Regerar" : "Gerar"}
                          </button>
                        )}
                      </div>

                      {item.status === "sem-telefone" && (
                        <p className="text-xs py-2 px-3 rounded-lg" style={{ background: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.15)" }}>
                          Sem número de telefone — lead será importado mas sem envio de mensagem.
                        </p>
                      )}
                      {item.status === "aguardando" && (
                        <p className="text-xs" style={{ color: "var(--text-3)" }}>Clique em "Gerar" ou use "Gerar todas com IA"</p>
                      )}
                      {item.status === "gerando" && (
                        <p className="text-xs animate-pulse" style={{ color: "var(--cyan)" }}>Pesquisando e gerando mensagem...</p>
                      )}
                      {item.status === "erro" && (
                        <p className="text-xs" style={{ color: "#EF4444" }}>Erro ao gerar. Tente novamente.</p>
                      )}
                      {item.status === "pronto" && (
                        <textarea
                          value={item.mensagem}
                          onChange={(e) => setPropostas(prev => prev.map((p, idx) => idx === i ? { ...p, mensagem: e.target.value } : p))}
                          disabled={enviandoAll}
                          rows={5}
                          className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none mt-1"
                          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", color: "var(--text-1)", fontFamily: "var(--ff-body)" }}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--border-dim)" }}>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setProspTab("prospectar")} disabled={enviandoAll} className="px-4 py-2 rounded-xl text-sm"
                      style={{ color: "var(--text-2)", background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
                      ← Voltar
                    </button>
                    <button onClick={importarEEnviar}
                      disabled={enviandoAll || propostas.every(p => p.status === "aguardando" || p.status === "gerando")}
                      className="px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                      style={{ background: "var(--cyan)", color: "#0a0d14" }}>
                      {enviandoAll
                        ? "Enviando..."
                        : `Importar e Enviar (${propostas.filter(p => p.lead.whatsapp && p.status === "pronto").length} com msg)`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal: Novo Lead */}
      {showNovoLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setShowNovoLead(false)}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)", maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
              <h2 className="text-base font-semibold" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>Novo Lead</h2>
              <button onClick={() => setShowNovoLead(false)} style={{ color: "var(--text-3)" }}><X size={18} /></button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Nome *">
                  <input className={inputCls} style={inputStyle} placeholder="João Silva"
                    value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </FormField>
                <FormField label="WhatsApp">
                  <input className={inputCls} style={inputStyle} placeholder="5561999999999"
                    value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                </FormField>
                <FormField label="E-mail">
                  <input className={inputCls} style={inputStyle} type="email" placeholder="joao@empresa.com"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </FormField>
                <FormField label="Segmento">
                  <input className={inputCls} style={inputStyle} placeholder="Tecnologia, Varejo..."
                    value={form.segmento} onChange={(e) => setForm({ ...form, segmento: e.target.value })} />
                </FormField>
                <FormField label="Tamanho da empresa">
                  <select className={inputCls} style={inputStyle} value={form.tamanho_empresa}
                    onChange={(e) => setForm({ ...form, tamanho_empresa: e.target.value })}>
                    <option value="">Selecione...</option>
                    {TAMANHOS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FormField>
                <FormField label="Pontuação">
                  <input className={inputCls} style={inputStyle} type="number" min={0} max={110} placeholder="0–110"
                    value={form.pontuacao} onChange={(e) => setForm({ ...form, pontuacao: e.target.value })} />
                </FormField>
                <FormField label="Classificação">
                  <select className={inputCls} style={inputStyle} value={form.classificacao}
                    onChange={(e) => setForm({ ...form, classificacao: e.target.value as LeadClassificacao })}>
                    {CLASSIFICACOES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FormField>
                <FormField label="Status">
                  <select className={inputCls} style={inputStyle} value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}>
                    {STATUS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="Orçamento">
                  <input className={inputCls} style={inputStyle} placeholder="R$ 10.000"
                    value={form.orcamento} onChange={(e) => setForm({ ...form, orcamento: e.target.value })} />
                </FormField>
                <FormField label="Prazo">
                  <input className={inputCls} style={inputStyle} placeholder="3 meses"
                    value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
                </FormField>
              </div>
              <FormField label="Dor principal">
                <input className={inputCls} style={inputStyle} placeholder="Principal desafio do cliente..."
                  value={form.dor_principal} onChange={(e) => setForm({ ...form, dor_principal: e.target.value })} />
              </FormField>
              <FormField label="Observações">
                <textarea className={inputCls} style={{ ...inputStyle, resize: "none" }} rows={3} placeholder="Observações adicionais..."
                  value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </FormField>
            </div>

            <div className="px-6 py-4 flex justify-end gap-3 flex-shrink-0" style={{ borderTop: "1px solid var(--border-dim)" }}>
              <button onClick={() => setShowNovoLead(false)} className="px-4 py-2 rounded-xl text-sm"
                style={{ color: "var(--text-2)", background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
                Cancelar
              </button>
              <button onClick={salvarNovoLead} disabled={!form.nome.trim() || salvando}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ background: "var(--cyan)", color: "#0a0d14" }}>
                {salvando ? "Salvando..." : "Salvar Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead, selected, onClick }: { lead: Lead; selected: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} className="rounded-2xl p-5 cursor-pointer transition-all"
      style={{ background: selected ? "rgba(65,190,234,0.08)" : "var(--bg-surface)", border: selected ? "1px solid rgba(65,190,234,0.4)" : "1px solid var(--border-dim)" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate text-sm">{lead.nome ?? "Sem nome"}</h3>
          {lead.whatsapp && (
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--text-3)" }}>
              <WhatsappLogo size={11} />{lead.whatsapp}
            </p>
          )}
        </div>
        <span className="font-bold text-xl flex-shrink-0" style={{ fontFamily: "var(--ff-head)", color: "var(--cyan)" }}>
          {lead.pontuacao ?? "—"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <ClassificacaoBadge classificacao={lead.classificacao} />
        <StatusBadge status={lead.status} />
      </div>
      {lead.segmento && <p className="text-xs truncate" style={{ color: "var(--text-2)" }}>{lead.segmento}</p>}
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--border-dim)" }}>
        <span className="text-xs" style={{ color: "var(--text-3)" }}>
          {format(new Date(lead.criado_em), "dd/MM/yy", { locale: ptBR })}
        </span>
        <div className="w-2 h-2 rounded-full" style={{ background: lead.ia_ativa ? "#22C55E" : "var(--text-3)" }} title={lead.ia_ativa ? "IA ativa" : "IA desativada"} />
      </div>
    </div>
  );
}

function LeadSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)", fontFamily: "var(--ff-body)" }}>{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--text-3)" }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{label}</span>
        <p className="text-sm mt-0.5 break-words" style={{ color: "var(--text-1)" }}>{value}</p>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>{label}</label>
      {children}
    </div>
  );
}
