import { NextResponse, type NextRequest } from "next/server";
import { getAuthUrl } from "@/lib/google";
import { isAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Inicia o OAuth do Google Calendar (origem admin).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.redirect(new URL("/login", req.url));
  const { id } = await params;
  const state = Buffer.from(JSON.stringify({ a: id, o: "admin" })).toString("base64url");
  return NextResponse.redirect(getAuthUrl(state));
}
