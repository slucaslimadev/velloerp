"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, PaperPlaneRight, Microphone, Stop,
  Paperclip, X, FilePdf, Image as ImageIcon,
} from "@phosphor-icons/react";
import type { AgenteConfig } from "@/lib/agentes/config";
import type { ChatMessage } from "@/app/api/agentes/chat/route";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ChatClient({ agente }: { agente: AgenteConfig }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [pendingFile, setPendingFile] = useState<ChatMessage["arquivo"] | null>(null);
  const [pendingFileLabel, setPendingFileLabel] = useState<string | null>(null);
  const [processandoArquivo, setProcessandoArquivo] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const texto = input.trim();
    if (!texto && !pendingFile) return;
    if (loading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: texto,
      arquivo: pendingFile ?? undefined,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setPendingFile(null);
    setPendingFileLabel(null);
    setLoading(true);

    try {
      const res = await fetch("/api/agentes/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: agente.slug, messages: nextMessages }),
      });
      const json = await res.json();
      if (json.resposta) {
        setMessages((prev) => [...prev, { role: "assistant", content: json.resposta }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  }

  async function processarArquivo(file: File) {
    setProcessandoArquivo(true);
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    const isAudio = file.type.startsWith("audio/");

    if (!isImage && !isPdf && !isAudio) {
      alert("Formato não suportado. Envie PDF, imagem ou áudio.");
      setProcessandoArquivo(false);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      const tipo = isImage ? "image" : isPdf ? "pdf" : "audio";
      const res = await fetch("/api/agentes/processar-arquivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, base64, mediaType: file.type, nome: file.name, ext: `.${file.name.split(".").pop()}` }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setPendingFile(json);
      setPendingFileLabel(file.name);
    } catch (err) {
      alert("Erro ao processar arquivo: " + (err instanceof Error ? err.message : "desconhecido"));
    } finally {
      setProcessandoArquivo(false);
    }
  }

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    mediaRecorderRef.current = mr;
    audioChunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(audioChunksRef.current, { type: "audio/ogg; codecs=opus" });
      const base64 = await blobToBase64(blob);
      setProcessandoArquivo(true);
      try {
        const res = await fetch("/api/agentes/processar-arquivo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: "audio", base64, nome: "áudio.ogg", ext: ".ogg" }),
        });
        const json = await res.json();
        if (json.texto) {
          // Send transcription directly as message
          setInput(json.texto);
        }
      } finally {
        setProcessandoArquivo(false);
      }
    };
    mr.start();
    setRecording(true);
    setRecordingSec(0);
    recordingTimerRef.current = setInterval(() => setRecordingSec((s) => s + 1), 1000);
  }, []);

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-dim)", background: "var(--bg-surface)" }}>
        <Link href="/agentes" className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-3)" }}>
          <ArrowLeft size={18} />
        </Link>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: `${agente.cor}18`, border: `1px solid ${agente.cor}30` }}>
          {agente.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>{agente.nome}</p>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>{agente.segmento} · powered by VELLO IA</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-medium" style={{ color: "#22C55E" }}>Online</span>
        </div>
      </div>

      {/* Messages */}
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
                <button key={s} onClick={() => { setInput(s); }}
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
            <div className="max-w-[80%] space-y-1.5">
              {/* File attachment badge */}
              {msg.arquivo && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                  style={{
                    background: msg.role === "user" ? "rgba(65,190,234,0.08)" : "var(--bg-elevated)",
                    border: "1px solid var(--border-dim)",
                  }}>
                  {msg.arquivo.tipo === "image" ? <ImageIcon size={14} style={{ color: "var(--cyan)" }} /> : <FilePdf size={14} style={{ color: "#EF4444" }} />}
                  <span style={{ color: "var(--text-2)" }}>{msg.arquivo.nome}</span>
                </div>
              )}
              {/* Message bubble */}
              {(msg.content || msg.arquivo?.tipo === "audio_transcricao") && (
                <div className="px-4 py-3 text-sm leading-relaxed"
                  style={{
                    background: msg.role === "user" ? "rgba(65,190,234,0.12)" : "var(--bg-elevated)",
                    color: "var(--text-1)",
                    borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                    border: msg.role === "user" ? "1px solid rgba(65,190,234,0.18)" : "1px solid var(--border-dim)",
                    fontFamily: "var(--ff-body)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}>
                  {msg.arquivo?.tipo === "audio_transcricao" && (
                    <span className="block text-xs mb-1.5 flex items-center gap-1" style={{ color: "var(--text-3)" }}>
                      🎤 Áudio transcrito
                    </span>
                  )}
                  {msg.content}
                </div>
              )}
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

      {/* File pending preview */}
      {pendingFileLabel && (
        <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0"
          style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-dim)" }}>
          <FilePdf size={16} style={{ color: "var(--cyan)" }} />
          <span className="text-xs flex-1 truncate" style={{ color: "var(--text-2)" }}>{pendingFileLabel}</span>
          <button onClick={() => { setPendingFile(null); setPendingFileLabel(null); }}
            style={{ color: "var(--text-3)" }}>
            <X size={15} />
          </button>
        </div>
      )}

      {processandoArquivo && (
        <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0"
          style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-dim)" }}>
          <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin inline-block" />
          <span className="text-xs" style={{ color: "var(--text-3)" }}>
            {recording ? "Transcrevendo áudio..." : "Processando arquivo..."}
          </span>
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-end gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderTop: "1px solid var(--border-dim)", background: "var(--bg-surface)" }}>

        {/* File picker */}
        {!recording && (
          <button onClick={() => fileInputRef.current?.click()} title="Anexar PDF ou imagem"
            className="p-2 rounded-xl flex-shrink-0"
            style={{ background: "var(--bg-elevated)", color: "var(--text-3)" }}>
            <Paperclip size={18} />
          </button>
        )}
        <input ref={fileInputRef} type="file" accept=".pdf,image/*,audio/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) processarArquivo(f); e.target.value = ""; }} />

        {/* Mic */}
        {!pendingFile && (
          <button onClick={recording ? stopRecording : startRecording} title={recording ? "Parar gravação" : "Gravar áudio"}
            className="p-2 rounded-xl flex-shrink-0 transition-colors"
            style={{ background: recording ? "rgba(239,68,68,0.15)" : "var(--bg-elevated)", color: recording ? "#EF4444" : "var(--text-3)" }}>
            {recording
              ? <span className="flex items-center gap-1.5"><Stop size={18} /><span className="text-xs font-mono">{fmt(recordingSec)}</span></span>
              : <Microphone size={18} />}
          </button>
        )}

        {/* Text */}
        {!recording && (
          <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Digite uma mensagem…"
            rows={1} disabled={loading || processandoArquivo}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none resize-none"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)", color: "var(--text-1)", fontFamily: "var(--ff-body)", maxHeight: 120 }} />
        )}
        {recording && <div className="flex-1 text-xs text-center" style={{ color: "#EF4444" }}>Gravando... clique em Stop para enviar</div>}

        {/* Send */}
        <button onClick={sendMessage} disabled={loading || recording || processandoArquivo || (!input.trim() && !pendingFile)}
          className="p-2 rounded-xl flex-shrink-0 disabled:opacity-40"
          style={{ background: "var(--cyan)", color: "#0a0d14" }}>
          <PaperPlaneRight size={18} weight="fill" />
        </button>
      </div>
    </div>
  );
}
