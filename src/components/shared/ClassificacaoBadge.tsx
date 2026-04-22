import type { LeadClassificacao } from "@/types/database";

const config: Record<
  LeadClassificacao,
  { label: string; bg: string; color: string; dot: string }
> = {
  Quente:         { label: "Quente",        bg: "rgba(239,68,68,0.12)",  color: "#EF4444", dot: "#EF4444" },
  Morno:          { label: "Morno",         bg: "rgba(245,158,11,0.12)", color: "#F59E0B", dot: "#F59E0B" },
  Frio:           { label: "Frio",          bg: "rgba(59,130,246,0.12)", color: "#3B82F6", dot: "#3B82F6" },
  Desqualificado: { label: "Desqualificado",bg: "rgba(107,114,128,0.12)",color: "#6B7280", dot: "#6B7280" },
};

interface Props {
  classificacao: LeadClassificacao | null;
}

export function ClassificacaoBadge({ classificacao }: Props) {
  if (!classificacao) return null;
  const c = config[classificacao] ?? config["Frio"];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
      style={{
        background: c.bg,
        color: c.color,
        fontFamily: "var(--ff-body)",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: c.dot, boxShadow: `0 0 6px ${c.dot}` }}
      />
      {c.label}
    </span>
  );
}
