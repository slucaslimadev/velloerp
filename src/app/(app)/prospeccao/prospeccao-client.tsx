"use client";

import { useState } from "react";
import {
  MagnifyingGlass,
  Funnel,
  Globe,
  GlobeX,
  ArrowSquareOut,
  Phone,
  Star,
  MapPin,
  WhatsappLogo,
  PaperPlaneTilt,
  UserPlus,
  ArrowsClockwise,
  CheckCircle,
  Warning,
} from "@phosphor-icons/react";

interface Resultado {
  nome: string | null;
  whatsapp: string | null;
  segmento: string | null;
  observacoes: string | null;
  status: string;
  classificacao: string;
  pontuacao: number;
  // extras extraídos de observacoes
  _site?: string | null;
  _avaliacao?: string | null;
  _endereco?: string | null;
  _maps?: string | null;
}

interface ItemState {
  salvando: boolean;
  salvo: boolean;
  gerandoProposta: boolean;
  proposta: string | null;
  produto: "landing-page" | "agente-ia" | null;
  demoUrl: string | null;
  erro: string | null;
}

function parseObservacoes(obs: string | null) {
  if (!obs) return {};
  return {
    _endereco:  obs.match(/Endereço:\s*([^\n]+)/)?.[1] ?? null,
    _site:      obs.match(/Site:\s*(https?:\/\/[^\s\n]+)/)?.[1] ?? null,
    _avaliacao: obs.match(/Avaliação Google:\s*([^\n]+)/)?.[1] ?? null,
    _maps:      obs.match(/Google Maps:\s*(https?:\/\/[^\s\n]+)/)?.[1] ?? null,
  };
}

const BUSCAS_SUGERIDAS = [
  "clínicas médicas Brasília",
  "clínicas odontológicas Brasília",
  "clínicas estéticas Brasília",
  "consultórios médicos Brasília DF",
  "clínicas veterinárias Brasília",
  "psicólogos Brasília",
  "nutricionistas Brasília",
];

export default function ProspeccaoClient() {
  const [busca, setBusca]           = useState("clínicas médicas Brasília");
  const [quantidade, setQuantidade] = useState(20);
  const [semSite, setSemSite]       = useState(true);
  const [loading, setLoading]       = useState(false);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [itemStates, setItemStates] = useState<Record<number, ItemState>>({});
  const [erro, setErro]             = useState<string | null>(null);
  const [totalApify, setTotalApify] = useState<number | null>(null);

  function setItemState(i: number, patch: Partial<ItemState>) {
    setItemStates((prev) => ({ ...prev, [i]: { ...defaultItemState, ...prev[i], ...patch } }));
  }

  const defaultItemState: ItemState = {
    salvando: false, salvo: false, gerandoProposta: false,
    proposta: null, produto: null, demoUrl: null, erro: null,
  };

  async function buscar() {
    if (!busca.trim()) return;
    setLoading(true);
    setErro(null);
    setResultados([]);
    setItemStates({});
    setTotalApify(null);

    try {
      const res = await fetch("/api/apify/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busca: busca.trim(), quantidade, semSite }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro na busca");

      const enriquecidos: Resultado[] = (data.leads ?? []).map((l: Resultado) => ({
        ...l,
        ...parseObservacoes(l.observacoes),
      }));

      setResultados(enriquecidos);
      setTotalApify(data.total ?? enriquecidos.length);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  async function salvarLead(item: Resultado, idx: number) {
    setItemState(idx, { salvando: true, erro: null });
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome:          item.nome,
          whatsapp:      item.whatsapp,
          segmento:      item.segmento,
          observacoes:   item.observacoes,
          status:        "Novo",
          classificacao: item.classificacao,
          pontuacao:     item.pontuacao,
          tentativas_requalificacao: 0,
        }),
      });
      if (!res.ok) throw new Error("Falha ao salvar lead");
      setItemState(idx, { salvando: false, salvo: true });
    } catch (e: unknown) {
      setItemState(idx, { salvando: false, erro: e instanceof Error ? e.message : "Erro" });
    }
  }

  async function gerarProposta(item: Resultado, idx: number) {
    setItemState(idx, { gerandoProposta: true, proposta: null, demoUrl: null, produto: null, erro: null });
    try {
      const res = await fetch("/api/apify/gerar-proposta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome:        item.nome,
          segmento:    item.segmento,
          observacoes: item.observacoes,
          // produto não enviado → API detecta automaticamente pelo segmento
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao gerar proposta");
      setItemState(idx, {
        gerandoProposta: false,
        proposta: data.mensagem,
        produto:  data.produto ?? null,
        demoUrl:  data.demoUrl ?? null,
      });
    } catch (e: unknown) {
      setItemState(idx, { gerandoProposta: false, erro: e instanceof Error ? e.message : "Erro" });
    }
  }

  const semSiteCount = resultados.filter((r) => !r._site).length;
  const comWppCount  = resultados.filter((r) => r.whatsapp).length;

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ fontFamily: "var(--ff-body)" }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-1)" }}>
            Prospecção Ativa
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
            Busca clínicas no Google Maps e filtra as que não têm site — clientes em potencial para a Vello.
          </p>
        </div>
      </div>

      {/* Search card */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Funnel size={16} style={{ color: "var(--cyan)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-2)" }}>Configurar busca</span>
        </div>

        {/* Sugestões */}
        <div className="flex flex-wrap gap-2">
          {BUSCAS_SUGERIDAS.map((s) => (
            <button
              key={s}
              onClick={() => setBusca(s)}
              className="text-xs px-3 py-1.5 rounded-full transition-all"
              style={{
                background: busca === s ? "rgba(65,190,234,0.15)" : "var(--bg-elevated)",
                color:      busca === s ? "var(--cyan)" : "var(--text-3)",
                border:     busca === s ? "1px solid rgba(65,190,234,0.3)" : "1px solid var(--border-dim)",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          {/* Campo busca */}
          <div className="flex-1 min-w-[240px] relative">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-3)" }}
            />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
              placeholder="Ex: clínicas médicas Brasília"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background:  "var(--bg-elevated)",
                border:      "1px solid var(--border-dim)",
                color:       "var(--text-1)",
              }}
            />
          </div>

          {/* Quantidade */}
          <select
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
            className="px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: "var(--bg-elevated)",
              border:     "1px solid var(--border-dim)",
              color:      "var(--text-1)",
            }}
          >
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>{n} resultados</option>
            ))}
          </select>

          {/* Toggle sem site */}
          <button
            onClick={() => setSemSite((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: semSite ? "rgba(239,68,68,0.1)" : "var(--bg-elevated)",
              border:     semSite ? "1px solid rgba(239,68,68,0.25)" : "1px solid var(--border-dim)",
              color:      semSite ? "#EF4444" : "var(--text-2)",
            }}
          >
            {semSite ? <GlobeX size={16} /> : <Globe size={16} />}
            {semSite ? "Sem site apenas" : "Todos (com e sem site)"}
          </button>

          {/* Buscar */}
          <button
            onClick={buscar}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: loading ? "rgba(65,190,234,0.3)" : "var(--cyan)",
              color:      "#0a0f0a",
              opacity:    loading ? 0.7 : 1,
            }}
          >
            {loading
              ? <ArrowsClockwise size={16} className="animate-spin" />
              : <MagnifyingGlass size={16} />}
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}
        >
          <Warning size={18} />
          {erro}
        </div>
      )}

      {/* Stats */}
      {resultados.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Encontrados", value: totalApify ?? resultados.length, icon: MagnifyingGlass, color: "var(--cyan)" },
            { label: "Sem site", value: semSiteCount, icon: GlobeX, color: "#EF4444" },
            { label: "Com WhatsApp", value: comWppCount, icon: WhatsappLogo, color: "#22C55E" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-4 flex items-center gap-4"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}18` }}
              >
                <s.icon size={20} style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-2xl font-semibold" style={{ color: "var(--text-1)" }}>{s.value}</div>
                <div className="text-xs" style={{ color: "var(--text-3)" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resultados */}
      {resultados.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>
              {resultados.length} resultado{resultados.length !== 1 ? "s" : ""}
              {semSite ? " sem site" : ""} com WhatsApp confirmado
            </h2>
          </div>

          {resultados.map((item, idx) => {
            const state = itemStates[idx] ?? defaultItemState;
            return (
              <div
                key={idx}
                className="rounded-2xl p-5 space-y-3 transition-all"
                style={{
                  background: "var(--bg-surface)",
                  border:     state.salvo
                    ? "1px solid rgba(34,197,94,0.3)"
                    : "1px solid var(--border-dim)",
                }}
              >
                {/* Linha 1: nome + badges */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold" style={{ color: "var(--text-1)" }}>
                      {item.nome ?? "—"}
                    </span>

                    {item.segmento && (
                      <span
                        className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(65,190,234,0.1)", color: "var(--cyan)", border: "1px solid rgba(65,190,234,0.2)" }}
                      >
                        {item.segmento}
                      </span>
                    )}

                    {!item._site ? (
                      <span
                        className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
                      >
                        <GlobeX size={11} /> Sem site
                      </span>
                    ) : (
                      <a
                        href={item._site}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1"
                        style={{ background: "rgba(34,197,94,0.08)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)" }}
                      >
                        <Globe size={11} /> Tem site
                      </a>
                    )}

                    {state.salvo && (
                      <span
                        className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1"
                        style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}
                      >
                        <CheckCircle size={11} /> Salvo como lead
                      </span>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item._maps && (
                      <a
                        href={item._maps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg transition-colors"
                        style={{ background: "var(--bg-elevated)", color: "var(--text-3)" }}
                        title="Ver no Google Maps"
                      >
                        <MapPin size={16} />
                      </a>
                    )}

                    {item.whatsapp && (
                      <a
                        href={`https://wa.me/55${item.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg transition-colors"
                        style={{ background: "rgba(37,211,102,0.1)", color: "#25D366" }}
                        title="Abrir WhatsApp"
                      >
                        <WhatsappLogo size={16} />
                      </a>
                    )}

                    <button
                      onClick={() => gerarProposta(item, idx)}
                      disabled={state.gerandoProposta}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: "rgba(65,190,234,0.1)",
                        color:      "var(--cyan)",
                        border:     "1px solid rgba(65,190,234,0.2)",
                        opacity:    state.gerandoProposta ? 0.6 : 1,
                      }}
                    >
                      {state.gerandoProposta
                        ? <ArrowsClockwise size={13} className="animate-spin" />
                        : <PaperPlaneTilt size={13} />}
                      {state.gerandoProposta ? "Gerando..." : "Gerar proposta"}
                    </button>

                    {!state.salvo && (
                      <button
                        onClick={() => salvarLead(item, idx)}
                        disabled={state.salvando}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: state.salvando ? "rgba(65,190,234,0.3)" : "var(--cyan)",
                          color:      "#0a0f0a",
                          opacity:    state.salvando ? 0.7 : 1,
                        }}
                      >
                        {state.salvando
                          ? <ArrowsClockwise size={13} className="animate-spin" />
                          : <UserPlus size={13} />}
                        {state.salvando ? "Salvando..." : "Salvar lead"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Linha 2: info */}
                <div className="flex items-center gap-5 flex-wrap text-xs" style={{ color: "var(--text-3)" }}>
                  {item.whatsapp && (
                    <span className="flex items-center gap-1.5">
                      <Phone size={13} />
                      {item.whatsapp}
                    </span>
                  )}
                  {item._avaliacao && (
                    <span className="flex items-center gap-1.5">
                      <Star size={13} />
                      {item._avaliacao}
                    </span>
                  )}
                  {item._endereco && (
                    <span className="flex items-center gap-1.5 max-w-sm truncate">
                      <MapPin size={13} />
                      {item._endereco}
                    </span>
                  )}
                </div>

                {/* Proposta gerada */}
                {state.proposta && (
                  <div
                    className="rounded-xl p-4 text-sm space-y-3"
                    style={{
                      background: "var(--bg-elevated)",
                      border:     "1px solid rgba(65,190,234,0.15)",
                      color:      "var(--text-2)",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {/* Header da proposta */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: "var(--cyan)" }}>
                          Mensagem WhatsApp gerada pela IA
                        </span>
                        {state.produto && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: state.produto === "landing-page"
                                ? "rgba(168,85,247,0.12)" : "rgba(65,190,234,0.1)",
                              color: state.produto === "landing-page" ? "#A855F7" : "var(--cyan)",
                              border: state.produto === "landing-page"
                                ? "1px solid rgba(168,85,247,0.25)" : "1px solid rgba(65,190,234,0.2)",
                            }}
                          >
                            {state.produto === "landing-page" ? "🌐 Oferta: Landing Page" : "🤖 Oferta: Agente IA"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {state.demoUrl && (
                          <a
                            href={state.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                            style={{ background: "rgba(168,85,247,0.1)", color: "#A855F7", border: "1px solid rgba(168,85,247,0.2)" }}
                          >
                            <Globe size={13} /> Ver demo
                          </a>
                        )}
                        {item.whatsapp && (
                          <a
                            href={`https://wa.me/55${item.whatsapp}?text=${encodeURIComponent(state.proposta)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                            style={{ background: "rgba(37,211,102,0.15)", color: "#22C55E" }}
                          >
                            <WhatsappLogo size={13} /> Enviar agora
                          </a>
                        )}
                      </div>
                    </div>
                    {state.proposta}
                    {/* Link da demo inline na mensagem */}
                    {state.demoUrl && (
                      <div
                        className="text-xs mt-1 pt-2 flex items-center gap-1.5"
                        style={{ borderTop: "1px solid rgba(65,190,234,0.1)", color: "var(--text-3)" }}
                      >
                        <Globe size={11} />
                        Demo para incluir na mensagem:{" "}
                        <span style={{ color: "var(--cyan)" }}>{state.demoUrl}</span>
                      </div>
                    )}
                  </div>
                )}

                {state.erro && (
                  <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
                    {state.erro}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Estado vazio */}
      {!loading && resultados.length === 0 && !erro && (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}
        >
          <MagnifyingGlass size={40} className="mx-auto mb-3" style={{ color: "var(--text-3)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
            Configure a busca e clique em <strong>Buscar</strong>
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
            O Apify vai buscar no Google Maps e filtrar clínicas sem site com WhatsApp ativo.
          </p>
        </div>
      )}
    </div>
  );
}
