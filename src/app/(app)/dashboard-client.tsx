"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, Fire, Thermometer, Snowflake, TrendUp, CurrencyCircleDollar } from "@phosphor-icons/react";
import type { Lead } from "@/types/database";
import { ClassificacaoBadge } from "@/components/shared/ClassificacaoBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  leads: Lead[];
  clientes: { valor_contrato: number | null; status: string | null }[];
}

const CLASSIFICACAO_COLORS: Record<string, string> = {
  Quente: "#EF4444",
  Morno: "#F59E0B",
  Frio: "#3B82F6",
  Desqualificado: "#6B7280",
};

export function DashboardClient({ leads, clientes }: Props) {
  const stats = useMemo(() => {
    const total = leads.length;
    const quente = leads.filter((l) => l.classificacao === "Quente").length;
    const morno = leads.filter((l) => l.classificacao === "Morno").length;
    const frio = leads.filter((l) => l.classificacao === "Frio").length;
    const scoreMedia =
      leads.length > 0
        ? Math.round(leads.reduce((acc, l) => acc + (l.pontuacao ?? 0), 0) / leads.length)
        : 0;
    const fechados = leads.filter((l) => l.status === "Fechado Ganho").length;
    const taxaConversao = total > 0 ? Math.round((fechados / total) * 100) : 0;
    const receitaPipeline = clientes.reduce((acc, c) => acc + (c.valor_contrato ?? 0), 0);

    return { total, quente, morno, frio, scoreMedia, taxaConversao, receitaPipeline };
  }, [leads, clientes]);

  const segmentoData = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => {
      if (l.segmento) map[l.segmento] = (map[l.segmento] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [leads]);

  const classificacaoPieData = useMemo(() => {
    return [
      { name: "Quente", value: stats.quente },
      { name: "Morno", value: stats.morno },
      { name: "Frio", value: stats.frio },
      { name: "Desqualificado", value: Math.max(0, leads.length - stats.quente - stats.morno - stats.frio) },
    ].filter((d) => {
      if ("value" in d) return d.value > 0;
      return false;
    }) as { name: string; value: number }[];
  }, [stats, leads.length]);

  const ultimosLeads = leads.slice(0, 5);

  const metricCards = [
    {
      label: "Total de Leads",
      value: stats.total,
      icon: Users,
      color: "var(--cyan)",
      glow: "rgba(65,190,234,0.15)",
    },
    {
      label: "Leads Quentes",
      value: stats.quente,
      icon: Fire,
      color: "#EF4444",
      glow: "rgba(239,68,68,0.15)",
    },
    {
      label: "Leads Mornos",
      value: stats.morno,
      icon: Thermometer,
      color: "#F59E0B",
      glow: "rgba(245,158,11,0.15)",
    },
    {
      label: "Leads Frios",
      value: stats.frio,
      icon: Snowflake,
      color: "#3B82F6",
      glow: "rgba(59,130,246,0.15)",
    },
    {
      label: "Score Médio",
      value: stats.scoreMedia,
      icon: TrendUp,
      color: "#22C55E",
      glow: "rgba(34,197,94,0.15)",
    },
    {
      label: "Receita em Pipeline",
      value: `R$ ${stats.receitaPipeline.toLocaleString("pt-BR")}`,
      icon: CurrencyCircleDollar,
      color: "#8B5CF6",
      glow: "rgba(139,92,246,0.15)",
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1600px]">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: "var(--ff-head)", letterSpacing: "-0.02em" }}
        >
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
          Visão geral dos seus leads e pipeline comercial
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map(({ label, value, icon: Icon, color, glow }) => (
          <div
            key={label}
            className="rounded-2xl p-5 flex flex-col gap-3"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-dim)",
              transition: "border-color 200ms, box-shadow 200ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = color;
              (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 24px ${glow}`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-dim)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: glow }}
            >
              <Icon size={20} weight="duotone" style={{ color }} />
            </div>
            <div>
              <p
                className="text-2xl font-bold leading-none"
                style={{ fontFamily: "var(--ff-head)", color }}
              >
                {value}
              </p>
              <p
                className="text-xs mt-1.5 leading-tight"
                style={{ color: "var(--text-3)", fontFamily: "var(--ff-body)" }}
              >
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads por segmento */}
        <div
          className="lg:col-span-2 rounded-2xl p-6"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}
        >
          <h2
            className="text-base font-semibold text-white mb-6"
            style={{ fontFamily: "var(--ff-head)" }}
          >
            Leads por Segmento
          </h2>
          {segmentoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={segmentoData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(65,190,234,0.08)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--text-3)", fontSize: 11, fontFamily: "var(--ff-body)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-3)", fontSize: 11, fontFamily: "var(--ff-body)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-mid)",
                    borderRadius: "12px",
                    color: "var(--text-1)",
                    fontFamily: "var(--ff-body)",
                    fontSize: 12,
                  }}
                  cursor={{ fill: "rgba(65,190,234,0.05)" }}
                />
                <Bar dataKey="value" fill="url(#gradBar)" radius={[6, 6, 0, 0]} name="Leads" />
                <defs>
                  <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#41BEEA" />
                    <stop offset="100%" stopColor="#2E59A6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>

        {/* Classificação */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}
        >
          <h2
            className="text-base font-semibold text-white mb-6"
            style={{ fontFamily: "var(--ff-head)" }}
          >
            Por Classificação
          </h2>
          {classificacaoPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={classificacaoPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {classificacaoPieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={CLASSIFICACAO_COLORS[entry.name] ?? "#6B7280"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-mid)",
                      borderRadius: "12px",
                      fontFamily: "var(--ff-body)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {classificacaoPieData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: CLASSIFICACAO_COLORS[entry.name] }}
                      />
                      <span className="text-xs" style={{ color: "var(--text-2)" }}>
                        {entry.name}
                      </span>
                    </div>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: CLASSIFICACAO_COLORS[entry.name] }}
                    >
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>

      {/* Últimos leads */}
      <div
        className="rounded-2xl"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}
      >
        <div
          className="px-6 py-4"
          style={{ borderBottom: "1px solid var(--border-dim)" }}
        >
          <h2
            className="text-base font-semibold text-white"
            style={{ fontFamily: "var(--ff-head)" }}
          >
            Últimos Leads Recebidos
          </h2>
        </div>
        {ultimosLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  {["Nome", "Segmento", "Pontuação", "Classificação", "Status", "Recebido em"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-3)", fontFamily: "var(--ff-body)" }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {ultimosLeads.map((lead) => (
                  <tr
                    key={lead.id}
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
                      <p className="font-medium text-white">{lead.nome ?? "—"}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                        {lead.whatsapp ?? ""}
                      </p>
                    </td>
                    <td className="px-6 py-4" style={{ color: "var(--text-2)" }}>
                      {lead.segmento ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="font-bold text-base"
                        style={{ fontFamily: "var(--ff-head)", color: "var(--cyan)" }}
                      >
                        {lead.pontuacao ?? "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <ClassificacaoBadge classificacao={lead.classificacao} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-6 py-4 text-xs" style={{ color: "var(--text-3)" }}>
                      {format(new Date(lead.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center" style={{ color: "var(--text-3)" }}>
            <Users size={40} weight="duotone" className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum lead recebido ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div
      className="h-[200px] flex items-center justify-center rounded-xl"
      style={{ background: "rgba(65,190,234,0.03)", border: "1px dashed var(--border-dim)" }}
    >
      <p className="text-sm" style={{ color: "var(--text-3)" }}>
        Sem dados ainda
      </p>
    </div>
  );
}
