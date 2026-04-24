"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MagnifyingGlass,
  ChatCircleDots,
  ArrowLeft,
  CheckCircle,
  Circle,
} from "@phosphor-icons/react";
import type { Conversa, Lead, MensagemConversa } from "@/types/database";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  initialConversas: Conversa[];
  leads: Pick<Lead, "id" | "nome" | "whatsapp">[];
}

const AVATAR_COLORS = [
  "#EF4444", "#F59E0B", "#10B981",
  "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6",
];

function avatarColor(phone: string): string {
  let h = 0;
  for (const c of phone) h = ((h * 31) + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name.trim().split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "?";
}

function formatConvTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Ontem";
  return format(d, "dd/MM");
}

function previewMsg(historico: MensagemConversa[]): string {
  if (!historico.length) return "Sem mensagens";
  const last = historico[historico.length - 1];
  const prefix = last.role === "assistant" ? "Velly: " : "";
  const text = last.content.length > 55 ? last.content.slice(0, 55) + "…" : last.content;
  return prefix + text;
}

export function ConversasClient({ initialConversas, leads }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [conversas, setConversas] = useState<Conversa[]>(initialConversas);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const leadNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of leads) {
      if (l.whatsapp && l.nome) map.set(l.whatsapp, l.nome);
    }
    return map;
  }, [leads]);

  function contactName(conv: Conversa): string {
    return leadNames.get(conv.whatsapp) ?? conv.nome_contato ?? conv.whatsapp;
  }

  useEffect(() => {
    const channel = supabase
      .channel("conversas-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversas" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setConversas((prev) => [payload.new as Conversa, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setConversas((prev) =>
              prev
                .map((c) => (c.id === payload.new.id ? (payload.new as Conversa) : c))
                .sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime())
            );
          } else if (payload.eventType === "DELETE") {
            setConversas((prev) => prev.filter((c) => c.id !== (payload.old as Conversa).id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, conversas]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return conversas;
    return conversas.filter((c) => {
      const name = contactName(c).toLowerCase();
      return name.includes(q) || c.whatsapp.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversas, search, leadNames]);

  const selected = conversas.find((c) => c.id === selectedId) ?? null;

  function handleSelect(id: string) {
    setSelectedId(id);
    setMobileView("chat");
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT: Conversation list ── */}
      <div
        className={`flex flex-col w-full lg:w-80 xl:w-96 flex-shrink-0 ${mobileView === "chat" ? "hidden lg:flex" : "flex"}`}
        style={{ borderRight: "1px solid var(--border-dim)", background: "var(--bg-surface)" }}
      >
        {/* Header + search */}
        <div className="px-4 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <h1
            className="text-base font-semibold mb-3"
            style={{ color: "var(--text-1)", fontFamily: "var(--ff-title)" }}
          >
            Conversas WhatsApp
          </h1>
          <div className="relative">
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-3)" }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou número…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-dim)",
                color: "var(--text-1)",
                fontFamily: "var(--ff-body)",
              }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-3)" }}>
            {filtered.length} conversa{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: "var(--text-3)" }}>
              <ChatCircleDots size={28} />
              <p className="text-sm">Nenhuma conversa</p>
            </div>
          ) : (
            filtered.map((conv) => {
              const isActive = conv.id === selectedId;
              const name = contactName(conv);
              const color = avatarColor(conv.whatsapp);
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelect(conv.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                  style={{
                    background: isActive ? "rgba(65,190,234,0.08)" : "transparent",
                    borderLeft: isActive ? "3px solid var(--cyan)" : "3px solid transparent",
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: color }}
                  >
                    {initials(name)}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--text-1)", fontFamily: "var(--ff-body)" }}
                      >
                        {name}
                      </span>
                      <span className="text-xs flex-shrink-0" style={{ color: "var(--text-3)" }}>
                        {formatConvTime(conv.atualizado_em)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>
                        {previewMsg(conv.historico)}
                      </p>
                      {conv.finalizada ? (
                        <CheckCircle size={13} className="flex-shrink-0" style={{ color: "var(--text-3)" }} />
                      ) : (
                        <Circle size={13} weight="fill" className="flex-shrink-0" style={{ color: "#10B981" }} />
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT: Chat view ── */}
      <div className={`flex-1 flex flex-col overflow-hidden ${mobileView === "list" ? "hidden lg:flex" : "flex"}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ color: "var(--text-3)" }}>
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "rgba(65,190,234,0.08)", border: "1px solid var(--border-dim)" }}
            >
              <ChatCircleDots size={36} style={{ color: "var(--cyan)" }} />
            </div>
            <div className="text-center">
              <p className="text-base font-medium" style={{ color: "var(--text-2)", fontFamily: "var(--ff-body)" }}>
                Selecione uma conversa
              </p>
              <p className="text-sm mt-1">Clique em um contato para ver o histórico</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--border-dim)", background: "var(--bg-surface)" }}
            >
              <button
                className="lg:hidden p-1.5 rounded-lg mr-1"
                style={{ color: "var(--text-3)" }}
                onClick={() => setMobileView("list")}
              >
                <ArrowLeft size={18} />
              </button>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: avatarColor(selected.whatsapp) }}
              >
                {initials(contactName(selected))}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: "var(--text-1)", fontFamily: "var(--ff-body)" }}
                >
                  {contactName(selected)}
                </p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>
                  +{selected.whatsapp}
                </p>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
                style={{
                  background: selected.finalizada ? "rgba(107,114,128,0.12)" : "rgba(16,185,129,0.12)",
                  color: selected.finalizada ? "#9CA3AF" : "#10B981",
                }}
              >
                {selected.finalizada ? "Encerrada" : "Ativa"}
              </span>
              <span
                className="text-xs px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: "var(--bg-elevated)", color: "var(--text-3)" }}
              >
                {selected.historico.length} msg
              </span>
            </div>

            {/* Messages area */}
            <div
              className="flex-1 overflow-y-auto px-4 py-5 space-y-3"
              style={{ background: "var(--bg-base)" }}
            >
              {selected.historico.length === 0 ? (
                <div className="flex items-center justify-center h-full" style={{ color: "var(--text-3)" }}>
                  <p className="text-sm">Nenhuma mensagem nesta conversa</p>
                </div>
              ) : (
                selected.historico.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} contactName={contactName(selected)} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer with timestamps */}
            <div
              className="px-4 py-2 flex items-center justify-between flex-shrink-0"
              style={{ borderTop: "1px solid var(--border-dim)", background: "var(--bg-surface)" }}
            >
              <span className="text-xs" style={{ color: "var(--text-3)" }}>
                Início: {format(new Date(selected.criado_em), "d MMM yyyy, HH:mm", { locale: ptBR })}
              </span>
              <span className="text-xs" style={{ color: "var(--text-3)" }}>
                Última atualização: {format(new Date(selected.atualizado_em), "d MMM yyyy, HH:mm", { locale: ptBR })}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg, contactName }: { msg: MensagemConversa; contactName: string }) {
  const isAssistant = msg.role === "assistant";

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"} items-end gap-2`}>
      {isAssistant && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mb-0.5"
          style={{ background: "var(--grad)", color: "#fff" }}
        >
          V
        </div>
      )}
      <div
        className="max-w-[75%] sm:max-w-sm md:max-w-md px-3.5 py-2.5 text-sm leading-relaxed"
        style={{
          background: isAssistant ? "rgba(65,190,234,0.10)" : "var(--bg-elevated)",
          color: "var(--text-1)",
          borderRadius: isAssistant ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
          border: isAssistant
            ? "1px solid rgba(65,190,234,0.18)"
            : "1px solid var(--border-dim)",
          fontFamily: "var(--ff-body)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        <span
          className="block text-xs font-semibold mb-1"
          style={{ color: isAssistant ? "var(--cyan)" : "var(--text-3)" }}
        >
          {isAssistant ? "Velly" : contactName}
        </span>
        {msg.content}
      </div>
    </div>
  );
}
