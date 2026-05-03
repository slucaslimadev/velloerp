import { NextRequest, NextResponse } from "next/server";

const AD_ACCOUNT = "act_314300854346356";
const INSIGHTS = "impressions,clicks,ctr,cpc,cpm,spend,actions,cost_per_action_type";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const preset = searchParams.get("preset") ?? "last_30d";
  const nivel  = searchParams.get("nivel")  ?? "campaigns";

  const token = process.env.META_PAGE_ACCESS_TOKEN!;

  const baseFields: Record<string, string> = {
    campaigns: `id,name,status,insights.date_preset(${preset}){${INSIGHTS}}`,
    adsets:    `id,name,status,campaign_id,campaign_name,insights.date_preset(${preset}){${INSIGHTS}}`,
    ads:       `id,name,status,campaign_id,adset_id,insights.date_preset(${preset}){${INSIGHTS}}`,
  };

  const fields = baseFields[nivel] ?? baseFields.campaigns;

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${AD_ACCOUNT}/${nivel}?fields=${fields}&limit=50&access_token=${token}`,
    { cache: "no-store" }
  );

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? "Erro ao buscar Meta Ads" },
      { status: 500 }
    );
  }

  return NextResponse.json(data.data ?? []);
}
