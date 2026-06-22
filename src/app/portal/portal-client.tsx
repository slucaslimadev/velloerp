"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChatCircleDots, CalendarCheck, Clock, ChatText, WhatsappLogo,
  CheckCircle, WarningCircle, ArrowClockwise, SignOut, ToggleLeft, ToggleRight, Robot,
  GoogleLogo, LinkSimple,
} from "@phosphor-icons/react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { VelloLogo } from "@/components/shared/VelloLogo";
import { format, subDays, startOfDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ClienteAgente, SessaoMetrica, Agendamento } from "@/types/database";

interface WppStatus { connected: boolean; state: string; qrcode: string | null; error?: string }

export function PortalClient({
  agente: agenteInicial,
  metricas,
  agendamentos,
}: {
  agente: ClienteAgente;
  metricas: SessaoMetrica[];
  agendamentos: Agendamento[];
}) {
  const router = useRouter();
  const [agente, setAgente] = useState(agenteInicial);
  const [wpp, setWpp] = useState<WppStatus | null>(null);
  const [checando, setChecando] = useState(false);

  const stats = useMemo(() => {
    const conversas = new Set(metricas.map((m) => m.conversa_id).filter(Boolean)).size;
    const tempos = metricas.filter((m) => m.tempo_resposta_ms > 0).map((m) => m.tempo_resposta_ms);
    const tempoMedio = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
    const hoje = metricas.filter((m) => isToday(new Date(m.criado_em))).length;
    return {
      conversas,
      agendamentos: agendamentos.filter((a) => a.status !== "cancelado").length,
      tempoMedio,
      hoje,
    };
  }, [metricas, agendamentos]);

  const chartData = useMemo(() => {
    const dias = Array.from({ length: 14 }, (_, i) => startOfDay(subDays(new Date(), 13 - i)));
    return dias.map((d) => ({
      dia: format(d, "dd/MM"),
      mensagens: metricas.filter((m) => startOfDay(new Date(m.criado_em)).getTime() === d.getTime()).length,
    }));
  }, [metricas]);

  async function checarWpp() {
    setChecando(true);
    try {
      const res = await fetch("/api/portal/whatsapp");
      setWpp(await res.json());
    } finally {
      setChecando(false);
    }
  }

  async function desconectar() {
    if (!confirm("Desconectar o WhatsApp? O agente parará de responder até reconectar.")) return;
    await fetch("/api/portal/whatsapp", { method: "DELETE" });
    checarWpp();
  }

  async function toggleAgente() {
    const novo = !agente.ativo;
    setAgente({ ...agente, ativo: novo });
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("clientes_agentes") as any).update({ ativo: novo }).eq("id", agente.id);
  }

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/portal/login");
    router.refresh();
  }

  // Google Calendar
  const [google, setGoogle] = useState<{ conectado: boolean; email: string | null } | null>(null);
  async function checarGoogle() {
    const res = await fetch("/api/portal/google");
    if (res.ok) setGoogle(await res.json());
  }
  async function desconectarGoogle() {
    if (!confirm("Desconectar o Google Calendar?")) return;
    await fetch("/api/portal/google", { method: "DELETE" });
    checarGoogle();
  }

  useEffect(() => {
    checarWpp();
    checarGoogle();
    const i = setInterval(checarWpp, 25_000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="min-h-screen bg-[#16171C]">
      {/* Header */}
      <header className="flex items-center justify-between px-5 lg:px-8 py-4" style={{ borderBottom: "1px solid var(--border-dim)", background: "var(--bg-surface)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: "rgba(65,190,234,0.1)" }}>{agente.emoji}</div>
          <div>
            <p className="font-semibold text-white text-sm" style={{ fontFamily: "var(--ff-head)" }}>{agente.nome}</p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>Painel do seu agente de IA</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block"><VelloLogo iconSize={28} titleSize={16} /></div>
          <button onClick={sair} className="p-2 rounded-lg" style={{ color: "var(--text-3)" }} title="Sair"><SignOut size={18} /></button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric icon={<ChatCircleDots size={18} />} label="Conversas" value={stats.conversas} />
          <Metric icon={<CalendarCheck size={18} />} label="Agendamentos" value={stats.agendamentos} />
          <Metric icon={<Clock size={18} />} label="Tempo médio" value={`${(stats.tempoMedio / 1000).toFixed(1)}s`} />
          <Metric icon={<ChatText size={18} />} label="Mensagens hoje" value={stats.hoje} />
        </div>

        {/* Gráfico */}
        <section className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-3)" }}>Atividade dos últimos 14 dias</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData}>
              <XAxis dataKey="dia" tick={{ fill: "var(--text-3)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(65,190,234,0.05)" }}
                contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)", borderRadius: 12, color: "var(--text-1)", fontSize: 12 }} />
              <Bar dataKey="mensagens" fill="var(--cyan)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Controles: Agente + WhatsApp */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Agente toggle */}
          <section className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: `1px solid ${agente.ativo ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>Agente de IA</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: agente.ativo ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: agente.ativo ? "#22C55E" : "#EF4444" }}>
                  <Robot size={20} weight={agente.ativo ? "fill" : "regular"} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{agente.ativo ? "Respondendo" : "Pausado"}</p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>{agente.ativo ? "Atende automaticamente" : "Não responde mensagens"}</p>
                </div>
              </div>
              <button onClick={toggleAgente}
                style={{ color: agente.ativo ? "#22C55E" : "var(--text-3)" }}>
                {agente.ativo ? <ToggleRight size={36} weight="fill" /> : <ToggleLeft size={36} weight="fill" />}
              </button>
            </div>
          </section>

          {/* WhatsApp */}
          <section className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Conexão WhatsApp</p>
              <button onClick={checarWpp} disabled={checando} className="flex items-center gap-1 text-xs disabled:opacity-50" style={{ color: "var(--cyan)" }}>
                <ArrowClockwise size={12} className={checando ? "animate-spin" : ""} /> Atualizar
              </button>
            </div>

            {!wpp ? (
              <div className="flex items-center gap-2" style={{ color: "var(--text-3)" }}>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                <span className="text-sm">Verificando...</span>
              </div>
            ) : wpp.connected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)" }}>
                    <WhatsappLogo size={20} weight="fill" style={{ color: "#22C55E" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1" style={{ color: "#22C55E" }}><CheckCircle size={14} weight="fill" /> Conectado</p>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>Recebendo mensagens</p>
                  </div>
                </div>
                <button onClick={desconectar} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                  Desconectar
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm self-start" style={{ color: "#F59E0B" }}>
                  <WarningCircle size={15} weight="fill" /> Desconectado — escaneie o QR
                </div>
                {wpp.qrcode ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={wpp.qrcode} alt="QR Code" className="w-44 h-44 rounded-xl" style={{ border: "4px solid white" }} />
                ) : (
                  <div className="w-44 h-44 rounded-xl flex items-center justify-center text-center text-xs px-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)", color: "var(--text-3)" }}>
                    QR indisponível — clique em Atualizar
                  </div>
                )}
                <p className="text-xs text-center" style={{ color: "var(--text-3)" }}>WhatsApp → Aparelhos conectados → Conectar aparelho</p>
              </div>
            )}
          </section>
        </div>

        {/* Integrações */}
        <section className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>Integrações</p>
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)" }}>
            <GoogleLogo size={24} style={{ color: google?.conectado ? "#22C55E" : "var(--text-3)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>Google Calendar</p>
              <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>
                {google?.conectado ? `Conectado${google.email ? ` · ${google.email}` : ""}` : "Conecte para os agendamentos irem direto pra sua agenda"}
              </p>
            </div>
            {google?.conectado ? (
              <button onClick={desconectarGoogle} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                Desconectar
              </button>
            ) : (
              <a href="/api/portal/google/connect" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                style={{ background: "var(--cyan)", color: "#0a0d14" }}>
                <LinkSimple size={14} /> Conectar
              </a>
            )}
          </div>
        </section>

        {/* Agendamentos */}
        <section className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest px-5 pt-5 pb-3" style={{ color: "var(--text-3)" }}>Agendamentos</p>
          {agendamentos.length === 0 ? (
            <p className="px-5 pb-6 text-sm" style={{ color: "var(--text-3)" }}>Nenhum agendamento ainda.</p>
          ) : (
            agendamentos.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3" style={{ borderTop: "1px solid var(--border-dim)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>{a.nome_contato || a.whatsapp || "—"}</p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>{a.servico || "—"}</p>
                </div>
                <p className="text-xs" style={{ color: "var(--text-2)" }}>{a.data_hora ? format(new Date(a.data_hora), "dd/MM 'às' HH'h'", { locale: ptBR }) : "—"}</p>
                <StatusBadge status={a.status} />
              </div>
            ))
          )}
        </section>

        <p className="text-center text-xs pt-2 pb-6" style={{ color: "var(--text-3)" }}>
          Powered by Vello Inteligência Artificial
        </p>
      </main>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
      <div className="flex items-center gap-1.5 mb-2" style={{ color: "var(--text-3)" }}>{icon}<span className="text-xs">{label}</span></div>
      <p className="text-2xl font-bold" style={{ color: "var(--cyan)", fontFamily: "var(--ff-head)" }}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    confirmado: { bg: "rgba(34,197,94,0.1)", fg: "#22C55E" },
    pendente: { bg: "rgba(245,158,11,0.1)", fg: "#F59E0B" },
    cancelado: { bg: "rgba(239,68,68,0.1)", fg: "#EF4444" },
    concluido: { bg: "rgba(65,190,234,0.1)", fg: "var(--cyan)" },
  };
  const c = map[status] ?? { bg: "var(--bg-elevated)", fg: "var(--text-3)" };
  return <span className="text-xs px-2 py-0.5 rounded-md flex-shrink-0" style={{ background: c.bg, color: c.fg }}>{status}</span>;
}
