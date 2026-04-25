"use client";

import { useState, useEffect } from "react";
import {
  Robot, ToggleLeft, ToggleRight, WhatsappLogo,
  CheckCircle, WarningCircle, ArrowClockwise,
  UserPlus, Trash, User, X,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UsuarioResumo {
  id: string;
  email: string | undefined;
  criado_em: string;
  ultimo_login: string | null;
}

interface WhatsAppStatus {
  connected: boolean;
  state: string;
  qrcode: string | null;
  error?: string;
}

export function ConfiguracoesClient({ iaAtivaInicial }: { iaAtivaInicial: boolean }) {
  const [iaAtiva, setIaAtiva] = useState(iaAtivaInicial);
  const [salvando, setSalvando] = useState(false);

  // WhatsApp
  const [wpStatus, setWpStatus] = useState<WhatsAppStatus | null>(null);
  const [checandoWp, setChecandoWp] = useState(false);

  // Usuários
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [carregandoUsers, setCarregandoUsers] = useState(true);
  const [showNovoUser, setShowNovoUser] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [criandoUser, setCriandoUser] = useState(false);
  const [erroUser, setErroUser] = useState("");

  async function toggleIa() {
    setSalvando(true);
    const supabase = createClient();
    const novoValor = !iaAtiva;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("configuracoes") as any)
      .update({ valor: novoValor ? "true" : "false" })
      .eq("id", "ia_ativa");
    setIaAtiva(novoValor);
    setSalvando(false);
  }

  async function checarWhatsApp() {
    setChecandoWp(true);
    try {
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json();
      setWpStatus(data);
    } finally {
      setChecandoWp(false);
    }
  }

  async function carregarUsuarios() {
    setCarregandoUsers(true);
    try {
      const res = await fetch("/api/usuarios");
      const json = await res.json();
      setUsuarios(json.users ?? []);
    } finally {
      setCarregandoUsers(false);
    }
  }

  async function criarUsuario() {
    setErroUser("");
    if (!novoEmail.trim() || !novaSenha.trim()) {
      setErroUser("Preencha todos os campos.");
      return;
    }
    setCriandoUser(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: novoEmail.trim(), password: novaSenha }),
      });
      const json = await res.json();
      if (json.error) { setErroUser(json.error); return; }
      setShowNovoUser(false);
      setNovoEmail("");
      setNovaSenha("");
      carregarUsuarios();
    } finally {
      setCriandoUser(false);
    }
  }

  async function deletarUsuario(id: string, email: string | undefined) {
    if (!confirm(`Remover o usuário ${email ?? id}?`)) return;
    await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
  }

  useEffect(() => {
    checarWhatsApp();
    carregarUsuarios();
    const interval = setInterval(checarWhatsApp, 25_000);
    return () => clearInterval(interval);
  }, []);

  const inputStyle = {
    background: "var(--bg-surface)",
    border: "1px solid var(--border-dim)",
    color: "var(--text-1)",
    fontFamily: "var(--ff-body)",
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-vello p-6 lg:p-8 space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--ff-head)", letterSpacing: "-0.02em" }}>
          Configurações
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
          Agente de IA, conexão WhatsApp e usuários do sistema
        </p>
      </div>

      {/* ── Agente Velly ── */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
          Agente Velly
        </p>
        <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: `1px solid ${iaAtiva ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: iaAtiva ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: iaAtiva ? "#22C55E" : "#EF4444" }}>
                <Robot size={22} weight={iaAtiva ? "fill" : "regular"} />
              </div>
              <div>
                <p className="font-semibold text-white text-sm" style={{ fontFamily: "var(--ff-head)" }}>
                  IA Global — Respostas Automáticas
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                  {iaAtiva ? "Respondendo automaticamente novos contatos no WhatsApp" : "Pausada — nenhuma mensagem será respondida"}
                </p>
              </div>
            </div>
            <button onClick={toggleIa} disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all flex-shrink-0 disabled:opacity-60"
              style={{ background: iaAtiva ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: iaAtiva ? "#22C55E" : "#EF4444", border: `1px solid ${iaAtiva ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`, fontFamily: "var(--ff-body)" }}>
              {iaAtiva ? <ToggleRight size={20} weight="fill" /> : <ToggleLeft size={20} weight="fill" />}
              {salvando ? "Salvando..." : iaAtiva ? "Ativa" : "Pausada"}
            </button>
          </div>
        </div>
      </section>

      {/* ── WhatsApp Connection ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
            Conexão WhatsApp
          </p>
          <button onClick={checarWhatsApp} disabled={checandoWp}
            className="flex items-center gap-1.5 text-xs disabled:opacity-50"
            style={{ color: "var(--cyan)" }}>
            <ArrowClockwise size={13} className={checandoWp ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
          {!wpStatus || checandoWp && !wpStatus ? (
            <div className="flex items-center gap-3" style={{ color: "var(--text-3)" }}>
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
              <span className="text-sm">Verificando conexão...</span>
            </div>
          ) : wpStatus.error ? (
            <div className="flex items-center gap-3">
              <WarningCircle size={20} style={{ color: "#F59E0B" }} />
              <p className="text-sm" style={{ color: "var(--text-2)" }}>{wpStatus.error}</p>
            </div>
          ) : wpStatus.connected ? (
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(34,197,94,0.1)" }}>
                <WhatsappLogo size={22} weight="fill" style={{ color: "#22C55E" }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <CheckCircle size={15} style={{ color: "#22C55E" }} weight="fill" />
                  <p className="text-sm font-semibold" style={{ color: "#22C55E" }}>WhatsApp Conectado</p>
                </div>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>
                  Instância {process.env.NEXT_PUBLIC_INSTANCE ?? "VELLO"} ativa e recebendo mensagens
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <WarningCircle size={16} style={{ color: "#F59E0B" }} weight="fill" />
                  <p className="text-sm font-semibold" style={{ color: "#F59E0B" }}>WhatsApp Desconectado</p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-3)" }}>
                  Escaneie o QR code com o WhatsApp do número do agente para reconectar.
                  O código expira em aproximadamente 60 segundos — clique em "Atualizar" se expirar.
                </p>
              </div>

              {wpStatus.qrcode ? (
                <div className="flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={wpStatus.qrcode} alt="QR Code WhatsApp"
                    className="w-40 h-40 rounded-xl"
                    style={{ border: "4px solid white" }} />
                </div>
              ) : (
                <div className="w-40 h-40 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)" }}>
                  <p className="text-xs text-center px-3" style={{ color: "var(--text-3)" }}>QR code indisponível — clique em Atualizar</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Usuários ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
            Usuários do Sistema
          </p>
          <button onClick={() => setShowNovoUser(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "rgba(65,190,234,0.1)", color: "var(--cyan)", border: "1px solid rgba(65,190,234,0.2)" }}>
            <UserPlus size={14} /> Adicionar
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
          {carregandoUsers ? (
            <div className="py-10 flex items-center justify-center gap-2" style={{ color: "var(--text-3)" }}>
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
              <span className="text-sm">Carregando...</span>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: "var(--text-3)" }}>
              Nenhum usuário cadastrado.
            </div>
          ) : (
            usuarios.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-4"
                style={{ borderBottom: i < usuarios.length - 1 ? "1px solid var(--border-dim)" : "none" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(65,190,234,0.1)" }}>
                  <User size={16} style={{ color: "var(--cyan)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>{u.email}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                    Criado em {format(new Date(u.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                    {u.ultimo_login && ` · Último acesso ${format(new Date(u.ultimo_login), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}
                  </p>
                </div>
                <button onClick={() => deletarUsuario(u.id, u.email)}
                  className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#EF4444"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; }}>
                  <Trash size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Modal: Novo usuário */}
      {showNovoUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setShowNovoUser(false)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-dim)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>Novo Usuário</h2>
              <button onClick={() => { setShowNovoUser(false); setErroUser(""); }} style={{ color: "var(--text-3)" }}><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>E-mail *</label>
                <input type="email" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
                  placeholder="usuario@empresa.com" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>Senha *</label>
                <input type="password" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
                  placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
              </div>
              {erroUser && <p className="text-xs" style={{ color: "#EF4444" }}>{erroUser}</p>}
            </div>
            <div className="px-5 py-4 flex justify-end gap-3" style={{ borderTop: "1px solid var(--border-dim)" }}>
              <button onClick={() => { setShowNovoUser(false); setErroUser(""); }} className="px-4 py-2 rounded-xl text-sm"
                style={{ color: "var(--text-2)", background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
                Cancelar
              </button>
              <button onClick={criarUsuario} disabled={criandoUser}
                className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--cyan)", color: "#0a0d14" }}>
                {criandoUser ? "Criando..." : "Criar Usuário"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
