import { CampanhasClient } from "./campanhas-client";

export const dynamic = "force-dynamic";

const AD_ACCOUNT = "act_314300854346356";

async function fetchCampanhas(preset: string) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return [];

  const fields = `id,name,status,insights.date_preset(${preset}){impressions,clicks,ctr,cpc,cpm,spend,actions,cost_per_action_type}`;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${AD_ACCOUNT}/campaigns?fields=${fields}&limit=20&access_token=${token}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

export default async function CampanhasPage() {
  const campanhas = await fetchCampanhas("last_30d");
  return <CampanhasClient campanhasIniciais={campanhas} />;
}
