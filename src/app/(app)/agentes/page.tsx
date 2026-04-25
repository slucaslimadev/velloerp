import Link from "next/link";
import { AGENTES } from "@/lib/agentes/config";

export default function AgentesPage() {
  return (
    <div className="p-6 lg:p-8 max-w-[1000px]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--ff-head)", letterSpacing: "-0.02em" }}>
          Demonstração de Agentes
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
          Teste os agentes de IA desenvolvidos pela VELLO — suportam texto, áudio e documentos
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {AGENTES.map((agente) => (
          <Link key={agente.slug} href={`/agentes/${agente.slug}`}
            className="group flex flex-col rounded-2xl p-5 transition-all hover:scale-[1.01]"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>

            {/* Icon */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 flex-shrink-0"
              style={{ background: `${agente.cor}18`, border: `1px solid ${agente.cor}30` }}>
              {agente.emoji}
            </div>

            {/* Info */}
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-1)", fontFamily: "var(--ff-head)" }}>
              {agente.nome}
            </p>
            <p className="text-xs leading-relaxed flex-1" style={{ color: "var(--text-3)" }}>
              {agente.descricao}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid var(--border-dim)" }}>
              <span className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: `${agente.cor}15`, color: agente.cor }}>
                {agente.segmento}
              </span>
              <span className="text-xs font-semibold transition-all group-hover:gap-2"
                style={{ color: "var(--cyan)" }}>
                Testar →
              </span>
            </div>
          </Link>
        ))}

        {/* Coming soon placeholder */}
        <div className="flex flex-col rounded-2xl p-5"
          style={{ background: "var(--bg-surface)", border: "1px dashed var(--border-dim)", opacity: 0.5 }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
            style={{ background: "rgba(107,114,128,0.12)" }}>
            🤖
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-2)", fontFamily: "var(--ff-head)" }}>
            Mais agentes em breve
          </p>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            Vendas, Atendimento, Financeiro, Jurídico e outros sendo desenvolvidos.
          </p>
        </div>
      </div>

      {/* Capabilities */}
      <div className="mt-10 p-5 rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-3)" }}>
          Todos os agentes suportam
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            { icon: "💬", label: "Texto" },
            { icon: "🎤", label: "Áudio (voz)" },
            { icon: "📄", label: "PDF" },
            { icon: "🖼️", label: "Imagens" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(65,190,234,0.08)", border: "1px solid rgba(65,190,234,0.12)" }}>
              <span>{icon}</span>
              <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
