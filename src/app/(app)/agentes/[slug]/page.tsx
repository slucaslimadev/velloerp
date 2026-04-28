import { notFound } from "next/navigation";
import { getAgente } from "@/lib/agentes/config";
import { ChatClient } from "./chat-client";

export const dynamic = "force-dynamic";

export default async function AgentePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agente = await getAgente(slug);
  if (!agente) notFound();
  return <ChatClient agente={agente} />;
}
