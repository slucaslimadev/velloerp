"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  CurrencyDollar, Users, ChartLineUp, Eye, ArrowsClockwise,
  CaretDown, CaretRight, MegaphoneSimple, Warning,
} from "@phosphor-icons/react";

// ── Types ────────────────────────────────────────────────────────────────────

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

interface Item {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
  campaign_id?: string;
  adset_id?: string;
  insights?: { data: Insight[] };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const PRESETS = [
  { value: "last_7d",  label: "7 dias"  },
  { value: "last_14d", label: "14 dias" },
  { value: "last_30d", label: "30 dias" },
  { value: "last_90d", label: "90 dias" },
];

function getLeads(ins: Insight) {
  return Number(ins.actions?.find((a) => a.action_type === "lead")?.value ?? 0);
}
function getCPL(ins: Insight) {
  const v = ins.cost_per_action_type?.find((a) => a.action_type === "lead")?.value;
  return v ? Number(v) : null;
}
function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function num(v: number) {
  return new Intl.NumberFormat("pt-BR").format(v);
}

const STATUS_MAP = {
  ACTIVE:   { label: "Ativo",     color: "#22C55E", bg: "rgba(34,197,94,0.12)"    },
  PAUSED:   { label: "Pausado",   color: "#F59E0B", bg: "rgba(245,158,11,0.12)"   },
  DELETED:  { label: "Excluído",  color: "#EF4444", bg: "rgba(239,68,68,0.12)"    },
  ARCHIVED: { label: "Arquivado", color: "#6B7280", bg: "rgba(107,114,128,0.12)"  },
};

function StatusPill({ status }: { status: Item["status"] }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.ARCHIVED;
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-md"
      style={{ background: s.bg, color: s.color, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

// ── Sub-table: Anúncios ───────────────────────────────────────────────────────

function AdsTable({ campaignId, preset }: { campaignId: string; preset: string }) {
  const [ads, setAds] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);

  useMemo(() => {
    if (ads !== null) return;
    setLoading(true);
    fetch(`/api/meta/campanhas?nivel=ads&preset=${preset}`)
      .then((r) => r.json())
      .then((data: Item[]) => {
        setAds(Array.isArray(data) ? data.filter((a) => a.campaign_id === campaignId) : []);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, preset]);

  if (loading) return (
    <tr><td colSpan={8} className="px-8 py-4">
      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-3)" }}>
        <ArrowsClockwise size={13} className="animate-spin" />Carregando anúncios...
      </div>
    </td></tr>
  );

  if (!ads?.length) return (
    <tr><td colSpan={8} className="px-8 py-3">
      <p className="text-xs" style={{ color: "var(--text-3)" }}>Sem dados de anúncios para este período.</p>
    </td></tr>
  );

  return (
    <>
      <tr><td colSpan={8} className="px-8 pt-3 pb-1">
        <p className="text-xs font-semibold" style={{ color: "var(--text-3)" }}>ANÚNCIOS</p>
      </td></tr>
      {ads.map((ad) => {
        const ins = ad.insights?.data[0];
        const leads = ins ? getLeads(ins) : 0;
        const cpl   = ins ? getCPL(ins)   : null;
        return (
          <tr key={ad.id}
            style={{ background: "rgba(65,190,234,0.03)", borderBottom: "1px solid rgba(65,190,234,0.06)" }}>
            <td className="pl-10 pr-5 py-3" colSpan={2}>
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full" style={{ background: "var(--border-dim)" }} />
                <p className="text-xs font-medium truncate max-w-xs" style={{ color: "var(--text-2)" }}>{ad.name}</p>
                <StatusPill status={ad.status} />
              </div>
            </td>
            <td className="px-5 py-3 text-xs font-semibold" style={{ color: "var(--cyan)" }}>
              {ins ? brl(Number(ins.spend)) : "—"}
            </td>
            <td className="px-5 py-3 text-xs font-semibold" style={{ color: "#22C55E" }}>
              {ins ? num(leads) : "—"}
            </td>
            <td className="px-5 py-3 text-xs" style={{ color: "var(--text-2)" }}>
              {ins && cpl ? brl(cpl) : "—"}
            </td>
            <td className="px-5 py-3 text-xs" style={{ color: "var(--text-2)" }}>
              {ins ? num(Number(ins.impressions)) : "—"}
            </td>
            <td className="px-5 py-3 text-xs" style={{ color: "var(--text-2)" }}>
              {ins ? num(Number(ins.clicks)) : "—"}
            </td>
            <td className="px-5 py-3 text-xs" style={{ color: "var(--text-2)" }}>
              {ins ? `${Number(ins.ctr).toFixed(2)}%` : "—"}
            </td>
          </tr>
        );
      })}
    </>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-sm shadow-xl"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)" }}>
      <p className="font-semibold mb-1 text-white truncate max-w-[200px]">{label}</p>
      <p style={{ color: "var(--cyan)" }}>{brl(payload[0].value)}</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CampanhasClient({ campanhasIniciais }: { campanhasIniciais: Item[] }) {
  const [campanhas, setCampanhas] = useState<Item[]>(campanhasIniciais);
  const [preset, setPreset]       = useState("last_30d");
  const [loading, setLoading]     = useState(false);
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());

  async function trocarPreset(p: string) {
    setPreset(p);
    setLoading(true);
    setExpanded(new Set());
    try {
      const res  = await fetch(`/api/meta/campanhas?preset=${p}`);
      const data = await res.json();
      if (Array.isArray(data)) setCampanhas(data);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totais = useMemo(() => {
    let spend = 0, leads = 0, impressions = 0, clicks = 0;
    for (const c of campanhas) {
      const ins = c.insights?.data[0];
      if (!ins) continue;
      spend       += Number(ins.spend       ?? 0);
      leads       += getLeads(ins);
      impressions += Number(ins.impressions ?? 0);
      clicks      += Number(ins.clicks      ?? 0);
    }
    return {
      spend, leads, impressions, clicks,
      cpl: leads > 0 ? spend / leads : 0,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    };
  }, [campanhas]);

  const chartData = useMemo(() =>
    campanhas
      .filter((c) => c.insights?.data[0])
      .map((c) => ({
        name: c.name.length > 24 ? c.name.slice(0, 24) + "…" : c.name,
        Investimento: Number(c.insights!.data[0].spend ?? 0),
        status: c.status,
      }))
      .sort((a, b) => b.Investimento - a.Investimento),
    [campanhas]
  );

  const kpis = [
    { label: "Investimento total", value: brl(totais.spend),        sub: "no período selecionado",            icon: <CurrencyDollar size={20} weight="duotone" />, color: "var(--cyan)",  glow: "rgba(65,190,234,0.15)" },
    { label: "Leads gerados",      value: num(totais.leads),         sub: totais.leads > 0 ? `CPL médio ${brl(totais.cpl)}` : "Sem leads no período", icon: <Users size={20} weight="duotone" />,        color: "#22C55E", glow: "rgba(34,197,94,0.15)"   },
    { label: "CTR médio",          value: `${totais.ctr.toFixed(2)}%`, sub: `${num(totais.clicks)} cliques`,  icon: <ChartLineUp size={20} weight="duotone" />,   color: "#A78BFA", glow: "rgba(167,139,250,0.15)" },
    { label: "Impressões",         value: num(totais.impressions),   sub: "alcance total",                     icon: <Eye size={20} weight="duotone" />,           color: "#F59E0B", glow: "rgba(245,158,11,0.15)"  },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1600px]">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--ff-head)", letterSpacing: "-0.02em" }}>
            Campanhas Meta Ads
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
            Desempenho das suas campanhas no Facebook e Instagram
          </p>
        </div>

        <div className="flex items-center gap-3">
          {loading && <ArrowsClockwise size={16} className="animate-spin" style={{ color: "var(--cyan)" }} />}
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-dim)" }}>
            {PRESETS.map((p) => (
              <button key={p.value} onClick={() => trocarPreset(p.value)}
                className="px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  background: preset === p.value ? "rgba(65,190,234,0.12)" : "var(--bg-surface)",
                  color:      preset === p.value ? "var(--cyan)"           : "var(--text-3)",
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
        {kpis.map(({ label, value, sub, icon, color, glow }) => (
          <div key={label}
            className="rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = color;
              (e.currentTarget as HTMLDivElement).style.boxShadow  = `0 0 24px ${glow}`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-dim)";
              (e.currentTarget as HTMLDivElement).style.boxShadow   = "none";
            }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: glow }}>
              <span style={{ color }}>{icon}</span>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-3)", fontFamily: "var(--ff-body)" }}>{label}</p>
              <p className="text-2xl font-bold leading-none" style={{ fontFamily: "var(--ff-head)", color: "var(--text-1)" }}>{value}</p>
              {sub && <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-2xl p-6"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
          <p className="text-sm font-semibold mb-5"
            style={{ fontFamily: "var(--ff-head)", color: "var(--text-1)" }}>
            Investimento por campanha
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={36}>
              <XAxis dataKey="name" tick={{ fill: "var(--text-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fill: "var(--text-3)", fontSize: 11 }} axisLine={false} tickLine={false} width={65} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(65,190,234,0.04)" }} />
              <Bar dataKey="Investimento" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i}
                    fill={entry.status === "ACTIVE" ? "url(#cyanGrad)" : "#374151"}
                    fillOpacity={entry.status === "ACTIVE" ? 1 : 0.5}
                  />
                ))}
              </Bar>
              <defs>
                <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#41BEEA" />
                  <stop offset="100%" stopColor="#2E59A6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>

        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <div className="flex items-center gap-2">
            <MegaphoneSimple size={18} style={{ color: "var(--cyan)" }} weight="duotone" />
            <p className="text-sm font-semibold"
              style={{ fontFamily: "var(--ff-head)", color: "var(--text-1)" }}>
              Campanhas ({campanhas.length})
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            Clique em uma campanha para ver os anúncios
          </p>
        </div>

        {campanhas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Warning size={36} style={{ color: "var(--text-3)" }} />
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
                  const ins    = c.insights?.data[0];
                  const leads  = ins ? getLeads(ins) : 0;
                  const cpl    = ins ? getCPL(ins)   : null;
                  const isOpen = expanded.has(c.id);

                  return (
                    <>
                      <tr key={c.id}
                        onClick={() => toggleExpand(c.id)}
                        className="cursor-pointer transition-colors"
                        style={{ borderBottom: isOpen ? "none" : "1px solid var(--border-dim)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(65,190,234,0.04)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = isOpen ? "rgba(65,190,234,0.05)" : "transparent")}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span style={{ color: "var(--text-3)" }}>
                              {isOpen ? <CaretDown size={14} /> : <CaretRight size={14} />}
                            </span>
                            <p className="font-medium truncate max-w-xs" style={{ color: "var(--text-1)" }}>{c.name}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4"><StatusPill status={c.status} /></td>
                        <td className="px-5 py-4 font-semibold whitespace-nowrap" style={{ color: "var(--cyan)" }}>
                          {ins ? brl(Number(ins.spend)) : "—"}
                        </td>
                        <td className="px-5 py-4 font-semibold" style={{ color: "#22C55E" }}>
                          {ins ? num(leads) : "—"}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap" style={{ color: "var(--text-2)" }}>
                          {ins && cpl ? brl(cpl) : "—"}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap" style={{ color: "var(--text-2)" }}>
                          {ins ? num(Number(ins.impressions)) : "—"}
                        </td>
                        <td className="px-5 py-4" style={{ color: "var(--text-2)" }}>
                          {ins ? num(Number(ins.clicks)) : "—"}
                        </td>
                        <td className="px-5 py-4" style={{ color: "var(--text-2)" }}>
                          {ins ? `${Number(ins.ctr).toFixed(2)}%` : "—"}
                        </td>
                      </tr>

                      {isOpen && (
                        <AdsTable key={`ads-${c.id}`} campaignId={c.id} preset={preset} />
                      )}

                      {isOpen && (
                        <tr><td colSpan={8} style={{ height: 8, borderBottom: "1px solid var(--border-dim)" }} /></tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
