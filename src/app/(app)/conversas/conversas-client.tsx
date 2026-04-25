"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MagnifyingGlass, ChatCircleDots, ArrowLeft, CheckCircle, Circle,
  Plus, X, PaperPlaneRight, Microphone, Stop, Image as ImageIcon,
  Robot, Tag, Hash,
} from "@phosphor-icons/react";
import type { Conversa, Lead, MensagemConversa } from "@/types/database";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  initialConversas: Conversa[];
  leads: Pick<Lead, "id" | "nome" | "whatsapp" | "ia_ativa">[];
}

const AVATAR_COLORS = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6"];

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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function ConversasClient({ initialConversas, leads }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [conversas, setConversas] = useState<Conversa[]>(initialConversas);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Nova conversa modal
  const [showNovaConversa, setShowNovaConversa] = useState(false);
  const [novaWhatsapp, setNovaWhatsapp] = useState("");
  const [novaMensagem, setNovaMensagem] = useState("Olá! Sou a Velly, assistente da VELLO Inteligência Artificial. Como posso te ajudar hoje? 😊");
  const [enviandoNova, setEnviandoNova] = useState(false);

  // Profile photos cache: whatsapp → url | null
  const [photos, setPhotos] = useState<Record<string, string | null>>({});

  // IA toggle cache: whatsapp → boolean
  const [iaMap, setIaMap] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const l of leads) { if (l.whatsapp) m[l.whatsapp] = l.ia_ativa; }
    return m;
  });

  // Tags cache: whatsapp → string[]
  const [tagsMap, setTagsMap] = useState<Record<string, string[]>>({});
  const [showTagsPanel, setShowTagsPanel] = useState(false);
  const [tagInput, setTagInput] = useState("");

  // Message sending
  const [msgText, setMsgText] = useState("");
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const leadNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of leads) { if (l.whatsapp && l.nome) map.set(l.whatsapp, l.nome); }
    return map;
  }, [leads]);

  function contactName(conv: Conversa): string {
    return leadNames.get(conv.whatsapp) ?? conv.nome_contato ?? conv.whatsapp;
  }

  const selected = conversas.find((c) => c.id === selectedId) ?? null;

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel("conversas-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversas" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setConversas((prev) => [payload.new as Conversa, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setConversas((prev) =>
            prev.map((c) => c.id === payload.new.id ? payload.new as Conversa : c)
              .sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime())
          );
        } else if (payload.eventType === "DELETE") {
          setConversas((prev) => prev.filter((c) => c.id !== (payload.old as Conversa).id));
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, conversas]);

  // When conversation selected: fetch photo + tags if not cached
  useEffect(() => {
    if (!selected) return;
    const { whatsapp } = selected;

    if (!(whatsapp in photos)) {
      setPhotos((p) => ({ ...p, [whatsapp]: null }));
      fetch("/api/evolution/foto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp }),
      }).then((r) => r.json()).then((j) => {
        setPhotos((p) => ({ ...p, [whatsapp]: j.url ?? null }));
      }).catch(() => {});
    }

    if (!(whatsapp in tagsMap)) {
      fetch(`/api/contatos/${encodeURIComponent(whatsapp)}`)
        .then((r) => r.json())
        .then((j) => setTagsMap((t) => ({ ...t, [whatsapp]: j.tags ?? [] })))
        .catch(() => setTagsMap((t) => ({ ...t, [whatsapp]: [] })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return conversas;
    return conversas.filter((c) => {
      const name = contactName(c).toLowerCase();
      return name.includes(q) || c.whatsapp.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversas, search, leadNames]);

  function handleSelect(id: string) {
    setSelectedId(id);
    setMobileView("chat");
    setShowTagsPanel(false);
    setMsgText("");
    setImgFile(null);
    setImgPreview(null);
    setAudioBlob(null);
  }

  // ── IA Toggle ──
  async function toggleIa() {
    if (!selected) return;
    const { whatsapp } = selected;
    const current = iaMap[whatsapp] ?? true;
    const newVal = !current;
    setIaMap((m) => ({ ...m, [whatsapp]: newVal }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (createClient().from("leads") as any).update({ ia_ativa: newVal }).eq("whatsapp", whatsapp);
  }

  // ── Tags ──
  async function addTag() {
    if (!selected || !tagInput.trim()) return;
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    const current = tagsMap[selected.whatsapp] ?? [];
    if (current.includes(tag)) { setTagInput(""); return; }
    const newTags = [...current, tag];
    setTagsMap((t) => ({ ...t, [selected.whatsapp]: newTags }));
    setTagInput("");
    await fetch(`/api/contatos/${encodeURIComponent(selected.whatsapp)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
  }

  async function removeTag(tag: string) {
    if (!selected) return;
    const newTags = (tagsMap[selected.whatsapp] ?? []).filter((t) => t !== tag);
    setTagsMap((t) => ({ ...t, [selected.whatsapp]: newTags }));
    await fetch(`/api/contatos/${encodeURIComponent(selected.whatsapp)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
  }

  // ── Send helpers ──
  function appendMsgLocal(content: string) {
    setConversas((prev) => prev.map((c) => {
      if (c.id !== selectedId) return c;
      return { ...c, historico: [...c.historico, { role: "assistant" as const, content }], atualizado_em: new Date().toISOString() };
    }));
  }

  async function sendText() {
    if (!selected || !msgText.trim() || sending) return;
    const texto = msgText.trim();
    setMsgText("");
    setSending(true);
    appendMsgLocal(texto);
    await fetch("/api/evolution/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsapp: selected.whatsapp, tipo: "texto", conteudo: texto, conversaId: selected.id }),
    });
    setSending(false);
  }

  async function sendImage() {
    if (!selected || !imgFile || sending) return;
    setSending(true);
    const b64 = await fileToBase64(imgFile);
    appendMsgLocal(`[Imagem: ${imgFile.name}]`);
    setImgFile(null);
    setImgPreview(null);
    await fetch("/api/evolution/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsapp: selected.whatsapp, tipo: "imagem", conteudo: b64, nomeArquivo: imgFile.name, conversaId: selected.id }),
    });
    setSending(false);
  }

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    mediaRecorderRef.current = mr;
    audioChunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    mr.onstop = () => {
      setAudioBlob(new Blob(audioChunksRef.current, { type: "audio/ogg; codecs=opus" }));
      stream.getTracks().forEach((t) => t.stop());
    };
    mr.start();
    setRecording(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
  }, []);

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  }

  async function sendAudio() {
    if (!selected || !audioBlob || sending) return;
    setSending(true);
    const b64 = await blobToBase64(audioBlob);
    appendMsgLocal("[Áudio enviado]");
    setAudioBlob(null);
    await fetch("/api/evolution/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsapp: selected.whatsapp, tipo: "audio", conteudo: b64, conversaId: selected.id }),
    });
    setSending(false);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImgPreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // ── Nova Conversa ──
  async function iniciarConversa() {
    const numero = novaWhatsapp.replace(/\D/g, "");
    if (!numero || !novaMensagem.trim()) return;
    setEnviandoNova(true);
    try {
      const res = await fetch("/api/conversas/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: numero, mensagem: novaMensagem.trim() }),
      });
      const json = await res.json();
      if (json.ok && json.conversa) {
        setConversas((prev) => [json.conversa as Conversa, ...prev]);
        setSelectedId(json.conversa.id);
        setMobileView("chat");
        setShowNovaConversa(false);
        setNovaWhatsapp("");
        setNovaMensagem("Olá! Sou a Velly, assistente da VELLO Inteligência Artificial. Como posso te ajudar hoje? 😊");
      }
    } finally {
      setEnviandoNova(false);
    }
  }

  const selTags = selected ? (tagsMap[selected.whatsapp] ?? []) : [];
  const selIa = selected ? (iaMap[selected.whatsapp] ?? true) : true;
  const selPhoto = selected ? (photos[selected.whatsapp] ?? null) : null;

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT: list ── */}
      <div className={`flex flex-col w-full lg:w-80 xl:w-96 flex-shrink-0 ${mobileView === "chat" ? "hidden lg:flex" : "flex"}`}
        style={{ borderRight: "1px solid var(--border-dim)", background: "var(--bg-surface)" }}>
        <div className="px-4 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-semibold" style={{ color: "var(--text-1)", fontFamily: "var(--ff-title)" }}>
              Conversas WhatsApp
            </h1>
            <button onClick={() => setShowNovaConversa(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "var(--cyan)", color: "#0a0d14" }}>
              <Plus size={14} weight="bold" /> Nova
            </button>
          </div>
          <div className="relative">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou número…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)", color: "var(--text-1)", fontFamily: "var(--ff-body)" }} />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-3)" }}>{filtered.length} conversa{filtered.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: "var(--text-3)" }}>
              <ChatCircleDots size={28} /><p className="text-sm">Nenhuma conversa</p>
            </div>
          ) : filtered.map((conv) => {
            const isActive = conv.id === selectedId;
            const name = contactName(conv);
            const photo = photos[conv.whatsapp];
            return (
              <button key={conv.id} onClick={() => handleSelect(conv.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{ background: isActive ? "rgba(65,190,234,0.08)" : "transparent", borderLeft: isActive ? "3px solid var(--cyan)" : "3px solid transparent" }}>
                <ContactAvatar name={name} photo={photo} size={40} color={avatarColor(conv.whatsapp)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate" style={{ color: "var(--text-1)", fontFamily: "var(--ff-body)" }}>{name}</span>
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--text-3)" }}>{formatConvTime(conv.atualizado_em)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>{previewMsg(conv.historico)}</p>
                    {conv.finalizada
                      ? <CheckCircle size={13} className="flex-shrink-0" style={{ color: "var(--text-3)" }} />
                      : <Circle size={13} weight="fill" className="flex-shrink-0" style={{ color: "#10B981" }} />}
                  </div>
                  {/* Tags preview */}
                  {(tagsMap[conv.whatsapp]?.length ?? 0) > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {(tagsMap[conv.whatsapp] ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(65,190,234,0.12)", color: "var(--cyan)" }}>#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: chat ── */}
      <div className={`flex-1 flex flex-col overflow-hidden ${mobileView === "list" ? "hidden lg:flex" : "flex"}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ color: "var(--text-3)" }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "rgba(65,190,234,0.08)", border: "1px solid var(--border-dim)" }}>
              <ChatCircleDots size={36} style={{ color: "var(--cyan)" }} />
            </div>
            <div className="text-center">
              <p className="text-base font-medium" style={{ color: "var(--text-2)", fontFamily: "var(--ff-body)" }}>Selecione uma conversa</p>
              <p className="text-sm mt-1">Clique em um contato para ver o histórico</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--border-dim)", background: "var(--bg-surface)" }}>
              <button className="lg:hidden p-1.5 rounded-lg mr-1" style={{ color: "var(--text-3)" }} onClick={() => setMobileView("list")}>
                <ArrowLeft size={18} />
              </button>
              <ContactAvatar name={contactName(selected)} photo={selPhoto} size={36} color={avatarColor(selected.whatsapp)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--text-1)", fontFamily: "var(--ff-body)" }}>
                  {contactName(selected)}
                </p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>+{selected.whatsapp}</p>
              </div>

              {/* IA Toggle */}
              <button onClick={toggleIa} title={selIa ? "IA ativa — clique para desativar" : "IA desativada — clique para ativar"}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
                style={{
                  background: selIa ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                  color: selIa ? "#22C55E" : "#EF4444",
                  border: `1px solid ${selIa ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                }}>
                <Robot size={15} weight={selIa ? "fill" : "regular"} />
                <span className="hidden sm:inline">{selIa ? "IA On" : "IA Off"}</span>
              </button>

              {/* Tags toggle */}
              <button onClick={() => setShowTagsPanel((v) => !v)} title="Tags do contato"
                className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                style={{
                  background: showTagsPanel ? "rgba(65,190,234,0.12)" : "transparent",
                  color: showTagsPanel ? "var(--cyan)" : "var(--text-3)",
                }}>
                <Tag size={17} />
              </button>

              <span className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                style={{ background: selected.finalizada ? "rgba(107,114,128,0.12)" : "rgba(16,185,129,0.12)", color: selected.finalizada ? "#9CA3AF" : "#10B981" }}>
                {selected.finalizada ? "Encerrada" : "Ativa"}
              </span>
            </div>

            {/* Tags panel */}
            {showTagsPanel && (
              <div className="px-4 py-3 flex-shrink-0 flex flex-wrap items-center gap-2"
                style={{ borderBottom: "1px solid var(--border-dim)", background: "var(--bg-surface)" }}>
                <Hash size={14} style={{ color: "var(--text-3)" }} />
                {selTags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(65,190,234,0.12)", color: "var(--cyan)", border: "1px solid rgba(65,190,234,0.2)" }}>
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="ml-0.5 opacity-60 hover:opacity-100">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <form onSubmit={(e) => { e.preventDefault(); addTag(); }} className="flex items-center gap-1">
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    placeholder="+ nova tag"
                    className="text-xs rounded-full px-2.5 py-1 outline-none w-24"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)", color: "var(--text-2)" }} />
                  <button type="submit" className="text-xs px-2 py-1 rounded-full"
                    style={{ background: "rgba(65,190,234,0.15)", color: "var(--cyan)" }}>
                    Ok
                  </button>
                </form>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3" style={{ background: "var(--bg-base)" }}>
              {selected.historico.length === 0 ? (
                <div className="flex items-center justify-center h-full" style={{ color: "var(--text-3)" }}>
                  <p className="text-sm">Nenhuma mensagem nesta conversa</p>
                </div>
              ) : selected.historico.map((msg, i) => (
                <MessageBubble key={i} msg={msg} contactName={contactName(selected)} photo={selPhoto} avatarColor={avatarColor(selected.whatsapp)} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Image preview */}
            {imgPreview && (
              <div className="px-4 py-2 flex items-center gap-3 flex-shrink-0"
                style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-dim)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgPreview} alt="preview" className="w-16 h-16 object-cover rounded-lg" />
                <p className="text-xs flex-1 truncate" style={{ color: "var(--text-2)" }}>{imgFile?.name}</p>
                <button onClick={() => { setImgFile(null); setImgPreview(null); }} style={{ color: "var(--text-3)" }}>
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Audio preview */}
            {audioBlob && !recording && (
              <div className="px-4 py-2 flex items-center gap-3 flex-shrink-0"
                style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-dim)" }}>
                <Microphone size={18} style={{ color: "var(--cyan)" }} />
                <p className="text-xs flex-1" style={{ color: "var(--text-2)" }}>
                  Áudio gravado ({recordingSeconds}s)
                </p>
                <button onClick={() => setAudioBlob(null)} style={{ color: "var(--text-3)" }}><X size={16} /></button>
              </div>
            )}

            {/* Input bar */}
            <div className="flex items-end gap-2 px-4 py-3 flex-shrink-0"
              style={{ borderTop: "1px solid var(--border-dim)", background: "var(--bg-surface)" }}>

              {/* Image attach */}
              {!recording && !audioBlob && !imgFile && (
                <button onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl flex-shrink-0 transition-colors"
                  style={{ color: "var(--text-3)", background: "var(--bg-elevated)" }}
                  title="Enviar imagem">
                  <ImageIcon size={18} />
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

              {/* Mic / Recording */}
              {!imgFile && !audioBlob && (
                <button
                  onClick={recording ? stopRecording : startRecording}
                  className="p-2 rounded-xl flex-shrink-0 transition-all"
                  style={{
                    background: recording ? "rgba(239,68,68,0.15)" : "var(--bg-elevated)",
                    color: recording ? "#EF4444" : "var(--text-3)",
                  }}
                  title={recording ? "Parar gravação" : "Gravar áudio"}>
                  {recording ? (
                    <div className="flex items-center gap-1.5">
                      <Stop size={18} />
                      <span className="text-xs font-mono">{String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}</span>
                    </div>
                  ) : <Microphone size={18} />}
                </button>
              )}

              {/* Text input */}
              {!recording && !audioBlob && (
                <textarea
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); imgFile ? sendImage() : sendText(); } }}
                  placeholder="Digite uma mensagem…"
                  rows={1}
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none resize-none"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-dim)",
                    color: "var(--text-1)",
                    fontFamily: "var(--ff-body)",
                    maxHeight: 120,
                  }}
                />
              )}
              {recording && <div className="flex-1" />}

              {/* Send button */}
              <button
                onClick={audioBlob ? sendAudio : imgFile ? sendImage : sendText}
                disabled={sending || (recording) || (!msgText.trim() && !imgFile && !audioBlob)}
                className="p-2 rounded-xl flex-shrink-0 transition-colors disabled:opacity-40"
                style={{ background: "var(--cyan)", color: "#0a0d14" }}>
                <PaperPlaneRight size={18} weight="fill" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal: Nova Conversa */}
      {showNovaConversa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setShowNovaConversa(false)}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-dim)" }}>
              <h2 className="text-base font-semibold" style={{ color: "var(--text-1)", fontFamily: "var(--ff-title)" }}>Nova Conversa</h2>
              <button onClick={() => setShowNovaConversa(false)} style={{ color: "var(--text-3)" }}><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>Número WhatsApp *</label>
                <input className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", color: "var(--text-1)", fontFamily: "var(--ff-body)" }}
                  placeholder="5561999999999" value={novaWhatsapp} onChange={(e) => setNovaWhatsapp(e.target.value)} />
                <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Formato: DDI + DDD + número (ex: 5561999999999)</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-3)" }}>Mensagem inicial</label>
                <textarea className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", color: "var(--text-1)", fontFamily: "var(--ff-body)", resize: "none" }}
                  rows={4} value={novaMensagem} onChange={(e) => setNovaMensagem(e.target.value)} />
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: "1px solid var(--border-dim)" }}>
              <button onClick={() => setShowNovaConversa(false)} className="px-4 py-2 rounded-xl text-sm"
                style={{ color: "var(--text-2)", background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
                Cancelar
              </button>
              <button onClick={iniciarConversa} disabled={!novaWhatsapp.trim() || !novaMensagem.trim() || enviandoNova}
                className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--cyan)", color: "#0a0d14" }}>
                {enviandoNova ? "Enviando..." : "Iniciar Conversa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactAvatar({ name, photo, size, color }: { name: string; photo: string | null; size: number; color: string }) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo} alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.35 }}>
      {initials(name)}
    </div>
  );
}

function MessageBubble({ msg, contactName, photo, avatarColor: color }: {
  msg: MensagemConversa; contactName: string; photo: string | null; avatarColor: string;
}) {
  const isAssistant = msg.role === "assistant";
  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"} items-end gap-2`}>
      {isAssistant && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mb-0.5"
          style={{ background: "var(--grad)", color: "#fff" }}>
          V
        </div>
      )}
      <div className="max-w-[75%] sm:max-w-sm md:max-w-md px-3.5 py-2.5 text-sm leading-relaxed"
        style={{
          background: isAssistant ? "rgba(65,190,234,0.10)" : "var(--bg-elevated)",
          color: "var(--text-1)",
          borderRadius: isAssistant ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
          border: isAssistant ? "1px solid rgba(65,190,234,0.18)" : "1px solid var(--border-dim)",
          fontFamily: "var(--ff-body)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
        <span className="block text-xs font-semibold mb-1" style={{ color: isAssistant ? "var(--cyan)" : "var(--text-3)" }}>
          {isAssistant ? "Velly" : contactName}
        </span>
        {msg.content}
      </div>
      {!isAssistant && (
        <ContactAvatar name={contactName} photo={photo} size={28} color={color} />
      )}
    </div>
  );
}
