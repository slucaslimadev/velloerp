"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Plus, PencilSimple, Trash, Link as LinkIcon, Check, ArrowLeft, ArrowRight, FloppyDisk, Robot, Sparkle, ChatCircle, MagicWand } from "@phosphor-icons/react";
import type { AgenteConfig } from "@/lib/agentes/config";

// ─── Constants ────────────────────────────────────────────────────────────────

const CORES_PRESET = [
  "#41BEEA", "#8B5CF6", "#10B981", "#F59E0B",
  "#EF4444", "#3B82F6", "#EC4899", "#F97316",
  "#14B8A6", "#6366F1", "#84CC16", "#06B6D4",
];

const EMOJIS_SUGERIDOS = [
  "🤖", "🧑‍💼", "🏠", "🎯", "💬", "📊",
  "⚕️", "🎓", "💰", "🛒", "🏥", "📋",
  "🚗", "✈️", "🍽️", "⚖️", "🔧", "📱",
];

const MODELOS = [
  { value: "gpt-4o", label: "GPT-4o", desc: "Mais inteligente, suporta imagens" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Rápido e econômico" },
  { value: "gpt-4.1-nano", label: "GPT-4.1 Nano", desc: "Ultra rápido, básico" },
];

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardForm {
  nome: string;
  emoji: string;
  cor: string;
  segmento: string;
  descricao: string;
  systemPrompt: string;
  modelo: string;
  sugestoes: string[];
  sugestaoInput: string;
}

const DEFAULT_FORM: WizardForm = {
  nome: "", emoji: "🤖", cor: "#41BEEA", segmento: "",
  descricao: "", systemPrompt: "", modelo: "gpt-4o-mini",
  sugestoes: [], sugestaoInput: "",
};

interface PreviewMessage { role: "user" | "assistant"; content: string; }

// ─── Input style helpers ──────────────────────────────────────────────────────

const inputStyle = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-dim)",
  color: "var(--text-1)",
  fontFamily: "var(--ff-body)",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function AgentesClient({ agentes: initialAgentes }: { agentes: AgenteConfig[] }) {
  const [agentes, setAgentes] = useState<AgenteConfig[]>(initialAgentes);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<WizardForm>(DEFAULT_FORM);
  const [salvando, setSalvando] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [gerandoPrompt, setGerandoPrompt] = useState(false);

  // Step 4 preview
  const [previewMsgs, setPreviewMsgs] = useState<PreviewMessage[]>([]);
  const [previewInput, setPreviewInput] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    previewEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [previewMsgs]);

  // ─── Gallery actions ─────────────────────────────────────────────────────

  function openNew() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setStep(1);
    setPreviewMsgs([]);
    setPreviewInput("");
    setShowWizard(true);
  }

  function openEdit(agente: AgenteConfig) {
    setEditingId(agente.id ?? null);
    setForm({
      nome: agente.nome,
      emoji: agente.emoji,
      cor: agente.cor,
      segmento: agente.segmento,
      descricao: agente.descricao,
      systemPrompt: agente.systemPrompt,
      modelo: agente.modelo,
      sugestoes: agente.sugestoes ?? [],
      sugestaoInput: "",
    });
    setStep(1);
    setPreviewMsgs([]);
    setPreviewInput("");
    setShowWizard(true);
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/demo/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(slug);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function deletar(id: string) {
    const { error } = await fetch(`/api/agentes/demo/${id}`, { method: "DELETE" }).then((r) => r.json());
    if (!error) {
      setAgentes((prev) => prev.filter((a) => a.id !== id));
      setConfirmDelete(null);
    }
  }

  // ─── Wizard actions ──────────────────────────────────────────────────────

  function setF<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addSugestao() {
    const s = form.sugestaoInput.trim();
    if (!s || form.sugestoes.includes(s)) return;
    setF("sugestoes", [...form.sugestoes, s]);
    setF("sugestaoInput", "");
  }

  function removeSugestao(i: number) {
    setF("sugestoes", form.sugestoes.filter((_, idx) => idx !== i));
  }

  async function salvar() {
    if (!form.nome.trim() || !form.systemPrompt.trim()) return;
    setSalvando(true);
    try {
      const body = {
        nome: form.nome, emoji: form.emoji, cor: form.cor,
        segmento: form.segmento, descricao: form.descricao,
        systemPrompt: form.systemPrompt, modelo: form.modelo,
        sugestoes: form.sugestoes,
      };

      let res: Response;
      if (editingId) {
        res = await fetch(`/api/agentes/demo/${editingId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/agentes/demo", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
      }

      const json = await res.json();
      if (json.agente) {
        const saved: AgenteConfig = {
          id: json.agente.id,
          slug: json.agente.slug,
          nome: json.agente.nome,
          emoji: json.agente.emoji,
          cor: json.agente.cor,
          segmento: json.agente.segmento,
          descricao: json.agente.descricao,
          systemPrompt: json.agente.system_prompt,
          modelo: json.agente.modelo,
          sugestoes: json.agente.sugestoes ?? [],
          ativo: json.agente.ativo,
        };
        if (editingId) {
          setAgentes((prev) => prev.map((a) => a.id === editingId ? saved : a));
        } else {
          setAgentes((prev) => [saved, ...prev]);
        }
      }
      setShowWizard(false);
    } finally {
      setSalvando(false);
    }
  }

  async function gerarPromptComIA() {
    setGerandoPrompt(true);
    try {
      const res = await fetch("/api/agentes/gerar-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: form.nome, segmento: form.segmento, descricao: form.descricao }),
      });
      const json = await res.json();
      if (json.systemPrompt) setF("systemPrompt", json.systemPrompt);
    } finally {
      setGerandoPrompt(false);
    }
  }

  async function sendPreview() {
    const text = previewInput.trim();
    if (!text || previewLoading) return;
    const userMsg: PreviewMessage = { role: "user", content: text };
    setPreviewMsgs((prev) => [...prev, userMsg]);
    setPreviewInput("");
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/agentes/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "__preview__",
          messages: [...previewMsgs, userMsg],
          systemPromptOverride: form.systemPrompt,
          modeloOverride: form.modelo,
        }),
      });
      const json = await res.json();
      setPreviewMsgs((prev) => [...prev, { role: "assistant", content: json.resposta || "Erro ao processar." }]);
    } finally {
      setPreviewLoading(false);
    }
  }

  const slug = slugify(form.nome);
  const canAdvance1 = form.nome.trim().length > 0;
  const canAdvance2 = form.systemPrompt.trim().length > 0;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Gallery ── */}
      <div className="p-6 lg:p-8 max-w-[1100px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--ff-head)", letterSpacing: "-0.02em", color: "var(--text-1)" }}>
              Demonstração de Agentes
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
              Agentes de IA que seus clientes podem testar — suportam texto, áudio e documentos
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: "var(--cyan)", color: "#0a0d14" }}
          >
            <Plus size={16} weight="bold" />
            Novo Agente
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {agentes.map((agente) => (
            <div
              key={agente.slug}
              className="group flex flex-col rounded-2xl p-5"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}
            >
              {/* Icon + actions */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${agente.cor}18`, border: `1px solid ${agente.cor}30` }}>
                  {agente.emoji}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Copy link */}
                  <button
                    onClick={() => copyLink(agente.slug)}
                    title="Copiar link público"
                    className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                    style={{ color: copied === agente.slug ? "#22c55e" : "var(--text-3)" }}
                  >
                    {copied === agente.slug ? <Check size={15} weight="bold" /> : <LinkIcon size={15} />}
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => openEdit(agente)}
                    title="Editar agente"
                    className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                    style={{ color: "var(--text-3)" }}
                  >
                    <PencilSimple size={15} />
                  </button>
                  {/* Delete — only DB agents */}
                  {agente.id && (
                    confirmDelete === agente.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deletar(agente.id!)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold"
                          style={{ background: "#EF4444", color: "#fff" }}
                        >
                          Excluir
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 rounded-lg text-xs"
                          style={{ color: "var(--text-3)" }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(agente.id!)}
                        title="Excluir agente"
                        className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                        style={{ color: "var(--text-3)" }}
                      >
                        <Trash size={15} />
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Info */}
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>
                {agente.nome}
              </p>
              <p className="text-xs leading-relaxed flex-1" style={{ color: "var(--text-3)" }}>
                {agente.descricao || "Sem descrição."}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid var(--border-dim)" }}>
                <span className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: `${agente.cor}15`, color: agente.cor }}>
                  {agente.segmento || "Geral"}
                </span>
                <Link href={`/agentes/${agente.slug}`}
                  className="text-xs font-semibold hover:opacity-70 transition-opacity"
                  style={{ color: "var(--cyan)" }}>
                  Testar →
                </Link>
              </div>
            </div>
          ))}

          {/* Add new placeholder */}
          <button
            onClick={openNew}
            className="flex flex-col items-center justify-center rounded-2xl p-5 gap-3 hover:opacity-70 transition-opacity"
            style={{ background: "var(--bg-surface)", border: "1px dashed var(--border-dim)", opacity: 0.6 }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(65,190,234,0.08)", border: "1px dashed rgba(65,190,234,0.3)" }}>
              <Plus size={22} style={{ color: "var(--cyan)" }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>Criar novo agente</p>
          </button>
        </div>

        {/* Capabilities */}
        <div className="mt-10 p-5 rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-3)" }}>
            Todos os agentes suportam
          </p>
          <div className="flex flex-wrap gap-3">
            {[{ icon: "💬", label: "Texto" }, { icon: "🎤", label: "Áudio (voz)" }, { icon: "📄", label: "PDF" }, { icon: "🖼️", label: "Imagens" }].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(65,190,234,0.08)", border: "1px solid rgba(65,190,234,0.12)" }}>
                <span>{icon}</span>
                <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Wizard Modal ── */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div
            className="w-full flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)", maxWidth: 680, maxHeight: "90vh" }}
          >
            {/* Wizard header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
              <div className="flex items-center gap-4">
                <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                  {editingId ? "Editar Agente" : "Novo Agente"}
                </p>
                {/* Step indicators */}
                <div className="flex items-center gap-1.5">
                  {([1, 2, 3, 4] as const).map((s) => (
                    <div key={s} className="flex items-center gap-1.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                        style={{
                          background: step === s ? "var(--cyan)" : step > s ? "rgba(65,190,234,0.2)" : "var(--bg-surface)",
                          color: step === s ? "#0a0d14" : step > s ? "var(--cyan)" : "var(--text-3)",
                        }}
                      >
                        {step > s ? <Check size={11} weight="bold" /> : s}
                      </div>
                      {s < 4 && <div className="w-6 h-px" style={{ background: step > s ? "var(--cyan)" : "var(--border-dim)" }} />}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowWizard(false)} className="text-xs hover:opacity-70" style={{ color: "var(--text-3)" }}>
                Fechar
              </button>
            </div>

            {/* Step content */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* ── Step 1: Identidade ── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>
                      Identidade do Agente
                    </h2>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>
                      Como o agente se apresenta para os clientes.
                    </p>
                  </div>

                  {/* Nome + Emoji */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-2)" }}>Nome *</label>
                      <input
                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                        style={inputStyle}
                        placeholder="ex: Assistente de Vendas"
                        value={form.nome}
                        onChange={(e) => setF("nome", e.target.value)}
                      />
                      {form.nome && (
                        <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                          URL: /demo/<span style={{ color: "var(--cyan)" }}>{slug}</span>
                        </p>
                      )}
                    </div>
                    <div style={{ width: 80 }}>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-2)" }}>Emoji</label>
                      <input
                        className="w-full rounded-xl px-3 py-2.5 text-2xl text-center outline-none"
                        style={inputStyle}
                        maxLength={2}
                        value={form.emoji}
                        onChange={(e) => setF("emoji", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Emoji suggestions */}
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS_SUGERIDOS.map((e) => (
                      <button key={e} onClick={() => setF("emoji", e)}
                        className="w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: form.emoji === e ? "rgba(65,190,234,0.2)" : "var(--bg-surface)", border: `1px solid ${form.emoji === e ? "var(--cyan)" : "var(--border-dim)"}` }}>
                        {e}
                      </button>
                    ))}
                  </div>

                  {/* Segmento */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-2)" }}>Segmento</label>
                    <input
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={inputStyle}
                      placeholder="ex: Imobiliárias, Clínicas, E-commerce..."
                      value={form.segmento}
                      onChange={(e) => setF("segmento", e.target.value)}
                    />
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-2)" }}>Descrição curta</label>
                    <textarea
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                      style={inputStyle}
                      rows={2}
                      placeholder="O que este agente faz? Aparece no card da galeria."
                      value={form.descricao}
                      onChange={(e) => setF("descricao", e.target.value)}
                    />
                  </div>

                  {/* Cor */}
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-2)" }}>Cor de destaque</label>
                    <div className="flex flex-wrap gap-2">
                      {CORES_PRESET.map((c) => (
                        <button key={c} onClick={() => setF("cor", c)}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                          style={{ background: c, border: form.cor === c ? "3px solid white" : "3px solid transparent" }}>
                          {form.cor === c && <Check size={13} weight="bold" color="#000" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Instruções ── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>
                      Instruções do Agente
                    </h2>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>
                      O system prompt define o comportamento, tom e limitações do agente.
                    </p>
                  </div>

                  {/* Modelo */}
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-2)" }}>Modelo de IA</label>
                    <div className="flex flex-col gap-2">
                      {MODELOS.map((m) => (
                        <label key={m.value} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                          style={{ background: form.modelo === m.value ? "rgba(65,190,234,0.08)" : "var(--bg-surface)", border: `1px solid ${form.modelo === m.value ? "rgba(65,190,234,0.4)" : "var(--border-dim)"}` }}>
                          <input type="radio" name="modelo" value={m.value} checked={form.modelo === m.value} onChange={() => setF("modelo", m.value)} className="hidden" />
                          <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ border: `2px solid ${form.modelo === m.value ? "var(--cyan)" : "var(--border-dim)"}` }}>
                            {form.modelo === m.value && <div className="w-2 h-2 rounded-full" style={{ background: "var(--cyan)" }} />}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{m.label}</p>
                            <p className="text-xs" style={{ color: "var(--text-3)" }}>{m.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* System Prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>System Prompt *</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: "var(--text-3)" }}>{form.systemPrompt.length} chars</span>
                        <button
                          onClick={gerarPromptComIA}
                          disabled={gerandoPrompt || !form.nome.trim()}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all hover:opacity-80"
                          style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}
                          title="Gera um system prompt com IA usando as informações da etapa 1"
                        >
                          <MagicWand size={13} weight="fill" />
                          {gerandoPrompt ? "Gerando..." : "Melhorar com IA"}
                        </button>
                      </div>
                    </div>
                    <textarea
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none font-mono"
                      style={{ ...inputStyle, minHeight: 220, lineHeight: 1.6, fontSize: 13 }}
                      placeholder={`Você é [nome do agente], assistente de [empresa/segmento].\n\nSua função é...\n\nRegras:\n- Responda sempre em português\n- Seja cordial e profissional\n- ...`}
                      value={form.systemPrompt}
                      onChange={(e) => setF("systemPrompt", e.target.value)}
                    />
                    <div className="mt-2 p-3 rounded-lg" style={{ background: "rgba(65,190,234,0.05)", border: "1px solid rgba(65,190,234,0.12)" }}>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--cyan)" }}>
                        <Sparkle size={12} className="inline mr-1" />
                        Dicas para um bom prompt
                      </p>
                      <ul className="text-xs space-y-0.5" style={{ color: "var(--text-3)" }}>
                        <li>• Defina quem é o agente e para qual empresa</li>
                        <li>• Descreva o que ele faz e o que evita fazer</li>
                        <li>• Especifique o tom (formal, informal, empático)</li>
                        <li>• Inclua informações relevantes (vagas, produtos, FAQ)</li>
                        <li>• Adicione uma CTA no final da conversa</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: Sugestões ── */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>
                      Sugestões de Mensagem
                    </h2>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>
                      Chips de resposta rápida que aparecem no início do chat para guiar o usuário.
                    </p>
                  </div>

                  {/* Add suggestion */}
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={inputStyle}
                      placeholder='ex: "Quero saber os preços"'
                      value={form.sugestaoInput}
                      onChange={(e) => setF("sugestaoInput", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSugestao()}
                    />
                    <button
                      onClick={addSugestao}
                      disabled={!form.sugestaoInput.trim()}
                      className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-opacity"
                      style={{ background: "rgba(65,190,234,0.15)", color: "var(--cyan)", border: "1px solid rgba(65,190,234,0.3)" }}
                    >
                      <Plus size={16} weight="bold" />
                    </button>
                  </div>

                  {/* Suggestions list */}
                  <div className="flex flex-col gap-2">
                    {form.sugestoes.length === 0 && (
                      <div className="text-center py-8" style={{ color: "var(--text-3)" }}>
                        <ChatCircle size={28} className="mx-auto mb-2 opacity-40" />
                        <p className="text-xs">Nenhuma sugestão ainda. É opcional.</p>
                      </div>
                    )}
                    {form.sugestoes.map((s, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
                        <span className="text-sm" style={{ color: "var(--text-1)" }}>{s}</span>
                        <button onClick={() => removeSugestao(i)} className="hover:opacity-70 transition-opacity ml-2" style={{ color: "var(--text-3)" }}>
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 4: Testar ── */}
              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>
                      Testar ao Vivo
                    </h2>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>
                      Converse com o agente usando o system prompt que você definiu. Volte e ajuste se necessário.
                    </p>
                  </div>

                  {/* Agent preview card */}
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${form.cor}18`, border: `1px solid ${form.cor}30` }}>
                      {form.emoji}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{form.nome || "Agente"}</p>
                      <p className="text-xs" style={{ color: "var(--text-3)" }}>{form.segmento || "Geral"} · {MODELOS.find(m => m.value === form.modelo)?.label}</p>
                    </div>
                  </div>

                  {/* Chat area */}
                  <div className="flex flex-col rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-dim)", height: 300 }}>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {previewMsgs.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: "var(--text-3)" }}>
                          <Robot size={28} className="opacity-40" />
                          <p className="text-xs">Envie uma mensagem para testar o agente</p>
                        </div>
                      )}
                      {previewMsgs.map((m, i) => (
                        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div
                            className="max-w-[80%] px-3 py-2 rounded-2xl text-sm"
                            style={{
                              background: m.role === "user" ? "var(--cyan)" : "var(--bg-surface)",
                              color: m.role === "user" ? "#0a0d14" : "var(--text-1)",
                              borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                            }}
                          >
                            {m.content}
                          </div>
                        </div>
                      ))}
                      {previewLoading && (
                        <div className="flex justify-start">
                          <div className="px-3 py-2 rounded-2xl text-sm" style={{ background: "var(--bg-surface)", color: "var(--text-3)", borderRadius: "18px 18px 18px 4px" }}>
                            Digitando...
                          </div>
                        </div>
                      )}
                      <div ref={previewEndRef} />
                    </div>
                    <div className="flex gap-2 p-3 flex-shrink-0" style={{ borderTop: "1px solid var(--border-dim)" }}>
                      <input
                        className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                        style={inputStyle}
                        placeholder="Envie uma mensagem..."
                        value={previewInput}
                        onChange={(e) => setPreviewInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendPreview()}
                        disabled={previewLoading}
                      />
                      <button
                        onClick={sendPreview}
                        disabled={!previewInput.trim() || previewLoading}
                        className="px-3 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-opacity"
                        style={{ background: "var(--cyan)", color: "#0a0d14" }}
                      >
                        →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard footer */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--border-dim)" }}>
              <button
                onClick={() => step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3 | 4) : setShowWizard(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm"
                style={{ color: "var(--text-2)", background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}
              >
                <ArrowLeft size={15} />
                {step === 1 ? "Cancelar" : "Voltar"}
              </button>

              {step < 4 ? (
                <button
                  onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
                  disabled={(step === 1 && !canAdvance1) || (step === 2 && !canAdvance2)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity"
                  style={{ background: "var(--cyan)", color: "#0a0d14" }}
                >
                  Próximo
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  onClick={salvar}
                  disabled={salvando}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity"
                  style={{ background: "var(--cyan)", color: "#0a0d14" }}
                >
                  <FloppyDisk size={15} weight="bold" />
                  {salvando ? "Salvando..." : "Salvar Agente"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
