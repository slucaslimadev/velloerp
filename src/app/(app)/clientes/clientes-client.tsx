"use client";

import { useState, useMemo } from "react";
import { MagnifyingGlass, Briefcase, CurrencyCircleDollar, Users } from "@phosphor-icons/react";
import type { Cliente } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  clientes: Cliente[];
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Ativo:     { bg: "rgba(34,197,94,0.12)",  color: "#22C55E" },
  Pausado:   { bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
  Encerrado: { bg: "rgba(239,68,68,0.12)",  color: "#EF4444" },
};

export function ClientesClient({ clientes }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nome?.toLowerCase().includes(q) ||
        c.empresa?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.segmento?.toLowerCase().includes(q)
    );
  }, [clientes, search]);

  const receitaTotal = useMemo(
    () => clientes.reduce((acc, c) => acc + (c.valor_contrato ?? 0), 0),
    [clientes]
  );

  const ativos = clientes.filter((c) => c.status === "Ativo").length;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1400px]">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: "var(--ff-head)", letterSpacing: "-0.02em" }}
        >
          Clientes
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
          Leads convertidos em clientes
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Total de Clientes",
            value: clientes.length,
            icon: <Users size={20} weight="duotone" style={{ color: "var(--cyan)" }} />,
            glow: "rgba(65,190,234,0.15)",
            color: "var(--cyan)",
          },
          {
            label: "Clientes Ativos",
            value: ativos,
            icon: <Briefcase size={20} weight="duotone" style={{ color: "#22C55E" }} />,
            glow: "rgba(34,197,94,0.15)",
            color: "#22C55E",
          },
          {
            label: "Receita Total",
            value: `R$ ${receitaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            icon: <CurrencyCircleDollar size={20} weight="duotone" style={{ color: "#8B5CF6" }} />,
            glow: "rgba(139,92,246,0.15)",
            color: "#8B5CF6",
          },
        ].map(({ label, value, icon, glow, color }) => (
          <div
            key={label}
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-dim)",
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: glow }}
            >
              {icon}
            </div>
            <div>
              <p
                className="text-2xl font-bold leading-none"
                style={{ fontFamily: "var(--ff-head)", color }}
              >
                {value}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 max-w-sm"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-dim)",
        }}
      >
        <MagnifyingGlass size={16} style={{ color: "var(--text-3)" }} />
        <input
          type="text"
          placeholder="Buscar por nome, empresa, e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--text-1)", fontFamily: "var(--ff-body)" }}
        />
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                {["Nome", "Empresa", "Segmento", "Contato", "Valor do Contrato", "Início", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-3)", fontFamily: "var(--ff-body)" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Briefcase
                      size={40}
                      weight="duotone"
                      className="mx-auto mb-3 opacity-30"
                      style={{ color: "var(--text-3)" }}
                    />
                    <p className="text-sm" style={{ color: "var(--text-3)" }}>
                      {clientes.length === 0
                        ? "Nenhum cliente cadastrado ainda."
                        : "Nenhum cliente encontrado."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((cliente) => {
                  const sc = STATUS_COLORS[cliente.status ?? ""] ?? {
                    bg: "rgba(107,114,128,0.12)",
                    color: "#6B7280",
                  };
                  return (
                    <tr
                      key={cliente.id}
                      className="transition-colors"
                      style={{ borderBottom: "1px solid rgba(65,190,234,0.05)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background =
                          "rgba(65,190,234,0.03)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                      }}
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{cliente.nome ?? "—"}</p>
                        {cliente.whatsapp && (
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                            {cliente.whatsapp}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4" style={{ color: "var(--text-2)" }}>
                        {cliente.empresa ?? "—"}
                      </td>
                      <td className="px-6 py-4" style={{ color: "var(--text-2)" }}>
                        {cliente.segmento ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-xs" style={{ color: "var(--text-3)" }}>
                        {cliente.email ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        {cliente.valor_contrato ? (
                          <span
                            className="font-bold"
                            style={{ fontFamily: "var(--ff-head)", color: "#22C55E" }}
                          >
                            R$ {cliente.valor_contrato.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-3)" }}>—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs" style={{ color: "var(--text-3)" }}>
                        {cliente.data_inicio
                          ? format(new Date(cliente.data_inicio), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        {cliente.status ? (
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: sc.bg, color: sc.color }}
                          >
                            {cliente.status}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-3)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
