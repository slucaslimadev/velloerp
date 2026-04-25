import { type NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { whatsapp } = await req.json();
  if (!whatsapp) return NextResponse.json({ url: null });

  try {
    const api = axios.create({
      baseURL: process.env.EVOLUTION_API_URL,
      headers: { apikey: process.env.EVOLUTION_API_KEY, "Content-Type": "application/json" },
      timeout: 8_000,
    });
    const instance = process.env.EVOLUTION_INSTANCE ?? "vello";
    const res = await api.post(`/chat/fetchProfilePictureUrl/${instance}`, {
      number: String(whatsapp).replace(/\D/g, ""),
    });
    const url: string | null = res.data?.profilePictureUrl ?? res.data?.picture ?? null;
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}
