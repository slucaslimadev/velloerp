"use client";

import { useState, useMemo } from "react";
import {
  MagnifyingGlass, Briefcase, CurrencyCircleDollar, Users, Plus, X,
  WhatsappLogo, EnvelopeSimple, Phone, Buildings, CalendarBlank,
  CurrencyDollar, Tag,
} from "@phosphor-icons/react";
import type { Cliente } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LIST = ["Ativo", "Pausado", "Encerrado"];
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Ativo:     { bg: "rgba(34,197,94,0.12)",  color: "#22C55E" },
  Pausado:   { bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
  Encerrado: { bg: "rgba(239,68,68,0.12)",  color: "#EF4444" },
};

const inputCls = "w-full rounded-xl px-3 py-2 text-sm outline-none";
const inputStyle = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-dim)",
  color: "var(--text-1)",
  fontFamily: "var(--ff-body)",
};

interface FormState {
  nome: string; empresa: string; segmento: string; whatsapp: string;
  email: string; valor_contrato: string; data_inicio: string; status: string;
}

const DEFAULT_FORM: FormState = {
  nome: "", empresa: "", segmento: "", whatsapp: "",
  email: "", valor_contrato: "", data_inicio: "", status: "Ativo",
};

export function ClientesClient({ clientes: initialClientes }: { clientes: Cliente[] }) {
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes);
  const [search, setSearch] = useState("");
  const [showNovoCliente, setShowNovoCliente] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [salvando, setSalvando] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      c.nome?.toLowerCase().includes(q) || c.empresa?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) || c.segmento?.toLowerCase().includes(q)
    );
  }, [clientes, search]);

  const receitaTotal = useMemo(() => clientes.reduce((acc, c) => acc + (c.valor_contrato ?? 0), 0), [clientes]);
  const ativos = clientes.filter((c) => c.status === "Ativo").length;

  async function salvarNovoCliente() {
    setSalvando(true);
    const supabase = createClient();
    const payload: Partial<Cliente> = {
      nome: form.nome || null,
      empresa: form.empresa || null,
      segmento: form.segmento || null,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      valor_contrato: form.valor_contrato ? Number(form.valor_contrato) : null,
      data_inicio: form.data_inicio || null,
      status: form.status || null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("clientes") as any).insert(payload).select().single();
    if (!error && data) {
      setClientes((prev) => [data as Cliente, ...prev]);
      setShowNovoCliente(false);
      setForm(DEFAULT_FORM);
    }
    setSalvando(false);
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--ff-head)", letterSpacing: "-0.02em" }}>Clientes</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>Leads convertidos em clientes</p>
        </div>
        <button
          onClick={() => setShowNovoCliente(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold mt-1"
          style={{ background: "var(--cyan)", color: "#0a0d14", fontFamily: "var(--ff-body)", cursor: "pointer" }}>
          <Plus size={16} weight="bold" /> Novo Cliente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total de Clientes", value: clientes.length, icon: <Users size={20} weight="duotone" style={{ color: "var(--cyan)" }} />, glow: "rgba(65,190,234,0.15)", color: "var(--cyan)" },
          { label: "Clientes Ativos", value: ativos, icon: <Briefcase size={20} weight="duotone" style={{ color: "#22C55E" }} />, glow: "rgba(34,197,94,0.15)", color: "#22C55E" },
          { label: "Receita Total", value: `R$ ${receitaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: <CurrencyCircleDollar size={20} weight="duotone" style={{ color: "#8B5CF6" }} />, glow: "rgba(139,92,246,0.15)", color: "#8B5CF6" },
        ].map(({ label, value, icon, glow, color }) => (
          <div key={label} className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: glow }}>{icon}</div>
            <div>
              <p className="text-2xl font-bold leading-none" style={{ fontFamily: "var(--ff-head)", color }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 max-w-sm" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
        <MagnifyingGlass size={16} style={{ color: "var(--text-3)" }} />
        <input type="text" placeholder="Buscar por nome, empresa, e-mail..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--text-1)", fontFamily: "var(--ff-body)" }} />
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                {["Nome", "Empresa", "Segmento", "Contato", "Valor do Contrato", "Início", "Status"].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-3)", fontFamily: "var(--ff-body)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Briefcase size={40} weight="duotone" className="mx-auto mb-3 opacity-30" style={{ color: "var(--text-3)" }} />
                    <p className="text-sm" style={{ color: "var(--text-3)" }}>
                      {clientes.length === 0 ? "Nenhum cliente cadastrado ainda." : "Nenhum cliente encontrado."}
                    </p>
                  </td>
                </tr>
              ) : filtered.map((cliente) => {
                const sc = STATUS_COLORS[cliente.status ?? ""] ?? { bg: "rgba(107,114,128,0.12)", color: "#6B7280" };
                return (
                  <tr
                    key={cliente.id}
                    onClick={() => setSelectedCliente(cliente)}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid rgba(65,190,234,0.05)", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(65,190,234,0.04)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">{cliente.nome ?? "—"}</p>
                      {cliente.whatsapp && <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{cliente.whatsapp}</p>}
                    </td>
                    <td className="px-6 py-4" style={{ color: "var(--text-2)" }}>{cliente.empresa ?? "—"}</td>
                    <td className="px-6 py-4" style={{ color: "var(--text-2)" }}>{cliente.segmento ?? "—"}</td>
                    <td className="px-6 py-4 text-xs" style={{ color: "var(--text-3)" }}>{cliente.email ?? "—"}</td>
                    <td className="px-6 py-4">
                      {cliente.valor_contrato
                        ? <span className="font-bold" style={{ fontFamily: "var(--ff-head)", color: "#22C55E" }}>R$ {cliente.valor_contrato.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        : <span style={{ color: "var(--text-3)" }}>—</span>}
                    </td>
                    <td className="px-6 py-4 text-xs" style={{ color: "var(--text-3)" }}>
                      {cliente.data_inicio ? format(new Date(cliente.data_inicio), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {cliente.status
                        ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: sc.bg, color: sc.color }}>{cliente.status}</span>
                        : <span style={{ color: "var(--text-3)" }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Detalhe do Cliente */}
      {selectedCliente && (() => {
        const c = selectedCliente;
        const sc = STATUS_COLORS[c.status ?? ""] ?? { bg: "rgba(107,114,128,0.12)", color: "#6B7280" };
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && setSelectedCliente(null)}
          >
            <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)" }}>
              {/* Header */}
              <div className="flex items-start justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                <div>
                  <h2 className="text-lg font-bold text-white" style={{ fontFamily: "var(--ff-head)" }}>
                    {c.nome ?? "Cliente"}
                  </h2>
                  {c.empresa && <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>{c.empresa}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {c.status && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: sc.bg, color: sc.color }}>
                      {c.status}
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedCliente(null)}
                    style={{ color: "var(--text-3)", cursor: "pointer" }}
                    className="p-1 rounded-lg hover:opacity-70 transition-opacity"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: <Buildings size={15} />, label: "Segmento", value: c.segmento },
                    { icon: <CalendarBlank size={15} />, label: "Início", value: c.data_inicio ? format(new Date(c.data_inicio), "dd/MM/yyyy", { locale: ptBR }) : null },
                    { icon: <CurrencyDollar size={15} />, label: "Contrato", value: c.valor_contrato ? `R$ ${c.valor_contrato.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null },
                    { icon: <Tag size={15} />, label: "Status", value: c.status },
                  ].map(({ icon, label, value }) => value ? (
                    <div key={label} className="rounded-xl p-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
                      <div className="flex items-center gap-1.5 mb-1" style={{ color: "var(--text-3)" }}>
                        {icon}
                        <span className="text-xs">{label}</span>
                      </div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{value}</p>
                    </div>
                  ) : null)}
                </div>

                {/* Contact buttons */}
                <div className="space-y-2">
                  {c.whatsapp && (
                    <a
                      href={`https://wa.me/${c.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                      style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)", color: "#22C55E", cursor: "pointer", textDecoration: "none" }}
                    >
                      <WhatsappLogo size={18} weight="fill" />
                      {c.whatsapp}
                    </a>
                  )}
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                      style={{ background: "rgba(65,190,234,0.08)", border: "1px solid rgba(65,190,234,0.15)", color: "var(--cyan)", cursor: "pointer", textDecoration: "none" }}
                    >
                      <EnvelopeSimple size={18} />
                      {c.email}
                    </a>
                  )}
                  {!c.whatsapp && !c.email && (
                    <p className="text-sm text-center py-2" style={{ color: "var(--text-3)" }}>
                      <Phone size={16} className="inline mr-1" />
                      Nenhum contato cadastrado
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 flex justify-end" style={{ borderTop: "1px solid var(--border-dim)" }}>
                <button
                  onClick={() => setSelectedCliente(null)}
                  className="px-4 py-2 rounded-xl text-sm transition-opacity hover:opacity-70"
                  style={{ color: "var(--text-2)", background: "var(--bg-surface)", border: "1px solid var(--border-dim)", cursor: "pointer" }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Novo Cliente */}
      {showNovoCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setShowNovoCliente(false)}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)", maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
              <h2 className="text-base font-semibold" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>Novo Cliente</h2>
              <button onClick={() => setShowNovoCliente(false)} style={{ color: "var(--text-3)", cursor: "pointer" }}><X size={18} /></button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Nome *">
                  <input className={inputCls} style={inputStyle} placeholder="João Silva"
                    value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </FormField>
                <FormField label="Empresa">
                  <input className={inputCls} style={inputStyle} placeholder="Empresa Ltda"
                    value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
                </FormField>
                <FormField label="Segmento">
                  <input className={inputCls} style={inputStyle} placeholder="Tecnologia, Varejo..."
                    value={form.segmento} onChange={(e) => setForm({ ...form, segmento: e.target.value })} />
                </FormField>
                <FormField label="WhatsApp">
                  <input className={inputCls} style={inputStyle} placeholder="5561999999999"
                    value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                </FormField>
                <FormField label="E-mail">
                  <input className={inputCls} style={inputStyle} type="email" placeholder="joao@empresa.com"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </FormField>
                <FormField label="Valor do contrato (R$)">
                  <input className={inputCls} style={inputStyle} type="number" min={0} placeholder="5000"
                    value={form.valor_contrato} onChange={(e) => setForm({ ...form, valor_contrato: e.target.value })} />
                </FormField>
                <FormField label="Data de início">
                  <input className={inputCls} style={{ ...inputStyle, colorScheme: "dark" }} type="date"
                    value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
                </FormField>
                <FormField label="Status">
                  <select className={inputCls} style={{ ...inputStyle, cursor: "pointer" }} value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
              </div>
            </div>

            <div className="px-6 py-4 flex justify-end gap-3 flex-shrink-0" style={{ borderTop: "1px solid var(--border-dim)" }}>
              <button onClick={() => setShowNovoCliente(false)}
                className="px-4 py-2 rounded-xl text-sm transition-opacity hover:opacity-70"
                style={{ color: "var(--text-2)", background: "var(--bg-surface)", border: "1px solid var(--border-dim)", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={salvarNovoCliente} disabled={!form.nome.trim() || salvando}
                className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--cyan)", color: "#0a0d14", cursor: "pointer" }}>
                {salvando ? "Salvando..." : "Salvar Cliente"}
              </button>
            </div>
          </div>
        </div>
      )}
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
