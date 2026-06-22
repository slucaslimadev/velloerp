"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import {
  Calendar,
  Clock,
  User,
  Plus,
  Trash,
  PencilSimple,
  Check,
  Warning,
  MagnifyingGlass,
  X,
  Link as LinkIcon,
  CheckCircle,
  Circle,
  FileText,
} from "@phosphor-icons/react";
import { format, isToday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tarefa } from "@/types/database";

interface TarefasClientProps {
  initialTarefas: Tarefa[];
  leads: { id: string; nome: string | null }[];
  clientes: { id: string; nome: string | null }[];
}

const COLABORADORES = ["Caio", "Lucas"];
const BUCKETS = [
  { id: "Pendente", label: "A Fazer", color: "#41BEEA", bg: "rgba(65, 190, 234, 0.04)" },
  { id: "Em Andamento", label: "Em Andamento", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.04)" },
  { id: "Concluída", label: "Concluído", color: "#22C55E", bg: "rgba(34, 197, 94, 0.04)" },
];

const parseLocalDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export function TarefasClient({ initialTarefas, leads, clientes }: TarefasClientProps) {
  const router = useRouter();
  const [tarefas, setTarefas] = useState<Tarefa[]>(initialTarefas);

  // Drag and Drop State
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);

  // Filter States
  const [search, setSearch] = useState<string>("");
  const [filterResponsavel, setFilterResponsavel] = useState<string>("");
  const [filterDateRange, setFilterDateRange] = useState<string>("todas"); // todas, hoje, amanha, esta_semana, atrasadas

  // Modal States
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);

  // Form States
  const [formTitulo, setFormTitulo] = useState<string>("");
  const [formDescricao, setFormDescricao] = useState<string>("");
  const [formData, setFormData] = useState<string>("");
  const [formHorario, setFormHorario] = useState<string>("");
  const [formResponsavel, setFormResponsavel] = useState<string>(COLABORADORES[0]);
  const [formStatus, setFormStatus] = useState<string>("Pendente");
  const [formVinculo, setFormVinculo] = useState<string>(""); // format: "lead:ID" or "cliente:ID" or ""

  // Loading/Submitting States
  const [salvando, setSalvando] = useState<boolean>(false);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);

  // Sensors config for Dnd Kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Get active task for overlay
  const activeTask = useMemo(() => tarefas.find((t) => t.id === activeId), [tarefas, activeId]);

  // Date Check Helpers
  const checkTaskUrgency = (task: Tarefa) => {
    if (task.status === "Concluída") return { label: "Concluída", type: "success" };
    
    const localDate = parseLocalDate(task.data);
    const todayStart = startOfDay(new Date());

    if (localDate < todayStart) {
      return { label: "Atrasada", type: "danger" };
    }
    if (isToday(localDate)) {
      return { label: "Hoje", type: "warning" };
    }
    return { label: "Planejada", type: "normal" };
  };

  // Reset form helper
  const resetForm = () => {
    setFormTitulo("");
    setFormDescricao("");
    setFormData(format(new Date(), "yyyy-MM-dd"));
    setFormHorario("");
    setFormResponsavel(COLABORADORES[0]);
    setFormStatus("Pendente");
    setFormVinculo("");
    setSelectedTarefa(null);
  };

  // Handle open create modal
  const handleOpenCreate = () => {
    resetForm();
    setModalMode("create");
    setShowModal(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (task: Tarefa) => {
    setSelectedTarefa(task);
    setFormTitulo(task.titulo);
    setFormDescricao(task.descricao || "");
    setFormData(task.data);
    setFormHorario(task.horario || "");
    setFormResponsavel(task.responsavel);
    setFormStatus(task.status);
    
    if (task.lead_id) {
      setFormVinculo(`lead:${task.lead_id}`);
    } else if (task.cliente_id) {
      setFormVinculo(`cliente:${task.cliente_id}`);
    } else {
      setFormVinculo("");
    }

    setModalMode("edit");
    setShowModal(true);
  };

  // Handle Save (Create / Edit)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim() || !formData || !formResponsavel) return;

    setSalvando(true);
    let lead_id: string | null = null;
    let cliente_id: string | null = null;

    if (formVinculo.startsWith("lead:")) {
      lead_id = formVinculo.replace("lead:", "");
    } else if (formVinculo.startsWith("cliente:")) {
      cliente_id = formVinculo.replace("cliente:", "");
    }

    const payload = {
      titulo: formTitulo.trim(),
      descricao: formDescricao.trim() || null,
      data: formData,
      horario: formHorario || null,
      responsavel: formResponsavel,
      status: formStatus,
      lead_id,
      cliente_id,
    };

    try {
      if (modalMode === "create") {
        const response = await fetch("/api/tarefas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (response.ok && data.tarefa) {
          setTarefas((prev) => [...prev, data.tarefa]);
          setShowModal(false);
          resetForm();
        }
      } else if (modalMode === "edit" && selectedTarefa) {
        const response = await fetch(`/api/tarefas/${selectedTarefa.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (response.ok && data.tarefa) {
          setTarefas((prev) => prev.map((t) => (t.id === selectedTarefa.id ? data.tarefa : t)));
          setShowModal(false);
          resetForm();
        }
      }
    } catch (err) {
      console.error("Erro ao salvar tarefa:", err);
    } finally {
      setSalvando(false);
    }
  };

  // Handle Toggle Status (Quick complete / uncomplete)
  const handleToggleStatus = async (task: Tarefa) => {
    const newStatus = task.status === "Concluída" ? "Pendente" : "Concluída";
    try {
      setTarefas((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
      
      const response = await fetch(`/api/tarefas/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (!response.ok || !data.tarefa) {
        // Rollback on failure
        setTarefas((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      }
    } catch (err) {
      console.error("Erro ao alterar status da tarefa:", err);
      setTarefas((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    }
  };

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    setDeletandoId(id);
    try {
      const response = await fetch(`/api/tarefas/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setTarefas((prev) => prev.filter((t) => t.id !== id));
        setShowModal(false);
        resetForm();
      }
    } catch (err) {
      console.error("Erro ao excluir tarefa:", err);
    } finally {
      setDeletandoId(null);
    }
  };

  // Drag End Handler
  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
    setIsDragActive(true);
  };

  const resolveTargetBucket = (overId: string): string | null => {
    // 1. Is overId directly a bucket ID?
    const bucket = BUCKETS.find((b) => b.id === overId);
    if (bucket) return bucket.id;
    
    // 2. Is overId a task ID? If so, find that task and return its status (bucket)
    const targetTask = tarefas.find((t) => t.id === overId);
    return targetTask ? targetTask.status : null;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setTimeout(() => setIsDragActive(false), 50);
    if (!over) return;

    const taskId = active.id as string;
    const targetBucketId = resolveTargetBucket(over.id as string);

    if (!targetBucketId) return;

    const task = tarefas.find((t) => t.id === taskId);
    if (!task || task.status === targetBucketId) return;

    // Optimistic Update
    setTarefas((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: targetBucketId } : t)));

    try {
      const response = await fetch(`/api/tarefas/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetBucketId }),
      });
      const data = await response.json();
      if (!response.ok || !data.tarefa) {
        // Rollback
        setTarefas((prev) => prev.map((t) => (t.id === taskId ? task : t)));
      }
    } catch (err) {
      console.error("Erro ao atualizar status via drag-and-drop:", err);
      // Rollback
      setTarefas((prev) => prev.map((t) => (t.id === taskId ? task : t)));
    }
  };

  // Filter Logic
  const filteredTarefas = useMemo(() => {
    return tarefas.filter((task) => {
      // 1. Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const inTitle = task.titulo.toLowerCase().includes(query);
        const inDesc = task.descricao?.toLowerCase().includes(query) ?? false;
        if (!inTitle && !inDesc) return false;
      }

      // 2. Responsible filter
      if (filterResponsavel && task.responsavel !== filterResponsavel) return false;

      // 3. Date filter
      if (filterDateRange !== "todas") {
        const localDate = parseLocalDate(task.data);
        const todayStart = startOfDay(new Date());

        if (filterDateRange === "hoje") {
          if (!isToday(localDate)) return false;
        } else if (filterDateRange === "amanha") {
          const tomorrow = new Date(todayStart);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (localDate.toDateString() !== tomorrow.toDateString()) return false;
        } else if (filterDateRange === "esta_semana") {
          const endOfWeek = new Date(todayStart);
          endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
          if (localDate < todayStart || localDate > endOfWeek) return false;
        } else if (filterDateRange === "atrasadas") {
          if (task.status === "Concluída" || localDate >= todayStart) return false;
        }
      }

      return true;
    });
  }, [tarefas, search, filterResponsavel, filterDateRange]);

  const getTarefasForBucket = useCallback(
    (bucketId: string) => filteredTarefas.filter((t) => t.status === bucketId),
    [filteredTarefas]
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 lg:px-8 pt-6 pb-0 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2" style={{ fontFamily: "var(--ff-head)", letterSpacing: "-0.02em" }}>
            Planner de Tarefas
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
            {filteredTarefas.length} tarefa{filteredTarefas.length !== 1 ? "s" : ""} no quadro
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
          style={{ background: "var(--cyan)", color: "#0a0d14", fontFamily: "var(--ff-body)", cursor: "pointer" }}
        >
          <Plus size={16} weight="bold" />
          Nova Tarefa
        </button>
      </div>

      {/* Filters Bar */}
      <div className="px-6 lg:px-8 py-4 space-y-4 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs rounded-xl px-4 py-2" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
            <MagnifyingGlass size={16} style={{ color: "var(--text-3)" }} />
            <input
              type="text"
              placeholder="Buscar por título ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none text-white placeholder-gray-500"
              style={{ fontFamily: "var(--ff-body)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ color: "var(--text-3)" }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Responsável filter */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
            <User size={14} style={{ color: "var(--text-3)" }} />
            <select
              value={filterResponsavel}
              onChange={(e) => setFilterResponsavel(e.target.value)}
              className="bg-transparent text-xs outline-none text-white cursor-pointer"
              style={{ fontFamily: "var(--ff-body)" }}
            >
              <option value="" style={{ background: "var(--bg-elevated)" }}>Responsável: Todos</option>
              {COLABORADORES.map((c) => (
                <option key={c} value={c} style={{ background: "var(--bg-elevated)" }}>{c}</option>
              ))}
            </select>
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
            <Calendar size={14} style={{ color: "var(--text-3)" }} />
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
              className="bg-transparent text-xs outline-none text-white cursor-pointer"
              style={{ fontFamily: "var(--ff-body)" }}
            >
              <option value="todas" style={{ background: "var(--bg-elevated)" }}>Data: Todas</option>
              <option value="hoje" style={{ background: "var(--bg-elevated)" }}>Hoje</option>
              <option value="amanha" style={{ background: "var(--bg-elevated)" }}>Amanhã</option>
              <option value="esta_semana" style={{ background: "var(--bg-elevated)" }}>Esta Semana</option>
              <option value="atrasadas" style={{ background: "var(--bg-elevated)" }}>Atrasadas</option>
            </select>
          </div>

          {(filterResponsavel || filterDateRange !== "todas" || search) && (
            <button
              onClick={() => {
                setFilterResponsavel("");
                setFilterDateRange("todas");
                setSearch("");
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444", cursor: "pointer" }}
            >
              <X size={12} /> Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Board Area */}
      <div className="flex-1 overflow-hidden px-6 lg:px-8 pb-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full overflow-x-auto pb-2 scrollbar-vello select-none">
            {BUCKETS.map((bucket) => (
              <BucketColumn
                key={bucket.id}
                bucket={bucket}
                tasks={getTarefasForBucket(bucket.id)}
                leads={leads}
                clientes={clientes}
                selectedId={selectedTarefa?.id ?? null}
                onCardClick={handleOpenEdit}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <TaskCard
                task={activeTask}
                leads={leads}
                clientes={clientes}
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modal - Create/Edit Form */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && !salvando && setShowModal(false)}
        >
          <div className="w-full max-w-lg flex flex-col rounded-2xl overflow-hidden" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-dim)", maxHeight: "90vh" }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-dim)" }}>
              <div>
                <h3 className="font-semibold text-white text-base leading-tight" style={{ fontFamily: "var(--ff-head)" }}>
                  {modalMode === "create" ? "Nova Tarefa" : "Editar Tarefa"}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                  {modalMode === "create" ? "Adicione uma nova tarefa ao Planner." : "Altere ou delete as informações desta tarefa."}
                </p>
              </div>
              <button
                onClick={() => !salvando && setShowModal(false)}
                className="p-2 rounded-xl transition-colors hover:bg-white/5"
                style={{ color: "var(--text-3)", cursor: "pointer" }}
                disabled={salvando}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto scrollbar-vello p-6 space-y-4">
              {/* Titulo ("O que") */}
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--text-2)" }}>O que deve ser feito? (Título)*</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Enviar briefing técnico"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-white focus:border-cyan/50 transition-colors"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", fontFamily: "var(--ff-body)" }}
                  disabled={salvando}
                />
              </div>

              {/* Descricao */}
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--text-2)" }}>Detalhes adicionais (Descrição)</label>
                <textarea
                  rows={3}
                  placeholder="Anotações adicionais ou notas sobre a tarefa..."
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-white resize-none focus:border-cyan/50 transition-colors"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", fontFamily: "var(--ff-body)" }}
                  disabled={salvando}
                />
              </div>

              {/* Data ("Quando") & Horario */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--text-2)" }}>Prazo (Data)*</label>
                  <input
                    type="date"
                    required
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-white focus:border-cyan/50 transition-colors"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", fontFamily: "var(--ff-body)", colorScheme: "dark" }}
                    disabled={salvando}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--text-2)" }}>Horário</label>
                  <input
                    type="time"
                    value={formHorario}
                    onChange={(e) => setFormHorario(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-white focus:border-cyan/50 transition-colors"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", fontFamily: "var(--ff-body)", colorScheme: "dark" }}
                    disabled={salvando}
                  />
                </div>
              </div>

              {/* Responsavel ("Quem") & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--text-2)" }}>Responsável*</label>
                  <select
                    value={formResponsavel}
                    onChange={(e) => setFormResponsavel(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-white focus:border-cyan/50 transition-colors cursor-pointer"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", fontFamily: "var(--ff-body)" }}
                    disabled={salvando}
                  >
                    {COLABORADORES.map((c) => (
                      <option key={c} value={c} style={{ background: "var(--bg-elevated)" }}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--text-2)" }}>Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-white focus:border-cyan/50 transition-colors cursor-pointer"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", fontFamily: "var(--ff-body)" }}
                    disabled={salvando}
                  >
                    <option value="Pendente" style={{ background: "var(--bg-elevated)" }}>A Fazer</option>
                    <option value="Em Andamento" style={{ background: "var(--bg-elevated)" }}>Em Andamento</option>
                    <option value="Concluída" style={{ background: "var(--bg-elevated)" }}>Concluído</option>
                  </select>
                </div>
              </div>

              {/* Vinculo (Leads/Clientes) */}
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--text-2)" }}>Vincular a Lead ou Cliente (Opcional)</label>
                <select
                  value={formVinculo}
                  onChange={(e) => setFormVinculo(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-white focus:border-cyan/50 transition-colors cursor-pointer"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", fontFamily: "var(--ff-body)" }}
                  disabled={salvando}
                >
                  <option value="" style={{ background: "var(--bg-elevated)" }}>Nenhum contato</option>
                  
                  {leads.length > 0 && (
                    <optgroup label="Leads" style={{ background: "var(--bg-elevated)", color: "var(--cyan)" }}>
                      {leads.map((l) => (
                        <option key={`lead:${l.id}`} value={`lead:${l.id}`} style={{ background: "var(--bg-elevated)", color: "var(--text-1)" }}>
                          {l.nome || "Lead Sem Nome"}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {clientes.length > 0 && (
                    <optgroup label="Clientes" style={{ background: "var(--bg-elevated)", color: "#22C55E" }}>
                      {clientes.map((c) => (
                        <option key={`cliente:${c.id}`} value={`cliente:${c.id}`} style={{ background: "var(--bg-elevated)", color: "var(--text-1)" }}>
                          {c.nome || "Cliente Sem Nome"}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid var(--border-dim)" }}>
                <div>
                  {modalMode === "edit" && selectedTarefa && (
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedTarefa.id)}
                      disabled={deletandoId === selectedTarefa.id}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 transition-all hover:bg-red-500/15 disabled:opacity-50"
                      style={{ cursor: "pointer" }}
                    >
                      Excluir
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => !salvando && setShowModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-75"
                    style={{ color: "var(--text-2)", background: "var(--bg-surface)", border: "1px solid var(--border-dim)", cursor: "pointer" }}
                    disabled={salvando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando || !formTitulo.trim() || !formData}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-85 disabled:opacity-50"
                    style={{ background: "var(--cyan)", color: "#0a0d14", cursor: "pointer" }}
                  >
                    {salvando ? "Salvando..." : "Salvar Tarefa"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COLUMN COMPONENT (BUCKETS)
// ==========================================
interface BucketColumnProps {
  bucket: (typeof BUCKETS)[number];
  tasks: Tarefa[];
  leads: any[];
  clientes: any[];
  selectedId: string | null;
  onCardClick: (task: Tarefa) => void;
  onToggleStatus: (task: Tarefa) => void;
}

function BucketColumn({
  bucket,
  tasks,
  leads,
  clientes,
  selectedId,
  onCardClick,
  onToggleStatus,
}: BucketColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: bucket.id });

  return (
    <div
      className="flex-shrink-0 w-80 flex flex-col rounded-2xl overflow-hidden h-full"
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${isOver ? bucket.color + "50" : "var(--border-dim)"}`,
        boxShadow: isOver ? `0 0 20px ${bucket.color}15` : "none",
        transition: "border-color 150ms, box-shadow 150ms",
      }}
    >
      {/* Column Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderBottomColor: "var(--border-dim)" }}>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: bucket.color }} />
          <span className="text-sm font-semibold text-white" style={{ fontFamily: "var(--ff-head)" }}>
            {bucket.label}
          </span>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${bucket.color}15`, color: bucket.color, fontFamily: "var(--ff-head)" }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Sortable Drop Area */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex-1 p-3 space-y-2.5 overflow-y-auto scrollbar-vello"
          style={{
            background: isOver ? `${bucket.color}03` : "transparent",
            transition: "background 150ms",
          }}
        >
          {tasks.length === 0 && (
            <div
              className="h-20 rounded-xl flex items-center justify-center text-center p-3 text-[11px]"
              style={{ border: "1.5px dashed var(--border-dim)", color: "var(--text-3)", fontFamily: "var(--ff-body)" }}
            >
              Nenhuma tarefa aqui.<br />Arraste uma tarefa para esta coluna.
            </div>
          )}

          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              leads={leads}
              clientes={clientes}
              selected={task.id === selectedId}
              onCardClick={onCardClick}
              onToggleStatus={onToggleStatus}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ==========================================
// CARD COMPONENT (TASK CARDS)
// ==========================================
interface TaskCardProps {
  task: Tarefa;
  leads: any[];
  clientes: any[];
  selected?: boolean;
  isDragging?: boolean;
  onCardClick?: (task: Tarefa) => void;
  onToggleStatus?: (task: Tarefa) => void;
}

const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  Caio: { bg: "rgba(65, 190, 234, 0.15)", text: "#41BEEA" }, // Cyan
  Lucas: { bg: "rgba(245, 158, 11, 0.15)", text: "#F59E0B" }, // Orange
};

function TaskCard({
  task,
  leads,
  clientes,
  selected,
  isDragging,
  onCardClick,
  onToggleStatus,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  // Urgency logic
  const dateInfo = useMemo(() => {
    if (task.status === "Concluída") return { color: "var(--text-3)", bg: "transparent", icon: null };
    const localDate = parseLocalDate(task.data);
    const todayStart = startOfDay(new Date());

    if (localDate < todayStart) {
      return { color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)", icon: <Warning size={11} weight="fill" /> };
    }
    if (isToday(localDate)) {
      return { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)", icon: <Clock size={11} weight="fill" /> };
    }
    return { color: "var(--text-3)", bg: "transparent", icon: null };
  }, [task.data, task.status]);

  // Linked label
  const linkedDetails = useMemo(() => {
    if (task.lead_id) {
      const l = leads.find((x) => x.id === task.lead_id);
      return l ? { name: l.nome, type: "lead" } : { name: "Lead", type: "lead" };
    }
    if (task.cliente_id) {
      const c = clientes.find((x) => x.id === task.cliente_id);
      return c ? { name: c.nome, type: "cliente" } : { name: "Cliente", type: "cliente" };
    }
    return null;
  }, [task.lead_id, task.cliente_id, leads, clientes]);

  const avatar = AVATAR_COLORS[task.responsavel] || { bg: "rgba(255, 255, 255, 0.08)", text: "var(--text-2)" };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isSortableDragging ? 0.35 : 1,
      }}
    >
      <div
        className="rounded-xl p-3.5 select-none cursor-pointer flex flex-col justify-between transition-all duration-150 hover:border-white/10"
        style={{
          background: isDragging ? "var(--bg-elevated)" : selected ? "rgba(65,190,234,0.08)" : "rgba(37,40,48,0.9)",
          border: isDragging
            ? "1px solid var(--cyan)"
            : selected
            ? "1px solid rgba(65,190,234,0.4)"
            : "1px solid var(--border-dim)",
          boxShadow: isDragging ? "0 8px 30px rgba(65,190,234,0.20)" : "none",
        }}
        onClick={() => onCardClick?.(task)}
        {...attributes}
        {...listeners}
      >
        {/* Card Header & Checkbox */}
        <div className="flex items-start gap-2.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus?.(task);
            }}
            className="mt-0.5 flex-shrink-0 cursor-pointer focus:outline-none transition-colors"
            style={{ color: task.status === "Concluída" ? "#22C55E" : "var(--text-3)" }}
          >
            {task.status === "Concluída" ? (
              <CheckCircle size={17} weight="fill" />
            ) : (
              <Circle size={17} />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium leading-snug text-white break-words ${
                task.status === "Concluída" ? "line-through text-gray-500/80" : ""
              }`}
              style={{ fontFamily: "var(--ff-head)" }}
            >
              {task.titulo}
            </p>
            {task.descricao && !isDragging && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
                <FileText size={11} />
                <span>Tem descrição</span>
              </div>
            )}
          </div>
        </div>

        {/* Card Footer Info */}
        <div className="mt-3.5 pt-3.5 flex items-center justify-between gap-2 border-t border-white/[0.04]">
          {/* Due Date Indicator */}
          <div
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium"
            style={{
              color: dateInfo.color,
              background: dateInfo.bg,
            }}
          >
            {dateInfo.icon}
            <span>{format(parseLocalDate(task.data), "dd/MM/yyyy", { locale: ptBR })}</span>
            {task.horario && (
              <span className="opacity-70">{task.horario.substring(0, 5)}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Linked Entity context */}
            {linkedDetails && (
              <div
                className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md border"
                style={{
                  background: linkedDetails.type === "lead" ? "rgba(65, 190, 234, 0.05)" : "rgba(34, 197, 94, 0.05)",
                  borderColor: linkedDetails.type === "lead" ? "rgba(65, 190, 234, 0.15)" : "rgba(34, 197, 94, 0.15)",
                  color: linkedDetails.type === "lead" ? "var(--cyan)" : "#22C55E",
                }}
                title={linkedDetails.name || ""}
              >
                <LinkIcon size={9} />
                <span className="max-w-[70px] truncate">{linkedDetails.name}</span>
              </div>
            )}

            {/* User Avatar Initial */}
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold select-none"
              style={{
                background: avatar.bg,
                color: avatar.text,
              }}
              title={`Responsável: ${task.responsavel}`}
            >
              {task.responsavel.substring(0, 1).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
