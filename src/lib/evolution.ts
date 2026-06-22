import axios, { type AxiosInstance } from "axios";

/**
 * Helpers para gerenciar instâncias na Evolution API (evogo).
 * Usa a Global API Key para criar instâncias e registrar webhooks.
 *
 * Obs.: o contrato exato pode variar entre versões da Evolution. As chamadas
 * abaixo seguem o padrão da Evolution API v2 e são tolerantes a falha — ajuste
 * os payloads se a sua versão do evogo divergir.
 */

const base = () => process.env.EVOLUTION_API_URL;
const globalKey = () => process.env.EVOLUTION_API_KEY;

export function evolutionApi(key?: string): AxiosInstance {
  return axios.create({
    baseURL: base(),
    headers: { apikey: key ?? globalKey(), "Content-Type": "application/json" },
    timeout: 15_000,
  });
}

export interface CriarInstanciaResult {
  ok: boolean;
  qrcode: string | null;
  token: string | null;
  webhookOk: boolean;
  erro?: string;
}

function detalheErro(err: any): { status?: number; msg: string } {
  const body = err?.response?.data;
  const msg =
    (body && (body.message || body.error || (typeof body === "string" ? body : JSON.stringify(body)))) ??
    err?.message ??
    "Erro desconhecido";
  return { status: err?.response?.status, msg: String(msg) };
}

/** Registra o webhook do agente para a instância. Tolerante a falha. */
export async function registrarWebhook(instanceName: string): Promise<boolean> {
  const webhookUrl = process.env.AGENT_WEBHOOK_URL;
  const token = process.env.WEBHOOK_TOKEN;
  if (!webhookUrl) {
    console.warn("[evolution] AGENT_WEBHOOK_URL não configurado — webhook não registrado.");
    return false;
  }
  try {
    await evolutionApi().post(`/webhook/set/${instanceName}`, {
      webhook: {
        enabled: true,
        url: webhookUrl,
        headers: { "X-Webhook-Token": token ?? "", "Content-Type": "application/json" },
        byEvents: false,
        base64: true,
        events: ["MESSAGES_UPSERT"],
      },
    });
    return true;
  } catch (err) {
    const d = detalheErro(err);
    console.error(`[evolution] Falha ao registrar webhook de ${instanceName}: status=${d.status} body=${d.msg}`);
    return false;
  }
}

/** Cria a instância na Evolution (se ainda não existir) e registra o webhook do agente. */
export async function criarInstancia(instanceName: string): Promise<CriarInstanciaResult> {
  const api = evolutionApi();
  let qrcode: string | null = null;
  let instanceToken: string | null = null;
  let jaExiste = false;

  try {
    // evogo (Evolution Go) usa `name` + `token` no create (a Evolution Node usa `instanceName`).
    const res = await api.post("/instance/create", {
      name: instanceName,
      token: crypto.randomUUID(),
      qrcode: true,
    });
    const data = res.data ?? {};
    instanceToken = data?.hash?.apikey ?? data?.hash ?? data?.instance?.token ?? data?.token ?? null;
    qrcode = data?.qrcode?.base64 ?? data?.qrcode ?? data?.base64 ?? null;
  } catch (err: any) {
    const d = detalheErro(err);
    // Se já existe, seguimos para registrar/atualizar o webhook mesmo assim.
    jaExiste = /exist|in use|already|já/i.test(d.msg);
    if (!jaExiste) {
      console.error(`[evolution] Falha ao criar instância ${instanceName}: status=${d.status} body=${d.msg}`);
      return { ok: false, qrcode: null, token: null, webhookOk: false, erro: d.msg };
    }
    console.log(`[evolution] Instância ${instanceName} já existe — registrando webhook.`);
  }

  const webhookOk = await registrarWebhook(instanceName);
  return { ok: true, qrcode, token: instanceToken, webhookOk };
}

/**
 * Tenta obter o QR (base64) de uma instância testando os endpoints conhecidos.
 * Loga a resposta crua de cada tentativa para facilitar o ajuste ao contrato da evogo.
 */
async function obterQrcode(_instanceName: string, instToken?: string): Promise<string | null> {
  try {
    const res = await axios.get(`${base()}/instance/qr`, {
      headers: { apikey: instToken ?? globalKey(), "Content-Type": "application/json" },
      timeout: 6000,
    });
    const d = res.data ?? {};
    const data = d.data ?? d;
    // evogo retorna o QR em data.Qrcode (data URI). Mantemos fallbacks por segurança.
    const qr =
      data.Qrcode ?? data.qrcode?.base64 ?? data.qrcode ?? data.base64 ?? data.qr ?? data.code ?? null;
    return typeof qr === "string" ? qr : null;
  } catch (err) {
    const e = detalheErro(err);
    console.log(`[evolution] QR /instance/qr falhou: status=${e.status} body=${e.msg}`);
    return null;
  }
}

/** Status + QR de uma instância pelo nome. */
export async function statusInstancia(
  instanceName: string
): Promise<{ connected: boolean; state: string; qrcode: string | null; error?: string }> {
  const api = evolutionApi();
  try {
    const res = await api.get("/instance/all");
    const list = res.data?.data || [];
    const inst = list.find((i: any) => i.name === instanceName);

    if (!inst) return { connected: false, state: "not_found", qrcode: null };
    if (inst.connected) return { connected: true, state: "open", qrcode: null };

    const qrcode = await obterQrcode(instanceName, inst.token);
    return { connected: false, state: "connecting", qrcode };
  } catch (err) {
    console.error("[evolution] statusInstancia:", err);
    return { connected: false, state: "error", qrcode: null, error: "Falha ao conectar à Evolution API" };
  }
}

/** Desconecta (logout) a instância. */
export async function desconectarInstancia(instanceName: string): Promise<boolean> {
  try {
    await evolutionApi().delete(`/instance/logout/${instanceName}`);
    return true;
  } catch (err) {
    console.error("[evolution] desconectarInstancia:", err);
    return false;
  }
}
