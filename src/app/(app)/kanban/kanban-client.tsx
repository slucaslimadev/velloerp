"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Lead, LeadStatus } from "@/types/database";
import { ClassificacaoBadge } from "@/components/shared/ClassificacaoBadge";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Star,
  DotsSixVertical,
  Lightning,
  ClipboardText,
  Scales,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";

const ESTAGIOS: {
  id: LeadStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    id: "Novo",
    label: "Novo Lead",
    icon: <Lightning size={16} weight="duotone" />,
    color: "#41BEEA",
  },
  {
    id: "Em Qualificação",
    label: "Em Qualificação",
    icon: <ClipboardText size={16} weight="duotone" />,
    color: "#F59E0B",
  },
  {
    id: "Proposta Enviada",
    label: "Proposta Enviada",
    icon: <ClipboardText size={16} weight="duotone" />,
    color: "#8B5CF6",
  },
  {
    id: "Em Negociação",
    label: "Em Negociação",
    icon: <Scales size={16} weight="duotone" />,
    color: "#F97316",
  },
  {
    id: "Fechado Ganho",
    label: "Fechado Ganho",
    icon: <CheckCircle size={16} weight="duotone" />,
    color: "#22C55E",
  },
  {
    id: "Fechado Perdido",
    label: "Fechado Perdido",
    icon: <XCircle size={16} weight="duotone" />,
    color: "#EF4444",
  },
];

interface Props {
  leads: Lead[];
}

export function KanbanClient({ leads: initialLeads }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const getLeadsForEstagio = useCallback(
    (estagio: LeadStatus) => leads.filter((l) => l.status === estagio),
    [leads]
  );

  const activeLead = leads.find((l) => l.id === activeId);

  // Find which column a lead or column id belongs to
  function resolveTargetColumn(overId: string): LeadStatus | null {
    // Is it a column id directly?
    const colMatch = ESTAGIOS.find((e) => e.id === overId);
    if (colMatch) return colMatch.id;
    // Otherwise it's a lead id — find its column
    const lead = leads.find((l) => l.id === overId);
    return (lead?.status as LeadStatus) ?? null;
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const leadId = active.id as string;
    const newStatus = resolveTargetColumn(over.id as string);
    if (!newStatus) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("leads") as any).update({ status: newStatus }).eq("id", leadId);
  }

  return (
    <div className="p-6 lg:p-8 flex flex-col h-full">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: "var(--ff-head)", letterSpacing: "-0.02em" }}
        >
          Kanban
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
          {leads.length} lead{leads.length !== 1 ? "s" : ""} no pipeline
        </p>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 scrollbar-vello">
          {ESTAGIOS.map((estagio) => {
            const estagioLeads = getLeadsForEstagio(estagio.id);
            return (
              <KanbanColumn
                key={estagio.id}
                estagio={estagio}
                leads={estagioLeads}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeLead && <KanbanCard lead={activeLead} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function KanbanColumn({
  estagio,
  leads,
}: {
  estagio: (typeof ESTAGIOS)[number];
  leads: Lead[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estagio.id });

  return (
    <div
      className="flex-shrink-0 w-72 flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${isOver ? estagio.color + "50" : "var(--border-dim)"}`,
        boxShadow: isOver ? `0 0 20px ${estagio.color}20` : "none",
        transition: "border-color 150ms, box-shadow 150ms",
        minHeight: 200,
      }}
    >
      {/* Column header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border-dim)" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: estagio.color }}>{estagio.icon}</span>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}
          >
            {estagio.label}
          </span>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: `${estagio.color}20`,
            color: estagio.color,
            fontFamily: "var(--ff-head)",
          }}
        >
          {leads.length}
        </span>
      </div>

      {/* Droppable + sortable area */}
      <SortableContext
        items={leads.map((l) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className="flex-1 p-3 space-y-2.5 overflow-y-auto scrollbar-vello"
          style={{
            minHeight: 80,
            background: isOver ? `${estagio.color}06` : "transparent",
            transition: "background 150ms",
          }}
        >
          {leads.length === 0 && (
            <div
              className="h-16 rounded-xl flex items-center justify-center"
              style={{
                border: "1px dashed var(--border-dim)",
                color: "var(--text-3)",
                fontSize: 12,
              }}
            >
              Arraste um lead aqui
            </div>
          )}
          {leads.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function KanbanCard({
  lead,
  isDragging,
}: {
  lead: Lead;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="rounded-xl p-3.5 select-none"
        style={{
          background: isDragging ? "var(--bg-elevated)" : "rgba(37, 40, 48, 0.9)",
          border: isDragging
            ? "1px solid var(--border-hi)"
            : "1px solid var(--border-dim)",
          boxShadow: isDragging
            ? "0 12px 40px rgba(65,190,234,0.30)"
            : "none",
          cursor: isDragging ? "grabbing" : "grab",
          transition: "border-color 150ms, box-shadow 150ms",
        }}
        {...attributes}
        {...listeners}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <p
            className="text-sm font-semibold leading-tight text-white flex-1 min-w-0 truncate"
            style={{ fontFamily: "var(--ff-head)" }}
          >
            {lead.nome ?? "Sem nome"}
          </p>
          <DotsSixVertical
            size={16}
            style={{ color: "var(--text-3)", flexShrink: 0, marginTop: 1 }}
          />
        </div>

        {/* Segmento */}
        {lead.segmento && (
          <p
            className="text-xs mb-2.5 truncate"
            style={{ color: "var(--text-3)" }}
          >
            {lead.segmento}
          </p>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between gap-2">
          <ClassificacaoBadge classificacao={lead.classificacao} />
          <div className="flex items-center gap-1">
            <Star size={12} weight="duotone" style={{ color: "var(--cyan)" }} />
            <span
              className="text-sm font-bold"
              style={{ color: "var(--cyan)", fontFamily: "var(--ff-head)" }}
            >
              {lead.pontuacao ?? "—"}
            </span>
          </div>
        </div>

        {/* Responsável */}
        {lead.responsavel && (
          <div
            className="flex items-center gap-1.5 mt-2.5 pt-2.5"
            style={{ borderTop: "1px solid var(--border-dim)" }}
          >
            <User size={12} style={{ color: "var(--text-3)" }} />
            <span
              className="text-xs truncate"
              style={{ color: "var(--text-3)" }}
            >
              {lead.responsavel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
