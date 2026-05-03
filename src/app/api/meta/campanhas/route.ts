import { NextRequest, NextResponse } from "next/server";

const AD_ACCOUNT = "act_314300854346356";

const INSIGHTS_FIELDS = [
  "impressions",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "spend",
  "actions",
  "cost_per_action_type",
].join(",");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const preset = searchParams.get("preset") ?? "last_30d";
  const nivel = searchParams.get("nivel") ?? "campanhas";

  const token = process.env.META_PAGE_ACCESS_TOKEN!;

  const endpoint =
    nivel === "adsets"
      ? `${AD_ACCOUNT}/adsets`
      : `${AD_ACCOUNT}/campaigns`;

  const fields = `id,name,status${nivel === "adsets" ? ",campaign_id,campaign_name" : ""},insights.date_preset(${preset}){${INSIGHTS_FIELDS}}`;

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${endpoint}?fields=${fields}&limit=20&access_token=${token}`,
    { cache: "no-store" }
  );

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? "Erro ao buscar dados da Meta" },
      { status: 500 }
    );
  }

  return NextResponse.json(data.data ?? []);
}
