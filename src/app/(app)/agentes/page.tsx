import { getAllAgentes } from "@/lib/agentes/config";
import { AgentesClient } from "./agentes-client";

export const dynamic = "force-dynamic";

export default async function AgentesPage() {
  const agentes = await getAllAgentes();
  return <AgentesClient agentes={agentes} />;
}
