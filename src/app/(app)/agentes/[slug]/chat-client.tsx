"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Gear, PaperPlaneRight, X } from "@phosphor-icons/react";
import type { ChatMessage } from "@/app/api/agentes/chat/route";
import type { AgenteConfig } from "@/lib/agentes/config";

export function ChatClient({ agente, isPublic = false }: { agente: AgenteConfig; isPublic?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPromptConfig, setShowPromptConfig] = useState(false);
  const [systemPromptOverride, setSystemPromptOverride] = useState(agente.systemPrompt);

  const [showCTA, setShowCTA] = useState(false);
  const [ctaEnviado, setCtaEnviado] = useState(false);
  const [ctaNome, setCtaNome] = useState("");
  const [ctaEmail, setCtaEmail] = useState("");
  const [ctaTelefone, setCtaTelefone] = useState("");
  const [ctaLoading, setCtaLoading] = useState(false);
  const CTA_TRIGGER = isPublic && agente.slug === "imobiliaria";

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`agent_prompt_${agente.slug}`);
    if (saved) setSystemPromptOverride(saved);
  }, [agente.slug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const texto = input.trim();
    if (!texto || loading) return;

    const userMsg: ChatMessage = { role: "user", content: texto };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agentes/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: agente.slug, messages: nextMessages, systemPromptOverride }),
      });
      const json = await res.json();
      if (json.resposta) {
        setMessages((prev) => {
          const updated = [...prev, { role: "assistant" as const, content: json.resposta }];
          if (CTA_TRIGGER && !ctaEnviado && updated.length >= 8) setShowCTA(true);
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative" }}>
      <div className="h-16 shrink-0 flex items-center justify-between px-6"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-dim)" }}>
        <div className="flex items-center gap-4">
          {!isPublic && (
            <Link href="/agentes" className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-3)" }}>
              <ArrowLeft size={18} />
            </Link>
          )}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: `${agente.cor}18`, border: `1px solid ${agente.cor}30` }}>
            {agente.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>{agente.nome}</p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>{agente.segmento} · powered by VELLO IA</p>
          </div>
        </div>
        <div className="flex items-center">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium" style={{ color: "#22C55E" }}>Online</span>
          </div>
          {!isPublic && (
            <button
              onClick={() => setShowPromptConfig(true)}
              className="p-1.5 rounded-lg transition-colors ml-2 hover:bg-[var(--border-dim)]"
              style={{ color: "var(--text-3)" }}
              title="Configurar Prompt"
            >
              <Gear size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4" style={{ background: "var(--bg-base)" }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center pb-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: `${agente.cor}15`, border: `1px solid ${agente.cor}25` }}>
              {agente.emoji}
            </div>
            <div>
              <p className="text-base font-semibold" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>
                {agente.nome}
              </p>
              <p className="text-sm mt-1 max-w-xs" style={{ color: "var(--text-3)" }}>
                {agente.descricao}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {(agente.sugestoes ?? ["Olá, como você pode me ajudar?"]).map((s) => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 rounded-full transition-colors"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", color: "var(--text-2)" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mb-0.5"
                style={{ background: `${agente.cor}18` }}>
                {agente.emoji}
              </div>
            )}
            <div className="max-w-[80%] px-4 py-3 text-sm leading-relaxed"
              style={{
                background: msg.role === "user" ? "rgba(65,190,234,0.12)" : "var(--bg-elevated)",
                color: "var(--text-1)",
                borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                border: msg.role === "user" ? "1px solid rgba(65,190,234,0.18)" : "1px solid var(--border-dim)",
                fontFamily: "var(--ff-body)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                  a: ({ node, ...props }) => <a className="text-[var(--cyan)] underline" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                }}
              >
                {msg.content || ""}
              </ReactMarkdown>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
              style={{ background: `${agente.cor}18` }}>
              {agente.emoji}
            </div>
            <div className="px-4 py-3 rounded-xl flex items-center gap-1.5"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)" }}>
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: agente.cor, animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-end gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderTop: "1px solid var(--border-dim)", background: "var(--bg-surface)" }}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Digite uma mensagem..."
          rows={1} disabled={loading}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          className="flex-1 rounded-xl px-3 py-2 text-sm outline-none resize-none"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)", color: "var(--text-1)", fontFamily: "var(--ff-body)", maxHeight: 120 }} />

        <button onClick={sendMessage} disabled={loading || !input.trim()}
          className="p-2 rounded-xl flex-shrink-0 disabled:opacity-40"
          style={{ background: "var(--cyan)", color: "#0a0d14" }}>
          <PaperPlaneRight size={18} weight="fill" />
        </button>
      </div>

      {showPromptConfig && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl flex flex-col shadow-2xl"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
            <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--border-dim)]">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Configurar Prompt de Sistema</h2>
              <button onClick={() => setShowPromptConfig(false)} style={{ color: "var(--text-3)", padding: 4 }} className="hover:bg-[var(--border-dim)] rounded">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <textarea
                className="w-full h-80 p-4 text-[13px] rounded-xl outline-none resize-none leading-relaxed"
                style={{ background: "var(--bg-base)", color: "var(--text-1)", border: "1px solid var(--border-dim)", fontFamily: "monospace" }}
                value={systemPromptOverride}
                onChange={(e) => setSystemPromptOverride(e.target.value)}
              />
              <p className="text-[11px] mt-3" style={{ color: "var(--text-3)" }}>
                As alterações neste prompt ficam salvas temporariamente no seu navegador.
              </p>
            </div>
            <div className="px-5 py-4 border-t border-[var(--border-dim)] flex justify-end gap-3">
              <button
                onClick={() => {
                  setSystemPromptOverride(agente.systemPrompt);
                  localStorage.removeItem(`agent_prompt_${agente.slug}`);
                }}
                className="px-4 py-2 text-xs font-medium rounded-lg transition-colors hover:bg-[var(--border-dim)]"
                style={{ color: "var(--text-2)" }}>
                Restaurar Padrão
              </button>
              <button
                onClick={() => {
                  localStorage.setItem(`agent_prompt_${agente.slug}`, systemPromptOverride);
                  setShowPromptConfig(false);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-[#0a0d14] shadow-sm transition-opacity hover:opacity-90"
                style={{ background: "var(--cyan)" }}>
                Salvar Configuração
              </button>
            </div>
          </div>
        </div>
      )}

      {showCTA && CTA_TRIGGER && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
            {!ctaEnviado ? (
              <>
                <div className="relative px-6 pt-6 pb-4 text-center"
                  style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.03) 100%)", borderBottom: "1px solid var(--border-dim)" }}>
                  <button onClick={() => setShowCTA(false)}
                    className="absolute top-4 right-4 p-1 rounded-lg"
                    style={{ color: "var(--text-3)" }}>
                    <X size={18} />
                  </button>
                  <div className="text-3xl mb-3">🏠</div>
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)", letterSpacing: "-0.02em" }}>
                    Gostou da demonstração?
                  </h2>
                  <p className="text-sm mt-1.5 max-w-xs mx-auto" style={{ color: "var(--text-3)" }}>
                    Aplique um Corretor Virtual igual a este no WhatsApp da sua imobiliária com{" "}
                    <span style={{ color: "#F59E0B", fontWeight: 600 }}>7 dias gratuitos</span>.
                  </p>
                </div>

                <div className="px-6 py-5 space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-2)" }}>Nome *</label>
                    <input value={ctaNome} onChange={(e) => setCtaNome(e.target.value)} placeholder="Seu nome completo"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "var(--bg-base)", border: "1px solid var(--border-dim)", color: "var(--text-1)", fontFamily: "var(--ff-body)" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-2)" }}>WhatsApp / Telefone *</label>
                    <input value={ctaTelefone} onChange={(e) => setCtaTelefone(e.target.value)} placeholder="(11) 99999-9999" type="tel"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "var(--bg-base)", border: "1px solid var(--border-dim)", color: "var(--text-1)", fontFamily: "var(--ff-body)" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-2)" }}>E-mail <span style={{ color: "var(--text-3)" }}>(opcional)</span></label>
                    <input value={ctaEmail} onChange={(e) => setCtaEmail(e.target.value)} placeholder="seu@email.com.br" type="email"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "var(--bg-base)", border: "1px solid var(--border-dim)", color: "var(--text-1)", fontFamily: "var(--ff-body)" }} />
                  </div>
                  <button
                    disabled={ctaLoading || !ctaNome.trim() || !ctaTelefone.trim()}
                    onClick={async () => {
                      setCtaLoading(true);
                      try {
                        await fetch("/api/agentes/capturar-lead", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            nome: ctaNome.trim(),
                            email: ctaEmail.trim() || null,
                            telefone: ctaTelefone.trim(),
                            segmento: "Imobiliário",
                            origem: "demo_imobiliaria",
                          }),
                        });
                        setCtaEnviado(true);
                      } catch {
                        alert("Erro ao enviar. Tente novamente.");
                      } finally {
                        setCtaLoading(false);
                      }
                    }}
                    className="w-full py-3 rounded-xl text-sm font-semibold mt-1 disabled:opacity-50 transition-opacity hover:opacity-90"
                    style={{ background: "#F59E0B", color: "#000" }}
                  >
                    {ctaLoading ? "Enviando..." : "Quero meus 7 dias gratuitos"}
                  </button>
                  <p className="text-center text-xs pt-1" style={{ color: "var(--text-3)" }}>
                    Nossa equipe entrará em contato em até 24h. Sem compromisso.
                  </p>
                </div>
              </>
            ) : (
              <div className="px-6 py-10 text-center">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>
                  Recebemos seu interesse!
                </h2>
                <p className="text-sm" style={{ color: "var(--text-3)" }}>
                  Nossa equipe vai entrar em contato com você em até 24 horas para iniciar seu teste gratuito.
                </p>
                <button onClick={() => setShowCTA(false)}
                  className="mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "#F59E0B", color: "#000" }}>
                  Continuar conversando
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
