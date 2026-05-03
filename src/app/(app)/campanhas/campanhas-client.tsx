"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  CurrencyDollar, Users, TrendAt, ChartBar, ArrowsClockwise,
  Play, Pause, Warning,
} from "@phosphor-icons/react";

interface Insight {
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  cpm: string;
  spend: string;
  actions?: { action_type: string; value: string }[];
  cost_per_action_type?: { action_type: string; value: string }[];
}

interface Campanha {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
  insights?: { data: Insight[] };
}

const PRESETS = [
  { value: "last_7d",  label: "7 dias"  },
  { value: "last_14d", label: "14 dias" },
  { value: "last_30d", label: "30 dias" },
  { value: "last_90d", label: "90 dias" },
];

function getLeads(insight: Insight) {
  return Number(
    insight.actions?.find((a) => a.action_type === "lead")?.value ?? 0
  );
}

function getCPL(insight: Insight) {
  const val = insight.cost_per_action_type?.find(
    (a) => a.action_type === "lead"
  )?.value;
  return val ? Number(val) : null;
}

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function num(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function StatusBadge({ status }: { status: Campanha["status"] }) {
  const map = {
    ACTIVE:   { label: "Ativo",    color: "#22C55E", bg: "rgba(34,197,94,0.12)"   },
    PAUSED:   { label: "Pausado",  color: "#F59E0B", bg: "rgba(245,158,11,0.12)"  },
    DELETED:  { label: "Excluído", color: "#EF4444", bg: "rgba(239,68,68,0.12)"   },
    ARCHIVED: { label: "Arquivado",color: "#6B7280", bg: "rgba(107,114,128,0.12)" },
  };
  const s = map[status] ?? map.ARCHIVED;
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700, padding: "2px 8px",
      borderRadius: 6, whiteSpace: "nowrap",
    }}>
      {status === "ACTIVE" ? <Play size={9} weight="fill" style={{ display: "inline", marginRight: 3 }} /> : <Pause size={9} weight="fill" style={{ display: "inline", marginRight: 3 }} />}
      {s.label}
    </span>
  );
}

function KpiCard({
  icon, label, value, sub, color = "var(--cyan)",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl p-5 flex items-start gap-4"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium mb-1" style={{ color: "var(--text-3)", fontFamily: "var(--ff-body)" }}>{label}</p>
        <p className="text-xl font-bold leading-tight" style={{ fontFamily: "var(--ff-head)", color: "var(--text-1)" }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{sub}</p>}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-sm"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)", color: "var(--text-1)" }}>
      <p className="font-semibold mb-1 truncate max-w-[180px]">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {brl(p.value)}
        </p>
      ))}
    </div>
  );
}

export function CampanhasClient({ campanhasIniciais }: { campanhasIniciais: Campanha[] }) {
  const [campanhas, setCampanhas] = useState<Campanha[]>(campanhasIniciais);
  const [preset, setPreset] = useState("last_30d");
  const [loading, setLoading] = useState(false);

  async function trocarPreset(p: string) {
    setPreset(p);
    setLoading(true);
    try {
      const res = await fetch(`/api/meta/campanhas?preset=${p}`);
      const data = await res.json();
      if (Array.isArray(data)) setCampanhas(data);
    } finally {
      setLoading(false);
    }
  }

  const totais = useMemo(() => {
    let spend = 0, leads = 0, impressions = 0, clicks = 0;
    for (const c of campanhas) {
      const ins = c.insights?.data[0];
      if (!ins) continue;
      spend       += Number(ins.spend ?? 0);
      leads       += getLeads(ins);
      impressions += Number(ins.impressions ?? 0);
      clicks      += Number(ins.clicks ?? 0);
    }
    const cpl = leads > 0 ? spend / leads : 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    return { spend, leads, cpl, impressions, ctr };
  }, [campanhas]);

  const chartData = useMemo(() =>
    campanhas
      .filter((c) => c.insights?.data[0])
      .map((c) => ({
        name: c.name.length > 22 ? c.name.slice(0, 22) + "…" : c.name,
        fullName: c.name,
        Investimento: Number(c.insights!.data[0].spend ?? 0),
        status: c.status,
      }))
      .sort((a, b) => b.Investimento - a.Investimento),
    [campanhas]
  );

  const semDados = campanhas.every((c) => !c.insights?.data[0]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--ff-head)", color: "var(--text-1)" }}>
            Campanhas Meta Ads
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>
            Desempenho das suas campanhas no Facebook e Instagram
          </p>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <ArrowsClockwise size={16} className="animate-spin" style={{ color: "var(--cyan)" }} />
          )}
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-dim)" }}>
            {PRESETS.map((p) => (
              <button key={p.value}
                onClick={() => trocarPreset(p.value)}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: preset === p.value ? "rgba(65,190,234,0.15)" : "var(--bg-surface)",
                  color: preset === p.value ? "var(--cyan)" : "var(--text-3)",
                  fontFamily: "var(--ff-body)",
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<CurrencyDollar size={20} weight="duotone" />}
          label="Investimento total"
          value={brl(totais.spend)}
          color="var(--cyan)"
        />
        <KpiCard
          icon={<Users size={20} weight="duotone" />}
          label="Leads gerados"
          value={num(totais.leads)}
          sub={totais.leads > 0 ? `CPL médio ${brl(totais.cpl)}` : "Sem leads no período"}
          color="#22C55E"
        />
        <KpiCard
          icon={<TrendAt size={20} weight="duotone" />}
          label="CTR médio"
          value={`${totais.ctr.toFixed(2)}%`}
          sub={`${num(totais.clicks)} cliques`}
          color="#A78BFA"
        />
        <KpiCard
          icon={<ChartBar size={20} weight="duotone" />}
          label="Impressões"
          value={num(totais.impressions)}
          color="#F59E0B"
        />
      </div>

      {/* Chart */}
      {!semDados && chartData.length > 0 && (
        <div className="rounded-2xl p-5"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
          <p className="text-sm font-semibold mb-4"
            style={{ fontFamily: "var(--ff-head)", color: "var(--text-1)" }}>
            Investimento por campanha
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={32}>
              <XAxis dataKey="name" tick={{ fill: "var(--text-3)", fontSize: 11 }}
                axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `R$${v}`}
                tick={{ fill: "var(--text-3)", fontSize: 11 }}
                axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(65,190,234,0.05)" }} />
              <Bar dataKey="Investimento" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i}
                    fill={entry.status === "ACTIVE" ? "var(--cyan)" : "var(--text-3)"}
                    fillOpacity={entry.status === "ACTIVE" ? 1 : 0.4}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <p className="text-sm font-semibold"
            style={{ fontFamily: "var(--ff-head)", color: "var(--text-1)" }}>
            Campanhas ({campanhas.length})
          </p>
        </div>

        {campanhas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Warning size={32} style={{ color: "var(--text-3)" }} />
            <p className="text-sm" style={{ color: "var(--text-3)" }}>Nenhuma campanha encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  {["Campanha", "Status", "Investimento", "Leads", "CPL", "Impressões", "Cliques", "CTR"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold"
                      style={{ color: "var(--text-3)", fontFamily: "var(--ff-body)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campanhas.map((c) => {
                  const ins = c.insights?.data[0];
                  const leads = ins ? getLeads(ins) : 0;
                  const cpl = ins ? getCPL(ins) : null;
                  return (
                    <tr key={c.id}
                      style={{ borderBottom: "1px solid var(--border-dim)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(65,190,234,0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td className="px-5 py-4 font-medium max-w-xs">
                        <p className="truncate" style={{ color: "var(--text-1)" }}>{c.name}</p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-4 font-semibold" style={{ color: "var(--cyan)", whiteSpace: "nowrap" }}>
                        {ins ? brl(Number(ins.spend)) : "—"}
                      </td>
                      <td className="px-5 py-4 font-semibold" style={{ color: "#22C55E" }}>
                        {ins ? num(leads) : "—"}
                      </td>
                      <td className="px-5 py-4" style={{ color: "var(--text-2)", whiteSpace: "nowrap" }}>
                        {ins && cpl ? brl(cpl) : ins && leads === 0 ? "—" : "—"}
                      </td>
                      <td className="px-5 py-4" style={{ color: "var(--text-2)", whiteSpace: "nowrap" }}>
                        {ins ? num(Number(ins.impressions)) : "—"}
                      </td>
                      <td className="px-5 py-4" style={{ color: "var(--text-2)" }}>
                        {ins ? num(Number(ins.clicks)) : "—"}
                      </td>
                      <td className="px-5 py-4" style={{ color: "var(--text-2)" }}>
                        {ins ? `${Number(ins.ctr).toFixed(2)}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {semDados && campanhas.length > 0 && (
        <div className="rounded-2xl p-6 flex items-center gap-3"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <Warning size={20} style={{ color: "#F59E0B" }} />
          <p className="text-sm" style={{ color: "#F59E0B" }}>
            Campanhas encontradas mas sem dados de desempenho para o período selecionado.
            Tente um período maior ou aguarde as campanhas acumularem impressões.
          </p>
        </div>
      )}
    </div>
  );
}
