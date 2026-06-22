import axios from "axios";

/**
 * Integração Google Calendar via OAuth 2.0 (Authorization Code + refresh token).
 * Requer um app OAuth no Google Cloud com as envs:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 * O redirect URI deve ser: https://sistema.velloia.com.br/api/google/callback
 */

const CLIENT_ID = () => process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = () => process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = () => process.env.GOOGLE_REDIRECT_URI!;

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

/** Monta a URL de consentimento. `state` carrega para onde voltar (ex: agente id + origem). */
export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID(),
    redirect_uri: REDIRECT_URI(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // força retornar refresh_token
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface TokenResult {
  refresh_token: string | null;
  access_token: string;
  email: string | null;
}

/** Troca o code por tokens e busca o e-mail da conta. */
export async function exchangeCode(code: string): Promise<TokenResult> {
  const res = await axios.post(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      code,
      client_id: CLIENT_ID(),
      client_secret: CLIENT_SECRET(),
      redirect_uri: REDIRECT_URI(),
      grant_type: "authorization_code",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  const access_token: string = res.data.access_token;
  const refresh_token: string | null = res.data.refresh_token ?? null;

  let email: string | null = null;
  try {
    const info = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    email = info.data?.email ?? null;
  } catch {
    // não crítico
  }

  return { refresh_token, access_token, email };
}

/** Gera um access_token novo a partir do refresh_token. */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await axios.post(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID(),
      client_secret: CLIENT_SECRET(),
      grant_type: "refresh_token",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return res.data.access_token;
}

export interface EventoCalendar {
  titulo: string;
  descricao?: string;
  inicioIso: string;
  duracaoMin?: number;
  timezone?: string;
}

/** Cria um evento no calendário usando o refresh_token (renova o access token). */
export async function criarEventoCalendar(
  refreshToken: string,
  calendarId: string,
  evento: EventoCalendar
): Promise<boolean> {
  try {
    const accessToken = await refreshAccessToken(refreshToken);
    const inicio = new Date(evento.inicioIso);
    const fim = new Date(inicio.getTime() + (evento.duracaoMin ?? 60) * 60 * 1000);
    const tz = evento.timezone ?? "America/Sao_Paulo";

    await axios.post(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        summary: evento.titulo,
        description: evento.descricao ?? "",
        start: { dateTime: inicio.toISOString(), timeZone: tz },
        end: { dateTime: fim.toISOString(), timeZone: tz },
      },
      { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
    );
    return true;
  } catch (err) {
    console.error("[google] Falha ao criar evento no Calendar:", err);
    return false;
  }
}
