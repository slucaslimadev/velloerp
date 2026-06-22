"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Robot, Plus, X, ChatCircleDots, CalendarCheck, CurrencyDollar,
  CaretRight, CheckCircle, PauseCircle,
} from "@phosphor-icons/react";
import type { AgenteComStats } from "./page";

export function AgentesClientesClient({ initialAgentes }: { initialAgentes: AgenteComStats[] }) {
  const router = useRouter();
  const [agentes] = useState(initialAgentes);
  const [showNovo, setShowNovo] = useState(false);
  const [nome, setNome] = useState("");
  const [instance, setInstance] = useState("");
  const [segmento, setSegmento] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");

  async function criar() {
    setErro("");
    if (!nome.trim() || !instance.trim()) {
      setErro("Preencha nome e instância.");
      return;
    }
    setCriando(true);
    try {
      const res = await fetch("/api/agentes-clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), instance_evolution: instance.trim(), segmento: segmento.trim() }),
      });
      const json = await res.json();
      if (json.error) { setErro(json.error); return; }
      if (json.instancia && json.instancia.ok === false) {
        setErro(`Agente criado, mas a instância falhou: ${json.instancia.erro}. Crie a instância depois no painel do agente.`);
        setNome(""); setInstance(""); setSegmento("");
        router.refresh();
        return;
      }
      setShowNovo(false);
      setNome(""); setInstance(""); setSegmento("");
      router.refresh();
    } finally {
      setCriando(false);
    }
  }

  const inputStyle = {
    background: "var(--bg-surface)",
    border: "1px solid var(--border-dim)",
    color: "var(--text-1)",
    fontFamily: "var(--ff-body)",
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-vello p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--ff-head)", letterSpacing: "-0.02em" }}>
            Agentes de Clientes
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
            Agentes de IA ativos em clientes · métricas e configuração
          </p>
        </div>
        <button onClick={() => setShowNovo(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm"
          style={{ background: "var(--cyan)", color: "#0a0d14", fontFamily: "var(--ff-body)" }}>
          <Plus size={16} weight="bold" /> Novo Agente
        </button>
      </div>

      {/* Lista */}
      {agentes.length === 0 ? (
        <div className="rounded-2xl py-16 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
          <Robot size={40} style={{ color: "var(--text-3)" }} className="mx-auto mb-3" />
          <p className="text-sm" style={{ color: "var(--text-3)" }}>Nenhum agente de cliente cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agentes.map((a) => (
            <Link key={a.id} href={`/agentes-clientes/${a.id}`}
              className="rounded-2xl p-5 transition-all hover:-translate-y-0.5 group"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: "rgba(65,190,234,0.1)" }}>
                    {a.emoji}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm" style={{ fontFamily: "var(--ff-head)" }}>{a.nome}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{a.segmento || a.modelo}</p>
                  </div>
                </div>
                <CaretRight size={16} style={{ color: "var(--text-3)" }} className="group-hover:translate-x-0.5 transition-transform" />
              </div>

              <div className="flex items-center gap-1.5 mb-4">
                {a.ativo ? (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md" style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}>
                    <CheckCircle size={12} weight="fill" /> Ativo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md" style={{ background: "rgba(107,114,128,0.12)", color: "var(--text-3)" }}>
                    <PauseCircle size={12} weight="fill" /> Pausado
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: "var(--bg-elevated)", color: "var(--text-3)" }}>
                  {a.modelo}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Stat icon={<ChatCircleDots size={14} />} label="Conversas" value={a.total_conversas} />
                <Stat icon={<CalendarCheck size={14} />} label="Agendados" value={a.total_agendamentos} />
                <Stat icon={<CurrencyDollar size={14} />} label="Custo" value={`$${a.custo_total.toFixed(2)}`} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal novo */}
      {showNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setShowNovo(false)}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-dim)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>Novo Agente de Cliente</h2>
              <button onClick={() => setShowNovo(false)} style={{ color: "var(--text-3)" }}><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <Field label="Nome do cliente *">
                <input className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
                  placeholder="Estética Silva" value={nome} onChange={(e) => setNome(e.target.value)} />
              </Field>
              <Field label="Instância na Evolution API *">
                <input className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
                  placeholder="estetica-silva" value={instance} onChange={(e) => setInstance(e.target.value)} />
                <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
                  A instância é criada na Evolution automaticamente e o webhook do agente é registrado.
                </p>
              </Field>
              <Field label="Segmento">
                <input className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
                  placeholder="Estética e Beleza" value={segmento} onChange={(e) => setSegmento(e.target.value)} />
              </Field>
              {erro && <p className="text-xs" style={{ color: "#EF4444" }}>{erro}</p>}
            </div>
            <div className="px-5 py-4 flex justify-end gap-3" style={{ borderTop: "1px solid var(--border-dim)" }}>
              <button onClick={() => setShowNovo(false)} className="px-4 py-2 rounded-xl text-sm"
                style={{ color: "var(--text-2)", background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>Cancelar</button>
              <button onClick={criar} disabled={criando}
                className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--cyan)", color: "#0a0d14" }}>
                {criando ? "Criando..." : "Criar Agente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg px-2 py-2" style={{ background: "var(--bg-base)" }}>
      <div className="flex items-center gap-1 mb-0.5" style={{ color: "var(--text-3)" }}>
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="text-sm font-bold" style={{ color: "var(--cyan)" }}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>{label}</label>
      {children}
    </div>
  );
}
