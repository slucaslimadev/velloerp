import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    SUPABASE_URL: process.env.SUPABASE_URL ? "SET" : "MISSING",
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? "SET" : "MISSING",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "SET" : "MISSING",
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL ? "SET" : "MISSING",
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY ? "SET" : "MISSING",
    EVOLUTION_INSTANCE: process.env.EVOLUTION_INSTANCE || "MISSING",
    WEBHOOK_TOKEN: process.env.WEBHOOK_TOKEN ? "SET" : "MISSING",
    ALLOWED_WHATSAPP: process.env.ALLOWED_WHATSAPP || "NOT_SET",
  });
}
