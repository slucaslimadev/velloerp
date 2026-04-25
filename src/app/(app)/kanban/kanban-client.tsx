"use client";

import { useState, useCallback } from "react";
import {
  DndContext, DragOverlay, closestCorners,
  type DragStartEvent, type DragEndEvent,
  PointerSensor, useSensor, useSensors, useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Lead, LeadStatus } from "@/types/database";
import { ClassificacaoBadge } from "@/components/shared/ClassificacaoBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import {
  User, Star, DotsSixVertical, Lightning, ClipboardText,
  Scales, CheckCircle, XCircle, X, WhatsappLogo, EnvelopeSimple,
  Buildings, Tag, Calendar,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ESTAGIOS: { id: LeadStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "Novo",            label: "Novo Lead",       icon: <Lightning size={16} weight="duotone" />,    color: "#41BEEA" },
  { id: "Em Qualificação", label: "Em Qualificação", icon: <ClipboardText size={16} weight="duotone" />, color: "#F59E0B" },
  { id: "Proposta Enviada",label: "Proposta Enviada",icon: <ClipboardText size={16} weight="duotone" />, color: "#8B5CF6" },
  { id: "Em Negociação",   label: "Em Negociação",   icon: <Scales size={16} weight="duotone" />,        color: "#F97316" },
  { id: "Fechado Ganho",   label: "Fechado Ganho",   icon: <CheckCircle size={16} weight="duotone" />,   color: "#22C55E" },
  { id: "Fechado Perdido", label: "Fechado Perdido", icon: <XCircle size={16} weight="duotone" />,       color: "#EF4444" },
];

export function KanbanClient({ leads: initialLeads }: { leads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const getLeadsForEstagio = useCallback((e: LeadStatus) => leads.filter((l) => l.status === e), [leads]);
  const activeLead = leads.find((l) => l.id === activeId);

  function resolveTargetColumn(overId: string): LeadStatus | null {
    const col = ESTAGIOS.find((e) => e.id === overId);
    if (col) return col.id;
    return (leads.find((l) => l.id === overId)?.status as LeadStatus) ?? null;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
    setIsDragActive(true);
    setSelectedLead(null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setTimeout(() => setIsDragActive(false), 50);
    if (!over) return;

    const leadId = active.id as string;
    const newStatus = resolveTargetColumn(over.id as string);
    if (!newStatus) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("leads") as any).update({ status: newStatus }).eq("id", leadId);
  }

  function handleCardClick(lead: Lead) {
    if (isDragActive) return;
    setSelectedLead((prev) => prev?.id === lead.id ? null : lead);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Board area */}
      <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-hidden min-w-0">
        <div className="mb-6 flex-shrink-0">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--ff-head)", letterSpacing: "-0.02em" }}>Kanban</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
            {leads.length} lead{leads.length !== 1 ? "s" : ""} no pipeline
          </p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1 scrollbar-vello">
            {ESTAGIOS.map((estagio) => (
              <KanbanColumn key={estagio.id} estagio={estagio} leads={getLeadsForEstagio(estagio.id)}
                selectedId={selectedLead?.id ?? null} onCardClick={handleCardClick} />
            ))}
          </div>
          <DragOverlay>{activeLead && <KanbanCard lead={activeLead} isDragging />}</DragOverlay>
        </DndContext>
      </div>

      {/* Detail panel */}
      {selectedLead && (
        <div className="w-80 xl:w-96 flex-shrink-0 flex flex-col overflow-hidden"
          style={{ borderLeft: "1px solid var(--border-dim)", background: "var(--bg-surface)" }}>
          <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--border-dim)" }}>
            <div>
              <h3 className="font-semibold text-white text-sm leading-tight" style={{ fontFamily: "var(--ff-head)" }}>
                {selectedLead.nome ?? "Sem nome"}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Detalhes do lead</p>
            </div>
            <button onClick={() => setSelectedLead(null)} className="p-1.5 rounded-lg" style={{ color: "var(--text-3)" }}>
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-vello">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(65,190,234,0.08)", border: "1px solid var(--border-dim)" }}>
                <Star size={14} weight="duotone" style={{ color: "var(--cyan)" }} />
                <span className="font-bold text-lg" style={{ fontFamily: "var(--ff-head)", color: "var(--cyan)" }}>
                  {selectedLead.pontuacao ?? "—"}
                </span>
                <span className="text-xs" style={{ color: "var(--text-3)" }}>pts</span>
              </div>
              <ClassificacaoBadge classificacao={selectedLead.classificacao} />
              <StatusBadge status={selectedLead.status} />
            </div>

            <KSection title="Contato">
              <KRow icon={<User size={13} />} label="Nome" value={selectedLead.nome} />
              <KRow icon={<WhatsappLogo size={13} style={{ color: "#22C55E" }} />} label="WhatsApp" value={selectedLead.whatsapp} />
              <KRow icon={<EnvelopeSimple size={13} />} label="E-mail" value={selectedLead.email} />
            </KSection>

            <KSection title="Empresa">
              <KRow icon={<Buildings size={13} />} label="Segmento" value={selectedLead.segmento} />
              <KRow icon={<Tag size={13} />} label="Tamanho" value={selectedLead.tamanho_empresa} />
              <KRow icon={<Tag size={13} />} label="Dor principal" value={selectedLead.dor_principal} />
            </KSection>

            <KSection title="Pipeline">
              <KRow icon={<Tag size={13} />} label="Orçamento" value={selectedLead.orcamento} />
              <KRow icon={<Calendar size={13} />} label="Prazo" value={selectedLead.prazo} />
              <KRow icon={<User size={13} />} label="Responsável" value={selectedLead.responsavel} />
              <KRow icon={<Calendar size={13} />} label="Próximo follow-up"
                value={selectedLead.proximo_followup
                  ? format(new Date(selectedLead.proximo_followup), "dd/MM/yyyy", { locale: ptBR }) : null} />
            </KSection>

            {selectedLead.observacoes && (
              <KSection title="Observações">
                <p className="text-xs leading-relaxed p-3 rounded-xl"
                  style={{ color: "var(--text-2)", background: "rgba(65,190,234,0.05)", border: "1px solid var(--border-dim)" }}>
                  {selectedLead.observacoes}
                </p>
              </KSection>
            )}

            <p className="text-xs pt-2" style={{ color: "var(--text-3)" }}>
              Cadastrado em {format(new Date(selectedLead.criado_em), "d MMM yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function KSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5"
        style={{ color: "var(--text-3)", fontFamily: "var(--ff-body)" }}>{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function KRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--text-3)" }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{label}</span>
        <p className="text-xs mt-0.5 break-words" style={{ color: "var(--text-1)" }}>{value}</p>
      </div>
    </div>
  );
}

function KanbanColumn({
  estagio, leads, selectedId, onCardClick,
}: {
  estagio: (typeof ESTAGIOS)[number];
  leads: Lead[];
  selectedId: string | null;
  onCardClick: (lead: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estagio.id });

  return (
    <div className="flex-shrink-0 w-72 flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${isOver ? estagio.color + "50" : "var(--border-dim)"}`,
        boxShadow: isOver ? `0 0 20px ${estagio.color}20` : "none",
        transition: "border-color 150ms, box-shadow 150ms",
        minHeight: 200,
      }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-dim)" }}>
        <div className="flex items-center gap-2">
          <span style={{ color: estagio.color }}>{estagio.icon}</span>
          <span className="text-sm font-semibold" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>{estagio.label}</span>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${estagio.color}20`, color: estagio.color, fontFamily: "var(--ff-head)" }}>
          {leads.length}
        </span>
      </div>

      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex-1 p-3 space-y-2.5 overflow-y-auto scrollbar-vello"
          style={{ minHeight: 80, background: isOver ? `${estagio.color}06` : "transparent", transition: "background 150ms" }}>
          {leads.length === 0 && (
            <div className="h-16 rounded-xl flex items-center justify-center"
              style={{ border: "1px dashed var(--border-dim)", color: "var(--text-3)", fontSize: 12 }}>
              Arraste um lead aqui
            </div>
          )}
          {leads.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} selected={lead.id === selectedId} onCardClick={onCardClick} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function KanbanCard({
  lead, isDragging, selected, onCardClick,
}: {
  lead: Lead;
  isDragging?: boolean;
  selected?: boolean;
  onCardClick?: (lead: Lead) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: lead.id });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isSortableDragging ? 0.3 : 1 }}>
      <div
        className="rounded-xl p-3.5 select-none cursor-pointer"
        style={{
          background: isDragging ? "var(--bg-elevated)" : selected ? "rgba(65,190,234,0.08)" : "rgba(37,40,48,0.9)",
          border: isDragging ? "1px solid var(--border-hi)" : selected ? "1px solid rgba(65,190,234,0.4)" : "1px solid var(--border-dim)",
          boxShadow: isDragging ? "0 12px 40px rgba(65,190,234,0.30)" : "none",
          transition: "border-color 150ms, box-shadow 150ms, background 150ms",
        }}
        onClick={() => onCardClick?.(lead)}
      >
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <p className="text-sm font-semibold leading-tight text-white flex-1 min-w-0 truncate" style={{ fontFamily: "var(--ff-head)" }}>
            {lead.nome ?? "Sem nome"}
          </p>
          {/* Drag handle — only this area initiates drag */}
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <DotsSixVertical size={16} style={{ color: "var(--text-3)" }} />
          </div>
        </div>

        {lead.segmento && (
          <p className="text-xs mb-2.5 truncate" style={{ color: "var(--text-3)" }}>{lead.segmento}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          <ClassificacaoBadge classificacao={lead.classificacao} />
          <div className="flex items-center gap-1">
            <Star size={12} weight="duotone" style={{ color: "var(--cyan)" }} />
            <span className="text-sm font-bold" style={{ color: "var(--cyan)", fontFamily: "var(--ff-head)" }}>
              {lead.pontuacao ?? "—"}
            </span>
          </div>
        </div>

        {lead.responsavel && (
          <div className="flex items-center gap-1.5 mt-2.5 pt-2.5" style={{ borderTop: "1px solid var(--border-dim)" }}>
            <User size={12} style={{ color: "var(--text-3)" }} />
            <span className="text-xs truncate" style={{ color: "var(--text-3)" }}>{lead.responsavel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
