import { NextResponse } from "next/server";
import axios from "axios";

const api = () =>
  axios.create({
    baseURL: process.env.EVOLUTION_API_URL,
    headers: { apikey: process.env.EVOLUTION_API_KEY, "Content-Type": "application/json" },
    timeout: 10_000,
  });

const INSTANCE = () => process.env.EVOLUTION_INSTANCE ?? "vello";

export async function GET(): Promise<NextResponse> {
  try {
    const stateRes = await api().get(`/instance/connectionState/${INSTANCE()}`);
    const state: string = stateRes.data?.instance?.state ?? stateRes.data?.state ?? "unknown";

    if (state === "open") {
      return NextResponse.json({ connected: true, state });
    }

    // Not connected — try to get QR code
    try {
      const qrRes = await api().get(`/instance/connect/${INSTANCE()}`);
      const base64: string | null = qrRes.data?.base64 ?? null;
      const code: string | null = qrRes.data?.code ?? null;
      return NextResponse.json({ connected: false, state, qrcode: base64, code });
    } catch {
      return NextResponse.json({ connected: false, state, qrcode: null });
    }
  } catch (err) {
    console.error("[whatsapp/status]", err);
    return NextResponse.json({ connected: false, state: "error", qrcode: null, error: "Falha ao conectar à Evolution API" });
  }
}
