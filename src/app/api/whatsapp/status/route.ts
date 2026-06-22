import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

const api = () =>
  axios.create({
    baseURL: process.env.EVOLUTION_API_URL,
    headers: { apikey: process.env.EVOLUTION_API_KEY, "Content-Type": "application/json" },
    timeout: 10_000,
  });

const INSTANCE = () => process.env.EVOLUTION_INSTANCE ?? "vello";

export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instanceName = INSTANCE();

  try {
    // 1. Try to list all instances (works if apiKey is the Global API Key)
    try {
      const res = await api().get("/instance/all");
      const list = res.data?.data || [];
      const inst = list.find((i: any) => i.name === instanceName);

      if (inst) {
        if (inst.connected) {
          return NextResponse.json({ connected: true, state: "open" });
        }
        
        // Retrieve QR code using the instance-specific token
        try {
          const qrRes = await axios.get(`${process.env.EVOLUTION_API_URL}/instance/qr`, {
            headers: { apikey: inst.token, "Content-Type": "application/json" },
            timeout: 5000,
          });
          const base64 = qrRes.data?.base64 ?? qrRes.data?.qrcode ?? null;
          return NextResponse.json({ connected: false, state: "connecting", qrcode: base64 });
        } catch {
          return NextResponse.json({ connected: false, state: "connecting", qrcode: null });
        }
      }
    } catch (err: any) {
      // If 401, it means apiKey is probably the Instance Token instead of the Global API Key
      if (err.response?.status !== 401) {
        throw err;
      }
    }

    // 2. Fallback: Query status directly (works if apiKey is the Instance Token)
    const statusRes = await api().get("/instance/status");
    const isConnected = statusRes.data?.data?.Connected || statusRes.data?.data?.LoggedIn || false;

    if (isConnected) {
      return NextResponse.json({ connected: true, state: "open" });
    }

    // Get QR code using the Instance Token
    try {
      const qrRes = await api().get("/instance/qr");
      const base64 = qrRes.data?.base64 ?? qrRes.data?.qrcode ?? null;
      return NextResponse.json({ connected: false, state: "connecting", qrcode: base64 });
    } catch {
      return NextResponse.json({ connected: false, state: "connecting", qrcode: null });
    }
  } catch (err) {
    console.error("[whatsapp/status]", err);
    return NextResponse.json({ connected: false, state: "error", qrcode: null, error: "Falha ao conectar à Evolution API" });
  }
}
