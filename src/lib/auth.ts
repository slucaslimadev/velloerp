import { createClient } from "@/lib/supabase/server";

/**
 * Verifica se a requisição vem de um admin da VELLO (sessão autenticada cujo
 * app_metadata.role NÃO é 'cliente'). Usuários antigos sem role → admin.
 *
 * Use no início dos handlers de API administrativos, pois o proxy.ts não
 * protege rotas /api por papel.
 */
export async function isAdminRequest(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const role = (user.app_metadata?.role as string | undefined) ?? "admin";
  return role !== "cliente";
}
