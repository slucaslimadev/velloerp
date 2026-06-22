"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ChatCircleDots, CalendarCheck, CurrencyDollar, Clock,
  FloppyDisk, ToggleLeft, ToggleRight, Key, CheckCircle, User,
  WhatsappLogo, ArrowClockwise, WarningCircle, Plugs,
  Target, CalendarPlus, ListBullets, Question, Plus, Trash, GoogleLogo, LinkSimple,
} from "@phosphor-icons/react";
import type { FaqItem, Servico } from "@/types/database";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ClienteAgente, SessaoMetrica, Agendamento } from "@/types/database";

const MODELOS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gpt-4o-mini"];
const CAPACIDADES = [
  { id: "qualificar_lead", icon: Target,       label: "Qualificar lead",  desc: "Pontua e registra em Leads" },
  { id: "agendar",         icon: CalendarPlus, label: "Agendar horário",  desc: "Marca e cancela agendamentos" },
  { id: "servicos",        icon: ListBullets,  label: "Listar serviços",  desc: "Informa cardápio e preços" },
  { id: "faq",             icon: Question,     label: "Responder FAQ",    desc: "Base de perguntas frequentes" },
] as const;

export function AgenteDashboard({
  agente: agenteInicial,
  metricas,
  agendamentos,
}: {
  agente: ClienteAgente;
  metricas: SessaoMetrica[];
  agendamentos: Agendamento[];
}) {
  const [agente, setAgente] = useState(agenteInicial);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  // Portal user
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [criandoUser, setCriandoUser] = useState(false);
  const [userMsg, setUserMsg] = useState("");
  const [temUsuario, setTemUsuario] = useState(!!agenteInicial.user_id);

  // URL do portal (resolvida só no cliente, evita mismatch de hidratação)
  const [portalUrl, setPortalUrl] = useState("/portal");
  useEffect(() => { setPortalUrl(`${window.location.origin}/portal`); }, []);

  // WhatsApp / instância
  const [wpp, setWpp] = useState<{ connected: boolean; state: string; qrcode: string | null; error?: string } | null>(null);
  const [checandoWpp, setChecandoWpp] = useState(false);
  const [provisionando, setProvisionando] = useState(false);
  const [wppMsg, setWppMsg] = useState("");

  async function checarWpp() {
    setChecandoWpp(true);
    try {
      const res = await fetch(`/api/agentes-clientes/${agente.id}/whatsapp`);
      setWpp(await res.json());
    } finally {
      setChecandoWpp(false);
    }
  }

  async function criarInstancia() {
    setProvisionando(true);
    setWppMsg("");
    try {
      const res = await fetch(`/api/agentes-clientes/${agente.id}/whatsapp`, { method: "POST" });
      const json = await res.json();
      if (json.erro) setWppMsg(`Falha: ${json.erro}`);
      else setWppMsg(json.webhookOk ? "Instância criada e webhook registrado!" : "Instância criada (verifique o webhook).");
      checarWpp();
    } finally {
      setProvisionando(false);
    }
  }

  async function desconectarWpp() {
    if (!confirm("Desconectar o WhatsApp desta instância?")) return;
    await fetch(`/api/agentes-clientes/${agente.id}/whatsapp`, { method: "DELETE" });
    checarWpp();
  }

  useEffect(() => {
    checarWpp();
    const i = setInterval(checarWpp, 25_000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const conversas = new Set(metricas.map((m) => m.conversa_id).filter(Boolean)).size;
    const custo = metricas.reduce((s, m) => s + Number(m.custo_usd ?? 0), 0);
    const tempos = metricas.filter((m) => m.tempo_resposta_ms > 0).map((m) => m.tempo_resposta_ms);
    const tempoMedio = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
    const tokens = metricas.reduce((s, m) => s + m.tokens_input + m.tokens_output, 0);
    return {
      conversas,
      agendamentos: agendamentos.filter((a) => a.status !== "cancelado").length,
      custo,
      tempoMedio,
      tokens,
    };
  }, [metricas, agendamentos]);

  const chartData = useMemo(() => {
    const dias = Array.from({ length: 14 }, (_, i) => startOfDay(subDays(new Date(), 13 - i)));
    return dias.map((d) => {
      const count = metricas.filter((m) => {
        const md = startOfDay(new Date(m.criado_em));
        return md.getTime() === d.getTime();
      }).length;
      return { dia: format(d, "dd/MM"), mensagens: count };
    });
  }, [metricas]);

  async function salvarConfig() {
    setSalvando(true);
    setSalvo(false);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("clientes_agentes") as any)
      .update({
        nome: agente.nome,
        segmento: agente.segmento,
        emoji: agente.emoji,
        modelo: agente.modelo,
        system_prompt: agente.system_prompt,
        temperatura: agente.temperatura,
        max_tokens: agente.max_tokens,
        tools_ativas: agente.tools_ativas,
        servicos: agente.servicos,
        faq: agente.faq,
      })
      .eq("id", agente.id);
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  }

  async function toggleAtivo() {
    const novo = !agente.ativo;
    setAgente({ ...agente, ativo: novo });
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("clientes_agentes") as any).update({ ativo: novo }).eq("id", agente.id);
  }

  async function criarUsuario() {
    setUserMsg("");
    if (!email.trim() || senha.length < 6) { setUserMsg("Email válido e senha (6+) obrigatórios."); return; }
    setCriandoUser(true);
    try {
      const url = `/api/agentes-clientes/${agente.id}/usuario`;
      const method = temUsuario ? "PATCH" : "POST";
      const body = temUsuario ? { password: senha } : { email: email.trim(), password: senha };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.error) { setUserMsg(json.error); return; }
      setTemUsuario(true);
      setSenha("");
      setUserMsg(temUsuario ? "Senha atualizada!" : "Usuário do portal criado!");
    } finally {
      setCriandoUser(false);
    }
  }

  function toggleTool(id: string) {
    const has = agente.tools_ativas.includes(id);
    setAgente({
      ...agente,
      tools_ativas: has ? agente.tools_ativas.filter((t) => t !== id) : [...agente.tools_ativas, id],
    });
  }

  // Serviços
  const servicos: Servico[] = agente.servicos ?? [];
  function setServicos(s: Servico[]) { setAgente({ ...agente, servicos: s }); }
  function addServico() { setServicos([...servicos, { nome: "", preco: undefined }]); }
  function updServico(i: number, patch: Partial<Servico>) { setServicos(servicos.map((s, j) => (j === i ? { ...s, ...patch } : s))); }
  function delServico(i: number) { setServicos(servicos.filter((_, j) => j !== i)); }

  // FAQ
  const faq: FaqItem[] = agente.faq ?? [];
  function setFaq(f: FaqItem[]) { setAgente({ ...agente, faq: f }); }
  function addFaq() { setFaq([...faq, { pergunta: "", resposta: "" }]); }
  function updFaq(i: number, patch: Partial<FaqItem>) { setFaq(faq.map((f, j) => (j === i ? { ...f, ...patch } : f))); }
  function delFaq(i: number) { setFaq(faq.filter((_, j) => j !== i)); }

  // Google Calendar
  const [google, setGoogle] = useState<{ conectado: boolean; email: string | null } | null>(null);
  async function checarGoogle() {
    const res = await fetch(`/api/agentes-clientes/${agente.id}/google`);
    setGoogle(await res.json());
  }
  async function desconectarGoogle() {
    if (!confirm("Desconectar o Google Calendar?")) return;
    await fetch(`/api/agentes-clientes/${agente.id}/google`, { method: "DELETE" });
    checarGoogle();
  }
  useEffect(() => { checarGoogle(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const inputStyle = { background: "var(--bg-surface)", border: "1px solid var(--border-dim)", color: "var(--text-1)", fontFamily: "var(--ff-body)" };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-vello p-6 lg:p-8 space-y-8 max-w-[1600px]">
      {/* Header */}
      <div>
        <Link href="/agentes-clientes" className="flex items-center gap-1.5 text-xs mb-3" style={{ color: "var(--text-3)" }}>
          <ArrowLeft size={14} /> Voltar
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: "rgba(65,190,234,0.1)" }}>
              {agente.emoji}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--ff-head)", letterSpacing: "-0.02em" }}>{agente.nome}</h1>
              <p className="text-sm" style={{ color: "var(--text-3)" }}>{agente.segmento || "—"} · {agente.instance_evolution}</p>
            </div>
          </div>
          <button onClick={toggleAtivo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm flex-shrink-0"
            style={{ background: agente.ativo ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: agente.ativo ? "#22C55E" : "#EF4444", border: `1px solid ${agente.ativo ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}` }}>
            {agente.ativo ? <ToggleRight size={20} weight="fill" /> : <ToggleLeft size={20} weight="fill" />}
            {agente.ativo ? "Ativo" : "Pausado"}
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<ChatCircleDots size={18} />} label="Conversas" value={stats.conversas} />
        <MetricCard icon={<CalendarCheck size={18} />} label="Agendamentos" value={stats.agendamentos} />
        <MetricCard icon={<CurrencyDollar size={18} />} label="Custo total" value={`$${stats.custo.toFixed(3)}`} accent="#F59E0B" />
        <MetricCard icon={<Clock size={18} />} label="Tempo médio" value={`${(stats.tempoMedio / 1000).toFixed(1)}s`} />
      </div>

      {/* Gráfico */}
      <section className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-3)" }}>Mensagens nos últimos 14 dias</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData}>
            <XAxis dataKey="dia" tick={{ fill: "var(--text-3)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "rgba(65,190,234,0.05)" }}
              contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)", borderRadius: 12, color: "var(--text-1)", fontSize: 12 }} />
            <Bar dataKey="mensagens" fill="var(--cyan)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs mt-2" style={{ color: "var(--text-3)" }}>{stats.tokens.toLocaleString("pt-BR")} tokens consumidos no total</p>
      </section>

      {/* WhatsApp / Instância */}
      <section className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>WhatsApp · {agente.instance_evolution}</p>
          <button onClick={checarWpp} disabled={checandoWpp} className="flex items-center gap-1 text-xs disabled:opacity-50" style={{ color: "var(--cyan)" }}>
            <ArrowClockwise size={12} className={checandoWpp ? "animate-spin" : ""} /> Atualizar
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
                <p className="text-xs" style={{ color: "var(--text-3)" }}>Instância ativa e recebendo mensagens</p>
              </div>
            </div>
            <button onClick={desconectarWpp} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.25)" }}>
              Desconectar
            </button>
          </div>
        ) : wpp.state === "not_found" ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm" style={{ color: "#F59E0B" }}>
              <WarningCircle size={15} weight="fill" /> Instância ainda não existe na Evolution.
            </div>
            <button onClick={criarInstancia} disabled={provisionando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{ background: "var(--cyan)", color: "#0a0d14" }}>
              <Plugs size={14} /> {provisionando ? "Criando..." : "Criar instância"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-sm mb-1" style={{ color: "#F59E0B" }}>
                <WarningCircle size={15} weight="fill" /> Desconectado
              </div>
              <p className="text-xs" style={{ color: "var(--text-3)" }}>Escaneie o QR com o WhatsApp do cliente. O cliente também pode conectar pelo portal.</p>
            </div>
            {wpp.qrcode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={wpp.qrcode} alt="QR Code" className="w-36 h-36 rounded-xl flex-shrink-0" style={{ border: "4px solid white" }} />
            ) : (
              <div className="w-36 h-36 rounded-xl flex items-center justify-center text-center text-xs px-3 flex-shrink-0" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)", color: "var(--text-3)" }}>
                QR indisponível — Atualizar
              </div>
            )}
          </div>
        )}
        {wppMsg && <p className="text-xs mt-3" style={{ color: wppMsg.includes("!") ? "#22C55E" : "#EF4444" }}>{wppMsg}</p>}
      </section>

      {/* Configuração */}
      <section className="rounded-2xl p-5 space-y-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Configuração do Agente</p>
          <button onClick={salvarConfig} disabled={salvando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{ background: salvo ? "rgba(34,197,94,0.15)" : "rgba(65,190,234,0.1)", color: salvo ? "#22C55E" : "var(--cyan)", border: `1px solid ${salvo ? "rgba(34,197,94,0.25)" : "rgba(65,190,234,0.2)"}` }}>
            {salvo ? <><CheckCircle size={14} weight="fill" /> Salvo</> : <><FloppyDisk size={14} /> {salvando ? "Salvando..." : "Salvar"}</>}
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>Modelo</label>
            <select className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
              value={agente.modelo} onChange={(e) => setAgente({ ...agente, modelo: e.target.value })}>
              {MODELOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>Emoji / Segmento</label>
            <div className="flex gap-2">
              <input className="w-14 rounded-xl px-3 py-2 text-sm outline-none text-center" style={inputStyle}
                value={agente.emoji} onChange={(e) => setAgente({ ...agente, emoji: e.target.value })} />
              <input className="flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
                value={agente.segmento ?? ""} onChange={(e) => setAgente({ ...agente, segmento: e.target.value })} placeholder="Segmento" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>System Prompt</label>
          <textarea rows={6} className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-y" style={inputStyle}
            value={agente.system_prompt} onChange={(e) => setAgente({ ...agente, system_prompt: e.target.value })}
            placeholder="Você é a Ana, assistente da Estética Silva..." />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>Temperatura: {agente.temperatura}</label>
            <input type="range" min={0} max={1} step={0.1} className="w-full accent-[var(--cyan)]"
              value={agente.temperatura} onChange={(e) => setAgente({ ...agente, temperatura: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>Max tokens</label>
            <input type="number" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
              value={agente.max_tokens} onChange={(e) => setAgente({ ...agente, max_tokens: Number(e.target.value) })} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-3)" }}>Funcionalidades</label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {CAPACIDADES.map((c) => {
              const on = agente.tools_ativas.includes(c.id);
              const Icon = c.icon;
              return (
                <button key={c.id} onClick={() => toggleTool(c.id)}
                  className="text-left rounded-xl p-3 transition-all"
                  style={{ background: on ? "rgba(65,190,234,0.08)" : "var(--bg-elevated)", border: `1px solid ${on ? "rgba(65,190,234,0.3)" : "var(--border-dim)"}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <Icon size={20} weight={on ? "duotone" : "regular"} style={{ color: on ? "var(--cyan)" : "var(--text-3)" }} />
                    {on
                      ? <ToggleRight size={22} weight="fill" style={{ color: "var(--cyan)" }} />
                      : <ToggleLeft size={22} weight="fill" style={{ color: "var(--text-3)" }} />}
                  </div>
                  <p className="text-sm font-medium" style={{ color: on ? "var(--text-1)" : "var(--text-2)" }}>{c.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{c.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor de serviços */}
        {agente.tools_ativas.includes("servicos") && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: "var(--text-3)" }}>Serviços (cardápio)</label>
              <button onClick={addServico} className="flex items-center gap-1 text-xs" style={{ color: "var(--cyan)" }}><Plus size={13} /> Adicionar</button>
            </div>
            <div className="space-y-2">
              {servicos.length === 0 && <p className="text-xs" style={{ color: "var(--text-3)" }}>Nenhum serviço cadastrado.</p>}
              {servicos.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input className="flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
                    placeholder="Nome (ex: Limpeza de pele)" value={s.nome} onChange={(e) => updServico(i, { nome: e.target.value })} />
                  <input type="number" className="w-24 rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
                    placeholder="R$" value={s.preco ?? ""} onChange={(e) => updServico(i, { preco: e.target.value ? Number(e.target.value) : undefined })} />
                  <input type="number" className="w-20 rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
                    placeholder="min" value={s.duracao_min ?? ""} onChange={(e) => updServico(i, { duracao_min: e.target.value ? Number(e.target.value) : undefined })} />
                  <button onClick={() => delServico(i)} className="px-2 rounded-xl" style={{ color: "var(--text-3)" }}><Trash size={15} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Editor de FAQ */}
        {agente.tools_ativas.includes("faq") && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: "var(--text-3)" }}>Perguntas frequentes</label>
              <button onClick={addFaq} className="flex items-center gap-1 text-xs" style={{ color: "var(--cyan)" }}><Plus size={13} /> Adicionar</button>
            </div>
            <div className="space-y-2">
              {faq.length === 0 && <p className="text-xs" style={{ color: "var(--text-3)" }}>Nenhuma pergunta cadastrada.</p>}
              {faq.map((f, i) => (
                <div key={i} className="rounded-xl p-2 space-y-2" style={{ background: "var(--bg-base)" }}>
                  <div className="flex gap-2">
                    <input className="flex-1 rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle}
                      placeholder="Pergunta" value={f.pergunta} onChange={(e) => updFaq(i, { pergunta: e.target.value })} />
                    <button onClick={() => delFaq(i)} className="px-2 rounded-lg" style={{ color: "var(--text-3)" }}><Trash size={15} /></button>
                  </div>
                  <textarea rows={2} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y" style={inputStyle}
                    placeholder="Resposta" value={f.resposta} onChange={(e) => updFaq(i, { resposta: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Integrações */}
      <section className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>Integrações</p>
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)" }}>
          <GoogleLogo size={24} style={{ color: google?.conectado ? "#22C55E" : "var(--text-3)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>Google Calendar</p>
            <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>
              {google?.conectado ? `Conectado${google.email ? ` · ${google.email}` : ""} — agendamentos vão pra agenda` : "Cria os agendamentos na agenda do cliente"}
            </p>
          </div>
          {google?.conectado ? (
            <button onClick={desconectarGoogle} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
              style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.25)" }}>
              Desconectar
            </button>
          ) : (
            <a href={`/api/agentes-clientes/${agente.id}/google/connect`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
              style={{ background: "var(--cyan)", color: "#0a0d14" }}>
              <LinkSimple size={14} /> Conectar
            </a>
          )}
        </div>
      </section>

      {/* Acesso ao portal */}
      <section className="rounded-2xl p-5 space-y-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Acesso do Cliente ao Portal</p>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-3)" }}>
          <User size={14} />
          {temUsuario ? <span style={{ color: "#22C55E" }}>Usuário do portal já configurado</span> : <span>Nenhum usuário criado ainda</span>}
        </div>
        <p className="text-xs" style={{ color: "var(--text-3)" }}>Portal: <span style={{ color: "var(--cyan)" }}>{portalUrl}</span></p>
        <div className="flex flex-col sm:flex-row gap-2">
          {!temUsuario && (
            <input type="email" placeholder="email@cliente.com" className="flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
              value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
          <input type="password" placeholder={temUsuario ? "Nova senha" : "Senha (6+)"} className="flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
            value={senha} onChange={(e) => setSenha(e.target.value)} />
          <button onClick={criarUsuario} disabled={criandoUser}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--cyan)", color: "#0a0d14" }}>
            <Key size={14} /> {criandoUser ? "..." : temUsuario ? "Redefinir" : "Criar acesso"}
          </button>
        </div>
        {userMsg && <p className="text-xs" style={{ color: userMsg.includes("!") ? "#22C55E" : "#EF4444" }}>{userMsg}</p>}
      </section>

      {/* Agendamentos recentes */}
      <section className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest px-5 pt-5 pb-3" style={{ color: "var(--text-3)" }}>Agendamentos recentes</p>
        {agendamentos.length === 0 ? (
          <p className="px-5 pb-6 text-sm" style={{ color: "var(--text-3)" }}>Nenhum agendamento ainda.</p>
        ) : (
          <div>
            {agendamentos.slice(0, 10).map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3"
                style={{ borderTop: i === 0 ? "1px solid var(--border-dim)" : "1px solid var(--border-dim)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>{a.nome_contato || a.whatsapp || "—"}</p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>{a.servico || "—"}</p>
                </div>
                <p className="text-xs" style={{ color: "var(--text-2)" }}>
                  {a.data_hora ? format(new Date(a.data_hora), "dd/MM 'às' HH'h'", { locale: ptBR }) : "—"}
                </p>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
      <div className="flex items-center gap-1.5 mb-2" style={{ color: "var(--text-3)" }}>
        {icon}<span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: accent ?? "var(--cyan)", fontFamily: "var(--ff-head)" }}>{value}</p>
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
