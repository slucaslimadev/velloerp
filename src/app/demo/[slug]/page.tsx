import { notFound } from "next/navigation";
import { getAgente } from "@/lib/agentes/config";
import { ChatClient } from "@/app/(app)/agentes/[slug]/chat-client";
import { VelloLogo } from "@/components/shared/VelloLogo";

export const dynamic = "force-dynamic";

export default async function PublicDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agente = await getAgente(slug);
  if (!agente) notFound();

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base)",
        overflow: "hidden",
      }}
    >
      {/* Top Brand Bar */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-dim)",
        }}
      >
        <VelloLogo iconSize={32} titleSize={18} showSubtitle={true} />
        <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--ff-body)" }}>
          Experimente a inteligência artificial de verdade
        </span>
      </div>

      {/* Chat fills the rest */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <ChatClient agente={agente} isPublic={true} />
      </div>
    </div>
  );
}
