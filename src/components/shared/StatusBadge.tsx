import type { LeadStatus } from "@/types/database";

const config: Record<LeadStatus, { bg: string; color: string }> = {
  "Novo":             { bg: "rgba(65,190,234,0.12)",  color: "#41BEEA" },
  "Em Qualificação":  { bg: "rgba(245,158,11,0.12)",  color: "#F59E0B" },
  "Proposta Enviada": { bg: "rgba(139,92,246,0.12)",  color: "#8B5CF6" },
  "Em Negociação":    { bg: "rgba(249,115,22,0.12)",  color: "#F97316" },
  "Fechado Ganho":    { bg: "rgba(34,197,94,0.12)",   color: "#22C55E" },
  "Fechado Perdido":  { bg: "rgba(239,68,68,0.12)",   color: "#EF4444" },
};

interface Props {
  status: LeadStatus | string;
}

export function StatusBadge({ status }: Props) {
  const c = config[status as LeadStatus] ?? { bg: "rgba(107,114,128,0.12)", color: "#6B7280" };

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        background: c.bg,
        color: c.color,
        fontFamily: "var(--ff-body)",
      }}
    >
      {status}
    </span>
  );
}
